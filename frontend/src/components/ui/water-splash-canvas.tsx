import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface WaterSplashCanvasRef {
  addPointerMove: (clientX: number, clientY: number) => void;
  handleLeave: () => void;
}

interface SplashPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface SplashDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  length: number;
  angle: number;
  alpha: number;
  decay: number;
  hue: number;
  wobble: number;
}

interface WaveRing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radiusX: number;
  radiusY: number;
  maxRadius: number;
  angle: number;
  alpha: number;
  decay: number;
}

interface WaterSplashCanvasProps {
  className?: string;
}

export const WaterSplashCanvas = forwardRef<WaterSplashCanvasRef, WaterSplashCanvasProps>(
  ({ className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Continuous liquid splash ribbon points
    const trailPointsRef = useRef<SplashPoint[]>([]);
    // Teardrop splash droplets
    const dropletsRef = useRef<SplashDroplet[]>([]);
    // Expanding surface wave rings
    const wavesRef = useRef<WaveRing[]>([]);

    const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const animFrameRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      addPointerMove(clientX: number, clientY: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const now = performance.now();

        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
          lastPointRef.current = null;
          return;
        }

        if (lastPointRef.current) {
          const dx = x - lastPointRef.current.x;
          const dy = y - lastPointRef.current.y;
          const dt = Math.max(now - lastPointRef.current.time, 10);
          const rawSpeed = Math.hypot(dx, dy) / (dt / 16.6);

          // Graceful fluid speed
          const speed = Math.min(rawSpeed, 9);

          if (speed > 0.2) {
            const mag = Math.hypot(dx, dy) || 1;
            const dirX = dx / mag;
            const dirY = dy / mag;
            const motionAngle = Math.atan2(dy, dx);

            // 1. Continuous Liquid Splash Wave Ribbon (Moves along with card cursor)
            const ribbonWidth = Math.min(22 + speed * 4.5, 48);
            trailPointsRef.current.push({
              x,
              y,
              vx: dirX * (speed * 0.28), // Smooth fluid inertia along swipe direction
              vy: dirY * (speed * 0.28),
              width: ribbonWidth,
              alpha: 1.0,
              life: 1.0,
              maxLife: 75 // ~1.25s graceful lingering
            });

            // 2. Spawn Directional Splash Droplets (Water spray moving along with swipe)
            const dropletCount = Math.min(Math.floor(speed * 0.9) + 2, 6);
            for (let i = 0; i < dropletCount; i++) {
              const coneAngle = motionAngle + (Math.random() - 0.5) * 0.75;
              const dropletSpeed = 1.0 + Math.random() * (speed * 0.4 + 1.6);

              const vx = Math.cos(coneAngle) * dropletSpeed;
              const vy = Math.sin(coneAngle) * dropletSpeed;

              const radius = 4 + Math.random() * 7;

              dropletsRef.current.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx,
                vy,
                radius,
                length: radius * (1.3 + Math.random() * 0.8),
                angle: coneAngle,
                alpha: 0.95,
                decay: 0.01 + Math.random() * 0.008, // Slower decay (~1.3s - 1.6s)
                hue: 190 + Math.random() * 20,
                wobble: Math.random() * Math.PI * 2
              });
            }

            // 3. Directional Water Surface Wave Ring
            if (Math.random() < 0.35) {
              wavesRef.current.push({
                x,
                y,
                vx: dirX * (speed * 0.18),
                vy: dirY * (speed * 0.18),
                radiusX: 8,
                radiusY: 4.5,
                maxRadius: 32 + speed * 3.5,
                angle: motionAngle,
                alpha: 0.65,
                decay: 0.015
              });
            }
          }
        }

        lastPointRef.current = { x, y, time: now };
      },

      handleLeave() {
        lastPointRef.current = null;
      }
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

        ctx.clearRect(0, 0, width, height);

        const trails = trailPointsRef.current;
        const droplets = dropletsRef.current;
        const waves = wavesRef.current;

        // -------------------------------------------------------------
        // A. RENDER CONTINUOUS LIQUID SPLASH BODY (Flows along cursor)
        // -------------------------------------------------------------
        if (trails.length > 1) {
          // Update trail point physics and lifecycle
          for (let i = trails.length - 1; i >= 0; i--) {
            const p = trails[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95; // Fluid water drag
            p.vy *= 0.95;
            p.life -= 1 / p.maxLife;
            p.alpha = Math.max(p.life, 0);

            if (p.life <= 0) {
              trails.splice(i, 1);
            }
          }

          if (trails.length > 1) {
            // 1. Soft Ambient Aqua Water Wash / Caustic Glow
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < trails.length - 1; i++) {
              const p1 = trails[i];
              const p2 = trails[i + 1];
              const avgAlpha = ((p1.alpha + p2.alpha) / 2) * 0.55;
              const avgWidth = (p1.width + p2.width) / 2;

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineWidth = avgWidth * 1.5;
              ctx.strokeStyle = `rgba(14, 165, 233, ${avgAlpha})`;
              ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
              ctx.shadowBlur = 20;
              ctx.stroke();
            }
            ctx.restore();

            // 2. Main Liquid Splash Stream Body
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < trails.length - 1; i++) {
              const p1 = trails[i];
              const p2 = trails[i + 1];
              const avgAlpha = ((p1.alpha + p2.alpha) / 2) * 0.8;
              const avgWidth = (p1.width + p2.width) / 2;

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineWidth = avgWidth;
              ctx.strokeStyle = `rgba(56, 189, 248, ${avgAlpha})`;
              ctx.stroke();
            }
            ctx.restore();

            // 3. Crisp Liquid Wave Crest Highlight (Glistening Water Center)
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < trails.length - 1; i++) {
              const p1 = trails[i];
              const p2 = trails[i + 1];
              const avgAlpha = ((p1.alpha + p2.alpha) / 2) * 0.95;
              const avgWidth = Math.max((p1.width + p2.width) * 0.32, 3);

              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineWidth = avgWidth;
              ctx.strokeStyle = `rgba(255, 255, 255, ${avgAlpha})`;
              ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
              ctx.shadowBlur = 8;
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // -------------------------------------------------------------
        // B. RENDER SURFACE WAVE RIPPLES
        // -------------------------------------------------------------
        for (let i = waves.length - 1; i >= 0; i--) {
          const w = waves[i];
          w.radiusX += 0.95;
          w.radiusY += 0.6;
          w.x += w.vx;
          w.y += w.vy;
          w.vx *= 0.96;
          w.vy *= 0.96;
          w.alpha -= w.decay;

          if (w.alpha <= 0.01 || w.radiusX >= w.maxRadius) {
            waves.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(w.x, w.y);
          ctx.rotate(w.angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, w.radiusX, w.radiusY, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${w.alpha * 0.55})`;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = 'rgba(14, 165, 233, 0.5)';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        }

        // -------------------------------------------------------------
        // C. RENDER ORGANIC TEARDROP WATER SPLASHES (Spray moving with cursor)
        // -------------------------------------------------------------
        for (let i = droplets.length - 1; i >= 0; i--) {
          const d = droplets[i];

          // Graceful flow with slight viscous drag
          d.x += d.vx;
          d.y += d.vy;
          d.vx *= 0.97;
          d.vy *= 0.97;

          // Gentle gravity
          d.vy += 0.035;

          // Droplet surface tension oscillation
          d.wobble += 0.07;
          const currentRadius = Math.max(d.radius + Math.sin(d.wobble) * 0.6, 1.5);

          // Card boundary containment
          const margin = 8;
          if (d.x < margin && d.vx < 0) {
            d.vx *= -0.3;
            d.x = margin;
          } else if (d.x > width - margin && d.vx > 0) {
            d.vx *= -0.3;
            d.x = width - margin;
          }
          if (d.y > height - margin && d.vy > 0) {
            d.vy *= -0.25;
            d.y = height - margin;
          }

          d.alpha -= d.decay;

          if (d.alpha <= 0.01) {
            droplets.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.angle);

          // 1. Splash Droplet Corona
          const corona = ctx.createRadialGradient(
            0, 0, 0,
            0, 0, currentRadius * 2.5
          );
          corona.addColorStop(0, `hsla(${d.hue}, 95%, 65%, ${d.alpha * 0.5})`);
          corona.addColorStop(0.6, `hsla(${d.hue}, 90%, 50%, ${d.alpha * 0.2})`);
          corona.addColorStop(1, 'rgba(14, 165, 233, 0)');

          ctx.fillStyle = corona;
          ctx.beginPath();
          ctx.ellipse(0, 0, d.length * 1.5, currentRadius * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Liquid Droplet Body
          const dome = ctx.createRadialGradient(
            -currentRadius * 0.2, -currentRadius * 0.2, 0,
            0, 0, currentRadius
          );
          dome.addColorStop(0, `hsla(${d.hue}, 98%, 76%, ${d.alpha * 0.9})`);
          dome.addColorStop(0.6, `hsla(${d.hue}, 92%, 56%, ${d.alpha * 0.7})`);
          dome.addColorStop(1, `hsla(${d.hue + 8}, 88%, 42%, ${d.alpha * 0.25})`);

          ctx.fillStyle = dome;
          ctx.beginPath();
          ctx.ellipse(0, 0, d.length, currentRadius, 0, 0, Math.PI * 2);
          ctx.fill();

          // 3. Water Specular Highlight (Crisp White Wet Sheen)
          const specX = -d.length * 0.35;
          const specY = -currentRadius * 0.25;
          const specSize = Math.max(currentRadius * 0.38, 1.2);
          ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.95})`;
          ctx.beginPath();
          ctx.arc(specX, specY, specSize, 0, Math.PI * 2);
          ctx.fill();

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
