"use client";

import React from "react";
import { ArrowLeft, Clock, Award, FilterX, RotateCcw, Sparkles } from "lucide-react";
import { RecommendationResponse, MovieRecommendation, RecommendationFilters } from "@/types";
import { MovieCard } from "./MovieCard";
import { MoviePoster } from "./MoviePoster";
import { RecommendationFilterBar } from "./RecommendationFilterBar";
import { describeProvenance } from "@/utils/api";

interface RecommendationSectionProps {
  data: RecommendationResponse;
  onReset: () => void;
  onSelectMovie: (movie: MovieRecommendation) => void;
  onFindMatchesForRec: (movie: MovieRecommendation) => void;
  filters?: RecommendationFilters;
  onFiltersChange?: (filters: RecommendationFilters) => void;
  onClearFilters?: () => void;
  isLoadingFilters?: boolean;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  data,
  onReset,
  onSelectMovie,
  onFindMatchesForRec,
  filters = {},
  onFiltersChange,
  onClearFilters,
  isLoadingFilters = false,
}) => {
  const { source_movie, recommendations, execution_time_ms, filter_info } = data;

  return (
    <section
      className="py-12 sm:py-16 section-divider animate-fade-in"
      aria-label="Recommendation results"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-5 border-b border-white/[0.06]">
          <button
            onClick={onReset}
            className="btn-ghost inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium w-fit cursor-pointer"
            aria-label="Back to movie catalog"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </button>

          <div className="flex items-center gap-2 text-xs text-[#5C5A58]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-[#A8A5A0]" />
              <span>
                Computed in <strong className="text-warm-white font-mono">{execution_time_ms.toFixed(1)}ms</strong>
              </span>
            </div>
            <p role="status" className="hidden md:block text-[11px] text-[#3C3A38] max-w-xs truncate">
              {describeProvenance(data.provenance)}
            </p>
          </div>
        </div>

        {/* ── Seed film card ── */}
        <div className="mb-8 rounded-2xl overflow-hidden bg-surface-2 border border-white/[0.07]">
          {/* Backdrop strip */}
          <div className="relative h-28 sm:h-36 overflow-hidden">
            {source_movie.backdrop_url && (
              <img
                src={source_movie.backdrop_url.startsWith("http")
                  ? source_movie.backdrop_url
                  : `https://image.tmdb.org/t/p/w1280${source_movie.backdrop_url}`}
                alt=""
                aria-hidden="true"
                loading="eager"
                className="w-full h-full object-cover opacity-40"
              />
            )}
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{ background: "linear-gradient(to right, var(--surface-2) 0%, transparent 50%, var(--surface-2) 100%)" }}
            />
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{ background: "linear-gradient(to top, var(--surface-2) 0%, transparent 60%)" }}
            />
          </div>

          <div className="flex flex-col md:flex-row items-start gap-5 px-5 pb-6 -mt-16 md:-mt-20 relative z-10">
            {/* Poster */}
            <div
              className="shrink-0 rounded-xl overflow-hidden shadow-poster border border-white/[0.1]"
              style={{ width: "90px", height: "135px" }}
              aria-hidden="true"
            >
              <MoviePoster src={source_movie.poster_url} alt={source_movie.title} priority />
            </div>

            {/* Info */}
            <div className="pt-2 md:pt-10 flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#5C5A58] uppercase tracking-wider mb-1">
                Because you liked
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-warm-white tracking-tight leading-tight" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
                {source_movie.title}
                {source_movie.release_date && (
                  <span className="text-lg font-normal text-[#5C5A58] ml-2">
                    ({source_movie.release_date.slice(0, 4)})
                  </span>
                )}
              </h2>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-surface-3 text-[#A8A5A0] border border-white/[0.06]">
                  {source_movie.original_language}
                </span>
                {source_movie.genres.slice(0, 3).map((g, i) => (
                  <span key={i} className="text-[11px] text-[#5C5A58] px-2 py-0.5 rounded-full bg-surface-3/60 border border-white/[0.05]">
                    {g}
                  </span>
                ))}
              </div>

              {source_movie.overview && (
                <p className="mt-2.5 text-xs text-[#5C5A58] line-clamp-2 leading-relaxed max-w-2xl">
                  {source_movie.overview}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Collapsible Filters Bar & Hidden Gems ── */}
        {onFiltersChange && onClearFilters && (
          <RecommendationFilterBar
            filters={filters}
            onChange={onFiltersChange}
            onClear={onClearFilters}
            isLoading={isLoadingFilters}
          />
        )}

        {/* ── Filter Info Banner (if filtered or reduced results) ── */}
        {filter_info && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(240,180,41,0.08)] border border-[rgba(240,180,41,0.22)] flex items-center justify-between gap-3 text-xs sm:text-sm text-[var(--amber)]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 shrink-0 text-[var(--amber)]" />
              <span>{filter_info}</span>
            </div>
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="min-h-[44px] px-3 font-semibold text-xs text-warm-white hover:text-[var(--amber)] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}

        {/* ── Empty State when no results match active filters ── */}
        {recommendations.length === 0 ? (
          <div className="py-16 px-6 text-center rounded-2xl bg-surface-2 border border-white/[0.07] my-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-3 border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <FilterX className="w-7 h-7 text-[#A8A5A0]" />
            </div>
            <h4 className="text-lg font-bold text-warm-white mb-2">
              No matching recommendations found
            </h4>
            <p className="text-xs sm:text-sm text-[#8C8984] max-w-md mx-auto mb-6">
              {filter_info || "None of the candidate movies matched your current combination of filters. Try broadening your criteria or reset your filters."}
            </p>
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--amber)] text-[#0B0B0D] font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-amber-btn transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Section heading ── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-[rgba(240,180,41,0.1)] border border-[rgba(240,180,41,0.2)]">
                <Award className="w-4.5 h-4.5 text-[var(--amber)]" style={{ width: "18px", height: "18px", color: "var(--amber)" }} />
              </div>
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-warm-white tracking-tight" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
                  Top {recommendations.length} Recommendations
                </h3>
                <p className="text-xs text-[#5C5A58] mt-0.5">
                  Story DNA 50% · Audience Sentiment 20% · Viewer Affinity 30%
                </p>
              </div>
            </div>

            {/* ── Provenance note ── */}
            <p role="status" className="text-[11px] text-[#3C3A38] mb-5 leading-relaxed">
              {describeProvenance(data.provenance)}. Scores are computed, not live measurements.
              {data.signal_provenance &&
                Object.values(data.signal_provenance.sentiment).some((s) => s.source === "rating_or_overview_fallback")
                ? " Some audience scores use rating/overview fallback."
                : ""}
            </p>

            {/* ── Recommendations grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {recommendations.map((rec, idx) => (
                <MovieCard
                  key={rec.tmdb_id}
                  movie={rec}
                  isRecommendation
                  rankIndex={idx + 1}
                  onSelect={() => onSelectMovie(rec)}
                  onFindMatches={() => onFindMatchesForRec(rec)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
