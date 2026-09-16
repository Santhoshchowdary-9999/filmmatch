"use client";

import React, { useState } from "react";
import { Film } from "lucide-react";
import { getTmdbPosterUrl } from "@/utils/image";

interface MoviePosterProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export const MoviePoster: React.FC<MoviePosterProps> = ({
  src,
  alt,
  className = "w-full h-full object-cover",
  priority = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const formattedUrl = getTmdbPosterUrl(src);

  // Reset image load/error state if URL changes
  React.useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [formattedUrl]);

  // Graceful fallback — no poster or image failed to load
  if (!formattedUrl || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4 text-center select-none">
        {/* Clean Icon Container */}
        <div className="relative z-10 flex flex-col items-center gap-2.5">
          <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 backdrop-blur-sm">
            <Film className="w-7 h-7 text-indigo-400/70" />
          </div>
          {/* Title — always shown, never blank */}
          <p className="text-[12px] font-bold text-gray-200 line-clamp-3 leading-snug max-w-[90%]">
            {alt || "Unknown Title"}
          </p>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400/50 mt-0.5">
            No Poster
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-surface-3">
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-2 to-surface-3 animate-pulse flex items-center justify-center">
          <Film className="w-5 h-5 text-gray-600/50" />
        </div>
      )}

      <img
        src={formattedUrl}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};
