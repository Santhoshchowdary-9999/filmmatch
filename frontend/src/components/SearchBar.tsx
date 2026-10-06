"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, Star, HelpCircle } from "lucide-react";
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
    { title: "Parasite", id: 496243, lang: "Korean" },
    { title: "Kantara", id: 1075794, lang: "Kannada" },
  ];

  // Global '/' keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && !(document.activeElement as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [inputRef]);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setSelectedIndex(-1);
    setSearchError(null);
    setSearchStatus("");
    setHasSearched(false);
    setIsOpen(false);
    if (!query.trim()) { setIsLoading(false); return; }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchFromApi<MovieSearchResponse>(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.results)) throw new Error("Invalid search results.");
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

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [inputRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim() && !isSubmitting) onSelectMovie(0, query.trim());
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
    <div className="w-full relative">
      {/* ── Input row ── */}
      <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-white/[0.12] bg-surface-1 focus-within:border-[rgba(240,180,41,0.5)] transition-colors duration-200 shadow-card">
        {/* Search icon */}
        <div className="flex items-center pl-4 pr-2 text-[#5C5A58]">
          <Search className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search a movie…"
          className="flex-1 py-3.5 pr-2 bg-transparent text-warm-white placeholder-[#5C5A58] text-base focus:outline-none min-w-0"
          aria-label="Search movies for hybrid recommendation"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="search-dropdown"
          role="combobox"
        />

        {/* Clear */}
        {query && !isLoading && (
          <button
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); setHasSearched(false); }}
            className="flex items-center px-2 text-[#5C5A58] hover:text-[#A8A5A0] transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <div className="flex items-center px-3 text-[#5C5A58]">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {/* ── Recommend button (amber CTA) ── */}
        <button
          onClick={() => { if (query.trim() && !isSubmitting) onSelectMovie(0, query.trim()); }}
          disabled={isSubmitting || !query.trim()}
          className="btn-amber flex items-center gap-2 px-5 py-3.5 text-sm font-bold rounded-none rounded-r-xl shrink-0"
          aria-label="Get movie recommendations"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Matching…</span>
            </>
          ) : (
            <span>Recommend</span>
          )}
        </button>
      </div>

      {/* ── Quick pill suggestions ── */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        <span className="shrink-0 text-[11px] text-[#5C5A58] font-medium">Try:</span>
        {quickPills.map(pill => (
          <button
            key={pill.id}
            onClick={() => handleSelect(pill.id, pill.title)}
            className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium text-[#A8A5A0] hover:text-[#F0EDE8] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-150"
          >
            {pill.title}
          </button>
        ))}
      </div>

      {/* ── Autocomplete dropdown ── */}
      {isOpen && (
        <div
          id="search-dropdown"
          ref={dropdownRef}
          role="listbox"
          aria-label="Movie search suggestions"
          className="absolute left-0 right-0 mt-2 rounded-xl glass-dropdown shadow-modal z-50 overflow-hidden max-h-[360px] overflow-y-auto"
        >
          {searchStatus && (
            <p role="status" className="px-3 py-2 text-[11px] text-[#5C5A58] border-b border-white/[0.06]">
              {searchStatus}
            </p>
          )}
          {searchError ? (
            <p role="alert" className="p-5 text-sm text-red-400">
              Search unavailable: {searchError}
            </p>
          ) : results.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#5C5A58] uppercase tracking-wider flex justify-between">
                <span>Results</span>
                <span className="font-normal">↑↓ Navigate · Enter Select</span>
              </div>
              {results.map((item, idx) => {
                const highlighted = selectedIndex === idx;
                return (
                  <div
                    key={item.tmdb_id || idx}
                    role="option"
                    aria-selected={highlighted}
                    onClick={() => handleSelect(item.tmdb_id, item.title)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-100 ${
                      highlighted
                        ? "bg-white/[0.07] text-warm-white"
                        : "hover:bg-white/[0.04] text-[#C8C5C0]"
                    }`}
                  >
                    {/* Mini poster */}
                    <div className="w-8 h-12 rounded-md overflow-hidden bg-surface-3 shrink-0">
                      <MoviePoster src={item.poster_url} alt={item.title} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-warm-white truncate">{item.title}</span>
                        {item.release_date && (
                          <span className="text-[11px] text-[#5C5A58] font-mono shrink-0">
                            {item.release_date.slice(0, 4)}
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface-2 text-[#A8A5A0] border border-white/[0.06] shrink-0">
                          {item.original_language}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#5C5A58]">
                        {item.genres && item.genres.length > 0 && (
                          <span>{item.genres.slice(0, 2).join(", ")}</span>
                        )}
                        {item.vote_average > 0 && (
                          <span className="flex items-center gap-1 text-gold" style={{ color: "var(--gold)" }}>
                            <Star className="w-3 h-3 fill-current" />
                            {item.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched && !isLoading ? (
            <div className="p-6 text-center space-y-2">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-white/[0.07] flex items-center justify-center mx-auto text-[#5C5A58]">
                <HelpCircle className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
              </div>
              <h4 className="text-sm font-semibold text-warm-white">No results for &ldquo;{query}&rdquo;</h4>
              <p className="text-xs text-[#5C5A58]">
                Try{" "}
                <button type="button" onClick={() => handleSelect(579974, "RRR")} className="text-amber underline" style={{ color: "var(--amber)" }}>RRR</button>,{" "}
                <button type="button" onClick={() => handleSelect(27205, "Inception")} className="text-amber underline" style={{ color: "var(--amber)" }}>Inception</button>, or{" "}
                <button type="button" onClick={() => handleSelect(496243, "Parasite")} className="text-amber underline" style={{ color: "var(--amber)" }}>Parasite</button>.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
