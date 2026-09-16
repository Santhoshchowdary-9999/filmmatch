"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, Sparkles, Star, Film, HelpCircle } from "lucide-react";
import { MovieSearchItem, MovieSearchResponse } from "@/types";
import { fetchFromApi, describeProvenance, requestError } from "@/utils/api";
import { MoviePoster } from "./MoviePoster";

interface SearchBarProps {
  onSelectMovie: (tmdbId: number, title: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  isSubmitting?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectMovie,
  inputRef: externalRef,
  isSubmitting = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [searchStatus, setSearchStatus] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const quickPills = [
    { title: "RRR", id: 579974, lang: "Telugu" },
    { title: "Dangal", id: 360814, lang: "Hindi" },
    { title: "Pushpa", id: 690957, lang: "Telugu" },
    { title: "Inception", id: 27205, lang: "English" },
    { title: "Gangs of Wasseypur", id: 89366, lang: "Hindi" },
    { title: "Parasite", id: 496243, lang: "Korean" },
    { title: "Interstellar", id: 157336, lang: "English" },
    { title: "Kantara", id: 1075794, lang: "Kannada" },
  ];

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea" && !(document.activeElement as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [inputRef]);

  // Abort obsolete searches; a failed request is not an empty search result.
  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setSelectedIndex(-1);
    setSearchError(null);
    setSearchStatus("");
    setHasSearched(false);
    setIsOpen(false);
    if (!query.trim()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchFromApi<MovieSearchResponse>(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.results)) throw new Error("The backend returned invalid search results.");
        setResults(data.results);
        setSearchStatus(describeProvenance(data.provenance));
        setHasSearched(true);
        setIsOpen(true);
      } catch (err) {
        if (!controller.signal.aborted) {
          setSearchError(requestError(err));
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputRef]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim() && !isSubmitting) {
        onSelectMovie(0, query.trim());
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const sel = results[selectedIndex];
        handleSelect(sel.tmdb_id, sel.title);
      } else if (query.trim() && !isSubmitting) {
        onSelectMovie(0, query.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (tmdbId: number, title: string) => {
    setQuery(title);
    setIsOpen(false);
    onSelectMovie(tmdbId, title);
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative">
      {/* Search Input Box */}
      <div className="relative group">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-cyan-500/30 blur-lg opacity-75 group-hover:opacity-100 transition duration-300 pointer-events-none" />
        
        <div className="relative flex items-center bg-surface-1/90 border border-white/[0.12] group-hover:border-indigo-500/50 rounded-2xl shadow-2xl transition-all duration-200">
          <div className="pl-5 text-gray-400">
            <Search className="w-5 h-5 group-hover:text-indigo-400 transition-colors duration-200" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder="Search any movie (e.g. 'RRR', 'Pushpa', 'Dangal', 'Inception')..."
            className="w-full py-4 pl-4 pr-12 bg-transparent text-white placeholder-gray-400 text-base md:text-lg focus:outline-none"
            aria-label="Search movies for hybrid recommendation"
          />

          <div className="pr-4 flex items-center space-x-2">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            ) : query ? (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setIsOpen(false);
                  setHasSearched(false);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/[0.1] transition-colors"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}

            <button
              onClick={() => {
                if (query.trim() && !isSubmitting) onSelectMovie(0, query.trim());
              }}
              disabled={isSubmitting || !query.trim()}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-glow-indigo transition-all duration-200 flex items-center space-x-2"
              aria-label="Get movie recommendations"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>Matching...</span>
                </>
              ) : (
                <span>Recommend</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Search Chips */}
      <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-gray-400">
        <span className="font-medium flex items-center space-x-1 text-gray-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Popular Searches:</span>
        </span>
        {quickPills.map((pill) => (
          <button
            key={pill.id}
            onClick={() => handleSelect(pill.id, pill.title)}
            className="px-2.5 py-1 rounded-lg bg-surface-2/60 hover:bg-indigo-600/20 border border-white/[0.06] hover:border-indigo-500/40 text-gray-300 hover:text-white transition-all duration-150"
          >
            {pill.title} <span className="text-[10px] text-gray-500">({pill.lang})</span>
          </button>
        ))}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-2 rounded-2xl glass-dropdown shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto"
        >
          {searchStatus && <p role="status" className="px-3 py-2 text-xs text-gray-400">{searchStatus}</p>}
          {searchError ? (
            <p role="alert" className="p-6 text-sm text-red-300">Search unavailable: {searchError}</p>
          ) : results.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Movie Suggestions</span>
                <span className="text-gray-500 font-normal">Use ↑↓ keys & Enter</span>
              </div>
              {results.map((item, index) => {
                const isHighlighted = selectedIndex === index;
                return (
                  <div
                    key={item.tmdb_id || index}
                    onClick={() => handleSelect(item.tmdb_id, item.title)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      isHighlighted ? "bg-indigo-600/30 text-white border border-indigo-500/40" : "hover:bg-white/[0.06] text-gray-200"
                    }`}
                  >
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-surface-3 flex-shrink-0">
                      <MoviePoster src={item.poster_url} alt={item.title} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white truncate font-sans">{item.title}</span>
                        {item.release_date && (
                          <span className="text-xs text-gray-400 font-mono">({item.release_date.slice(0, 4)})</span>
                        )}
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-2 text-indigo-300 border border-white/[0.06]">
                          {item.original_language}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                        {item.genres && item.genres.length > 0 && <span>{item.genres.slice(0, 2).join(", ")}</span>}
                        {item.vote_average > 0 && (
                          <span className="flex items-center space-x-1 text-cinema-gold">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{item.vote_average.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched && !isLoading ? (
            /* Movie Not Found Friendly State */
            <div className="p-6 text-center text-gray-300 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-white/[0.08] flex items-center justify-center mx-auto text-indigo-400 mb-2">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Movie not found</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                No matching film found for &ldquo;<span className="text-indigo-300">{query}</span>&rdquo;. Try searching another movie title like <button type="button" onClick={() => handleSelect(579974, "RRR")} className="text-cyan-300 underline font-medium">RRR</button>, <button type="button" onClick={() => handleSelect(360814, "Dangal")} className="text-cyan-300 underline font-medium">Dangal</button>, or <button type="button" onClick={() => handleSelect(27205, "Inception")} className="text-cyan-300 underline font-medium">Inception</button>.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
