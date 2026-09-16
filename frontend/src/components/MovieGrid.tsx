"use client";

import React from "react";
import { CatalogMovie, MovieRecommendation } from "@/types";
import { MovieCard } from "./MovieCard";

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
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No movies found matching the selected criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
      {movies.map((movie, idx) => {
        const key = `${movie.tmdb_id || 'item'}-${idx}`;
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
