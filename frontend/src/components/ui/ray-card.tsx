import React from 'react';
import { cn } from '@/lib/utils';
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
  ...props
}: RayCardProps) {
  return (
    <div className={cn("cyber-container cyber-noselect", className)} {...props}>
      <div className="cyber-canvas">
        {/* 25 3D Tracking Sectors for smooth tilt physics */}
        {Array.from({ length: 25 }, (_, i) => (
          <div key={i} className={`cyber-tracker tr-${i + 1}`} />
        ))}

        {/* 3D Tilted Card Body */}
        <div className="cyber-card">
          <div className={cn("cyber-card-content", innerClassName)}>
            {/* Dynamic Hover Glare */}
            <div className="cyber-card-glare" />

            {/* Glowing Tech Cyber Lines */}
            <div className="cyber-lines">
              <span />
              <span />
              <span />
              <span />
            </div>

            {/* Neon Glow Spots */}
            <div className="cyber-glowing-elements">
              <div className="cyber-glow-1" />
              <div className="cyber-glow-2" />
              <div className="cyber-glow-3" />
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
              <div className="relative z-10 w-full h-full flex flex-col justify-between p-6">
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
