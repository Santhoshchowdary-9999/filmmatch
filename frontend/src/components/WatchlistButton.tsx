"use client";

import React from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface WatchlistButtonProps {
  isInWatchlist: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  isInWatchlist,
  onToggle,
  size = "sm",
  className = "",
  title,
}) => {
  const sizeClasses =
    size === "sm"
      ? "w-6 h-6 p-1"
      : "w-8 h-8 p-1.5";

  const iconSize = size === "sm" ? 14 : 18;

  return (
    <button
      onClick={onToggle}
      title={title ?? (isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist")}
      aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={isInWatchlist}
      className={`
        ${sizeClasses} rounded-md flex items-center justify-center
        transition-all duration-150 z-20
        ${isInWatchlist
          ? "bg-[rgba(240,180,41,0.2)] border border-[rgba(240,180,41,0.4)] text-[var(--amber)]"
          : "bg-[rgba(11,11,13,0.65)] border border-white/[0.12] text-[#A8A5A0] hover:text-[var(--amber)] hover:border-[rgba(240,180,41,0.35)]"
        }
        ${className}
      `}
    >
      {isInWatchlist ? (
        <BookmarkCheck style={{ width: iconSize, height: iconSize }} />
      ) : (
        <Bookmark style={{ width: iconSize, height: iconSize }} />
      )}
    </button>
  );
};
