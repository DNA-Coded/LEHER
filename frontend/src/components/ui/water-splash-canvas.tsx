import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface WaterSplashCanvasRef {
  addPointerMove: (clientX: number, clientY: number) => void;
  handleLeave: () => void;
}

interface FoamBubble {
  relAngle: number;
  distOffset: number;
  size: number;
  alpha: number;
  wobble: number;
  speed: number;
}

interface RollingWave {
  id: number;
  startX: number;        // Cursor origin X
  startY: number;        // Cursor origin Y
  radius: number;        // Current expanding radius
  maxRadius: number;     // Distance to furthest corner of card (unrestricted!)
  speed: number;         // Slow, majestic rolling speed
  angle: number;         // Direction heading towards opposite side of the card
  spread: number;        // Sweeping arc spread (~180 degrees)
  amplitude: number;     // Undulation height
  phase: number;         // Animated phase
  phaseSpeed: number;    // Gentle wave undulation rate
  alpha: number;         // Current opacity
  foamBubbles: FoamBubble[];
}

interface WaterSplashCanvasProps {
  className?: string;
}

export const WaterSplashCanvas = forwardRef<WaterSplashCanvasRef, WaterSplashCanvasProps>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Active waves (only one per hover)
    const activeWaveRef = useRef<RollingWave | null>(null);
    const hasTriggeredRef = useRef(false);

    // Helper: calculate distance to furthest card corner ensuring UNRESTRICTED propagation
    const getFurthestDistance = (x: number, y: number, w: number, h: number) => {
      const d1 = Math.hypot(x, y);
      const d2 = Math.hypot(w - x, y);
      const d3 = Math.hypot(x, h - y);
      const d4 = Math.hypot(w - x, h - y);
      return Math.max(d1, d2, d3, d4) + 60; // Generous buffer so wave completely clears the other side
    };

    // Helper: generate delicate seafoam bubbles along the wave crest
    const createFoamBubbles = (spread: number): FoamBubble[] => {
      const count = 14;
      const bubbles: FoamBubble[] = [];
      for (let i = 0; i < count; i++) {
        bubbles.push({
          relAngle: (Math.random() - 0.5) * (spread * 0.85),
          distOffset: (Math.random() - 0.5) * 12,
          size: 1.4 + Math.random() * 2.2,
          alpha: 0.7 + Math.random() * 0.3,
          wobble: Math.random() * Math.PI * 2,
          speed: 0.03 + Math.random() * 0.04,
        });
      }
      return bubbles;
    };

    // Trigger the single, slow, unrestricted ocean wave rolling towards the other side of the card
    const triggerSingleWave = (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Calculate direction heading toward the opposite side of the card
      const dx = width / 2 - x;
      const dy = height / 2 - y;
      // If cursor is near center, aim toward bottom-right; otherwise aim opposite to cursor location
      const targetAngle =
        Math.hypot(dx, dy) > 20
          ? Math.atan2(dy, dx)
          : Math.atan2(height - y, width - x);

      const maxRadius = getFurthestDistance(x, y, width, height);
      const spread = Math.PI * 1.05; // ~190 degree sweeping crescent wavefront

      activeWaveRef.current = {
        id: Date.now(),
        startX: x,
        startY: y,
        radius: 4,
        maxRadius,
        speed: 1.5, // Slow, graceful rolling velocity (~1.5px/frame)
        angle: targetAngle,
        spread,
        amplitude: 6.5,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.035, // Slow, hypnotic undulation
        alpha: 0,
        foamBubbles: createFoamBubbles(spread),
      };
    };

    useImperativeHandle(ref, () => ({
      addPointerMove(clientX: number, clientY: number) {
        // Only trigger once per hover!
        if (hasTriggeredRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
          return;
        }

        hasTriggeredRef.current = true;
        triggerSingleWave(x, y);
      },

      handleLeave() {
        // Reset so subsequent hover on this card triggers once again
        hasTriggeredRef.current = false;
        // The in-flight wave continues rolling across the card naturally until it reaches the edge
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const updateSize = () => {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(rect.width * dpr, 1);
        canvas.height = Math.max(rect.height * dpr, 1);
        ctx.scale(dpr, dpr);
      };

      updateSize();
      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(container);

      let isRunning = true;
      let animFrameId: number | null = null;

      const render = () => {
        if (!isRunning) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.clearRect(0, 0, width, height);

        const w = activeWaveRef.current;
        if (w) {
          // Advance the slow wave front across the card
          w.radius += w.speed;
          w.phase += w.phaseSpeed;

          // Progress ratio (0 = at cursor, 1 = reached furthest opposite edge)
          const progress = w.radius / w.maxRadius;

          // Smooth envelope: fades in gracefully (no sudden blob at birth),
          // stays bright and crystalline as it rolls across the card,
          // then dissolves softly as it reaches and passes the far boundaries
          if (w.radius < 40) {
            w.alpha = w.radius / 40;
          } else if (progress < 0.82) {
            w.alpha = 1.0;
          } else {
            w.alpha = Math.max((1.05 - progress) / 0.23, 0);
          }

          // When wave has completely crossed and cleared the card boundaries, finish
          if (progress >= 1.05 || w.alpha <= 0.01) {
            activeWaveRef.current = null;
          } else {
            // Generate sweeping wave crest arc points
            const pointCount = 56;
            const startAngle = w.angle - w.spread / 2;
            const endAngle = w.angle + w.spread / 2;
            const angleStep = (endAngle - startAngle) / pointCount;

            const crestPoints: Array<{ x: number; y: number; edgeFade: number }> = [];
            const wakePoints1: Array<{ x: number; y: number }> = [];
            const wakePoints2: Array<{ x: number; y: number }> = [];

            for (let p = 0; p <= pointCount; p++) {
              const phi = startAngle + p * angleStep;

              // Smooth crescent curvature (bulges forward in the direction of the wave)
              const angleDiff = phi - w.angle;
              const directionalScale = 0.8 + 0.25 * Math.cos(angleDiff);

              // Gentle edge taper so the wave wings fade out softly
              const normalizedArc = p / pointCount;
              const edgeFade = Math.sin(normalizedArc * Math.PI);

              // Oceanic fluid sinusoidal undulation
              const undulation =
                Math.sin(phi * 4 + w.phase) * w.amplitude +
                Math.sin(phi * 8 - w.phase * 0.7) * (w.amplitude * 0.35);

              const rMain = Math.max(w.radius * directionalScale + undulation, 3);
              const rWake1 = Math.max(rMain - 20, 1);
              const rWake2 = Math.max(rMain - 40, 1);

              crestPoints.push({
                x: w.startX + Math.cos(phi) * rMain,
                y: w.startY + Math.sin(phi) * rMain,
                edgeFade,
              });

              wakePoints1.push({
                x: w.startX + Math.cos(phi) * rWake1,
                y: w.startY + Math.sin(phi) * rWake1,
              });

              wakePoints2.push({
                x: w.startX + Math.cos(phi) * rWake2,
                y: w.startY + Math.sin(phi) * rWake2,
              });
            }

            if (crestPoints.length > 2) {
              // =======================================================
              // 1. LIGHTER SHADE: SOFT AMBIENT WATER SURGE WASH
              // =======================================================
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
              for (let p = 1; p < crestPoints.length; p++) {
                ctx.lineTo(crestPoints[p].x, crestPoints[p].y);
              }
              ctx.lineWidth = 22;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.strokeStyle = `rgba(224, 242, 254, ${w.alpha * 0.2})`;
              ctx.shadowColor = 'rgba(186, 230, 253, 0.65)';
              ctx.shadowBlur = 16;
              ctx.stroke();
              ctx.restore();

              // =======================================================
              // 2. LIGHTER SHADE: TRAILING HARMONIC WAKE RIPPLES
              // =======================================================
              if (w.radius > 35) {
                ctx.save();
                // Trailing ripple 2
                ctx.beginPath();
                ctx.moveTo(wakePoints2[0].x, wakePoints2[0].y);
                for (let p = 1; p < wakePoints2.length; p++) {
                  ctx.lineTo(wakePoints2[p].x, wakePoints2[p].y);
                }
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = `rgba(224, 242, 254, ${w.alpha * 0.22})`;
                ctx.stroke();

                // Trailing ripple 1
                ctx.beginPath();
                ctx.moveTo(wakePoints1[0].x, wakePoints1[0].y);
                for (let p = 1; p < wakePoints1.length; p++) {
                  ctx.lineTo(wakePoints1[p].x, wakePoints1[p].y);
                }
                ctx.lineWidth = 2.0;
                ctx.strokeStyle = `rgba(186, 230, 253, ${w.alpha * 0.38})`;
                ctx.stroke();
                ctx.restore();
              }

              // =======================================================
              // 3. LIGHTER SHADE: MAIN ROLLING WAVE CREST BODY
              // =======================================================
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
              for (let p = 1; p < crestPoints.length; p++) {
                ctx.lineTo(crestPoints[p].x, crestPoints[p].y);
              }
              ctx.lineWidth = 6;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              // Crisp ice cyan (#7dd3fc / #bae6fd)
              ctx.strokeStyle = `rgba(125, 211, 252, ${w.alpha * 0.68})`;
              ctx.stroke();
              ctx.restore();

              // =======================================================
              // 4. LIGHTER SHADE: CRISP WHITE FOAM CREST LINE
              // =======================================================
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
              for (let p = 1; p < crestPoints.length; p++) {
                ctx.lineTo(crestPoints[p].x, crestPoints[p].y);
              }
              ctx.lineWidth = 2.2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              // Crisp pure white foam crest
              ctx.strokeStyle = `rgba(255, 255, 255, ${w.alpha * 0.95})`;
              ctx.shadowColor = 'rgba(224, 242, 254, 0.95)';
              ctx.shadowBlur = 8;
              ctx.stroke();
              ctx.restore();

              // =======================================================
              // 5. LIGHTER SHADE: DRIFTING SEAFOAM FLECK BUBBLES
              // =======================================================
              ctx.save();
              for (let b = 0; b < w.foamBubbles.length; b++) {
                const fb = w.foamBubbles[b];
                fb.wobble += fb.speed;

                const bubbleAngle = w.angle + fb.relAngle;
                const angleDiff = bubbleAngle - w.angle;
                const directionalScale = 0.8 + 0.25 * Math.cos(angleDiff);

                const rBubble =
                  w.radius * directionalScale +
                  fb.distOffset +
                  Math.sin(fb.wobble) * 2;

                const bx = w.startX + Math.cos(bubbleAngle) * rBubble;
                const by = w.startY + Math.sin(bubbleAngle) * rBubble;

                const bubbleAlpha = w.alpha * fb.alpha;
                ctx.fillStyle = `rgba(255, 255, 255, ${bubbleAlpha * 0.95})`;
                ctx.shadowColor = 'rgba(186, 230, 253, 0.8)';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(bx, by, fb.size, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          }
        }

        animFrameId = requestAnimationFrame(render);
      };

      animFrameId = requestAnimationFrame(render);

      return () => {
        isRunning = false;
        if (animFrameId) {
          cancelAnimationFrame(animFrameId);
        }
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 pointer-events-none z-1 overflow-hidden rounded-[18px] ${className}`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />
      </div>
    );
  }
);

WaterSplashCanvas.displayName = 'WaterSplashCanvas';
export default WaterSplashCanvas;
