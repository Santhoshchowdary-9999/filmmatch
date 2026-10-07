"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { X, ArrowLeftRight, Star, Trophy } from "lucide-react";
import { CatalogMovie, MovieRecommendation } from "@/types";
import { MoviePoster } from "./MoviePoster";

type ComparableMovie = CatalogMovie | MovieRecommendation;

interface CompareModalProps {
  movieA: ComparableMovie | null;
  movieB: ComparableMovie | null;
  onClose: () => void;
  onFindMatches: (tmdb_id: number, title: string) => void;
}

function getField(movie: ComparableMovie) {
  const isRec = "hybrid_score" in movie;
  return {
    poster: isRec ? (movie as MovieRecommendation).poster_url : (movie as CatalogMovie).poster,
    year: isRec
      ? (movie as MovieRecommendation).release_date?.slice(0, 4)
      : (movie as CatalogMovie).year,
    rating: isRec
      ? (movie as MovieRecommendation).vote_average
      : (movie as CatalogMovie).rating,
    language: isRec
      ? (movie as MovieRecommendation).original_language
      : (movie as CatalogMovie).languageCode,
    matchPct: isRec ? (movie as MovieRecommendation).match_percentage : null,
    breakdown: isRec ? (movie as MovieRecommendation).score_breakdown : null,
    hybrid: isRec ? (movie as MovieRecommendation).hybrid_score : null,
  };
}

function ScoreBar({
  label,
  value,
  color,
  winner,
}: {
  label: string;
  value: number | null;
  color: string;
  winner: boolean;
}) {
  const pct = value !== null ? Math.round(value * 100) : null;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-[#5C5A58]">{label}</span>
        <span className={`font-bold font-mono ${winner ? "text-[var(--amber)]" : ""}`} style={{ color: winner ? undefined : color }}>
          {pct !== null ? `${pct}%` : "—"}
          {winner && <span className="ml-1">▲</span>}
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct ?? 0}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
    </div>
  );
}

export const CompareModal: React.FC<CompareModalProps> = ({
  movieA,
  movieB,
  onClose,
  onFindMatches,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (movieA && movieB) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [movieA, movieB]);

  if (!movieA || !movieB) return null;

  const a = getField(movieA);
  const b = getField(movieB);

  // Determine winners (higher = better)
  const ratingWinner = (a.rating ?? 0) >= (b.rating ?? 0) ? "A" : "B";
  const matchWinner = a.hybrid !== null && b.hybrid !== null
    ? (a.hybrid >= b.hybrid ? "A" : "B")
    : null;

  const contentWinner =
    a.breakdown && b.breakdown
      ? a.breakdown.content_similarity >= b.breakdown.content_similarity ? "A" : "B"
      : null;
  const sentimentWinner =
    a.breakdown && b.breakdown
      ? a.breakdown.sentiment_score >= b.breakdown.sentiment_score ? "A" : "B"
      : null;
  const collabWinner =
    a.breakdown?.collaborative_score !== null &&
    b.breakdown?.collaborative_score !== null &&
    a.breakdown?.collaborative_score !== undefined &&
    b.breakdown?.collaborative_score !== undefined
      ? a.breakdown.collaborative_score >= b.breakdown.collaborative_score ? "A" : "B"
      : null;

  const [compareData, setCompareData] = React.useState<any>(null);

  React.useEffect(() => {
    if (movieA && movieB) {
      import("@/utils/api").then(({ compareMoviesApi }) => {
        compareMoviesApi([movieA.tmdb_id, movieB.tmdb_id])
          .then((res) => setCompareData(res))
          .catch(() => setCompareData(null));
      });
    }
  }, [movieA?.tmdb_id, movieB?.tmdb_id]);

  const itemA = compareData?.items?.find((i: any) => i.tmdb_id === movieA.tmdb_id);
  const itemB = compareData?.items?.find((i: any) => i.tmdb_id === movieB.tmdb_id);

  const MovieCol = ({ movie, field, side, details }: { movie: ComparableMovie; field: ReturnType<typeof getField>; side: "A" | "B"; details?: any }) => (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-3">
      {/* Poster */}
      <div className="w-24 h-36 sm:w-32 sm:h-48 rounded-xl overflow-hidden shadow-poster border border-white/[0.1]">
        <MoviePoster src={field.poster} alt={movie.title} />
      </div>

      {/* Title + meta */}
      <div className="text-center px-2">
        <h3 className="text-sm font-bold text-[#F0EDE8] leading-snug">{movie.title}</h3>
        <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-[#5C5A58]">
          {field.year && <span className="font-mono">{field.year}</span>}
          {details?.runtime && <span className="font-mono">{details.runtime}m</span>}
          {field.language && (
            <span className="px-1.5 py-0.5 rounded bg-surface-3 border border-white/[0.06] uppercase font-bold">
              {field.language}
            </span>
          )}
        </div>
        {field.matchPct !== null && (
          <div className="mt-1.5 badge-match mx-auto w-fit">
            {field.matchPct}% Match
          </div>
        )}
      </div>

      {/* Rating */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
        ratingWinner === side ? "bg-[rgba(240,180,41,0.12)] border border-[rgba(240,180,41,0.3)]" : "bg-surface-2 border border-white/[0.06]"
      }`}>
        <Star className={`w-3 h-3 fill-current ${ratingWinner === side ? "text-[var(--gold)]" : "text-[#5C5A58]"}`} />
        <span className={`text-xs font-bold font-mono ${ratingWinner === side ? "text-[var(--gold)]" : "text-[#5C5A58]"}`}>
          {(field.rating ?? 0).toFixed(1)}
        </span>
        {details?.vote_count ? (
          <span className="text-[10px] text-[#888580] font-mono">({details.vote_count.toLocaleString()})</span>
        ) : null}
        {ratingWinner === side && <Trophy className="w-3 h-3 text-[var(--amber)]" />}
      </div>

      {/* Audience Sentiment Label */}
      {details?.sentiment_summary && (
        <div className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[#C4B5FD] font-medium">
          Sentiment: {details.sentiment_summary} ({Math.round(details.sentiment_score * 100)}%)
        </div>
      )}

      {/* Score breakdown (recommendations only) */}
      {field.breakdown && (
        <div className="w-full space-y-2">
          <ScoreBar label="Story DNA" value={field.breakdown.content_similarity} color="#D9A441" winner={contentWinner === side} />
          <ScoreBar label="Audience" value={field.breakdown.sentiment_score} color="#9B7DD4" winner={sentimentWinner === side} />
          <ScoreBar label="Viewer Affinity" value={field.breakdown.collaborative_score} color="#22D3EE" winner={collabWinner === side} />
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {details && (
        <div className="w-full text-left space-y-2 mt-2 pt-2 border-t border-white/[0.06]">
          {details.strengths?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Strengths</p>
              <ul className="space-y-0.5 text-[11px] text-[#A8A5A0]">
                {details.strengths.slice(0, 2).map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-emerald-400">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {details.weaknesses?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Considerations</p>
              <ul className="space-y-0.5 text-[11px] text-[#888580]">
                {details.weaknesses.slice(0, 2).map((w: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-amber-400">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => { onClose(); onFindMatches(movie.tmdb_id, movie.title); }}
        className="w-full btn-ghost text-xs py-2 rounded-lg mt-auto"
        aria-label={`Find matches for ${movie.title}`}
      >
        Find Matches
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Compare movies"
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(11,11,13,0.9)] backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden z-10 animate-scale-in shadow-modal"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[var(--amber)]" />
            <h2 className="text-base font-bold text-[#F0EDE8]">Compare Films</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[rgba(11,11,13,0.6)] border border-white/[0.08] text-[#A8A5A0] hover:text-white"
            aria-label="Close comparison"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex gap-4 sm:gap-6">
            <MovieCol movie={movieA} field={a} side="A" details={itemA} />
            {/* VS divider */}
            <div className="flex flex-col items-center justify-center gap-2 shrink-0">
              <div className="w-px flex-1 bg-white/[0.06]" />
              <span className="text-xs font-black text-[#3C3A38] tracking-widest">VS</span>
              <div className="w-px flex-1 bg-white/[0.06]" />
            </div>
            <MovieCol movie={movieB} field={b} side="B" details={itemB} />
          </div>
        </div>
      </div>
    </div>
  );
};
