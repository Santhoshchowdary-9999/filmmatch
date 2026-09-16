"use client";

import React from "react";
import { Sparkles, ArrowLeft, Clock, Film, Layers, MessageSquareText, Users, Award } from "lucide-react";
import { RecommendationResponse, MovieRecommendation } from "@/types";
import { MovieCard } from "./MovieCard";
import { MoviePoster } from "./MoviePoster";

interface RecommendationSectionProps {
  data: RecommendationResponse;
  onReset: () => void;
  onSelectMovie: (movie: MovieRecommendation) => void;
  onFindMatchesForRec: (movie: MovieRecommendation) => void;
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  data,
  onReset,
  onSelectMovie,
  onFindMatchesForRec,
}) => {
  const { source_movie, recommendations, applied_weights, execution_time_ms } = data;

  return (
    <section className="py-10 sm:py-16 border-b border-white/[0.08] bg-obsidian-100/60 relative animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navigation & Metrics Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.06]">
          <button
            onClick={onReset}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/[0.08] text-gray-300 hover:text-white text-xs sm:text-sm font-semibold transition-all duration-150 w-fit"
            aria-label="Back to movie catalog"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Back to Browse</span>
          </button>

          <div className="flex items-center space-x-3 text-xs text-gray-400">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calculated in <strong className="text-white font-mono">{execution_time_ms.toFixed(1)}ms</strong></span>
            </div>

            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-white/[0.06]">
              <span className="text-gray-400 font-medium">Weights:</span>
              <span className="text-indigo-300 font-mono font-bold">50% Story</span>
              <span>•</span>
              <span className="text-violet-300 font-mono font-bold">20% Audience</span>
              <span>•</span>
              <span className="text-cyan-300 font-mono font-bold">30% Community</span>
            </div>
          </div>
        </div>

        {/* Source Seed Film Spotlight Card */}
        <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1 border border-indigo-500/30 shadow-glow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            {/* Poster */}
            <div className="w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/[0.1] bg-surface-3">
              <MoviePoster
                src={source_movie.poster_url}
                alt={source_movie.title}
                priority={true}
              />
            </div>

            {/* Meta & Narrative */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Base Seed Film</span>
              </div>

              <div className="text-xs sm:text-sm font-semibold text-indigo-300 mb-1">
                Because you liked:
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-sans tracking-tight">
                {source_movie.title}
                {source_movie.release_date && (
                  <span className="text-lg sm:text-2xl md:text-3xl text-gray-400 font-normal ml-3">
                    ({source_movie.release_date.slice(0, 4)})
                  </span>
                )}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-surface-3 text-indigo-300 border border-white/[0.08]">
                  {source_movie.original_language}
                </span>
                {source_movie.genres.map((g, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-gray-300 px-3 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06]"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <p className="text-xs sm:text-sm text-gray-300/90 mt-4 line-clamp-3 leading-relaxed max-w-4xl font-normal">
                {source_movie.overview}
              </p>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-glow-indigo">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight">
                Top 10 Ranked Recommendations
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1.5">
              Deterministic fusion of Story DNA (50%), Audience Sentiment (20%), and Community Viewer Affinity (30%).
            </p>
          </div>
        </div>

        {/* 10 Recommendations Grid with Rank Index */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {recommendations.map((rec, idx) => (
            <MovieCard
              key={rec.tmdb_id}
              movie={rec}
              isRecommendation={true}
              rankIndex={idx + 1}
              onSelect={() => onSelectMovie(rec)}
              onFindMatches={() => onFindMatchesForRec(rec)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
