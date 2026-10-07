"use client";

import React, { useState } from "react";
import { Sparkles, Search, Loader2, Filter, X } from "lucide-react";
import { naturalSearchApi } from "@/utils/api";
import { MovieRecommendation, DetectedFilters } from "@/types";

interface NaturalSearchBarProps {
  onResults?: (results: MovieRecommendation[], detectedFilters: DetectedFilters, query: string) => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

const SAMPLE_PROMPTS = [
  "Emotional Telugu movies under 2 hours",
  "Funny action movie with high audience rating",
  "Movies like Interstellar but more emotional",
  "Mind-bending sci-fi thriller under 150 minutes",
  "Romantic movies with positive endings",
];

export const NaturalSearchBar: React.FC<NaturalSearchBarProps> = ({
  onResults,
  onSearch,
  isLoading: externalLoading,
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<DetectedFilters | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loading = externalLoading || internalLoading;

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQ = (customQuery || query).trim();
    if (!targetQ || loading) return;

    if (customQuery) setQuery(customQuery);

    if (onSearch) {
      onSearch(targetQ);
      return;
    }

    setInternalLoading(true);
    setErrorMsg(null);
    try {
      const resp = await naturalSearchApi(targetQ);
      if (resp && resp.results) {
        setActiveFilters(resp.detected_filters);
        if (onResults) onResults(resp.results, resp.detected_filters, targetQ);
      }
    } catch (err: any) {
      console.error("Natural language search failed:", err);
      setErrorMsg(err.message || "Could not interpret search query.");
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      <form onSubmit={(e) => handleSubmit(e)} className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-[var(--amber)]">
          <Sparkles className="w-5 h-5" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask in natural language... e.g. 'Emotional Telugu movies under 2 hours'"
          className="w-full pl-12 pr-28 py-3.5 bg-surface-1/90 border border-white/[0.12] rounded-2xl text-warm-white placeholder-[#7A7875] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)] focus:border-transparent transition-all shadow-xl backdrop-blur-md"
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 px-4 py-2 bg-[var(--amber)] hover:bg-[#d89f20] disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing…</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Search</span>
            </>
          )}
        </button>
      </form>

      {/* ── Sample Prompt Chips ── */}
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-[#7A7875] mr-1">Try:</span>
        {SAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setQuery(prompt);
              handleSubmit(undefined, prompt);
            }}
            className="text-[11px] text-[#A8A5A0] bg-white/[0.04] hover:bg-white/[0.08] hover:text-[var(--amber)] border border-white/[0.06] rounded-full px-2.5 py-1 transition-colors"
          >
            "{prompt}"
          </button>
        ))}
      </div>

      {/* ── Detected Filters Display ── */}
      {activeFilters && (
        <div className="mt-3 p-3 rounded-xl bg-surface-2 border border-white/[0.08] flex items-center gap-2 flex-wrap text-xs animate-fade-in">
          <span className="flex items-center gap-1 font-bold text-[var(--amber)]">
            <Filter className="w-3.5 h-3.5" />
            Detected Signals:
          </span>
          {activeFilters.language && (
            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
              Language: {activeFilters.language.toUpperCase()}
            </span>
          )}
          {activeFilters.mood && (
            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
              Mood: {activeFilters.mood}
            </span>
          )}
          {activeFilters.runtime_max && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
              Runtime &lt; {activeFilters.runtime_max} mins
            </span>
          )}
          {activeFilters.genres.length > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
              Genres: {activeFilters.genres.join(", ")}
            </span>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-xs text-rose-400">{errorMsg}</p>
      )}
    </div>
  );
};
