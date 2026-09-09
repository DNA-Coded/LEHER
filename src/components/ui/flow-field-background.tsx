import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface FlowFieldBackgroundProps {
  className?: string;
  /**
   * Color(s) of the particles. 
   * Defaults to light blue (sky color) and dark blue palette.
   */
  colors?: string[];
  /**
   * Single color fallback for backwards compatibility with NeuralBackground
   */
  color?: string;
  /**
   * Overall opacity of the effect (0.0 to 1.0).
   * Lower = more transparent.
   * Default: 0.55
   */
  opacity?: number;
  /**
   * The opacity of the trails (0.0 to 1.0).
   * Lower = longer trails. Higher = shorter trails.
   * Default: 0.15
   */
  trailOpacity?: number;
  /**
   * Number of particles. Default: 650
   */
  particleCount?: number;
  /**
   * Speed multiplier. Default: 1
   */
  speed?: number;
  /**
   * Blend mode for the canvas (screen, lighten, normal). Default: 'screen'
   */
  blendMode?: "screen" | "lighten" | "normal";
  /**
   * Mask mode. 'left' keeps the effect on the left side and avoids the globe on the right.
   * Default: 'left'
   */
  mask?: "left" | "none" | string;
  /**
   * Custom CSS style overrides
   */
  style?: React.CSSProperties;
}

// Light blue (sky colour) and dark blue palette
const DEFAULT_PALETTE = [
  "#38bdf8", // Light sky blue
  "#7dd3fc", // Pale sky blue
  "#0ea5e9", // Sky blue
  "#2563eb", // Vivid royal blue
  "#1d4ed8", // Dark ocean blue
  "#1e40af", // Deep dark navy blue
];

export function FlowFieldBackground({
  className,
  colors = DEFAULT_PALETTE,
  color,
  opacity = 0.55,
  trailOpacity = 0.15,
  particleCount = 650,
  speed = 1,
  blendMode = "screen",
  mask = "left",
  style,
}: FlowFieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maskStyle: React.CSSProperties =
    mask === "left"
      ? {
          maskImage:
            "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 32%, rgba(0,0,0,0.18) 48%, transparent 62%)",
          WebkitMaskImage:
            "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 32%, rgba(0,0,0,0.18) 48%, transparent 62%)",
        }
      : typeof mask === "string" && mask !== "none"
      ? {
          maskImage: mask,
          WebkitMaskImage: mask,
        }
      : {};

  // If a single color prop was provided, use that, otherwise use colors array
  const palette = color ? [color] : colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- CONFIGURATION ---
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    let animationFrameId: number;
    const mouse = { x: -1000, y: -1000 };

    // --- PARTICLE CLASS ---
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
      life: number;
      color: string;
      size: number;

      constructor(spawnRight?: boolean) {
        if (spawnRight) {
          this.x = width * 0.45 + Math.random() * width * 0.55;
        } else {
          this.x = Math.random() * width;
        }
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 220 + 80;
        this.color = palette[Math.floor(Math.random() * palette.length)];
        this.size = Math.random() * 0.8 + 1.2;
      }

      update() {
        // 1. Flow Field Math (Simplex-ish wave noise)
        const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;

        // 2. Add force from flow field
        this.vx += Math.cos(angle) * 0.2 * speed;
        this.vy += Math.sin(angle) * 0.2 * speed;

        // 3. Mouse Repulsion
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 160;

        if (distance < interactionRadius && distance > 0) {
          const force = (interactionRadius - distance) / interactionRadius;
          this.vx -= (dx / distance) * force * 3 * speed;
          this.vy -= (dy / distance) * force * 3 * speed;
        }

        // 4. Velocity & Friction
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;

        // 5. Aging
        this.age++;
        if (this.age > this.life) {
          this.reset();
        }

        // 6. Wrap around edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      reset() {
        if (Math.random() < 0.5) {
          this.x = width * 0.45 + Math.random() * width * 0.55;
        } else {
          this.x = Math.random() * width;
        }
        this.y = Math.random() * height;
        this.vx = 0;
        this.vy = 0;
        this.age = 0;
        this.life = Math.random() * 220 + 80;
        this.color = palette[Math.floor(Math.random() * palette.length)];
      }

      draw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.color;
        // Fade in and out smoothly based on particle lifetime
        const alpha = Math.max(0, Math.min(1, 1 - Math.abs((this.age / this.life) - 0.5) * 2));
        context.globalAlpha = alpha;
        context.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    let particles: Particle[] = [];

    // --- INITIALIZATION ---
    const init = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Clear initially to clean black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      particles = [];
      const count = Math.min(particleCount, Math.floor((width * height) / 1200));
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(i % 2 === 0));
      }
    };

    // --- ANIMATION LOOP ---
    const animate = () => {
      // Trail fade effect: semi-transparent black overlay
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // --- EVENT LISTENERS ---
    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
      }
    };

    const handleTouchEnd = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    init();
    animate();

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [palette, trailOpacity, particleCount, speed]);

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none overflow-hidden", className)}
      style={{
        opacity,
        mixBlendMode: blendMode,
        ...maskStyle,
        ...style,
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export const NeuralBackground = FlowFieldBackground;
export default FlowFieldBackground;
