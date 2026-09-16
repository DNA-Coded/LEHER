import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface WaterSplashCanvasRef {
  addPointerMove: (clientX: number, clientY: number) => void;
  handleLeave: () => void;
}

interface FoamBubble {
  angleOffset: number;
  distOffset: number;
  size: number;
  alpha: number;
  wobble: number;
  speed: number;
}

interface RollingWave {
  id: number;
  startX: number;        // Origin X (where cursor was/is)
  startY: number;        // Origin Y (where cursor was/is)
  radius: number;        // Expanding radius
  maxRadius: number;     // Full distance to furthest boundary/corner of the card (unrestricted)
  speed: number;         // Propagation speed across card
  angle: number;         // Main direction angle
  spread: number;        // Arc spread in radians
  wavelength: number;    // Crest thickness
  amplitude: number;     // Undulation height
  freq: number;          // Undulation frequency
  phase: number;         // Phase offset
  phaseSpeed: number;    // Wave oscillation speed
  alpha: number;         // Overall opacity
  isDirectional: boolean;
  foamBubbles: FoamBubble[];
}

interface WaterSplashCanvasProps {
  className?: string;
}

export const WaterSplashCanvas = forwardRef<WaterSplashCanvasRef, WaterSplashCanvasProps>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Active rolling ocean waves
    const wavesRef = useRef<RollingWave[]>([]);
    const nextWaveId = useRef(1);

    // Mouse tracking & hover state
    const isHoveredRef = useRef(false);
    const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
    const lastMoveTimeRef = useRef(0);
    const lastSpawnTimeRef = useRef(0);
    const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);

    const animFrameRef = useRef<number | null>(null);

    // Helper: calculate distance to furthest card corner to guarantee UNRESTRICTED propagation
    const getFurthestDistance = (x: number, y: number, w: number, h: number) => {
      const d1 = Math.hypot(x, y);
      const d2 = Math.hypot(w - x, y);
      const d3 = Math.hypot(x, h - y);
      const d4 = Math.hypot(w - x, h - y);
      return Math.max(d1, d2, d3, d4) + 60; // Add generous buffer so wave completely exits opposite side
    };

    // Helper: generate foam bubbles that ride along the wave crest
    const createFoamBubbles = (spread: number, isDirectional: boolean): FoamBubble[] => {
      const count = isDirectional ? 10 : 16;
      const bubbles: FoamBubble[] = [];
      for (let i = 0; i < count; i++) {
        const angleOffset = (Math.random() - 0.5) * spread;
        bubbles.push({
          angleOffset,
          distOffset: (Math.random() - 0.5) * 14,
          size: 1.5 + Math.random() * 2.8,
          alpha: 0.75 + Math.random() * 0.25,
          wobble: Math.random() * Math.PI * 2,
          speed: 0.05 + Math.random() * 0.08,
        });
      }
      return bubbles;
    };

    // Spawn an unrestricted wave originating at (x, y) rolling towards the opposite side of the card
    const spawnWave = (
      x: number,
      y: number,
      angle: number,
      speed: number,
      isDirectional: boolean
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Unrestricted radius: rolls all the way to the other side of the card
      const maxRadius = getFurthestDistance(x, y, width, height);
      const spread = isDirectional ? Math.PI * 0.95 : Math.PI * 2; // ~170 deg arc if directional, 360 deg if stationary

      wavesRef.current.push({
        id: nextWaveId.current++,
        startX: x,
        startY: y,
        radius: 2,
        maxRadius,
        speed: Math.max(speed, 3.8), // Smooth, majestic rolling velocity (~4px/frame)
        angle,
        spread,
        wavelength: 18 + Math.random() * 8,
        amplitude: 6 + Math.random() * 5,
        freq: 3 + Math.floor(Math.random() * 3),
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.06 + Math.random() * 0.04,
        alpha: 1.0,
        isDirectional,
        foamBubbles: createFoamBubbles(spread, isDirectional),
      });

      // Keep max 8 simultaneous waves for optimal 60fps performance
      if (wavesRef.current.length > 8) {
        wavesRef.current.shift();
      }
    };

    useImperativeHandle(ref, () => ({
      addPointerMove(clientX: number, clientY: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const now = performance.now();

        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
          isHoveredRef.current = false;
          cursorPosRef.current = null;
          lastPointRef.current = null;
          return;
        }

        isHoveredRef.current = true;
        cursorPosRef.current = { x, y };
        lastMoveTimeRef.current = now;

        if (lastPointRef.current) {
          const dx = x - lastPointRef.current.x;
          const dy = y - lastPointRef.current.y;
          const dist = Math.hypot(dx, dy);
          const dt = Math.max(now - lastPointRef.current.time, 10);
          const rawSpeed = dist / (dt / 16.6);

          // Spawn wave if moved sufficiently or enough time elapsed (smooth rolling wave train)
          if (dist > 14 && now - lastSpawnTimeRef.current > 110) {
            const motionAngle = Math.atan2(dy, dx);
            const waveSpeed = 3.6 + Math.min(rawSpeed * 0.15, 2.4);

            // Spawn directional rolling wave moving across to the other side
            spawnWave(x, y, motionAngle, waveSpeed, true);
            lastSpawnTimeRef.current = now;
          }
        } else {
          // Initial hover entry: spawn initial wave rolling outward from cursor
          spawnWave(x, y, 0, 3.8, false);
          lastSpawnTimeRef.current = now;
        }

        lastPointRef.current = { x, y, time: now };
      },

      handleLeave() {
        isHoveredRef.current = false;
        cursorPosRef.current = null;
        lastPointRef.current = null;
        // In-flight waves are NOT cleared; they finish rolling across the card naturally
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

      const render = () => {
        if (!isRunning) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const now = performance.now();

        // Check if user is stationary hovering: pulse gentle rhythmic rolling ocean swells
        if (
          isHoveredRef.current &&
          cursorPosRef.current &&
          now - lastSpawnTimeRef.current > 420
        ) {
          const { x, y } = cursorPosRef.current;
          // Determine directional bias towards center or far side of card
          const toCenterX = width / 2 - x;
          const toCenterY = height / 2 - y;
          const centerAngle = Math.atan2(toCenterY, toCenterX);

          spawnWave(x, y, centerAngle, 3.6, false);
          lastSpawnTimeRef.current = now;
        }

        ctx.clearRect(0, 0, width, height);

        const waves = wavesRef.current;

        // -------------------------------------------------------------
        // RENDER ROLLING OCEAN WAVES (Unrestricted across card to opposite edge)
        // -------------------------------------------------------------
        for (let i = waves.length - 1; i >= 0; i--) {
          const w = waves[i];

          // Advance wave front across the card
          w.radius += w.speed;
          w.phase += w.phaseSpeed;

          // Progress ratio (0 = at cursor, 1 = reached furthest opposite edge)
          const progress = w.radius / w.maxRadius;

          // Natural ocean envelope: fades in smoothly, maintains high clarity across card,
          // then gracefully washes out as it exits the opposite boundary
          if (progress < 0.12) {
            w.alpha = progress / 0.12;
          } else if (progress < 0.82) {
            w.alpha = 1.0;
          } else {
            w.alpha = Math.max((1.05 - progress) / 0.23, 0);
          }

          // When wave has completely crossed and cleared the card boundaries, remove it
          if (progress >= 1.05 || w.alpha <= 0.01) {
            waves.splice(i, 1);
            continue;
          }

          // Generate wave points along the propagating crest arc
          const pointCount = w.isDirectional ? 48 : 72;
          const startAngle = w.isDirectional ? w.angle - w.spread / 2 : 0;
          const endAngle = w.isDirectional ? w.angle + w.spread / 2 : Math.PI * 2;
          const angleStep = (endAngle - startAngle) / pointCount;

          const crestPoints: Array<{ x: number; y: number }> = [];
          const wakePoints1: Array<{ x: number; y: number }> = [];
          const wakePoints2: Array<{ x: number; y: number }> = [];

          for (let p = 0; p <= pointCount; p++) {
            const phi = startAngle + p * angleStep;

            // Directional surge forward (wave bulges towards direction of motion)
            let directionalScale = 1.0;
            if (w.isDirectional) {
              const angleDiff = Math.abs(phi - w.angle);
              directionalScale = 0.72 + 0.28 * Math.cos(angleDiff);
            }

            // Oceanic sinusoidal harmonics and undulations along the crest
            const waveUndulation =
              Math.sin(phi * w.freq + w.phase) * w.amplitude +
              Math.sin(phi * (w.freq * 2.2) - w.phase * 0.8) * (w.amplitude * 0.35);

            const rMain = Math.max(w.radius * directionalScale + waveUndulation, 2);
            const rWake1 = Math.max(rMain - 16, 1);
            const rWake2 = Math.max(rMain - 32, 1);

            crestPoints.push({
              x: w.startX + Math.cos(phi) * rMain,
              y: w.startY + Math.sin(phi) * rMain,
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

          if (crestPoints.length < 2) continue;

          // ===========================================================
          // 1. LIGHTER SHADE: SOFT AMBIENT WATER SURGE / CAUSTIC WASH
          // ===========================================================
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
          for (let p = 1; p < crestPoints.length; p++) {
            ctx.lineTo(crestPoints[p].x, crestPoints[p].y);
          }
          ctx.lineWidth = 26;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Very light, ethereal translucent aqua/ice wash
          ctx.strokeStyle = `rgba(224, 242, 254, ${w.alpha * 0.22})`;
          ctx.shadowColor = 'rgba(186, 230, 253, 0.7)';
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.restore();

          // ===========================================================
          // 2. LIGHTER SHADE: TRAILING HARMONIC ECHO RIPPLES (WAKE)
          // ===========================================================
          if (w.radius > 25) {
            ctx.save();
            // Wake Ripple 2 (farthest behind)
            ctx.beginPath();
            ctx.moveTo(wakePoints2[0].x, wakePoints2[0].y);
            for (let p = 1; p < wakePoints2.length; p++) {
              ctx.lineTo(wakePoints2[p].x, wakePoints2[p].y);
            }
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = `rgba(224, 242, 254, ${w.alpha * 0.28})`;
            ctx.stroke();

            // Wake Ripple 1 (intermediate)
            ctx.beginPath();
            ctx.moveTo(wakePoints1[0].x, wakePoints1[0].y);
            for (let p = 1; p < wakePoints1.length; p++) {
              ctx.lineTo(wakePoints1[p].x, wakePoints1[p].y);
            }
            ctx.lineWidth = 2.4;
            ctx.strokeStyle = `rgba(186, 230, 253, ${w.alpha * 0.45})`;
            ctx.stroke();
            ctx.restore();
          }

          // ===========================================================
          // 3. LIGHTER SHADE: MAIN ROLLING WAVE BODY
          // ===========================================================
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
          for (let p = 1; p < crestPoints.length; p++) {
            ctx.lineTo(crestPoints[p].x, crestPoints[p].y);
          }
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Crisp light sky cyan (#7dd3fc / #bae6fd)
          ctx.strokeStyle = `rgba(125, 211, 252, ${w.alpha * 0.75})`;
          ctx.stroke();
          ctx.restore();

          // ===========================================================
          // 4. LIGHTER SHADE: CRISP LUMINOUS WHITE-CYAN CREST HIGHLIGHT
          // ===========================================================
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(crestPoints[0].x, crestPoints[0].y);
          for (let p = 1; p < crestPoints.length; p++) {
            ctx.lineTo(crestPoints[p].x, crestPoints[p].y);
          }
          ctx.lineWidth = 2.8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Glistening white wave crest
          ctx.strokeStyle = `rgba(255, 255, 255, ${w.alpha * 0.95})`;
          ctx.shadowColor = 'rgba(224, 242, 254, 0.9)';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();

          // ===========================================================
          // 5. LIGHTER SHADE: EFFERVESCENT SEAFOAM FLECK BUBBLES
          // ===========================================================
          ctx.save();
          for (let b = 0; b < w.foamBubbles.length; b++) {
            const fb = w.foamBubbles[b];
            fb.wobble += fb.speed;

            const bubbleAngle = w.angle + fb.angleOffset;
            let directionalScale = 1.0;
            if (w.isDirectional) {
              const diff = Math.abs(bubbleAngle - w.angle);
              directionalScale = 0.72 + 0.28 * Math.cos(diff);
            }

            const rBubble =
              w.radius * directionalScale +
              fb.distOffset +
              Math.sin(fb.wobble) * 2.5;

            const bx = w.startX + Math.cos(bubbleAngle) * rBubble;
            const by = w.startY + Math.sin(bubbleAngle) * rBubble;

            // Render seafoam bubble
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

        animFrameRef.current = requestAnimationFrame(render);
      };

      animFrameRef.current = requestAnimationFrame(render);

      return () => {
        isRunning = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
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
