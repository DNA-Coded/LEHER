import React, { useState } from 'react';
import { Menu, X, Compass, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppNavRoute = 'home' | 'about' | 'explore';

interface AppNavbarProps {
  currentRoute?: AppNavRoute;
  onNavigate?: (route: AppNavRoute) => void;
  className?: string;
}

export function AppNavbar({
  currentRoute = 'home',
  onNavigate,
  className,
}: AppNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLinkClick = (route: AppNavRoute, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);

    if (onNavigate) {
      onNavigate(route);
      return;
    }

    if (route === 'home') {
      window.location.href = '/';
    } else if (route === 'about') {
      window.location.href = '/about';
    } else if (route === 'explore') {
      window.location.href = '/operations';
    }
  };

  const navLinks: { route: AppNavRoute; label: string }[] = [
    { route: 'home', label: 'Home' },
    { route: 'about', label: 'About' },
    { route: 'explore', label: 'Platform' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-16 glass border-b transition-colors',
        className
      )}
      style={{ borderColor: 'rgb(var(--hairline))' }}
      aria-label="Main Navigation"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={(e) => handleLinkClick('home', e)}
          className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          aria-label="Leher Home"
        >
          <img
            src="/logo.png"
            alt="Leher"
            className="h-8 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 8px rgb(var(--brand) / 0.4))' }}
          />
          <span
            className="font-display text-xl tracking-tight"
            style={{ color: 'rgb(var(--ink))' }}
          >
            Leher
          </span>
          <span
            className="hidden sm:inline text-xs font-mono pl-3 border-l"
            style={{ color: 'rgb(var(--ink-faint))', borderColor: 'rgb(var(--hairline))' }}
          >
            Maritime Safety
          </span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          {navLinks.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={(e) => handleLinkClick(item.route, e)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer relative',
                  isActive
                    ? 'text-ink'
                    : 'text-ink-muted hover:text-ink'
                )}
                style={{
                  color: isActive ? 'rgb(var(--ink))' : undefined,
                  backgroundColor: isActive ? 'rgb(var(--elevated))' : undefined,
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px rounded-full"
                    style={{ background: 'rgb(var(--brand))' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* CTA + Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => handleLinkClick('explore', e)}
            className="hidden sm:inline-flex items-center gap-2 py-2 px-5 rounded-md brand-fill glow-brand text-black font-semibold text-xs transition-all cursor-pointer focus:outline-none hover-lift"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 rounded-md border text-white flex items-center justify-center cursor-pointer transition-colors focus:outline-none"
            style={{ backgroundColor: 'rgb(var(--elevated))', borderColor: 'rgb(var(--hairline))' }}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 z-40 glass border-b p-6 flex flex-col gap-6 animate-fade-in"
          style={{ borderColor: 'rgb(var(--hairline))' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="eyebrow pb-3 border-b flex justify-between items-center"
            style={{ borderColor: 'rgb(var(--hairline))' }}
          >
            <span>Leher Navigation</span>
            <span style={{ color: 'rgb(var(--brand))' }}>Maritime Safety Platform</span>
          </div>

          <div className="flex flex-col gap-2">
            {navLinks.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={(e) => handleLinkClick(item.route, e)}
                  className="text-left py-3 px-4 rounded-md text-base font-medium transition-all flex items-center justify-between cursor-pointer border"
                  style={{
                    backgroundColor: isActive ? 'rgb(var(--elevated))' : 'rgb(var(--surface))',
                    color: isActive ? 'rgb(var(--ink))' : 'rgb(var(--ink-muted))',
                    borderColor: 'rgb(var(--hairline))',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-4 h-4 opacity-60" />
                </button>
              );
            })}
          </div>

          <button
            onClick={(e) => handleLinkClick('explore', e)}
            className="w-full py-3.5 px-4 rounded-md brand-fill glow-brand text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Launch Platform</span>
          </button>
        </div>
      )}
    </nav>
  );
}

export default AppNavbar;
