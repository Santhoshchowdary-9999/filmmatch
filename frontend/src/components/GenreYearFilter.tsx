"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
  "Romance", "Science Fiction", "Thriller", "War", "Western",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGES = [
  { label: "All Years", min: 1900, max: CURRENT_YEAR },
  { label: "2020s", min: 2020, max: CURRENT_YEAR },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "1990s", min: 1990, max: 1999 },
  { label: "Classic (< 1990)", min: 1900, max: 1989 },
];

export interface ActiveFilters {
  genres: string[];
  yearMin: number;
  yearMax: number;
}

export const DEFAULT_FILTERS: ActiveFilters = {
  genres: [],
  yearMin: 1900,
  yearMax: CURRENT_YEAR,
};

interface GenreYearFilterProps {
  filters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
}

export const GenreYearFilter: React.FC<GenreYearFilterProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount =
    filters.genres.length +
    (filters.yearMin !== DEFAULT_FILTERS.yearMin ||
    filters.yearMax !== DEFAULT_FILTERS.yearMax
      ? 1
      : 0);

  const toggleGenre = (genre: string) => {
    const next = filters.genres.includes(genre)
      ? filters.genres.filter((g) => g !== genre)
      : [...filters.genres, genre];
    onFiltersChange({ ...filters, genres: next });
  };

  const setYearRange = (min: number, max: number) => {
    onFiltersChange({ ...filters, yearMin: min, yearMax: max });
  };

  const clearAll = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const selectedRange = YEAR_RANGES.find(
    (r) => r.min === filters.yearMin && r.max === filters.yearMax
  );

  return (
    <div className="relative">
      {/* Filter toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
          activeCount > 0
            ? "bg-[rgba(240,180,41,0.15)] border border-[rgba(240,180,41,0.35)] text-[var(--amber)]"
            : "btn-ghost text-[#A8A5A0]"
        }`}
        aria-expanded={isOpen}
        aria-label="Toggle genre and year filters"
        id="genre-year-filter-btn"
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Filter</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-[var(--amber)] text-[#0B0B0D] font-black text-[9px] flex items-center justify-center">
            {activeCount}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl glass-dropdown shadow-modal z-30 p-4 animate-scale-in"
          id="genre-year-filter-panel"
          role="dialog"
          aria-label="Genre and year filters"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A8A5A0]">
              Filters
            </span>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] text-[#5C5A58] hover:text-[var(--amber)] transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-[#5C5A58] hover:text-[#A8A5A0] transition-colors"
                aria-label="Close filters"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Year Range */}
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C5A58] mb-2">
              Release Era
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {YEAR_RANGES.map((range) => {
                const active =
                  filters.yearMin === range.min &&
                  filters.yearMax === range.max;
                return (
                  <button
                    key={range.label}
                    onClick={() => setYearRange(range.min, range.max)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-100 text-left ${
                      active
                        ? "bg-[rgba(240,180,41,0.15)] border border-[rgba(240,180,41,0.35)] text-[var(--amber)]"
                        : "bg-surface-3/60 border border-white/[0.06] text-[#A8A5A0] hover:border-white/[0.12] hover:text-[#F0EDE8]"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genres */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C5A58] mb-2">
              Genres
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-none">
              {GENRES.map((genre) => {
                const active = filters.genres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-100 ${
                      active
                        ? "bg-[rgba(240,180,41,0.15)] border border-[rgba(240,180,41,0.35)] text-[var(--amber)]"
                        : "bg-surface-3/60 border border-white/[0.06] text-[#A8A5A0] hover:border-white/[0.12] hover:text-[#F0EDE8]"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active summary */}
          {activeCount > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-[#5C5A58]">
              {filters.genres.length > 0 && (
                <p>Genres: {filters.genres.join(", ")}</p>
              )}
              {selectedRange && selectedRange.label !== "All Years" && (
                <p>Era: {selectedRange.label}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Apply genre + year filters to a movie array.
 * year field = 4-digit string like "2023".
 */
export function applyFilters<
  T extends { genres: string[]; year?: string; release_date?: string }
>(movies: T[], filters: ActiveFilters): T[] {
  return movies.filter((m) => {
    // Year check
    const yearStr = m.year ?? m.release_date?.slice(0, 4);
    const year = yearStr ? parseInt(yearStr, 10) : null;
    if (year !== null && (year < filters.yearMin || year > filters.yearMax))
      return false;

    // Genre check (any genre must match if genres filter is active)
    if (filters.genres.length > 0) {
      const movieGenres = m.genres || [];
      const hasGenre = filters.genres.some((fg) =>
        movieGenres.some((mg) => mg.toLowerCase().includes(fg.toLowerCase()))
      );
      if (!hasGenre) return false;
    }

    return true;
  });
}
