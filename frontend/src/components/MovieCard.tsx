"use client";

import React, { useState } from "react";
import { Star, ArrowRight, Loader2, Trophy } from "lucide-react";
import { CatalogMovie, MovieRecommendation } from "@/types";
import { MoviePoster } from "./MoviePoster";

interface MovieCardProps {
  movie: CatalogMovie | MovieRecommendation;
  isRecommendation?: boolean;
  rankIndex?: number;
  isLoading?: boolean;
  onSelect: () => void;
  onFindMatches?: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  isRecommendation = false,
  rankIndex,
  isLoading = false,
  onSelect,
  onFindMatches,
}) => {
  const [hovered, setHovered] = useState(false);

  const title    = movie.title || "Unknown Title";
  const posterUrl = "poster_url" in movie ? movie.poster_url : movie.poster;
  const year     = "release_date" in movie ? movie.release_date.slice(0, 4) : movie.year;
  const rating   = "vote_average" in movie ? movie.vote_average : movie.rating;
  const genres   = movie.genres || [];

  const recData  = isRecommendation && "hybrid_score" in movie ? (movie as MovieRecommendation) : null;
  const isTopRank = rankIndex === 1;

  // Friendly explanation label
  const getExplanation = () => {
    if (!recData) return null;
    const bd = recData.score_breakdown;
    if (bd.is_cold_start)                                          return "New Release · Content Match";
    if (bd.content_similarity >= 0.70 && bd.sentiment_score >= 0.70) return "Story & Audience Favourite";
    if (bd.collaborative_score && bd.collaborative_score >= 0.70)   return "Viewers Also Loved This";
    if (bd.content_similarity >= 0.70)                              return "Strong Story & Genre Match";
    return "Balanced Hybrid Match";
  };

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex flex-col rounded-xl overflow-hidden cursor-pointer card-cinema focus-within:ring-2 focus-within:ring-[var(--amber)] ${
        isTopRank ? "ring-1 ring-[rgba(240,180,41,0.3)]" : ""
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
      }}
      aria-label={`View details for ${title}${rankIndex ? `, ranked #${rankIndex}` : ""}`}
    >
      {/* ── Poster (fixed 2:3) ── */}
      <div className="poster-box">
        <MoviePoster
          src={posterUrl}
          alt={`${title} movie poster`}
          className="w-full h-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.04]"
        />

        {/* Gradient fade to card body */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
          aria-hidden="true"
          style={{
            background: "linear-gradient(to top, rgba(20,20,22,1) 0%, rgba(20,20,22,0.5) 40%, transparent 100%)",
          }}
        />

        {/* ── Top badges ── */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          {/* Rank badge */}
          {rankIndex !== undefined && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${
                isTopRank
                  ? "bg-[var(--amber)] text-[#0B0B0D]"
                  : "bg-surface-1/90 text-[#A8A5A0] border border-white/[0.08]"
              }`}
            >
              {isTopRank && <Trophy className="w-2.5 h-2.5 fill-current" />}
              #{rankIndex}
            </div>
          )}

          {/* Match % for recommendations */}
          {recData && (
            <div className="badge-match ml-auto">
              {recData.match_percentage}%
            </div>
          )}

          {/* Star rating for catalog cards */}
          {!recData && rating > 0 && (
            <div className="badge-gold ml-auto">
              <Star className="w-2.5 h-2.5 fill-current" />
              {rating.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="flex-1 p-3 flex flex-col gap-1.5">
        <h3 className="text-sm font-bold text-warm-white leading-snug line-clamp-1 group-hover:text-[var(--amber)] transition-colors duration-150">
          {title}
        </h3>

        <div className="flex items-center gap-1.5 text-[11px] text-[#5C5A58]">
          {year && <span className="font-mono">{year}</span>}
          {genres[0] && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{genres[0]}</span>
            </>
          )}
        </div>

        {/* Score breakdown for recommendations (subtle, below the fold) */}
        {recData && (
          <div className="mt-1 pt-2 border-t border-white/[0.05] space-y-1">
            {/* Explanation label */}
            <p className="text-[10px] text-[#9B7DD4] font-medium line-clamp-1">
              {getExplanation()}
            </p>

            {/* Score mini-row */}
            <div className="flex items-center gap-2 text-[10px] text-[#5C5A58] font-mono">
              <span title="Story DNA">
                S <span className="text-[#A8A5A0]">{Math.round(recData.score_breakdown.content_similarity * 100)}%</span>
              </span>
              <span aria-hidden="true">·</span>
              <span title="Audience Sentiment">
                A <span className="text-[#A8A5A0]">{Math.round(recData.score_breakdown.sentiment_score * 100)}%</span>
              </span>
              <span aria-hidden="true">·</span>
              <span title="Viewer Affinity">
                V{" "}
                <span className="text-[#A8A5A0]">
                  {recData.score_breakdown.collaborative_score !== null
                    ? `${Math.round(recData.score_breakdown.collaborative_score * 100)}%`
                    : "—"}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Flatrate provider logos (recommendation view only, max 3) */}
        {recData && (() => {
          const flatrate = recData.watch_providers?.flatrate;
          if (!flatrate || flatrate.length === 0) return null;
          return (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {flatrate.slice(0, 3).map((p) => (
                <img
                  key={p.provider_id}
                  src={`https://image.tmdb.org/t/p/original${p.logo_path.startsWith("/") ? p.logo_path : "/" + p.logo_path}`}
                  alt={p.provider_name}
                  title={p.provider_name}
                  className="w-5 h-5 rounded object-cover border border-white/[0.10] flex-shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                  loading="lazy"
                />
              ))}
              {flatrate.length > 3 && (
                <span className="text-[9px] text-[#5C5A58]">+{flatrate.length - 3}</span>
              )}
            </div>
          );
        })()}
        {onFindMatches && !recData && (
          <button
            onClick={e => { e.stopPropagation(); if (!isLoading) onFindMatches(); }}
            disabled={isLoading}
            className="mt-1.5 w-full py-1.5 rounded-lg btn-ghost text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label={`Find matches for ${title}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Matching…</span>
              </>
            ) : (
              <>
                <span>Get Matches</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
};
