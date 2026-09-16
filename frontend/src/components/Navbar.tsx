"use client";

import React, { useState } from "react";
import { Film, Search, Sparkles, Compass, Menu, X, Flame } from "lucide-react";

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

  return (
    <nav className="sticky top-0 z-40 w-full glass-nav transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[1.5px] shadow-glow-indigo group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center">
                <Film className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                  FilmMatch<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  HYBRID ML
                </span>
              </div>
              <p className="text-[10px] text-gray-400 hidden sm:block tracking-wide font-medium">
                Content • Sentiment • Collaborative
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={onTrendingClick}
              className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] px-3 py-2 rounded-xl transition-all duration-150"
              aria-label="Navigate to Trending Cinema"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Trending</span>
            </button>

            <button
              onClick={onExploreClick}
              className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] px-3 py-2 rounded-xl transition-all duration-150"
              aria-label="Navigate to Explore Cinema by Language"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Explore Cinema</span>
            </button>

            <button
              onClick={onHowItWorksClick}
              className="flex items-center space-x-1.5 text-xs sm:text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/[0.06] px-3 py-2 rounded-xl transition-all duration-150"
              aria-label="Navigate to How It Works"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>How It Works</span>
            </button>

            {/* Quick Search Action */}
            <button
              onClick={onSearchFocus}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/[0.08] hover:border-indigo-500/40 text-xs sm:text-sm font-semibold text-gray-200 hover:text-white transition-all duration-150 shadow-sm"
              aria-label="Search movies"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span>Search Movie</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-surface-1 rounded border border-white/[0.08]">
                /
              </kbd>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onSearchFocus}
              className="p-2 rounded-xl bg-surface-2 border border-white/[0.08] text-indigo-400"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-surface-2 border border-white/[0.08] text-gray-300 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/[0.08] space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onTrendingClick();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-200 hover:bg-white/[0.06]"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Trending Cinema</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onExploreClick();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-200 hover:bg-white/[0.06]"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Explore by Language</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onHowItWorksClick();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-200 hover:bg-white/[0.06]"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>How It Works</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
