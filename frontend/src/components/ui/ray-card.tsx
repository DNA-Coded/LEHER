import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import WaterSplashCanvas, { type WaterSplashCanvasRef } from '@/components/ui/water-splash-canvas';
import './cyber-card.css';

export interface RayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  showCyberLabels?: boolean;
}

export function RayCard({
  children,
  className,
  innerClassName,
  showCyberLabels = false,
  onPointerMove,
  onPointerLeave,
  ...props
}: RayCardProps) {
  const waterRef = useRef<WaterSplashCanvasRef>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    waterRef.current?.addPointerMove(e.clientX, e.clientY);
    onPointerMove?.(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    waterRef.current?.handleLeave();
    onPointerLeave?.(e);
  };

  return (
    <div
      className={cn("cyber-container cyber-noselect", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      <div className="cyber-canvas">
        {/* 25 3D Tracking Sectors for smooth tilt physics */}
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className={`cyber-tracker tr-${i + 1}`} />
        ))}

        {/* 3D Tilted Card Body */}
        <div className="cyber-card">
          <div className={cn("cyber-card-content", innerClassName)}>
            {/* Dynamic Directional Water Flow & Spill Canvas (Replaces the Aura Light) */}
            <WaterSplashCanvas ref={waterRef} />

            {/* Dynamic Hover Glare */}
            <div className="cyber-card-glare" />

            {/* Glowing Tech Cyber Lines */}
            <div className="cyber-lines">
              <span />
              <span />
              <span />
              <span />
            </div>

            {/* Floating Particles */}
            <div className="cyber-card-particles">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            {/* High-Tech Corner Brackets */}
            <div className="cyber-corner-elements">
              <span />
              <span />
              <span />
              <span />
            </div>

            {/* Animated Scanline */}
            <div className="cyber-scan-line" />

            {/* Default Cyber Labels if requested or no children */}
            {(!children || showCyberLabels) && (
              <>
                <p className="cyber-prompt">HOVER ME</p>
                <div className="cyber-title">CYBER<br />CARD</div>
                <div className="cyber-subtitle">
                  <span>INTERACTIVE</span>
                  <span className="cyber-highlight">3D EFFECT</span>
                </div>
              </>
            )}

            {/* Custom Content */}
            {children && (
              <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 pointer-events-none select-none">
                {children}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const CyberCard = RayCard;
export default RayCard;
