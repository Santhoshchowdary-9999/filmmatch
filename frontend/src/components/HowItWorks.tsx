"use client";

import React from "react";
import { Layers, MessageSquareText, Users, Sparkles, CheckCircle2, Calculator, ArrowRight, Film } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      id: "pillar-story",
      step: "01",
      title: "Story & Genre DNA",
      weight: "50% Weight",
      icon: Layers,
      color: "from-indigo-500 to-blue-600",
      accentBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      description:
        "Analyzes structural narrative components: plot overview, director style, top cast members, keywords, and original regional language to build a high-dimensional vector space using TF-IDF bigrams.",
      bullets: [
        "Weighted metadata soup (2x Director & Genres)",
        "Token-merged actor & filmmaker names",
        "Multilingual regional language indexing",
      ],
    },
    {
      id: "pillar-sentiment",
      step: "02",
      title: "Audience Sentiment",
      weight: "20% Weight",
      icon: MessageSquareText,
      color: "from-violet-500 to-purple-600",
      accentBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      description:
        "Evaluates emotional valence across thousands of real audience reviews directly from TMDB viewers using NLTK VADER sentiment analysis, normalized linearly to 0–100%.",
      bullets: [
        "Real audience review compound polarity",
        "Punctuation and intensity-aware scoring",
        "Graceful narrative tone overview fallback",
      ],
    },
    {
      id: "pillar-collab",
      step: "03",
      title: "Viewer Preferences",
      weight: "30% Weight",
      icon: Users,
      color: "from-cyan-500 to-teal-600",
      accentBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      description:
        "Leverages 100,000+ ratings from MovieLens strictly mapped to TMDB IDs via links.csv. Employs mean-centered item-item cosine similarity to capture authentic viewer affinity patterns.",
      bullets: [
        "Strict links.csv TMDB ID verification (9,734 films)",
        "Mean-centered user rating bias correction",
        "Explainable cold-start fallback for new releases",
      ],
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-24 sm:scroll-mt-28 py-16 md:py-24 border-t border-white/[0.06] bg-obsidian-200/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Explainable Tripartite Recommendation Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans">
            How the Hybrid Recommendation Engine Works
          </h2>
          <p className="text-sm sm:text-base text-gray-300/80 mt-3 leading-relaxed font-normal">
            Unlike black-box opaque recommendation algorithms, FilmMatch AI synthesizes three independent intelligence layers into an explainable, deterministic hybrid match score.
          </p>
        </div>

        {/* Three Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                id={item.id}
                className="scroll-mt-28 relative rounded-3xl bg-surface-1/90 border border-white/[0.08] hover:border-indigo-500/40 p-6 sm:p-8 shadow-xl hover:shadow-glow-card transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-white/20 font-mono">
                      {item.step}
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-xl bg-surface-2 text-white border border-white/[0.08]">
                      {item.weight}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center space-x-3 mb-3.5">
                    <div className={`p-3 rounded-2xl border ${item.accentBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-white font-sans">
                      {item.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed mb-6 font-normal">
                    {item.description}
                  </p>
                </div>

                {/* Bullets */}
                <div className="space-y-2.5 pt-5 border-t border-white/[0.06]">
                  {item.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-start space-x-2 text-xs text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 50/20/30 Worked Calculation Example Box (RRR -> Baahubali) */}
        <div className="mt-12 rounded-3xl bg-surface-1/80 border border-indigo-500/30 p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-600/10 via-violet-600/10 to-transparent blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white font-sans">
                    Concrete Worked Example: 50 / 20 / 30 Weighting Formula
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  How FilmMatch AI calculates the exact match score when searching for <strong className="text-indigo-300">RRR</strong> and recommending <strong className="text-cyan-300">Baahubali: The Beginning</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-surface-2 border border-white/[0.08] text-xs font-semibold text-gray-300">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>RRR</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-cyan-300">Baahubali (Rank #1)</span>
            </div>
          </div>

          {/* Calculation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mt-6">
            {/* Story & Genre */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-2/60 border border-indigo-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Story & Genre DNA
                </div>
                <div className="text-xs text-gray-400 leading-relaxed mb-3">
                  Shared S.S. Rajamouli direction, period epic action themes & Telugu language soup.
                </div>
              </div>
              <div className="pt-3 border-t border-white/[0.06] font-mono">
                <div className="text-xs text-gray-400">Raw Score: 82%</div>
                <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                  82 × 50% = <span className="text-indigo-300 font-black">41.0</span>
                </div>
              </div>
            </div>

            {/* Audience Sentiment */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-2/60 border border-violet-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-400 mb-1">
                  Audience Sentiment
                </div>
                <div className="text-xs text-gray-400 leading-relaxed mb-3">
                  NLTK VADER polarity on real TMDB audience reviews normalized to 0–100%.
                </div>
              </div>
              <div className="pt-3 border-t border-white/[0.06] font-mono">
                <div className="text-xs text-gray-400">Raw Score: 76%</div>
                <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                  76 × 20% = <span className="text-violet-300 font-black">15.2</span>
                </div>
              </div>
            </div>

            {/* Viewer Preferences */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-2/60 border border-cyan-500/20 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
                  Viewer Preferences
                </div>
                <div className="text-xs text-gray-400 leading-relaxed mb-3">
                  MovieLens mean-centered item-item collaborative co-rating cosine affinity.
                </div>
              </div>
              <div className="pt-3 border-t border-white/[0.06] font-mono">
                <div className="text-xs text-gray-400">Raw Score: 88%</div>
                <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                  88 × 30% = <span className="text-cyan-300 font-black">26.4</span>
                </div>
              </div>
            </div>

            {/* Final Match Total */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-surface-2 to-surface-1 border border-indigo-400/40 flex flex-col justify-between shadow-glow-indigo">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Final Match Score
                </div>
                <div className="text-xs text-gray-300 leading-relaxed mb-3">
                  Weighted tripartite fusion produced deterministic final recommendation ranking.
                </div>
              </div>
              <div className="pt-3 border-t border-white/[0.1] font-mono">
                <div className="text-[11px] text-gray-400">41.0 + 15.2 + 26.4</div>
                <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-300 to-cyan-300 mt-0.5">
                  = 82.6%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
