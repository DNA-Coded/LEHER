import React, { useState, useEffect } from 'react';
import { Menu, X, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShinyButton } from '@/components/ui/shiny-button';

export type AppNavRoute = 'home' | 'about' | 'explore';

interface AppNavbarProps {
  currentRoute?: AppNavRoute;
  onNavigate?: (route: AppNavRoute) => void;
  className?: string;
}

interface NavItem {
  route: AppNavRoute;
  label: string;
  href: string;
}

export function AppNavbar({
  currentRoute = 'home',
  onNavigate,
  className,
}: AppNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [realTimeClock, setRealTimeClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        };
        const formatter = new Intl.DateTimeFormat('en-CA', options);
        setRealTimeClock(`${formatter.format(now)} IST`);
      } catch {
        setRealTimeClock(`${now.toLocaleTimeString()} IST`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const navLinks: NavItem[] = [
    { route: 'home', label: 'Home', href: '/' },
    { route: 'about', label: 'About Leher', href: '/about' },
    { route: 'explore', label: 'Explore / Platform', href: '/operations' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40 bg-[#080808]/80 backdrop-blur-md border-b border-[#1c1c1c] transition-colors',
        className
      )}
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={(e) => handleLinkClick('home', e)}
          className="flex items-center gap-3.5 cursor-pointer group text-left" 
        >
          <div className="relative w-10 h-10 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Leher Logo" 
              title="Leher"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" 
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
        </div>

        {/* Desktop Primary Navigation Links with Old Style Animated Sky-Blue Hover Effects */}
        <div className="hidden md:flex items-center gap-1 lg:gap-3 text-sm font-medium">
          {navLinks.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <a
                key={item.route}
                href={item.href}
                onClick={(e) => handleLinkClick(item.route, e)}
                className="relative inline-block group cursor-pointer whitespace-nowrap"
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Link text */}
                <span
                  className={cn(
                    "relative z-10 block uppercase font-sans font-semibold transition-colors duration-300 text-xs md:text-sm py-1.5 px-3 lg:px-4 tracking-wider whitespace-nowrap",
                    isActive ? "text-white" : "text-[#aaaaaa] group-hover:text-white"
                  )}
                >
                  {item.label}
                </span>

                {/* Top & bottom border animation - Light Sky Blue */}
                <span
                  className={cn(
                    "absolute inset-0 border-t-2 border-b-2 border-sky-400 transition-all duration-300 origin-center pointer-events-none",
                    isActive
                      ? "scale-y-100 opacity-100 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                      : "scale-y-[2] opacity-0 group-hover:scale-y-100 group-hover:opacity-100 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                  )}
                />

                {/* Background fill animation - Light Sky Blue */}
                <span
                  className={cn(
                    "absolute top-[2px] left-0 w-full h-[calc(100%-4px)] bg-sky-500/20 transition-all duration-300 origin-top backdrop-blur-sm pointer-events-none",
                    isActive
                      ? "scale-100 opacity-100"
                      : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  )}
                />
              </a>
            );
          })}
        </div>

        {/* Action CTA & Hamburger Menu with ShinyButton */}
        <div className="flex items-center gap-3">
          <ShinyButton 
            onClick={() => handleLinkClick('explore')}
            className="hidden sm:inline-flex items-center gap-2 py-2 px-5 text-xs font-semibold cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Launch Platform</span>
          </ShinyButton>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#222222] border border-[#262626] text-white flex items-center gap-2 cursor-pointer transition-all md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Hamburger Menu Overlay with Old Style numbers & operations drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-[#080808]/95 backdrop-blur-xl border-b border-[#222222] p-6 flex flex-col justify-between transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-6 max-w-xl mx-auto w-full pt-4">
            <div className="text-xs font-mono uppercase text-[#888888] tracking-widest border-b border-[#222222] pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-5 h-5 rounded-full object-contain" />
                <span>Operations Menu</span>
              </div>
              <span className="text-emerald-400 font-mono text-xs">{realTimeClock}</span>
            </div>
            <div className="flex flex-col gap-3 text-base sm:text-lg font-semibold text-[#cccccc]">
              {navLinks.map((item, idx) => {
                const isActive = currentRoute === item.route;
                return (
                  <button 
                    key={item.route}
                    onClick={(e) => handleLinkClick(item.route, e)} 
                    className={cn(
                      "text-left py-2.5 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group shadow-sm",
                      isActive
                        ? "bg-[#0c1e36] border-sky-400 text-sky-200"
                        : "bg-[#121212] hover:bg-[#0c1e36] hover:border-sky-400 hover:text-sky-200 border-[#222222]"
                    )}
                  >
                    <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                    <span className="text-xs font-mono text-[#666666] group-hover:text-sky-400">0{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4">
              <ShinyButton 
                onClick={(e) => handleLinkClick('explore', e)} 
                className="w-full py-3 text-xs font-bold"
              >
                Open Operations Platform
              </ShinyButton>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full text-center text-xs font-mono text-[#666666] pt-4 border-t border-[#181818] flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Leher Logo" title="Leher" className="w-4 h-4 object-contain opacity-80" />
            <span>Leher Maritime Safety &amp; Hazard Intelligence • INCOIS</span>
          </div>
        </div>
      )}
    </nav>
  );
}

export default AppNavbar;
