"use client";

import React, { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar";
import { getTmdbBackdropUrl } from "@/utils/image";

interface HeroProps {
  onSearchMovie: (tmdbId: number, title: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  isSubmitting?: boolean;
  /**
   * backdrop_path from the #1 trending movie already fetched by the page.
   * When provided this is used as the hero backdrop — no new API call.
   * Falls back to the curated list when null / undefined.
   */
  trendingBackdropPath?: string | null;
}



export const Hero: React.FC<HeroProps> = ({
  onSearchMovie,
  searchRef,
  isSubmitting = false,
  trendingBackdropPath,
}) => {
  const [backdropSrc, setBackdropSrc] = useState<string | null>(null);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  useEffect(() => {
    if (trendingBackdropPath) {
      // Use the #1 trending movie's backdrop — already fetched by the page, no new API call.
      setBackdropSrc(getTmdbBackdropUrl(trendingBackdropPath, "w1280"));
    } else {
      // No trending backdrop available — spec requires flat dark background fallback.
      // Do not load any image; body background-color (#0B0B0D) shows through.
      setBackdropSrc(null);
    }
    // Reset loaded state whenever source changes so the fade-in replays.
    setBackdropLoaded(false);
  }, [trendingBackdropPath]);

  return (
    <section className="relative w-full overflow-hidden" aria-label="Hero — search for movies">

      {/* ── Backdrop image ──
          z-index -20: lowest layer, behind everything. object-fit: cover so it
          crops and repositions naturally on all viewport sizes (mobile included).
          Fades in once loaded; flat dark bg shows while image resolves.
          No broken-image icon: onError leaves backdropLoaded false → opacity-0. */}
      <div className="absolute inset-0 -z-20">
        {backdropSrc && (
          <img
            src={backdropSrc}
            alt=""
            aria-hidden="true"
            loading="eager"
            onLoad={() => setBackdropLoaded(true)}
            onError={() => setBackdropLoaded(false)}
            className={`w-full h-full object-cover object-center transition-opacity duration-700 ${
              backdropLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>

      {/* ── Dark gradient over backdrop ── (z-index -10)
          Keeps text/search fully readable; fades backdrop into near-black bg. */}
      <div className="absolute inset-0 -z-10 hero-gradient" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 hero-vignette" aria-hidden="true" />

      {/* Side vignettes */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to right, rgba(11,11,13,0.6) 0%, transparent 25%, transparent 75%, rgba(11,11,13,0.6) 100%)",
        }}
      />

      {/* ── Ambient violet glow ──
          Sits above the backdrop/gradients (z-index -9) but below the global
          grain overlay (body::before z-index 1) and all content (z-index auto).
          Muted violet, not gold — gold is reserved for ratings/primary actions. */}
      <div
        className="absolute inset-0 hero-ambient-glow pointer-events-none"
        style={{ zIndex: -9 }}
        aria-hidden="true"
      />

      {/* ── Hero content ── */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 md:pt-36 md:pb-24 flex flex-col items-center text-center">

        {/* Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-[rgba(124,92,191,0.35)] bg-[rgba(124,92,191,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-light)]" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-ai" style={{ color: "var(--violet-light)" }}>
            AI-Powered Discovery
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-warm-white mb-4 animate-fade-up" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
          Find your next<br />
          <span style={{ color: "var(--amber)" }}>unforgettable</span> film.
        </h1>

        {/* Sub-headline */}
        <p className="text-base sm:text-lg text-[#A8A5A0] font-normal mb-10 max-w-lg animate-fade-up" style={{ animationDelay: "60ms" }}>
          Start with a movie you love.
        </p>

        {/* ── Search bar ── */}
        <div className="w-full max-w-2xl animate-fade-up" style={{ animationDelay: "100ms" }}>
          <SearchBar
            onSelectMovie={onSearchMovie}
            inputRef={searchRef}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Three score-pillar mini-labels */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#5C5A58] font-medium animate-fade-up" style={{ animationDelay: "160ms" }}>
          <span>Story DNA · 50%</span>
          <span className="w-1 h-1 rounded-full bg-[#3C3A38]" aria-hidden="true" />
          <span>Audience Sentiment · 20%</span>
          <span className="w-1 h-1 rounded-full bg-[#3C3A38]" aria-hidden="true" />
          <span>Viewer Affinity · 30%</span>
        </div>
      </div>
    </section>
  );
};
