"use client";

import React from "react";
import { Film, Heart, Shield, Database, Sparkles } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-obsidian-300 py-12 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/[0.06]">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px]">
                <div className="w-full h-full bg-obsidian rounded-[7px] flex items-center justify-center">
                  <Film className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                FilmMatch<span className="text-indigo-400">AI</span>
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-md">
              Full-stack AI recommendation engine combining Content Similarity (TF-IDF), Audience Sentiment (NLTK VADER), and Collaborative Filtering (MovieLens) with transparent, explainable scores.
            </p>
          </div>

          {/* Regional Cinema Focus */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Regional Coverage
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li>Telugu Cinema (Tollywood)</li>
              <li>Hindi Cinema (Bollywood)</li>
              <li>Tamil Cinema (Kollywood)</li>
              <li>Malayalam & Kannada Cinema</li>
              <li>Global & International Films</li>
            </ul>
          </div>

          {/* Technology & Attributions */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Data & Architecture
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li>TMDB API Metadata & Reviews</li>
              <li>MovieLens Collaborative Matrix</li>
              <li>FastAPI & Python 3.14</li>
              <li>Next.js 14 & Tailwind CSS</li>
              <li>Target Database: PostgreSQL</li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimers */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4">
          <p>
            © {new Date().getFullYear()} FilmMatch AI. All movie metadata and posters courtesy of TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="flex items-center space-x-1">
            <span>Built with precision for cinematic discovery</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
