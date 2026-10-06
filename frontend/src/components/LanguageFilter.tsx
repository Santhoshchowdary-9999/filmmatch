"use client";

import React from "react";

interface LanguageFilterProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

const LANGUAGES = [
  { label: "All Cinema",      code: "all" },
  { label: "Telugu",          code: "te" },
  { label: "Hindi",           code: "hi" },
  { label: "Tamil",           code: "ta" },
  { label: "Malayalam",       code: "ml" },
  { label: "Kannada",         code: "kn" },
  { label: "English / Global", code: "global" },
];

export const LanguageFilter: React.FC<LanguageFilterProps> = ({
  selectedLanguage,
  onSelectLanguage,
}) => (
  /* Horizontal scroll-snap on mobile, flex-wrap on desktop */
  <div
    className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 sm:flex-wrap"
    style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
    role="group"
    aria-label="Filter cinema by language"
  >
    {LANGUAGES.map(lang => {
      const active = selectedLanguage === lang.code;
      return (
        <button
          key={lang.code}
          onClick={() => onSelectLanguage(lang.code)}
          aria-pressed={active}
          aria-label={`Show ${lang.label} films`}
          style={{ scrollSnapAlign: "start" }}
          className={`
            shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold
            whitespace-nowrap transition-all duration-150
            ${active
              ? "bg-[var(--amber)] text-[#0B0B0D] shadow-amber-btn"
              : "bg-surface-2 text-[#A8A5A0] hover:text-warm-white border border-white/[0.07] hover:border-white/[0.12]"
            }
          `}
        >
          {lang.label}
        </button>
      );
    })}
  </div>
);
