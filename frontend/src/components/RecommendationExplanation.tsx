"use client";

import React from "react";
import { CheckCircle2, Sparkles, HelpCircle } from "lucide-react";
import { ExplanationDetails, ScoreBreakdown } from "@/types";

interface RecommendationExplanationProps {
  explanationDetails?: ExplanationDetails;
  scoreBreakdown?: ScoreBreakdown;
  className?: string;
  sourceTitle?: string;
}

export const RecommendationExplanation: React.FC<RecommendationExplanationProps> = ({
  explanationDetails,
  scoreBreakdown,
  className = "",
  sourceTitle,
}) => {
  // Use structured reasons if available, otherwise synthesize from actual breakdown signals
  const reasons: string[] = [];

  if (explanationDetails?.reasons && explanationDetails.reasons.length > 0) {
    reasons.push(...explanationDetails.reasons);
  } else if (scoreBreakdown) {
    const cPct = Math.round(scoreBreakdown.content_similarity * 100);
    if (sourceTitle) {
      reasons.push(`${cPct}% narrative and story DNA match with ${sourceTitle}`);
    } else {
      reasons.push(`${cPct}% story and narrative similarity`);
    }

    const sVal = scoreBreakdown.sentiment_score;
    if (sVal >= 0.75) {
      reasons.push(`Overwhelming audience praise (${Math.round(sVal * 100)}% positive sentiment)`);
    } else if (sVal >= 0.55) {
      reasons.push(`Favorable viewer reviews (${Math.round(sVal * 100)}% positive approval)`);
    } else {
      reasons.push("Balanced critical and audience reception");
    }

    if (!scoreBreakdown.is_cold_start && scoreBreakdown.collaborative_score !== null) {
      const vPct = Math.round(scoreBreakdown.collaborative_score * 100);
      if (vPct >= 40) {
        reasons.push(`Viewers with matching taste patterns loved this film (${vPct}% affinity)`);
      }
    } else {
      reasons.push("Trending release match based on theme and reception");
    }

    if (scoreBreakdown.explanation && !reasons.includes(scoreBreakdown.explanation)) {
      reasons.push(scoreBreakdown.explanation);
    }
  }

  if (reasons.length === 0) return null;

  return (
    <div
      className={`rounded-xl bg-surface-1/80 border border-white/[0.08] p-4 text-sm ${className}`}
      data-testid="recommendation-explanation"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[var(--amber)]" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-warm-white">
          {explanationDetails?.title || "Why this movie?"}
        </h4>
      </div>

      <ul className="space-y-2">
        {reasons.slice(0, 4).map((reason, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-xs text-[#A8A5A0] leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
