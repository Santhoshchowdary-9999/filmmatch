"use client";

import React from "react";
import { Sparkles, Layers, MessageSquareText, Users } from "lucide-react";
import { SearchBar } from "./SearchBar";

interface HeroProps {
  onSearchMovie: (tmdbId: number, title: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  isSubmitting?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ onSearchMovie, searchRef, isSubmitting = false }) => {
  const scrollToPillar = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = `/#${id}`;
    }
  };

  return (
    <div className="relative pt-8 pb-8 md:pt-12 md:pb-12">
      {/* Cinematic Ambient Glow Background (isolated to prevent clipping children) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[320px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/15 to-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-0 right-10 w-72 h-72 bg-violet-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-cyan-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surface-2/90 border border-indigo-500/30 text-xs font-semibold text-indigo-300 shadow-glow-indigo mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Explainable Hybrid Recommendation Intelligence</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white font-sans max-w-4xl mx-auto leading-[1.12]">
          FilmMatch AI helps you discover your{" "}
          <span className="gradient-text-accent">
            next favourite movie.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-gray-300/90 max-w-2xl mx-auto font-normal leading-relaxed">
          Search any movie you love and get 10 personalized recommendations powered by story, audience sentiment, and viewer preferences.
        </p>

        {/* Primary Search Container */}
        <div className="mt-6 sm:mt-8 mb-5 max-w-2xl mx-auto">
          <SearchBar onSelectMovie={onSearchMovie} inputRef={searchRef} isSubmitting={isSubmitting} />
        </div>

        {/* Clickable 50/20/30 Weight Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs text-gray-300 pt-1">
          <button
            onClick={() => scrollToPillar("pillar-story")}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-surface-1/90 hover:bg-indigo-600/20 border border-white/[0.08] hover:border-indigo-500/50 hover:text-white transition-all duration-200 cursor-pointer group shadow-sm"
            aria-label="Learn about 50% Story & Genre weighting"
          >
            <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span><strong className="text-white">50%</strong> Story & Genre</span>
          </button>

          <button
            onClick={() => scrollToPillar("pillar-sentiment")}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-surface-1/90 hover:bg-violet-600/20 border border-white/[0.08] hover:border-violet-500/50 hover:text-white transition-all duration-200 cursor-pointer group shadow-sm"
            aria-label="Learn about 20% Audience Sentiment weighting"
          >
            <MessageSquareText className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
            <span><strong className="text-white">20%</strong> Audience Sentiment</span>
          </button>

          <button
            onClick={() => scrollToPillar("pillar-collab")}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-surface-1/90 hover:bg-cyan-600/20 border border-white/[0.08] hover:border-cyan-500/50 hover:text-white transition-all duration-200 cursor-pointer group shadow-sm"
            aria-label="Learn about 30% Viewer Preferences weighting"
          >
            <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span><strong className="text-white">30%</strong> Viewer Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
