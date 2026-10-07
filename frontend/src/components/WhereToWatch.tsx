"use client";

import React from "react";
import { WatchProvidersData } from "@/types";

interface WhereToWatchProps {
  watchProviders?: WatchProvidersData | null;
  className?: string;
}

export const WhereToWatch: React.FC<WhereToWatchProps> = ({ watchProviders, className = "" }) => {
  const wp = watchProviders;
  const hasAny = wp && ((wp.flatrate?.length ?? 0) > 0 || (wp.rent?.length ?? 0) > 0 || (wp.buy?.length ?? 0) > 0);

  return (
    <div className={`p-4 rounded-xl bg-surface-2 border border-white/[0.06] ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#A8A5A0] flex items-center gap-1.5">
          <span>🎬</span> Where to Watch (India)
        </h3>
        {wp?.link && (
          <a
            href={wp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[var(--amber)] hover:underline transition-colors"
            aria-label="View streaming options on JustWatch"
          >
            JustWatch ↗
          </a>
        )}
      </div>

      {hasAny ? (
        <div className="space-y-2.5">
          {([
            { key: "flatrate" as const, label: "Stream" },
            { key: "rent" as const, label: "Rent" },
            { key: "buy" as const, label: "Buy" },
          ] as const).map(({ key, label }) => {
            const items = wp?.[key];
            if (!items || items.length === 0) return null;
            return (
              <div key={key} className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] text-[#5C5A58] font-mono w-12 flex-shrink-0 uppercase font-semibold">
                  {label}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {items.map((p) => (
                    <div
                      key={p.provider_id}
                      className="group relative flex items-center justify-center"
                      title={p.provider_name}
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/original${p.logo_path.startsWith("/") ? p.logo_path : "/" + p.logo_path}`}
                        alt={p.provider_name}
                        className="w-8 h-8 rounded-lg object-cover border border-white/[0.10] hover:scale-105 transition-transform"
                        onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[#5C5A58] italic">Streaming information unavailable</p>
      )}
    </div>
  );
};
