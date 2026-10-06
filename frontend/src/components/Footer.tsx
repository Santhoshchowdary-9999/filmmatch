"use client";

import React from "react";
import { Film } from "lucide-react";
import Image from "next/image";

export const Footer: React.FC = () => (
  <footer className="w-full border-t border-white/[0.06] py-12 text-[#8E8B85] text-xs" style={{ backgroundColor: "var(--surface-1)" }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/[0.05]">

        {/* Brand */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-white/[0.08] flex items-center justify-center">
              <Film className="w-4 h-4" style={{ color: "var(--gold)" }} />
            </div>
            <span className="font-display text-base font-bold text-warm-white" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
              FilmMatch <span style={{ color: "var(--amber)" }}>AI</span>
            </span>
          </div>
          <p className="text-[#8E8B85] text-xs leading-relaxed max-w-sm">
            Full-stack AI recommendation engine combining Story DNA (TF-IDF), Audience Sentiment (NLTK VADER),
            and Collaborative Filtering (MovieLens) with transparent, explainable scores.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Image
              src="/tmdb-logo.svg"
              alt="TMDB Logo"
              width={65}
              height={27}
              className="h-6 w-auto object-contain"
            />
            <p className="text-[11px] text-[#A8A5A0] leading-snug">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>

        {/* Regional */}
        <div>
          <h4 className="text-[#D4D1CA] text-[11px] font-bold uppercase tracking-wider mb-3">
            Regional Coverage
          </h4>
          <ul className="space-y-1.5 text-[#8E8B85]">
            {["Telugu Cinema (Tollywood)", "Hindi Cinema (Bollywood)", "Tamil Cinema (Kollywood)", "Malayalam & Kannada Cinema", "Global & International Films"].map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Attribution & Citations */}
        <div>
          <h4 className="text-[#D4D1CA] text-[11px] font-bold uppercase tracking-wider mb-3">
            Data Attribution & Research
          </h4>
          <div className="space-y-2 text-[#8E8B85] text-[11px] leading-relaxed">
            <p>
              <strong className="text-[#A8A5A0]">MovieLens Dataset:</strong> Provided by GroupLens Research at the University of Minnesota. Licensed for non-commercial research use only.
            </p>
            <p className="text-[10px] text-[#716E68]">
              Citation: F. Maxwell Harper and Joseph A. Konstan. 2015. The MovieLens Datasets: History and Context. ACM TIIS 5, 4, Article 19.
            </p>
            <p className="pt-1">
              <strong className="text-[#A8A5A0]">JustWatch:</strong>{" "}
              Streaming availability data provided by JustWatch.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8E8B85]">
        <p>
          © {new Date().getFullYear()} FilmMatch AI. All movie metadata and images courtesy of TMDB. Licensed under the MIT License.
        </p>
        <p className="text-[#8E8B85]/80">Cinematic · Precise · Explainable</p>
      </div>
    </div>
  </footer>
);
