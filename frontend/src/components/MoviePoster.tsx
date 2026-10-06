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

  React.useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [formattedUrl]);

  // ── Fallback (no poster or load error) ──
  if (!formattedUrl || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 p-3 text-center select-none gap-2">
        <div className="p-2.5 rounded-xl bg-surface-3 border border-white/[0.06]">
          <Film className="w-5 h-5 text-[#3C3A38]" />
        </div>
        <p className="text-[11px] font-medium text-[#5C5A58] line-clamp-2 leading-snug max-w-[90%]">
          {alt || "Unknown Title"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* ── Quiet skeleton — no pulse flash ── */}
      {!isLoaded && (
        <div className="absolute inset-0 skeleton" aria-hidden="true" />
      )}

      <img
        src={formattedUrl}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};
