import type React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface DottedSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  dotColor?: string;
  dotSize?: number;
  speed?: number;
  waveHeight?: number;
  opacity?: number;
}

export function DottedSurface({
  className,
  dotColor = "#dfc58d",
  dotSize = 7,
  speed = 0.03,
  waveHeight = 40,
  opacity = 0.55,
  ...props
}: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 140;
    const AMOUNTX = 45;
    const AMOUNTY = 55;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080808, 0.00035);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    camera.position.set(0, 380, 1150);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x080808, 0);

    container.appendChild(renderer.domElement);

    // Parse dot color
    const colorObj = new THREE.Color(dotColor);

    // Create particles
    const positions: number[] = [];
    const colors: number[] = [];

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const y = 0;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

        positions.push(x, y, z);
        // Add subtle natural variation to particle tones
        const variation = 0.85 + Math.random() * 0.25;
        colors.push(
          colorObj.r * variation,
          colorObj.g * variation,
          colorObj.b * variation
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    const material = new THREE.PointsMaterial({
      size: dotSize,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const positionAttr = geometry.attributes.position;
      const posArray = positionAttr.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;

          // Double harmonic sine wave for oceanic swell feel
          posArray[index + 1] =
            Math.sin((ix + count) * 0.28) * waveHeight +
            Math.sin((iy + count) * 0.42) * (waveHeight * 0.8) +
            Math.cos((ix + iy + count * 0.5) * 0.2) * (waveHeight * 0.3);

          i++;
        }
      }

      positionAttr.needsUpdate = true;
      renderer.render(scene, camera);
      count += speed;
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);

      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [dotColor, dotSize, speed, waveHeight, opacity]);

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      {...props}
    />
  );
}

export default DottedSurface;
