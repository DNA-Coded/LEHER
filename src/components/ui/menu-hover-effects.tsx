import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface NavMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface NavMenuProps {
  items?: (string | NavMenuItem)[];
  className?: string;
  onItemClick?: (item: string | NavMenuItem) => void;
  hoverColor?: "sky" | "white" | "default";
}

const defaultMenuItems = [
  "Home",
  "About",
  "Services",
  "Team",
  "Portfolio",
  "Contact",
];

export function NavMenu({
  items = defaultMenuItems,
  className,
  onItemClick,
}: NavMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const formattedItems: NavMenuItem[] = items.map((item) =>
    typeof item === "string" ? { label: item, href: "#" } : item
  );

  return (
    <nav className={cn("relative w-full", className)}>
      {/* Mobile menu toggle button - only visible on small screens */}
      <button
        onClick={toggleMenu}
        className="md:hidden absolute top-4 right-4 z-20 p-2 cursor-pointer"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
      >
        <div
          className={cn(
            "w-6 h-0.5 bg-white mb-1.5 transition-transform duration-300",
            isMenuOpen && "transform rotate-45 translate-y-2 bg-sky-400"
          )}
        />
        <div
          className={cn(
            "w-6 h-0.5 bg-white mb-1.5 transition-opacity duration-300",
            isMenuOpen && "opacity-0"
          )}
        />
        <div
          className={cn(
            "w-6 h-0.5 bg-white transition-transform duration-300",
            isMenuOpen && "transform -rotate-45 -translate-y-2 bg-sky-400"
          )}
        />
      </button>

      {/* Menu container - adapts to screen size */}
      <div
        className={cn(
          "flex items-center justify-center w-full h-full md:block md:h-auto",
          isMenuOpen ? "block" : "hidden md:block"
        )}
      >
        <ul
          className={cn(
            "flex flex-col items-center space-y-6 md:flex-row md:space-y-0 md:space-x-4 md:justify-center lg:space-x-8"
          )}
        >
          {formattedItems.map((item) => (
            <li key={item.label} className="list-none">
              <a
                href={item.href || "#"}
                className="relative inline-block group cursor-pointer"
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                  if (onItemClick) {
                    onItemClick(item);
                  }
                  setIsMenuOpen(false);
                }}
              >
                {/* Link text */}
                <span
                  className="
                    relative z-10 block uppercase text-[#cccccc] 
                    font-sans font-semibold transition-colors duration-300 
                    group-hover:text-white
                    text-xl py-2 px-3
                    md:text-sm md:py-2 md:px-3
                    lg:text-base lg:py-2 lg:px-4
                    tracking-wider
                  "
                >
                  {item.label}
                </span>

                {/* Top & bottom border animation - Light Sky Blue */}
                <span
                  className="
                    absolute inset-0 border-t-2 border-b-2 border-sky-400
                    transform scale-y-[2] opacity-0 
                    transition-all duration-300 origin-center
                    group-hover:scale-y-100 group-hover:opacity-100
                    shadow-[0_0_12px_rgba(56,189,248,0.4)]
                  "
                />

                {/* Background fill animation - Light Sky Blue */}
                <span
                  className="
                    absolute top-[2px] left-0 w-full h-full bg-sky-500/20
                    transform scale-0 opacity-0
                    transition-all duration-300 origin-top
                    group-hover:scale-100 group-hover:opacity-100
                    backdrop-blur-sm
                  "
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/**
 * Atomic link component with the same menu hover effect (Light Sky Blue)
 * for direct embedding into existing navbars.
 */
export function MenuHoverLink({
  children,
  onClick,
  href = "#",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn("relative inline-block group cursor-pointer", className)}
    >
      {/* Link text */}
      <span
        className="
          relative z-10 block uppercase text-[#aaaaaa] 
          font-sans font-semibold transition-colors duration-300 
          group-hover:text-white
          text-xs md:text-sm py-1.5 px-3
          tracking-wider
        "
      >
        {children}
      </span>

      {/* Top & bottom border animation - Light Sky Blue */}
      <span
        className="
          absolute inset-0 border-t-2 border-b-2 border-sky-400
          transform scale-y-[2] opacity-0 
          transition-all duration-300 origin-center
          group-hover:scale-y-100 group-hover:opacity-100
          shadow-[0_0_12px_rgba(56,189,248,0.4)]
        "
      />

      {/* Background fill animation - Light Sky Blue */}
      <span
        className="
          absolute top-[2px] left-0 w-full h-full bg-sky-500/20
          transform scale-0 opacity-0
          transition-all duration-300 origin-top
          group-hover:scale-100 group-hover:opacity-100
          backdrop-blur-sm
        "
      />
    </a>
  );
}

export default NavMenu;
