"use client";

import React, { useState } from "react";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  RotateCcw,
  Star,
  Clock,
  Calendar,
} from "lucide-react";
import { RecommendationFilters } from "@/types";

export const GENRE_OPTIONS = [
  "Action", "Adventure", "Animation", "Comedy", "Crime",
  "Documentary", "Drama", "Family", "Fantasy", "History",
  "Horror", "Music", "Mystery", "Romance", "Science Fiction",
  "Thriller", "War", "Western",
];

const CURRENT_YEAR = new Date().getFullYear();

const YEAR_PRESETS = [
  { label: "All Years", min: undefined, max: undefined },
  { label: "2020s", min: 2020, max: CURRENT_YEAR },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "Classic (<2000)", min: 1900, max: 1999 },
];

const RUNTIME_PRESETS = [
  { label: "Any Length", max: undefined },
  { label: "Under 90m", max: 90 },
  { label: "Under 120m", max: 120 },
  { label: "Under 150m", max: 150 },
];

const RATING_PRESETS = [
  { label: "Any Rating", min: undefined },
  { label: "6.0+ ★", min: 6.0 },
  { label: "7.0+ ★", min: 7.0 },
  { label: "8.0+ ★", min: 8.0 },
];

interface RecommendationFilterBarProps {
  filters: RecommendationFilters;
  onChange: (filters: RecommendationFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const RecommendationFilterBar: React.FC<RecommendationFilterBarProps> = ({
  filters,
  onChange,
  onClear,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount =
    (filters.hidden_gems ? 1 : 0) +
    (filters.year_min !== undefined || filters.year_max !== undefined ? 1 : 0) +
    (filters.runtime_max !== undefined ? 1 : 0) +
    (filters.genres && filters.genres.length > 0 ? filters.genres.length : 0) +
    (filters.min_rating !== undefined ? 1 : 0);

  const toggleGenre = (genre: string) => {
    const current = filters.genres || [];
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    onChange({ ...filters, genres: next.length > 0 ? next : undefined });
  };

  const setYearPreset = (min?: number, max?: number) => {
    onChange({ ...filters, year_min: min, year_max: max });
  };

  const setRuntimePreset = (max?: number) => {
    onChange({ ...filters, runtime_max: max });
  };

  const setRatingPreset = (min?: number) => {
    onChange({ ...filters, min_rating: min });
  };

  const toggleHiddenGems = () => {
    onChange({ ...filters, hidden_gems: !filters.hidden_gems });
  };

  return (
    <div className="mb-6 rounded-2xl bg-surface-2 border border-white/[0.08] overflow-hidden transition-all duration-200">
      {/* ── Filter Bar Header / Toggle ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="min-h-[44px] px-3.5 rounded-xl bg-surface-3/80 hover:bg-surface-3 border border-white/[0.08] hover:border-white/[0.15] text-warm-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            aria-expanded={isOpen}
            aria-label="Toggle recommendation filters"
          >
            <Filter className="w-4 h-4 text-[var(--amber)]" />
            <span>Filters & Refinements</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[var(--amber)] text-[#0B0B0D] font-black text-[10px] flex items-center justify-center">
                {activeCount}
              </span>
            )}
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-[#A8A5A0]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#A8A5A0]" />
            )}
          </button>

          {/* Quick Hidden Gems Pill in collapsed state */}
          <button
            type="button"
            onClick={toggleHiddenGems}
            className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              filters.hidden_gems
                ? "bg-purple-900/40 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                : "bg-surface-3/50 hover:bg-surface-3 border-white/[0.06] text-[#A8A5A0] hover:text-warm-white"
            }`}
            aria-pressed={!!filters.hidden_gems}
            aria-label="Toggle hidden gems discovery filter"
          >
            <Sparkles className={`w-4 h-4 ${filters.hidden_gems ? "text-purple-400 animate-pulse" : "text-[#5C5A58]"}`} />
            <span>Hidden Gems</span>
            {filters.hidden_gems && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-md font-mono">
                ON
              </span>
            )}
          </button>
        </div>

        {/* Clear filters button */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={isLoading}
            className="min-h-[44px] px-3.5 rounded-xl text-xs font-semibold text-[#A8A5A0] hover:text-[var(--amber)] hover:bg-white/[0.04] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Clear all active filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear filters ({activeCount})</span>
          </button>
        )}
      </div>

      {/* ── Collapsible Panel Content ── */}
      {isOpen && (
        <div className="px-4 pb-5 pt-1 border-t border-white/[0.06] space-y-5 animate-fade-in">
          {/* 1. Hidden Gems Feature Spotlight */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-600/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                  Hidden Gems Discovery Mode
                </p>
                <p className="text-[11px] text-purple-300/80">
                  Filters for high audience sentiment (≥ 75%) with under 1,000 mainstream reviews.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleHiddenGems}
              className={`min-h-[44px] px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                filters.hidden_gems
                  ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                  : "bg-surface-3 hover:bg-surface-4 text-[#A8A5A0] border border-white/[0.08]"
              }`}
              aria-pressed={!!filters.hidden_gems}
            >
              {filters.hidden_gems ? "Active" : "Enable"}
            </button>
          </div>

          {/* 2. Release Era */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A8A5A0] mb-2.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--amber)]" />
              <span>Release Era</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {YEAR_PRESETS.map((p) => {
                const isSelected =
                  filters.year_min === p.min && filters.year_max === p.max;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setYearPreset(p.min, p.max)}
                    className={`min-h-[44px] px-3.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center ${
                      isSelected
                        ? "bg-[rgba(240,180,41,0.18)] border border-[rgba(240,180,41,0.4)] text-[var(--amber)] font-bold"
                        : "bg-surface-3/60 hover:bg-surface-3 border border-white/[0.06] text-[#A8A5A0] hover:text-warm-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Runtime & Minimum Rating Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Runtime */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A8A5A0] mb-2.5">
                <Clock className="w-3.5 h-3.5 text-[var(--amber)]" />
                <span>Max Runtime</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {RUNTIME_PRESETS.map((p) => {
                  const isSelected = filters.runtime_max === p.max;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setRuntimePreset(p.max)}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center ${
                        isSelected
                          ? "bg-[rgba(240,180,41,0.18)] border border-[rgba(240,180,41,0.4)] text-[var(--amber)] font-bold"
                          : "bg-surface-3/60 hover:bg-surface-3 border border-white/[0.06] text-[#A8A5A0] hover:text-warm-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Min Rating */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A8A5A0] mb-2.5">
                <Star className="w-3.5 h-3.5 text-[var(--amber)]" />
                <span>Minimum Rating</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {RATING_PRESETS.map((p) => {
                  const isSelected = filters.min_rating === p.min;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setRatingPreset(p.min)}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center ${
                        isSelected
                          ? "bg-[rgba(240,180,41,0.18)] border border-[rgba(240,180,41,0.4)] text-[var(--amber)] font-bold"
                          : "bg-surface-3/60 hover:bg-surface-3 border border-white/[0.06] text-[#A8A5A0] hover:text-warm-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Genre Multi-select Chips */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#A8A5A0] mb-2.5">
              Genres (Match Any Selected)
            </p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-none py-1">
              {GENRE_OPTIONS.map((genre) => {
                const isSelected = (filters.genres || []).includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`min-h-[44px] px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center ${
                      isSelected
                        ? "bg-[rgba(240,180,41,0.2)] border border-[rgba(240,180,41,0.45)] text-[var(--amber)] font-bold"
                        : "bg-surface-3/60 hover:bg-surface-3 border border-white/[0.06] text-[#A8A5A0] hover:text-warm-white"
                    }`}
                    aria-pressed={isSelected}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
