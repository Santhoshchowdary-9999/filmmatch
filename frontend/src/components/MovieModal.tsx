"use client";

import React, { useEffect, useRef } from "react";
import { X, Star, Sparkles, MessageSquareText, Layers, Users, ExternalLink, ArrowRight, Film, Heart } from "lucide-react";
import { CatalogMovie, MovieRecommendation } from "@/types";
import { MoviePoster } from "./MoviePoster";

interface MovieModalProps {
  movie: CatalogMovie | MovieRecommendation | null;
  onClose: () => void;
  onFindMatches: (tmdbId: number, title: string) => void;
}

export const MovieModal: React.FC<MovieModalProps> = ({
  movie,
  onClose,
  onFindMatches,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!movie) return null;

  const title = movie.title;
  const posterUrl = "poster_url" in movie ? movie.poster_url : movie.poster;
  const backdropUrl = "backdrop_url" in movie ? movie.backdrop_url : movie.backdrop;
  const year = "release_date" in movie ? movie.release_date.slice(0, 4) : movie.year;
  const rating = "vote_average" in movie ? movie.vote_average : movie.rating;
  const genres = movie.genres || [];
  const language = "original_language" in movie ? movie.original_language : movie.languageCode;
  const tmdbId = movie.tmdb_id;
  const overview = movie.overview;

  const recData = "hybrid_score" in movie ? (movie as MovieRecommendation) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-modal-title"
    >
      {/* Backdrop blur overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-obsidian/85 backdrop-blur-md transition-opacity"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl rounded-3xl bg-surface-1 border border-white/[0.12] shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-obsidian/85 hover:bg-obsidian text-gray-300 hover:text-white border border-white/[0.12] transition-colors focus:ring-2 focus:ring-indigo-400"
          aria-label="Close movie details dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Backdrop Banner */}
        <div className="relative h-48 sm:h-64 w-full bg-surface-3 overflow-hidden">
          {backdropUrl && (
            <img
              src={backdropUrl.startsWith("http") ? backdropUrl : `https://image.tmdb.org/t/p/w1280${backdropUrl.startsWith("/") ? backdropUrl : `/${backdropUrl}`}`}
              alt={title}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
              className="w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/40 to-transparent" />
        </div>

        {/* Content Body */}
        <div className="relative px-6 pb-8 pt-0 -mt-20">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Floating Poster */}
            <div className="w-32 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/[0.15] bg-surface-3">
              <MoviePoster
                src={posterUrl}
                alt={title}
                priority={true}
              />
            </div>

            {/* Header Meta */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {language}
                </span>
                {year && (
                  <span className="text-xs font-semibold text-gray-300 font-mono">
                    {year}
                  </span>
                )}
                {rating > 0 && (
                  <div className="flex items-center space-x-1 text-cinema-gold text-xs font-bold px-2 py-0.5 rounded-md bg-cinema-gold/10 border border-cinema-gold/30">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{rating.toFixed(1)} TMDB</span>
                  </div>
                )}
              </div>

              <h2 id="movie-modal-title" className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
                {title}
              </h2>

              {genres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2.5">
                  {genres.map((g, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-gray-300 px-2.5 py-0.5 rounded-full bg-surface-2 border border-white/[0.06]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Explainable Recommendation Breakdown (if opened from recommendation) */}
          {recData && (
            <div className="mt-6 p-5 rounded-2xl bg-surface-2/95 border border-indigo-500/30 shadow-glow-card">
              <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-white">
                      {recData.match_percentage}% Overall Match Score
                    </span>
                    <p className="text-[11px] text-gray-400">
                      {recData.score_breakdown.is_cold_start ? "New Release / Content + Audience Match" : "Tripartite Hybrid Precision"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Pillars Friendly Sub-Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400 font-medium">Story & Genre</span>
                    <span className="text-indigo-300 font-bold font-mono">
                      {Math.round(recData.score_breakdown.content_similarity * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                      style={{ width: `${Math.round(recData.score_breakdown.content_similarity * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400 font-medium">Audience Sentiment</span>
                    <span className="text-violet-300 font-bold font-mono">
                      {Math.round(recData.score_breakdown.sentiment_score * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                      style={{ width: `${Math.round(recData.score_breakdown.sentiment_score * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-1 border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400 font-medium">Viewer Affinity</span>
                    <span className="text-cyan-300 font-bold font-mono">
                      {recData.score_breakdown.collaborative_score !== null
                        ? `${Math.round(recData.score_breakdown.collaborative_score * 100)}%`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                      style={{ width: `${recData.score_breakdown.collaborative_score !== null ? Math.round(recData.score_breakdown.collaborative_score * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Explainability Tagline */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-gray-200 leading-relaxed">
                💡 <strong className="text-indigo-300">Why this was recommended:</strong> {recData.score_breakdown.explanation}
              </div>
            </div>
          )}

          {/* Plot Synopsis */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Plot Synopsis
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed font-normal">
              {overview || "No overview available for this movie."}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <a
              href={`https://www.themoviedb.org/movie/${tmdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <span>View on TMDB</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-gray-300 hover:text-white text-sm font-semibold transition-colors min-h-[44px]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  onFindMatches(tmdbId, title);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-glow-indigo flex items-center space-x-2 transition-all min-h-[44px]"
              >
                <span>Find Matches for this Film</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
