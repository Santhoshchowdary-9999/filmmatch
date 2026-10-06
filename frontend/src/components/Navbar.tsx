"use client";

import React, { useState, useEffect } from "react";
import { Film, Flame, Compass, Sparkles, Menu, X, Search } from "lucide-react";

interface NavbarProps {
  onSearchFocus: () => void;
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
  onTrendingClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchFocus,
  onExploreClick,
  onHowItWorksClick,
  onTrendingClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    {
      label: "Discover",
      icon: Compass,
      onClick: onExploreClick,
      ariaLabel: "Explore cinema by language",
    },
    {
      label: "Trending",
      icon: Flame,
      onClick: onTrendingClick,
      ariaLabel: "View trending cinema",
    },
    {
      label: "How It Works",
      icon: Sparkles,
      onClick: onHowItWorksClick,
      ariaLabel: "Learn how the AI recommendation works",
    },
  ];

  return (
    <nav
      className={`sticky top-0 z-40 w-full glass-nav transition-all duration-300 ${
        scrolled ? "shadow-nav" : ""
      }`}
      aria-label="Primary navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">

          {/* ── Brand ── */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cinema-amber rounded-lg"
            aria-label="FilmMatch AI — scroll to top"
          >
            {/* Film reel icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-1 border border-white/[0.1] group-hover:border-cinema-gold/40 transition-colors">
              <Film className="w-4.5 h-4.5 text-cinema-gold" style={{ width: "18px", height: "18px" }} />
            </div>

            <div className="leading-none">
              <span className="font-display text-[1.05rem] sm:text-lg font-800 tracking-tight text-warm-white" style={{ fontWeight: 800 }}>
                FilmMatch{" "}
                <span className="text-cinema-amber" style={{ color: "var(--amber)" }}>AI</span>
              </span>
            </div>
          </button>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, onClick, ariaLabel }) => (
              <button
                key={label}
                onClick={onClick}
                aria-label={ariaLabel}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#A8A5A0] hover:text-[#F0EDE8] hover:bg-white/[0.05] transition-all duration-150"
              >
                {label}
              </button>
            ))}

            {/* Search shortcut */}
            <button
              onClick={onSearchFocus}
              className="ml-2 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-sm font-medium text-[#A8A5A0] hover:text-[#F0EDE8] transition-all duration-150"
              aria-label="Focus movie search"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#5C5A58] bg-surface-1 rounded border border-white/[0.08]">
                /
              </kbd>
            </button>
          </div>

          {/* ── Mobile controls ── */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onSearchFocus}
              className="p-2 rounded-lg border border-white/[0.08] text-[#A8A5A0] hover:text-[#F0EDE8]"
              aria-label="Search"
            >
              <Search className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-white/[0.08] text-[#A8A5A0] hover:text-[#F0EDE8]"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
              ) : (
                <Menu className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 pb-4 border-t border-white/[0.06] space-y-0.5 animate-fade-in">
            {navLinks.map(({ label, icon: Icon, onClick, ariaLabel }) => (
              <button
                key={label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onClick();
                }}
                aria-label={ariaLabel}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#A8A5A0] hover:text-[#F0EDE8] hover:bg-white/[0.05] transition-all duration-150"
              >
                <Icon className="w-4 h-4 text-[#5C5A58]" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
