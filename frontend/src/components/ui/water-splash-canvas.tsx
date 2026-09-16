import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface WaterSplashCanvasRef {
  addPointerMove: (clientX: number, clientY: number) => void;
  handleLeave: () => void;
}

interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  initialRadius: number;
  alpha: number;
  decay: number;
  hue: number;
  wobble: number;
  wobbleSpeed: number;
}

interface WaveRipple {
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

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
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

    const dropletsRef = useRef<Droplet[]>([]);
    const ripplesRef = useRef<WaveRipple[]>([]);
    const splashesRef = useRef<SplashParticle[]>([]);
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

        // Ensure pointer is inside card bounds
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
          lastPointRef.current = null;
          return;
        }

        if (lastPointRef.current) {
          const dx = x - lastPointRef.current.x;
          const dy = y - lastPointRef.current.y;
          const dt = Math.max(now - lastPointRef.current.time, 8);
          const speed = Math.hypot(dx, dy) / (dt / 16.6);

          if (speed > 0.35) {
            const mag = Math.hypot(dx, dy);
            const dirX = dx / mag;
            const dirY = dy / mag;

            // Momentum in the direction of the swipe
            const flowSpeed = Math.min(speed * 0.75, 12);

            // 1. Spawn directional water droplets
            const dropletCount = Math.min(Math.floor(speed * 1.2) + 3, 9);
            for (let i = 0; i < dropletCount; i++) {
              // Conical spray in the motion direction
              const angleSpread = (Math.random() - 0.5) * 0.8;
              const cos = Math.cos(angleSpread);
              const sin = Math.sin(angleSpread);
              const vel = flowSpeed * (0.6 + Math.random() * 0.7);

              const pVx = (dirX * cos - dirY * sin) * vel;
              const pVy = (dirX * sin + dirY * cos) * vel;

              const radius = 3.5 + Math.random() * 7;

              dropletsRef.current.push({
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 12,
                vx: pVx,
                vy: pVy,
                radius,
                initialRadius: radius,
                alpha: 0.85 + Math.random() * 0.15,
                decay: 0.014 + Math.random() * 0.016,
                hue: 188 + Math.random() * 22, // Cyan / Azure Ocean Palette
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 0.15 + Math.random() * 0.15
              });
            }

            // 2. Spawn elongated directional wave ripples
            if (Math.random() < 0.45) {
              const rippleAngle = Math.atan2(dy, dx);
              ripplesRef.current.push({
                x,
                y,
                vx: dirX * (flowSpeed * 0.35),
                vy: dirY * (flowSpeed * 0.35),
                radiusX: 8,
                radiusY: 5,
                maxRadius: 35 + Math.min(speed * 4, 55),
                angle: rippleAngle,
                alpha: 0.65,
                decay: 0.024
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

        const droplets = dropletsRef.current;
        const ripples = ripplesRef.current;
        const splashes = splashesRef.current;

        // Render & Update Directional Ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rip = ripples[i];
          rip.radiusX += 1.8;
          rip.radiusY += 1.1;
          rip.x += rip.vx;
          rip.y += rip.vy;
          rip.vx *= 0.94;
          rip.vy *= 0.94;
          rip.alpha -= rip.decay;

          if (rip.alpha <= 0.01 || rip.radiusX >= rip.maxRadius) {
            ripples.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(rip.x, rip.y);
          ctx.rotate(rip.angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, rip.radiusX, rip.radiusY, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${rip.alpha * 0.5})`;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        }

        // Render & Update Water Droplets
        for (let i = droplets.length - 1; i >= 0; i--) {
          const d = droplets[i];

          // Flow physics: inertia + fluid viscosity
          d.x += d.vx;
          d.y += d.vy;
          d.vx *= 0.955;
          d.vy *= 0.955;

          // Subtle natural gravity drift
          d.vy += 0.06;

          // Droplet surface tension oscillation
          d.wobble += d.wobbleSpeed;
          const currentRadius = Math.max(
            d.radius + Math.sin(d.wobble) * 0.8,
            1.5
          );

          // Boundary bounce / splash within card
          const margin = 10;
          if (d.x < margin && d.vx < 0) {
            d.vx *= -0.4;
            d.x = margin;
            // Spawn tiny boundary splash
            splashes.push({
              x: d.x,
              y: d.y,
              vx: Math.random() * 2,
              vy: (Math.random() - 0.5) * 2,
              radius: 2,
              alpha: d.alpha * 0.7,
              decay: 0.05
            });
          } else if (d.x > width - margin && d.vx > 0) {
            d.vx *= -0.4;
            d.x = width - margin;
            splashes.push({
              x: d.x,
              y: d.y,
              vx: -Math.random() * 2,
              vy: (Math.random() - 0.5) * 2,
              radius: 2,
              alpha: d.alpha * 0.7,
              decay: 0.05
            });
          }

          if (d.y > height - margin && d.vy > 0) {
            d.vy *= -0.3;
            d.y = height - margin;
          }

          d.alpha -= d.decay;

          if (d.alpha <= 0.01) {
            droplets.splice(i, 1);
            continue;
          }

          ctx.save();

          // 1. Ambient Fluid Cyan Corona / Water Glow
          const corona = ctx.createRadialGradient(
            d.x, d.y, 0,
            d.x, d.y, currentRadius * 2.6
          );
          corona.addColorStop(0, `hsla(${d.hue}, 95%, 62%, ${d.alpha * 0.45})`);
          corona.addColorStop(0.6, `hsla(${d.hue}, 90%, 50%, ${d.alpha * 0.16})`);
          corona.addColorStop(1, 'rgba(0, 162, 255, 0)');

          ctx.fillStyle = corona;
          ctx.beginPath();
          ctx.arc(d.x, d.y, currentRadius * 2.6, 0, Math.PI * 2);
          ctx.fill();

          // 2. Liquid Water Dome Body
          const dome = ctx.createRadialGradient(
            d.x - currentRadius * 0.3,
            d.y - currentRadius * 0.3,
            0,
            d.x,
            d.y,
            currentRadius
          );
          dome.addColorStop(0, `hsla(${d.hue}, 98%, 76%, ${d.alpha * 0.9})`);
          dome.addColorStop(0.5, `hsla(${d.hue}, 92%, 58%, ${d.alpha * 0.75})`);
          dome.addColorStop(1, `hsla(${d.hue + 12}, 88%, 42%, ${d.alpha * 0.3})`);

          ctx.fillStyle = dome;
          ctx.beginPath();
          ctx.arc(d.x, d.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();

          // 3. Crisp Water Surface Specular Glint
          const glintSize = Math.max(currentRadius * 0.38, 1.2);
          ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 0.95})`;
          ctx.beginPath();
          ctx.arc(
            d.x - currentRadius * 0.32,
            d.y - currentRadius * 0.32,
            glintSize,
            0,
            Math.PI * 2
          );
          ctx.fill();

          ctx.restore();
        }

        // Render & Update Boundary Splashes
        for (let i = splashes.length - 1; i >= 0; i--) {
          const sp = splashes[i];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.alpha -= sp.decay;

          if (sp.alpha <= 0.01) {
            splashes.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.fillStyle = `rgba(186, 230, 253, ${sp.alpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
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
