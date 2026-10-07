/**
 * FilmMatch AI — Watchlist Hook
 * Persists movie bookmarks in localStorage under "fm_watchlist".
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { CatalogMovie, MovieRecommendation } from "@/types";

export type WatchlistItem = {
  tmdb_id: number;
  title: string;
  poster: string;
  year: string;
  genres: string[];
  rating: number;
  overview: string;
  language: string;
  addedAt: number; // Unix ms
};

const STORAGE_KEY = "fm_watchlist";

function toWatchlistItem(movie: CatalogMovie | MovieRecommendation): WatchlistItem {
  const poster =
    "poster_url" in movie ? movie.poster_url : (movie as CatalogMovie).poster;
  const year =
    "release_date" in movie
      ? (movie as MovieRecommendation).release_date.slice(0, 4)
      : (movie as CatalogMovie).year;
  const rating =
    "vote_average" in movie
      ? (movie as MovieRecommendation).vote_average
      : (movie as CatalogMovie).rating;
  const language =
    "original_language" in movie
      ? (movie as MovieRecommendation).original_language
      : (movie as CatalogMovie).languageCode;
  return {
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    poster,
    year,
    genres: movie.genres || [],
    rating,
    overview: movie.overview || "",
    language,
    addedAt: Date.now(),
  };
}

function readStorage(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: WatchlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setItems(readStorage());
  }, []);

  const isInWatchlist = useCallback(
    (tmdb_id: number) => items.some((i) => i.tmdb_id === tmdb_id),
    [items]
  );

  const addToWatchlist = useCallback(
    (movie: CatalogMovie | MovieRecommendation) => {
      setItems((prev) => {
        if (prev.some((i) => i.tmdb_id === movie.tmdb_id)) return prev;
        const item = toWatchlistItem(movie);
        const next = [item, ...prev];
        writeStorage(next);

        // Sync with PostgreSQL
        import("@/utils/api").then(({ addToWatchlistApi }) => {
          addToWatchlistApi({
            tmdb_id: item.tmdb_id,
            title: item.title,
            poster_url: item.poster,
            release_date: item.year,
            vote_average: item.rating,
            genres: (item.genres || []).join(", "),
            original_language: item.language,
          }).catch(() => {});
        });

        return next;
      });
    },
    []
  );

  const removeFromWatchlist = useCallback((tmdb_id: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.tmdb_id !== tmdb_id);
      writeStorage(next);

      // Sync with PostgreSQL
      import("@/utils/api").then(({ removeFromWatchlistApi }) => {
        removeFromWatchlistApi(tmdb_id).catch(() => {});
      });

      return next;
    });
  }, []);

  const toggleWatchlist = useCallback(
    (movie: CatalogMovie | MovieRecommendation) => {
      if (isInWatchlist(movie.tmdb_id)) {
        removeFromWatchlist(movie.tmdb_id);
      } else {
        addToWatchlist(movie);
      }
    },
    [isInWatchlist, addToWatchlist, removeFromWatchlist]
  );

  const clearWatchlist = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return {
    items,
    watchlist: items,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    clearWatchlist,
    reloadWatchlist: () => setItems(readStorage()),
  };
}
