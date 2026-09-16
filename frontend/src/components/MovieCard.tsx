"use client";

import React, { useState } from "react";
import { Star, Sparkles, ArrowRight, Trophy, Loader2 } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);

  const title = movie.title || "Unknown Title";
  const posterUrl = "poster_url" in movie ? movie.poster_url : movie.poster;
  const year = "release_date" in movie ? movie.release_date.slice(0, 4) : movie.year;
  const rating = "vote_average" in movie ? movie.vote_average : movie.rating;
  const genres = movie.genres || [];
  const language = "original_language" in movie ? movie.original_language : movie.languageCode;

  // Recommendation specifics
  const recData = isRecommendation && "hybrid_score" in movie ? (movie as MovieRecommendation) : null;
  const isTopRank = rankIndex === 1;

  // Format understandable explanation labels
  const getFriendlyExplanation = () => {
    if (!recData) return null;
    const bd = recData.score_breakdown;
    if (bd.is_cold_start) {
      return "New Release / Content + Audience Match";
    }
    if (bd.content_similarity >= 0.70 && bd.sentiment_score >= 0.70) {
      return "Story & Audience Favorite";
    }
    if (bd.collaborative_score && bd.collaborative_score >= 0.70) {
      return "Similar Viewers Highly Enjoyed";
    }
    if (bd.content_similarity >= 0.70) {
      return "Story, Cast & Genre Match";
    }
    return "Balanced Hybrid Match";
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-surface-1 border transition-all duration-200 ${
        isTopRank
          ? "border-indigo-500/50 shadow-glow-indigo hover:border-indigo-400 hover:shadow-glow-hover"
          : "border-white/[0.08] hover:border-indigo-500/40 hover:shadow-glow-card"
      } hover:-translate-y-1.5 cursor-pointer will-change-transform`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`View details for ${title}`}
    >
      {/* Poster Media Box with 2:3 Aspect Ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-3">
        <MoviePoster
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* Ambient Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-black/40 opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {/* Rank Badge for Recommendations */}
          {rankIndex !== undefined && (
            <div
              className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-black tracking-wider ${
                isTopRank
                  ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-glow-gold border border-amber-300/40"
                  : "bg-surface-1/90 text-gray-200 border border-white/[0.1]"
              }`}
            >
              {isTopRank && <Trophy className="w-3 h-3 text-amber-300 fill-current" />}
              <span>#{rankIndex}</span>
            </div>
          )}

          {/* Match Score Badge */}
          {recData && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-600/90 text-white text-xs font-black shadow-glow-indigo border border-indigo-400/40 ml-auto">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>{recData.match_percentage}% Match</span>
            </div>
          )}

          {/* TMDB Rating for standard catalog */}
          {!recData && rating > 0 && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-obsidian/85 text-cinema-gold text-xs font-bold border border-cinema-gold/30 ml-auto">
              <Star className="w-3 h-3 fill-current" />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Bottom Language & Year Tags */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold text-gray-300 pointer-events-none z-10">
          <span className="uppercase px-1.5 py-0.5 rounded bg-obsidian/80 text-indigo-300 border border-white/[0.08]">
            {language}
          </span>
          {year && <span className="text-gray-300 font-mono drop-shadow">{year}</span>}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3.5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors font-sans">
            {title}
          </h3>

          {/* Genres */}
          <div className="flex items-center space-x-1.5 mt-1 overflow-hidden">
            {genres.slice(0, 2).map((g, idx) => (
              <span key={idx} className="text-[10px] text-gray-400 truncate">
                {idx > 0 ? "• " : ""}{g}
              </span>
            ))}
          </div>
        </div>

        {/* Explainability Tag / Breakdown for Recommendations */}
        {recData && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1.5">
            {/* Friendly Explainability Label */}
            <div className="flex items-center space-x-1.5 text-[11px] text-indigo-300 font-medium line-clamp-1">
              <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{getFriendlyExplanation()}</span>
            </div>

            {/* Sub-Score Bars (Progressive disclosure) */}
            <div className="grid grid-cols-3 gap-1 pt-1 text-[9px] font-mono text-gray-400 text-center">
              <div className="p-1 rounded bg-surface-2 border border-white/[0.04]">
                <div className="text-[8px] uppercase text-gray-500 font-bold">Story</div>
                <div className="text-indigo-300 font-bold">
                  {Math.round(recData.score_breakdown.content_similarity * 100)}%
                </div>
              </div>

              <div className="p-1 rounded bg-surface-2 border border-white/[0.04]">
                <div className="text-[8px] uppercase text-gray-500 font-bold">Audience</div>
                <div className="text-violet-300 font-bold">
                  {Math.round(recData.score_breakdown.sentiment_score * 100)}%
                </div>
              </div>

              <div className="p-1 rounded bg-surface-2 border border-white/[0.04]">
                <div className="text-[8px] uppercase text-gray-500 font-bold">Affinity</div>
                <div className="text-cyan-300 font-bold">
                  {recData.score_breakdown.collaborative_score !== null
                    ? `${Math.round(recData.score_breakdown.collaborative_score * 100)}%`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {onFindMatches && !recData && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isLoading) onFindMatches();
            }}
            disabled={isLoading}
            className="mt-3 w-full py-1.5 rounded-lg bg-surface-2 hover:bg-indigo-600/30 disabled:opacity-75 disabled:cursor-not-allowed text-gray-300 hover:text-white border border-white/[0.06] hover:border-indigo-500/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-150"
            aria-label={`Find matches for ${title}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span className="text-indigo-300">Matching...</span>
              </>
            ) : (
              <>
                <span>Get Matches</span>
                <ArrowRight className="w-3 h-3 text-indigo-400" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
