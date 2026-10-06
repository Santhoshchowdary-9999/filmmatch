"use client";

import React from "react";
import { CatalogMovie, MovieRecommendation } from "@/types";
import { MovieCard } from "./MovieCard";
import { Film } from "lucide-react";

interface MovieGridProps {
  movies: (CatalogMovie | MovieRecommendation)[];
  isRecommendation?: boolean;
  loadingMovieId?: number | null;
  onSelectMovie: (movie: CatalogMovie | MovieRecommendation) => void;
  onFindMatches?: (movie: CatalogMovie | MovieRecommendation) => void;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  isRecommendation = false,
  loadingMovieId = null,
  onSelectMovie,
  onFindMatches,
}) => {
  if (!movies || movies.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-surface-2 border border-white/[0.07] flex items-center justify-center mx-auto">
          <Film className="w-4.5 h-4.5 text-[#3C3A38]" style={{ width: "18px", height: "18px" }} />
        </div>
        <p className="text-sm text-[#5C5A58]">No titles found for the selected criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {movies.map((movie, idx) => {
        const key = `${movie.tmdb_id || "item"}-${idx}`;
        const isCardLoading = loadingMovieId !== null && loadingMovieId === movie.tmdb_id;
        return (
          <MovieCard
            key={key}
            movie={movie}
            isRecommendation={isRecommendation}
            rankIndex={isRecommendation ? idx + 1 : undefined}
            isLoading={isCardLoading}
            onSelect={() => onSelectMovie(movie)}
            onFindMatches={onFindMatches ? () => onFindMatches(movie) : undefined}
          />
        );
      })}
    </div>
  );
};
