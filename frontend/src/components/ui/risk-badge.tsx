import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskLevel = 'SAFE' | 'CAUTION' | 'DANGER';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  subtext?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskBadge({
  level,
  label,
  subtext,
  size = 'md',
  className,
}: RiskBadgeProps) {
  const normalizedLevel: RiskLevel = 
    level === 'SAFE' ? 'SAFE' : level === 'CAUTION' ? 'CAUTION' : 'DANGER';

  const config = {
    SAFE: {
      text: 'SAFE',
      icon: ShieldCheck,
      classes: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400',
      dotClass: 'bg-emerald-400',
    },
    CAUTION: {
      text: 'CAUTION',
      icon: AlertTriangle,
      classes: 'bg-amber-950/60 border-amber-800/60 text-amber-400',
      dotClass: 'bg-amber-400',
    },
    DANGER: {
      text: 'DANGER',
      icon: AlertOctagon,
      classes: 'bg-rose-950/60 border-rose-800/60 text-rose-400',
      dotClass: 'bg-rose-400',
    },
  }[normalizedLevel];

  const IconComponent = config.icon;
  const displayLabel = label || config.text;

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-mono font-bold tracking-wider uppercase transition-colors',
        config.classes,
        sizeStyles,
        className
      )}
      role="status"
      aria-label={`Maritime Risk Level: ${displayLabel}`}
    >
      <IconComponent className={cn(iconSizes, 'shrink-0')} aria-hidden="true" />
      <span>{displayLabel}</span>
      {subtext && (
        <span className="font-normal opacity-80 border-l border-current/30 pl-1.5 ml-0.5 normal-case">
          {subtext}
        </span>
      )}
    </span>
  );
}

export default RiskBadge;
