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

    // Default fallback to browser navigation
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
    { route: 'about', label: 'About Leher' },
    { route: 'explore', label: 'Explore / Platform' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40 h-20 bg-[#080808]/90 backdrop-blur-md border-b border-[#1c1c1c] transition-colors',
        className
      )}
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-full flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={(e) => handleLinkClick('home', e)}
          className="flex items-center gap-3.5 cursor-pointer group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg p-1"
          aria-label="Leher Home"
        >
          <div className="relative h-9 sm:h-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <img
              src="/logo.png"
              alt="Leher Logo"
              title="Leher"
              className="h-8 sm:h-9 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(56,189,248,0.35)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-2xl tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              Leher
            </span>
            <span className="text-xs font-mono text-[#888888] border-l border-[#262626] pl-3 hidden sm:inline">
              Maritime Safety &amp; Hazards
            </span>
          </div>
        </button>

        {/* Desktop Primary Navigation Links */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2 text-sm font-medium">
          {navLinks.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={(e) => handleLinkClick(item.route, e)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer relative',
                  isActive
                    ? 'text-white bg-white/[0.08] border border-white/15 font-semibold shadow-sm'
                    : 'text-[#888888] hover:text-white hover:bg-white/[0.04]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Primary CTA & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => handleLinkClick('explore', e)}
            className="hidden sm:inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-[#141414] hover:bg-[#222222] border border-[#262626] text-white flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-20 z-40 bg-[#080808]/98 backdrop-blur-2xl border-b border-[#222222] p-6 flex flex-col justify-between animate-in fade-in slide-in-from-top-4 duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="space-y-4 max-w-sm mx-auto w-full pt-4">
            <div className="text-xs font-mono uppercase text-[#888888] tracking-widest border-b border-[#222222] pb-3 flex justify-between items-center">
              <span>Leher Navigation</span>
              <span className="text-cyan-400 font-mono text-[10px]">SIH 2026</span>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              {navLinks.map((item) => {
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={(e) => handleLinkClick(item.route, e)}
                    className={cn(
                      'text-left py-3 px-4 rounded-xl text-base font-medium transition-all flex items-center justify-between cursor-pointer border',
                      isActive
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60 font-semibold'
                        : 'bg-[#121212] text-[#cccccc] hover:text-white hover:bg-[#181818] border-[#222222]'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-60" />
                  </button>
                );
              })}
            </div>

            <div className="pt-6">
              <button
                onClick={(e) => handleLinkClick('explore', e)}
                className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Launch Operational Platform</span>
              </button>
            </div>
          </div>

          <div className="max-w-sm mx-auto w-full text-center text-xs font-mono text-[#666666] pt-4 border-t border-[#181818] flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Leher Logo" title="Leher" className="h-4 w-auto object-contain opacity-70" />
            <span>Leher • INCOIS Maritime Safety</span>
          </div>
        </div>
      )}
    </nav>
  );
}

export default AppNavbar;
