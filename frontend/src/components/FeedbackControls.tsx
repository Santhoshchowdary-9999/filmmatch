"use client";

import React, { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Star, Check } from "lucide-react";
import { sendFeedback, getSessionId } from "@/utils/api";

interface FeedbackControlsProps {
  tmdbId: number;
  sourceTmdbId?: number | null;
  hybridScore?: number;
  isColdStart?: boolean;
  className?: string;
  onFeedbackSubmitted?: (vote: "like" | "dislike", rating?: number) => void;
}

export const FeedbackControls: React.FC<FeedbackControlsProps> = ({
  tmdbId,
  sourceTmdbId,
  hybridScore,
  isColdStart = false,
  className = "",
  onFeedbackSubmitted,
}) => {
  const [currentVote, setCurrentVote] = useState<"like" | "dislike" | null>(null);
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Load any previously saved vote from localStorage cache for instant UI response
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`fm_fb_${tmdbId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.vote) setCurrentVote(parsed.vote);
          if (parsed.rating) setCurrentRating(parsed.rating);
        } catch {
          // ignore parsing error
        }
      }
    }
  }, [tmdbId]);

  const handleVote = async (vote: "like" | "dislike") => {
    if (submitting) return;
    setSubmitting(true);
    const newVote = currentVote === vote ? null : vote;
    setCurrentVote(newVote);

    if (newVote) {
      try {
        await sendFeedback({
          recommended_tmdb_id: tmdbId,
          source_tmdb_id: sourceTmdbId,
          vote: newVote,
          rating: currentRating,
          hybrid_score: hybridScore,
          is_cold_start: isColdStart,
        });

        if (typeof window !== "undefined") {
          localStorage.setItem(
            `fm_fb_${tmdbId}`,
            JSON.stringify({ vote: newVote, rating: currentRating })
          );
        }

        setSavedMessage(newVote === "like" ? "Liked! We'll recommend more like this." : "Got it, tuned out of your feed.");
        setTimeout(() => setSavedMessage(null), 2500);

        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(newVote, currentRating ?? undefined);
        }
      } catch (err) {
        console.error("Failed to submit feedback:", err);
      }
    }
    setSubmitting(false);
  };

  const handleRating = async (ratingVal: number) => {
    if (submitting) return;
    setSubmitting(true);
    setCurrentRating(ratingVal);
    const vote = ratingVal >= 3 ? "like" : "dislike";
    setCurrentVote(vote);

    try {
      await sendFeedback({
        recommended_tmdb_id: tmdbId,
        source_tmdb_id: sourceTmdbId,
        vote: vote,
        rating: ratingVal,
        hybrid_score: hybridScore,
        is_cold_start: isColdStart,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(
          `fm_fb_${tmdbId}`,
          JSON.stringify({ vote, rating: ratingVal })
        );
      }

      setSavedMessage(`Rated ${ratingVal}★! Saved to your profile taste.`);
      setTimeout(() => setSavedMessage(null), 2500);

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(vote, ratingVal);
      }
    } catch (err) {
      console.error("Failed to submit rating:", err);
    }
    setSubmitting(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Like / Dislike buttons */}
        <div className="flex items-center gap-1.5 bg-surface-1/90 border border-white/[0.08] rounded-lg p-1">
          <button
            onClick={() => handleVote("like")}
            disabled={submitting}
            aria-label="Like recommendation"
            title="Like this film"
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-semibold ${
              currentVote === "like"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-[#A8A5A0] hover:text-warm-white hover:bg-white/[0.06]"
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${currentVote === "like" ? "fill-current" : ""}`} />
            <span>Like</span>
          </button>

          <button
            onClick={() => handleVote("dislike")}
            disabled={submitting}
            aria-label="Dislike recommendation"
            title="Dislike this film"
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-semibold ${
              currentVote === "dislike"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "text-[#A8A5A0] hover:text-warm-white hover:bg-white/[0.06]"
            }`}
          >
            <ThumbsDown className={`w-3.5 h-3.5 ${currentVote === "dislike" ? "fill-current" : ""}`} />
            <span>Dislike</span>
          </button>
        </div>

        {/* 1-5 Star Rating */}
        <div
          className="flex items-center gap-1 bg-surface-1/90 border border-white/[0.08] rounded-lg px-2 py-1"
          title="Rate this movie (1-5 stars)"
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = (hoverRating ?? currentRating ?? 0) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-0.5 text-zinc-500 hover:scale-110 transition-transform"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isFilled ? "text-[var(--amber)] fill-[var(--amber)]" : "text-[#5C5A58]"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 animate-fade-in font-medium">
          <Check className="w-3 h-3" />
          <span>{savedMessage}</span>
        </div>
      )}
    </div>
  );
};
