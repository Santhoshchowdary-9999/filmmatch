"use client";

import React from "react";
import { Layers, MessageSquareText, Users, CheckCircle2, Calculator, ArrowRight, Film } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const pillars = [
    {
      id: "pillar-story",
      step: "01",
      title: "Story & Genre DNA",
      weight: "50%",
      icon: Layers,
      accentColor: "var(--gold)",
      accentBg: "rgba(217,164,65,0.1)",
      accentBorder: "rgba(217,164,65,0.2)",
      description:
        "Analyses structural narrative components: plot overview, director style, top cast members, keywords, and original regional language to build a high-dimensional vector space using TF-IDF bigrams.",
      bullets: [
        "Weighted metadata soup (2× Director & Genres)",
        "Token-merged actor & filmmaker names",
        "Multilingual regional language indexing",
      ],
    },
    {
      id: "pillar-sentiment",
      step: "02",
      title: "Audience Sentiment",
      weight: "20%",
      icon: MessageSquareText,
      accentColor: "var(--violet-light)",
      accentBg: "rgba(155,125,212,0.1)",
      accentBorder: "rgba(155,125,212,0.2)",
      description:
        "Evaluates emotional valence across thousands of real audience reviews from TMDB viewers using NLTK VADER sentiment analysis, normalised linearly to 0–100%.",
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
      weight: "30%",
      icon: Users,
      accentColor: "#22D3EE",
      accentBg: "rgba(34,211,238,0.08)",
      accentBorder: "rgba(34,211,238,0.18)",
      description:
        "Leverages 100,000+ ratings from MovieLens strictly mapped to TMDB IDs via links.csv. Employs mean-centred item-item cosine similarity to capture authentic viewer affinity patterns.",
      bullets: [
        "Strict links.csv TMDB ID verification (9,734 films)",
        "Mean-centred user rating bias correction",
        "Explainable cold-start fallback for new releases",
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 py-16 md:py-24 border-t border-white/[0.05] relative"
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="badge-ai mb-4 inline-flex">Explainable AI</span>
          <h2
            className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-warm-white mb-3"
            style={{ fontFamily: "Outfit, Inter, sans-serif" }}
          >
            How the Engine Works
          </h2>
          <p className="text-sm sm:text-base text-[#5C5A58] leading-relaxed">
            Unlike black-box recommendation algorithms, FilmMatch AI synthesises three independent
            intelligence layers into a transparent, explainable hybrid match score.
          </p>
        </div>

        {/* ── Three Pillar Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map(({ id, step, title, weight, icon: Icon, accentColor, accentBg, accentBorder, description, bullets }) => (
            <div
              key={step}
              id={id}
              className="scroll-mt-24 rounded-2xl p-6 sm:p-7 border border-white/[0.07] hover:border-white/[0.12] transition-colors duration-200 flex flex-col"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-2xl font-black text-[#3C3A38] font-mono">{step}</span>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
                  style={{ color: accentColor, backgroundColor: accentBg, borderColor: accentBorder }}
                >
                  {weight} Weight
                </span>
              </div>

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl border" style={{ backgroundColor: accentBg, borderColor: accentBorder }}>
                  <Icon className="w-4.5 h-4.5" style={{ width: "18px", height: "18px", color: accentColor }} />
                </div>
                <h3 className="text-lg font-bold text-warm-white">{title}</h3>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#5C5A58] leading-relaxed mb-6 flex-1">
                {description}
              </p>

              {/* Bullets */}
              <div className="space-y-2 pt-4 border-t border-white/[0.05]">
                {bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#5C5A58]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: accentColor, opacity: 0.7 }} />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Worked Example ── */}
        <div className="mt-10 rounded-2xl border border-white/[0.07] overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 sm:px-8 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-surface-3 border border-white/[0.07]">
                <Calculator className="w-4.5 h-4.5 text-[#A8A5A0]" style={{ width: "18px", height: "18px" }} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-warm-white">
                  Worked Example: 50 / 20 / 30 Formula
                </h3>
                <p className="text-xs text-[#5C5A58] mt-0.5">
                  Searching <strong className="text-[#A8A5A0]">RRR</strong> → recommending{" "}
                  <strong className="text-[#A8A5A0]">Baahubali: The Beginning</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-3 border border-white/[0.07] text-xs text-[#5C5A58]">
              <Film className="w-3.5 h-3.5" />
              <span>RRR</span>
              <ArrowRight className="w-3 h-3 text-[#3C3A38]" />
              <span className="text-[#A8A5A0]">Baahubali #1</span>
            </div>
          </div>

          {/* Calc grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 sm:p-8">
            {[
              {
                label: "Story & Genre DNA",
                body: "Shared S.S. Rajamouli direction, period epic action themes & Telugu language soup.",
                raw: "82%", weight: "50%", result: "41.0",
                color: "var(--gold)",
                bg: "rgba(217,164,65,0.06)",
                border: "rgba(217,164,65,0.15)",
              },
              {
                label: "Audience Sentiment",
                body: "NLTK VADER polarity on real TMDB audience reviews normalised to 0–100%.",
                raw: "76%", weight: "20%", result: "15.2",
                color: "var(--violet-light)",
                bg: "rgba(155,125,212,0.06)",
                border: "rgba(155,125,212,0.15)",
              },
              {
                label: "Viewer Preferences",
                body: "MovieLens mean-centred item-item collaborative co-rating cosine affinity.",
                raw: "88%", weight: "30%", result: "26.4",
                color: "#22D3EE",
                bg: "rgba(34,211,238,0.06)",
                border: "rgba(34,211,238,0.15)",
              },
              {
                label: "Final Match Score",
                body: "Weighted tripartite fusion — deterministic final recommendation ranking.",
                raw: "41.0 + 15.2 + 26.4",
                weight: null, result: "82.6%",
                color: "var(--amber)",
                bg: "rgba(240,180,41,0.07)",
                border: "rgba(240,180,41,0.18)",
                isFinal: true,
              },
            ].map(({ label, body, raw, weight, result, color, bg, border, isFinal }) => (
              <div
                key={label}
                className="p-4 rounded-xl border flex flex-col justify-between"
                style={{ backgroundColor: bg, borderColor: border }}
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>
                    {label}
                  </div>
                  <p className="text-xs text-[#5C5A58] leading-relaxed mb-4">{body}</p>
                </div>
                <div className="pt-3 border-t border-white/[0.05] font-mono">
                  <div className="text-xs text-[#3C3A38]">{weight ? `Raw: ${raw}` : raw}</div>
                  <div className="text-base sm:text-lg font-black mt-0.5" style={{ color }}>
                    {weight ? `${raw.replace("%", "")} × ${weight} = ${result}` : `= ${result}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
