"use client";

import React from "react";
import { ScoreBreakdown } from "@/types";
import { BookOpen, HeartHandshake, Users, Award } from "lucide-react";

interface ScoreBreakdownVisualProps {
  scoreBreakdown: ScoreBreakdown;
  matchPercentage: number;
  hybridScore?: number;
  className?: string;
}

export const ScoreBreakdownVisual: React.FC<ScoreBreakdownVisualProps> = ({
  scoreBreakdown,
  matchPercentage,
  hybridScore,
  className = "",
}) => {
  const contentPct = Math.min(100, Math.max(0, Math.round(scoreBreakdown.content_similarity * 100)));
  const sentimentPct = Math.min(100, Math.max(0, Math.round(scoreBreakdown.sentiment_score * 100)));
  const collabPct =
    scoreBreakdown.collaborative_score !== null && scoreBreakdown.collaborative_score !== undefined
      ? Math.min(100, Math.max(0, Math.round(scoreBreakdown.collaborative_score * 100)))
      : null;

  return (
    <div
      className={`rounded-xl bg-surface-1/70 border border-white/[0.08] p-4 text-xs font-sans ${className}`}
      data-testid="score-breakdown-visual"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[var(--amber)]" />
          <span className="font-bold text-warm-white uppercase tracking-wider text-[11px]">
            Score Breakdown
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-[#A8A5A0]">Match:</span>
          <span className="text-sm font-black font-mono text-[var(--amber)]">
            {matchPercentage}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* ── Story DNA (Content Similarity) ── */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#C4C2BE]">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              Content Similarity
            </span>
            <span className="font-mono font-semibold text-warm-white">{contentPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-500"
              style={{ width: `${contentPct}%` }}
            />
          </div>
        </div>

        {/* ── Audience Sentiment ── */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#C4C2BE]">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
              Audience Sentiment
            </span>
            <span className="font-mono font-semibold text-warm-white">{sentimentPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${sentimentPct}%` }}
            />
          </div>
        </div>

        {/* ── Viewer Affinity (Collaborative Filtering) ── */}
        <div>
          <div className="flex justify-between items-center mb-1 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#C4C2BE]">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Viewer Affinity
            </span>
            <span className="font-mono font-semibold text-warm-white">
              {collabPct !== null ? `${collabPct}%` : "Cold Start"}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full transition-all duration-500"
              style={{ width: collabPct !== null ? `${collabPct}%` : "35%" }}
            />
          </div>
          {collabPct === null && (
            <p className="mt-1 text-[10px] text-[#7A7875] italic">
              New entry: weighted toward Story DNA (65%) and Sentiment (35%).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
