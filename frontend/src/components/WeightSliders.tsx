"use client";

import React, { useState } from "react";
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

export interface RecommendationWeights {
  content: number;    // 0.0 – 1.0
  sentiment: number;  // 0.0 – 1.0
  collaborative: number; // 0.0 – 1.0
}

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  content: 0.5,
  sentiment: 0.2,
  collaborative: 0.3,
};

interface WeightSlidersProps {
  weights: RecommendationWeights;
  onWeightsChange: (weights: RecommendationWeights) => void;
}

function clamp(v: number) {
  return Math.max(0, Math.min(1, v));
}

function redistributeWeights(
  key: keyof RecommendationWeights,
  newValue: number,
  current: RecommendationWeights
): RecommendationWeights {
  const clamped = clamp(newValue);
  const remaining = clamp(1 - clamped);
  const others = (["content", "sentiment", "collaborative"] as const).filter((k) => k !== key);
  const currentOtherTotal = others.reduce((sum, k) => sum + current[k], 0);

  const next = { ...current, [key]: clamped } as RecommendationWeights;

  if (currentOtherTotal === 0) {
    // Distribute equally
    others.forEach((k) => { next[k] = remaining / 2; });
  } else {
    // Proportional redistribution
    others.forEach((k) => {
      next[k] = clamp((current[k] / currentOtherTotal) * remaining);
    });
  }

  // Normalize to exactly 1.0 (floating-point safety)
  const total = next.content + next.sentiment + next.collaborative;
  if (total > 0) {
    next.content = clamp(next.content / total);
    next.sentiment = clamp(next.sentiment / total);
    next.collaborative = clamp(next.collaborative / total);
  }

  return next;
}

const SLIDER_CONFIG: {
  key: keyof RecommendationWeights;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}[] = [
  {
    key: "content",
    label: "Story DNA",
    description: "Genre, cast & narrative similarity",
    color: "#D9A441",
    bgColor: "rgba(217,164,65,0.15)",
  },
  {
    key: "sentiment",
    label: "Audience Sentiment",
    description: "VADER sentiment from TMDB reviews",
    color: "#9B7DD4",
    bgColor: "rgba(155,125,212,0.15)",
  },
  {
    key: "collaborative",
    label: "Viewer Affinity",
    description: "MovieLens co-rating correlation",
    color: "#22D3EE",
    bgColor: "rgba(34,211,238,0.15)",
  },
];

export const WeightSliders: React.FC<WeightSlidersProps> = ({
  weights,
  onWeightsChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isDefault =
    Math.abs(weights.content - DEFAULT_WEIGHTS.content) < 0.01 &&
    Math.abs(weights.sentiment - DEFAULT_WEIGHTS.sentiment) < 0.01 &&
    Math.abs(weights.collaborative - DEFAULT_WEIGHTS.collaborative) < 0.01;

  const handleSliderChange = (key: keyof RecommendationWeights, value: number) => {
    onWeightsChange(redistributeWeights(key, value, weights));
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
          !isDefault
            ? "bg-[rgba(155,125,212,0.15)] border border-[rgba(155,125,212,0.35)] text-[var(--violet-light)]"
            : "btn-ghost text-[#A8A5A0]"
        }`}
        aria-expanded={isOpen}
        aria-label="Adjust AI recommendation weights"
        id="weight-sliders-btn"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>AI Weights</span>
        {!isDefault && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-light)]" />
        )}
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl glass-dropdown shadow-modal z-30 p-4 animate-scale-in"
          id="weight-sliders-panel"
          role="dialog"
          aria-label="AI recommendation weight controls"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-[#A8A5A0] uppercase tracking-wider">
                AI Weight Controls
              </p>
              <p className="text-[10px] text-[#5C5A58] mt-0.5">
                Weights auto-balance to 100%
              </p>
            </div>
            {!isDefault && (
              <button
                onClick={() => onWeightsChange(DEFAULT_WEIGHTS)}
                className="flex items-center gap-1 text-[10px] text-[#5C5A58] hover:text-[var(--amber)] transition-colors"
                aria-label="Reset weights to default"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {SLIDER_CONFIG.map(({ key, label, description, color, bgColor }) => {
              const pct = Math.round(weights[key] * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-xs font-semibold text-[#F0EDE8]">
                        {label}
                      </span>
                      <p className="text-[10px] text-[#5C5A58]">{description}</p>
                    </div>
                    <span
                      className="text-sm font-black font-mono"
                      style={{ color }}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Track */}
                  <div className="relative h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
                    />
                  </div>

                  {/* Range input (overlaid) */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={pct}
                    onChange={(e) =>
                      handleSliderChange(key, parseInt(e.target.value) / 100)
                    }
                    className="w-full mt-1 h-1.5 appearance-none bg-transparent cursor-pointer"
                    style={{
                      accentColor: color,
                    } as React.CSSProperties}
                    aria-label={`${label} weight`}
                    id={`weight-slider-${key}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Balance bar visualization */}
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-[#5C5A58] mb-2 uppercase tracking-wider font-bold">
              Weight Balance
            </p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {SLIDER_CONFIG.map(({ key, color }) => (
                <div
                  key={key}
                  className="transition-all duration-200"
                  style={{
                    width: `${Math.round(weights[key] * 100)}%`,
                    backgroundColor: color,
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1 text-[9px] font-mono text-[#5C5A58]">
              <span style={{ color: "#D9A441" }}>S {Math.round(weights.content * 100)}%</span>
              <span style={{ color: "#9B7DD4" }}>A {Math.round(weights.sentiment * 100)}%</span>
              <span style={{ color: "#22D3EE" }}>V {Math.round(weights.collaborative * 100)}%</span>
            </div>
          </div>

          {/* Note */}
          <p className="mt-3 text-[9px] text-[#3C3A38] leading-relaxed">
            Changes apply to the next recommendation. Cold-start films use
            fixed 65% Story DNA + 35% Audience weights regardless.
          </p>
        </div>
      )}
    </div>
  );
};
