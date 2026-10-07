"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  X, Star, ExternalLink, ArrowRight, Sparkles,
} from "lucide-react";
import { CatalogMovie, MovieRecommendation, WatchProvidersData } from "@/types";
import { MoviePoster } from "./MoviePoster";
import { RecommendationExplanation } from "./RecommendationExplanation";
import { FeedbackControls } from "./FeedbackControls";
import { WatchlistButton } from "./WatchlistButton";
import { useWatchlist } from "@/utils/useWatchlist";

interface MovieModalProps {
  movie: CatalogMovie | MovieRecommendation | null;
  onClose: () => void;
  onFindMatches: (tmdbId: number, title: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

export const MovieModal: React.FC<MovieModalProps> = ({
  movie,
  onClose,
  onFindMatches,
  triggerRef,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Lock body scroll ──
  // NOTE: <MovieModal> is always mounted; the `if (!movie) return null` guard
  // is below the hooks. Gate on `!!movie` so the lock only applies while the
  // modal is actually visible, and always clean up to '' on change/unmount.
  useEffect(() => {
    if (movie) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [movie]);

  // ── Focus trap ──
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", trapFocus);
    // Auto-focus close button
    setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [trapFocus]);

  // ── Return focus on close ──
  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => (triggerRef?.current as HTMLElement | null)?.focus(), 50);
  }, [onClose, triggerRef]);

  if (!movie) return null;

  const title      = movie.title;
  const posterUrl  = "poster_url" in movie ? movie.poster_url : movie.poster;
  const backdropUrl = "backdrop_url" in movie ? movie.backdrop_url : movie.backdrop;
  const year       = "release_date" in movie ? movie.release_date.slice(0, 4) : movie.year;
  const rating     = "vote_average" in movie ? movie.vote_average : movie.rating;
  const genres     = movie.genres || [];
  const language   = "original_language" in movie ? movie.original_language : movie.languageCode;
  const tmdbId     = movie.tmdb_id;
  const overview   = movie.overview;

  const recData    = "hybrid_score" in movie ? (movie as MovieRecommendation) : null;

  const backdropSrc = backdropUrl
    ? (backdropUrl.startsWith("http")
        ? backdropUrl
        : `https://image.tmdb.org/t/p/w1280${backdropUrl.startsWith("/") ? backdropUrl : `/${backdropUrl}`}`)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* ── Scrim ── */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-[rgba(11,11,13,0.88)] backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* ── Modal container ── */}
      <div
        ref={modalRef}
        className="relative w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl overflow-hidden z-10 animate-scale-in shadow-modal"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        {/* ── Close button ── */}
        <button
          ref={closeRef}
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-[rgba(11,11,13,0.75)] border border-white/[0.1] text-[#A8A5A0] hover:text-white transition-colors"
          aria-label="Close movie details"
        >
          <X className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
        </button>

        {/* ── Backdrop banner ── */}
        <div className="relative w-full overflow-hidden" style={{ height: "220px" }}>
          {/* Backdrop image */}
          {backdropSrc ? (
            <img
              src={backdropSrc}
              alt=""
              aria-hidden="true"
              loading="eager"
              onError={e => { (e.target as HTMLElement).style.display = "none"; }}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          ) : (
            <div className="absolute inset-0 bg-surface-3" />
          )}
          {/* Gradient over backdrop */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background: "linear-gradient(to top, var(--surface-1) 0%, rgba(20,20,22,0.6) 60%, rgba(20,20,22,0.2) 100%)",
            }}
          />

          {/* Floating poster — desktop (absolute into banner, offset down) */}
          <div
            className="absolute bottom-0 left-6 translate-y-1/2 hidden sm:block z-10"
            style={{ width: "120px" }}
          >
            <div className="poster-box rounded-xl overflow-hidden shadow-poster border border-white/[0.12]" style={{ width: "120px", height: "180px" }}>
              <MoviePoster src={posterUrl} alt={`${title} poster`} priority />
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-5 pb-6 pt-4 sm:pl-[calc(120px+40px)] sm:pt-4 sm:pb-8">
          {/* Mobile-only poster (stacked layout) */}
          <div className="sm:hidden flex justify-center mb-4 -mt-16 relative z-10">
            <div className="poster-box rounded-xl overflow-hidden shadow-poster border border-white/[0.12]" style={{ width: "100px", height: "150px" }}>
              <MoviePoster src={posterUrl} alt={`${title} poster`} priority />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {language && (
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-surface-2 text-[#A8A5A0] border border-white/[0.08]">
                {language}
              </span>
            )}
            {year && <span className="text-[11px] text-[#5C5A58] font-mono">{year}</span>}
            {rating > 0 && (
              <span className="badge-gold">
                <Star className="w-2.5 h-2.5 fill-current" />
                {rating.toFixed(1)}
              </span>
            )}
            {recData?.is_personalized && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                🎯 Personalized for you
              </span>
            )}
            {recData && (
              <span className="badge-match ml-auto">
                {recData.match_percentage}% Match
              </span>
            )}
          </div>

          {/* Title + Watchlist */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2
              id="modal-title"
              className="font-display text-2xl sm:text-3xl font-black text-warm-white tracking-tight leading-tight flex-1"
              style={{ fontFamily: "Outfit, Inter, sans-serif" }}
            >
              {title}
            </h2>
            <div className="flex-shrink-0 mt-1">
              <WatchlistButton
                isInWatchlist={isInWatchlist(tmdbId)}
                onToggle={() => isInWatchlist(tmdbId) ? removeFromWatchlist(tmdbId) : addToWatchlist(movie)}
                size="md"
              />
            </div>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {genres.map((g, i) => (
                <span
                  key={i}
                  className="text-[11px] text-[#A8A5A0] px-2.5 py-0.5 rounded-full bg-surface-2 border border-white/[0.06]"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* AI score breakdown (recommendations) */}
          {recData && (
            <div className="mb-5 p-4 rounded-xl bg-surface-2 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-ai">AI Analysis</span>
                <span className="text-xs text-[#5C5A58]">
                  {recData.score_breakdown.is_cold_start ? "Content + Audience Match" : "Tripartite Hybrid Score"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: "Story DNA",        value: Math.round(recData.score_breakdown.content_similarity * 100),   color: "#D9A441" },
                  { label: "Audience Sentiment", value: Math.round(recData.score_breakdown.sentiment_score * 100),      color: "#9B7DD4" },
                  {
                    label: "Viewer Affinity",
                    value: recData.score_breakdown.collaborative_score !== null
                      ? Math.round(recData.score_breakdown.collaborative_score * 100) : null,
                    color: "#22D3EE",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#5C5A58] font-medium">{label}</span>
                      <span className="font-bold font-mono" style={{ color }}>
                        {value !== null ? `${value}%` : "—"}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${value ?? 0}%`, backgroundColor: color, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#5C5A58] leading-relaxed mb-3">
                {recData.score_breakdown.explanation}
              </p>

              {/* Explainable AI section */}
              <RecommendationExplanation
                explanationDetails={recData.explanation_details}
                scoreBreakdown={recData.score_breakdown}
                sourceTitle={title}
              />
            </div>
          )}
          {/* ── Watch Providers (IN Region) ── */}
          {recData && (() => {
            const wp: WatchProvidersData | null | undefined = recData.watch_providers;
            const hasAny = wp && ((wp.flatrate?.length ?? 0) > 0 || (wp.rent?.length ?? 0) > 0 || (wp.buy?.length ?? 0) > 0);
            const tmdbId = recData.tmdb_id;
            return (
              <div className="mb-5 p-4 rounded-xl bg-surface-2 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5A58]">🎬 Where to Watch (India)</h3>
                  {wp?.link && (
                    <a
                      href={wp.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#6366F1] hover:text-[#8B5CF6] transition-colors"
                      aria-label="View all streaming options on JustWatch"
                    >
                      JustWatch ↗
                    </a>
                  )}
                </div>
                {hasAny ? (
                  <div className="space-y-2.5">
                    {([
                      { key: "flatrate" as const, label: "Stream" },
                      { key: "rent"     as const, label: "Rent" },
                      { key: "buy"      as const, label: "Buy" },
                    ] as const).map(({ key, label }) => {
                      const items = wp?.[key];
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-[#5C5A58] font-mono w-10 flex-shrink-0">{label}</span>
                          {items.map((p) => (
                            <img
                              key={p.provider_id}
                              src={`https://image.tmdb.org/t/p/original${p.logo_path.startsWith("/") ? p.logo_path : "/" + p.logo_path}`}
                              alt={p.provider_name}
                              title={p.provider_name}
                              className="w-8 h-8 rounded-lg object-cover border border-white/[0.10] flex-shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                              loading="lazy"
                            />
                          ))}
                        </div>
                      );
                    })}
                    <p className="text-[9px] text-[#5C5A58] mt-1.5 leading-relaxed">
                      Streaming data provided by JustWatch
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-[#5C5A58]">
                      Not available to stream in India
                    </p>
                    <p className="text-[9px] text-[#5C5A58] leading-relaxed">
                      Streaming data provided by JustWatch
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5A58] mb-2">Synopsis</h3>
            <p className="text-sm text-[#A8A5A0] leading-relaxed mb-4">
              {overview || "No synopsis available."}
            </p>

            {/* User Feedback & Rating */}
            <div className="p-3.5 rounded-xl bg-surface-2 border border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A7875] block mb-2">
                Rate & Help FilmMatch Learn Your Taste
              </span>
              <FeedbackControls
                tmdbId={tmdbId}
                hybridScore={recData?.hybrid_score}
                isColdStart={recData?.score_breakdown?.is_cold_start}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
            <a
              href={`https://www.themoviedb.org/movie/${tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#5C5A58] hover:text-[#A8A5A0] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on TMDB
            </a>

            <div className="flex items-center gap-2.5">
              <Link
                href={`/movie/${tmdbId}`}
                className="btn-ghost px-3.5 py-2.5 rounded-xl text-sm min-h-[44px] flex items-center gap-1.5"
                onClick={handleClose}
              >
                Full Page
              </Link>
              <button
                onClick={handleClose}
                className="btn-ghost px-4 py-2.5 rounded-xl text-sm min-h-[44px]"
              >
                Close
              </button>
              <button
                onClick={() => { handleClose(); onFindMatches(tmdbId, title); }}
                className="btn-amber flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm min-h-[44px]"
                aria-label={`Find recommendations similar to ${title}`}
              >
                <span>Recommend Similar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
