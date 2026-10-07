"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Clock, Trash2, ArrowRight, Bookmark, History } from "lucide-react";
import { WatchlistItem } from "@/utils/useWatchlist";
import { HistoryItem } from "@/utils/useHistory";
import { MoviePoster } from "./MoviePoster";

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  // Watchlist
  watchlistItems: WatchlistItem[];
  onRemoveFromWatchlist: (tmdb_id: number) => void;
  onClearWatchlist: () => void;
  // History
  historyItems: HistoryItem[];
  onRemoveFromHistory: (tmdb_id: number) => void;
  onClearHistory: () => void;
  // Actions
  onFindMatches: (tmdb_id: number, title: string) => void;
}

type ActiveTab = "watchlist" | "history";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function ItemRow({
  tmdb_id,
  title,
  poster,
  year,
  genres,
  rating,
  timestamp,
  onRemove,
  onFindMatches,
}: {
  tmdb_id: number;
  title: string;
  poster: string;
  year: string;
  genres: string[];
  rating: number;
  timestamp: number;
  onRemove: () => void;
  onFindMatches: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors">
      {/* Poster */}
      <div className="w-8 h-12 rounded-md overflow-hidden bg-surface-3 shrink-0">
        <MoviePoster src={poster} alt={title} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#F0EDE8] truncate">{title}</p>
        <p className="text-[10px] text-[#5C5A58] font-mono">{year}</p>
        <p className="text-[10px] text-[#3C3A38]">{timeAgo(timestamp)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onFindMatches}
          title="Find similar movies"
          className="p-1.5 rounded-md text-[#5C5A58] hover:text-[var(--amber)] hover:bg-[rgba(240,180,41,0.08)] transition-all"
          aria-label={`Find matches for ${title}`}
        >
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={onRemove}
          title="Remove"
          className="p-1.5 rounded-md text-[#5C5A58] hover:text-red-400 hover:bg-red-500/[0.08] transition-all"
          aria-label={`Remove ${title}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export const HistoryWatchlistPanel: React.FC<PanelProps> = ({
  isOpen,
  onClose,
  watchlistItems,
  onRemoveFromWatchlist,
  onClearWatchlist,
  historyItems,
  onRemoveFromHistory,
  onClearHistory,
  onFindMatches,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("watchlist");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = activeTab === "watchlist" ? watchlistItems : historyItems;
  const isEmpty = items.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-[rgba(11,11,13,0.5)] backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] flex flex-col animate-slide-in-right"
        style={{ backgroundColor: "var(--surface-1)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Watchlist and History panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
          <div className="flex gap-1 p-1 rounded-lg bg-surface-2">
            <button
              onClick={() => setActiveTab("watchlist")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "watchlist"
                  ? "bg-[var(--amber)] text-[#0B0B0D]"
                  : "text-[#A8A5A0] hover:text-[#F0EDE8]"
              }`}
              aria-pressed={activeTab === "watchlist"}
            >
              <Bookmark className="w-3 h-3" />
              Watchlist
              {watchlistItems.length > 0 && (
                <span className={`text-[9px] font-black px-1 py-0.5 rounded ${
                  activeTab === "watchlist" ? "bg-[#0B0B0D]/20" : "bg-surface-3 text-[#F0EDE8]"
                }`}>
                  {watchlistItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-[var(--amber)] text-[#0B0B0D]"
                  : "text-[#A8A5A0] hover:text-[#F0EDE8]"
              }`}
              aria-pressed={activeTab === "history"}
            >
              <History className="w-3 h-3" />
              History
              {historyItems.length > 0 && (
                <span className={`text-[9px] font-black px-1 py-0.5 rounded ${
                  activeTab === "history" ? "bg-[#0B0B0D]/20" : "bg-surface-3 text-[#F0EDE8]"
                }`}>
                  {historyItems.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#5C5A58] hover:text-[#F0EDE8] hover:bg-white/[0.05] transition-all"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              {activeTab === "watchlist" ? (
                <>
                  <Bookmark className="w-10 h-10 text-[#3C3A38] mb-3" />
                  <p className="text-sm font-semibold text-[#5C5A58]">Your watchlist is empty</p>
                  <p className="text-xs text-[#3C3A38] mt-1">
                    Bookmark movies to save them for later
                  </p>
                </>
              ) : (
                <>
                  <Clock className="w-10 h-10 text-[#3C3A38] mb-3" />
                  <p className="text-sm font-semibold text-[#5C5A58]">No history yet</p>
                  <p className="text-xs text-[#3C3A38] mt-1">
                    Movies you view or search will appear here
                  </p>
                </>
              )}
            </div>
          ) : activeTab === "watchlist" ? (
            watchlistItems.map((item) => (
              <ItemRow
                key={item.tmdb_id}
                tmdb_id={item.tmdb_id}
                title={item.title}
                poster={item.poster}
                year={item.year}
                genres={item.genres}
                rating={item.rating}
                timestamp={item.addedAt}
                onRemove={() => onRemoveFromWatchlist(item.tmdb_id)}
                onFindMatches={() => { onClose(); onFindMatches(item.tmdb_id, item.title); }}
              />
            ))
          ) : (
            historyItems.map((item) => (
              <ItemRow
                key={item.tmdb_id}
                tmdb_id={item.tmdb_id}
                title={item.title}
                poster={item.poster}
                year={item.year}
                genres={item.genres}
                rating={item.rating}
                timestamp={item.viewedAt}
                onRemove={() => onRemoveFromHistory(item.tmdb_id)}
                onFindMatches={() => { onClose(); onFindMatches(item.tmdb_id, item.title); }}
              />
            ))
          )}
        </div>

        {/* Footer clear button */}
        {!isEmpty && (
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <button
              onClick={activeTab === "watchlist" ? onClearWatchlist : onClearHistory}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs text-[#5C5A58] hover:text-red-400 hover:bg-red-500/[0.06] border border-white/[0.05] hover:border-red-500/[0.2] transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear {activeTab === "watchlist" ? "Watchlist" : "History"}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
