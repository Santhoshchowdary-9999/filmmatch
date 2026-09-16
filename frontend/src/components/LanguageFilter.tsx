"use client";

import React from "react";

interface LanguageFilterProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const LanguageFilter: React.FC<LanguageFilterProps> = ({
  selectedLanguage,
  onSelectLanguage,
}) => {
  const languages = [
    { label: "All Cinema", code: "all" },
    { label: "Telugu", code: "te" },
    { label: "Hindi", code: "hi" },
    { label: "Tamil", code: "ta" },
    { label: "Malayalam", code: "ml" },
    { label: "Kannada", code: "kn" },
    { label: "English / Global", code: "global" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 max-w-full overflow-x-auto pb-1 scrollbar-none">
      {languages.map((lang) => {
        const isSelected = selectedLanguage === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => onSelectLanguage(lang.code)}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              isSelected
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-glow-indigo border border-indigo-400/40"
                : "bg-surface-2/70 text-gray-300 hover:text-white hover:bg-surface-3 border border-white/[0.06]"
            }`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};
