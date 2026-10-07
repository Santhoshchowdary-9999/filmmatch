"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Star, ArrowLeft, ExternalLink, Loader2, AlertCircle,
  ThumbsUp, ThumbsDown, Minus, ArrowRight, Bookmark, BookmarkCheck,
  ArrowLeftRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MoviePoster } from "@/components/MoviePoster";
import { WhereToWatch } from "@/components/WhereToWatch";
import { FeedbackControls } from "@/components/FeedbackControls";
import { CompareModal } from "@/components/CompareModal";
import { fetchFromApi, requestError } from "@/utils/api";
import { useWatchlist } from "@/utils/useWatchlist";
import type { CatalogMovie, WatchProvidersData, MovieRecommendation, RecommendationResponse } from "@/types";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface MovieDetailData {
  watch_providers?: WatchProvidersData | null;
  movie: {
    tmdb_id: number;
    title: string;
    overview: string;
    release_date: string;
    original_language: string;
    poster_url: string;
    backdrop_url: string;
    genres: string[];
    vote_average: number;
    vote_count: number;
    runtime?: number;
    tagline?: string;
    budget?: number;
    revenue?: number;
    status?: string;
    production_companies?: { name: string; logo_path?: string | null }[];
    credits?: {
      cast: { name: string; character: string; profile_path?: string | null }[];
      crew: { name: string; job: string }[];
    };
    videos?: { key: string; site: string; type: string; name: string }[];
    keywords?: string[];
  };
  sentiment: {
    tmdb_id: number;
    sentiment_score: number;
    raw_compound: number;
    review_count: number;
    is_fallback: boolean;
    sentiment_summary: string;
    positive_count?: number;
    neutral_count?: number;
    negative_count?: number;
  };
  reviews_count: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function SentimentBar({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-[#A8A5A0]">
          {icon}
          {label}
        </span>
        <span className="font-bold font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-surface-2 border border-white/[0.06]">
      <span className="text-[10px] text-[#5C5A58] uppercase tracking-wider font-bold">{label}</span>
      <span className="text-sm font-semibold text-[#F0EDE8]">{value}</span>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tmdbId = Number(params?.id);

  const [data, setData] = useState<MovieDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarMovies, setSimilarMovies] = useState<MovieRecommendation[]>([]);
  const [compareMovie, setCompareMovie] = useState<CatalogMovie | MovieRecommendation | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const load = useCallback(async () => {
    if (!tmdbId || isNaN(tmdbId)) { setError("Invalid movie ID."); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFromApi<MovieDetailData>(`/api/movie/${tmdbId}`);
      setData(result);
      fetchFromApi<RecommendationResponse>(`/api/recommend?tmdb_id=${tmdbId}&top_k=6`)
        .then((recRes) => {
          if (recRes?.recommendations) setSimilarMovies(recRes.recommendations);
        })
        .catch(() => {});
    } catch (err) {
      setError(requestError(err));
    } finally {
      setIsLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => { load(); }, [load]);

  const handleFindMatches = () => {
    if (!data) return;
    router.push(`/?recommend=${tmdbId}&title=${encodeURIComponent(data.movie.title)}`);
  };

  const trailerKey = data?.movie.videos?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  )?.key;

  const director = data?.movie.credits?.crew.find((c) => c.job === "Director")?.name;
  const topCast = data?.movie.credits?.cast?.slice(0, 8) ?? [];

  const sentimentScore = data?.sentiment.sentiment_score ?? 0;
  const positiveRatio = data?.sentiment.positive_count !== undefined
    ? data.sentiment.positive_count / Math.max(data.reviews_count, 1)
    : sentimentScore;
  const neutralRatio = data?.sentiment.neutral_count !== undefined
    ? data.sentiment.neutral_count / Math.max(data.reviews_count, 1)
    : Math.max(0, 0.5 - Math.abs(sentimentScore - 0.5));
  const negativeRatio = data?.sentiment.negative_count !== undefined
    ? data.sentiment.negative_count / Math.max(data.reviews_count, 1)
    : 1 - positiveRatio - neutralRatio;

  /* Watchlist shim from movie detail data */
  const watchlistMovie: CatalogMovie | null = data
    ? {
        id: data.movie.tmdb_id,
        tmdb_id: data.movie.tmdb_id,
        title: data.movie.title,
        year: data.movie.release_date?.slice(0, 4) ?? "",
        rating: data.movie.vote_average,
        genres: data.movie.genres,
        language: data.movie.original_language,
        languageCode: data.movie.original_language,
        director: director ?? "",
        cast: [],
        poster: data.movie.poster_url,
        backdrop: data.movie.backdrop_url,
        overview: data.movie.overview,
        sentiment: data.sentiment.sentiment_summary,
      }
    : null;

  const inWatchlist = watchlistMovie ? isInWatchlist(watchlistMovie.tmdb_id) : false;

  const backdropSrc = data?.movie.backdrop_url
    ? (data.movie.backdrop_url.startsWith("http")
        ? data.movie.backdrop_url
        : `https://image.tmdb.org/t/p/w1280${data.movie.backdrop_url}`)
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)", color: "#F0EDE8" }}>
      <Navbar
        onSearchFocus={() => router.push("/")}
        onTrendingClick={() => router.push("/#trending-section")}
        onExploreClick={() => router.push("/#explore-section")}
        onHowItWorksClick={() => router.push("/#how-it-works")}
      />

      <main className="flex-1">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-8 h-8 text-[var(--amber)] animate-spin" />
            <p className="text-sm text-[#5C5A58]">Loading movie details…</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="max-w-2xl mx-auto my-16 px-4">
            <div className="p-5 rounded-2xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Could not load movie</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="mt-4 btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
          </div>
        )}

        {/* Content */}
        {data && !isLoading && (
          <>
            {/* Backdrop hero */}
            <div className="relative w-full overflow-hidden" style={{ height: "420px" }}>
              {backdropSrc && (
                <img
                  src={backdropSrc}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, var(--bg) 0%, rgba(11,11,13,0.5) 60%, rgba(11,11,13,0.2) 100%)" }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to right, var(--bg) 0%, transparent 30%, transparent 70%, var(--bg) 100%)" }}
              />
            </div>

            {/* Main content — pulls up over backdrop */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-72 relative z-10">
              {/* Back button */}
              <button
                onClick={() => router.back()}
                className="mb-6 btn-ghost flex items-center gap-2 px-4 py-2 rounded-xl text-sm w-fit"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="flex flex-col md:flex-row gap-8">
                {/* ── Poster column ── */}
                <div className="shrink-0 flex flex-col items-center md:items-start gap-4">
                  <div
                    className="rounded-2xl overflow-hidden shadow-poster border border-white/[0.12]"
                    style={{ width: "200px", height: "300px" }}
                  >
                    <MoviePoster src={data.movie.poster_url} alt={data.movie.title} priority />
                  </div>

                  {/* Watchlist button */}
                  {watchlistMovie && (
                    <button
                      onClick={() => toggleWatchlist(watchlistMovie)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        inWatchlist
                          ? "bg-[rgba(240,180,41,0.15)] border border-[rgba(240,180,41,0.4)] text-[var(--amber)]"
                          : "btn-ghost"
                      }`}
                      aria-pressed={inWatchlist}
                    >
                      {inWatchlist ? (
                        <><BookmarkCheck className="w-4 h-4" /> In Watchlist</>
                      ) : (
                        <><Bookmark className="w-4 h-4" /> Add to Watchlist</>
                      )}
                    </button>
                  )}

                  {/* Feedback Controls (Like, Dislike, Star Rating) */}
                  <div className="w-full p-3 rounded-xl bg-surface-2 border border-white/[0.06]">
                    <FeedbackControls
                      tmdbId={data.movie.tmdb_id}
                      sourceTmdbId={data.movie.tmdb_id}
                      hybridScore={data.movie.vote_average * 10}
                    />
                  </div>

                  <a
                    href={`https://www.themoviedb.org/movie/${tmdbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-[#5C5A58] hover:text-[#A8A5A0] transition-colors py-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on TMDB
                  </a>
                </div>

                {/* ── Info column ── */}
                <div className="flex-1 min-w-0">
                  {/* Language + year badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-surface-2 text-[#A8A5A0] border border-white/[0.08]">
                      {data.movie.original_language}
                    </span>
                    {data.movie.release_date && (
                      <span className="text-sm text-[#5C5A58] font-mono">
                        {data.movie.release_date.slice(0, 4)}
                      </span>
                    )}
                    {data.movie.runtime && (
                      <span className="text-sm text-[#5C5A58]">
                        {Math.floor(data.movie.runtime / 60)}h {data.movie.runtime % 60}m
                      </span>
                    )}
                    {data.movie.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-3 text-[#5C5A58] border border-white/[0.06]">
                        {data.movie.status}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1
                    className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-[#F0EDE8] tracking-tight leading-tight mb-2"
                    style={{ fontFamily: "Outfit, Inter, sans-serif" }}
                  >
                    {data.movie.title}
                  </h1>

                  {/* Tagline */}
                  {data.movie.tagline && (
                    <p className="text-base italic text-[#5C5A58] mb-4">"{data.movie.tagline}"</p>
                  )}

                  {/* Rating + genres */}
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <span className="badge-gold text-sm px-3 py-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {data.movie.vote_average.toFixed(1)}
                      <span className="text-[10px] font-normal ml-1 opacity-60">
                        ({data.movie.vote_count.toLocaleString()} votes)
                      </span>
                    </span>
                    {data.movie.genres.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        className="text-xs text-[#A8A5A0] px-2.5 py-1 rounded-full bg-surface-2 border border-white/[0.06]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Director */}
                  {director && (
                    <p className="text-sm text-[#5C5A58] mb-4">
                      <span className="text-[#A8A5A0] font-semibold">Directed by</span>{" "}
                      <span className="text-[#F0EDE8]">{director}</span>
                    </p>
                  )}

                  {/* Overview */}
                  <div className="mb-6">
                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5A58] mb-2">Synopsis</h2>
                    <p className="text-sm text-[#A8A5A0] leading-relaxed">
                      {data.movie.overview || "No synopsis available."}
                    </p>
                  </div>

                  {/* Find Matches + Compare CTA */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleFindMatches}
                      className="btn-amber flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                      aria-label={`Get AI recommendations for ${data.movie.title}`}
                    >
                      <span>Find Similar Films</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (similarMovies.length > 0) {
                          setCompareMovie(similarMovies[0]);
                          setIsCompareOpen(true);
                        } else if (watchlistMovie) {
                          setCompareMovie(watchlistMovie);
                          setIsCompareOpen(true);
                        }
                      }}
                      className="btn-ghost flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-white/[0.1] hover:border-[var(--amber)]/40 transition-colors"
                      aria-label="Compare with another film"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-[var(--amber)]" />
                      <span>Compare Film</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Where to Watch (Feature 9) ── */}
              <div className="mt-8">
                <WhereToWatch watchProviders={data.watch_providers} />
              </div>

              {/* ── Stats row ── */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Release Year" value={data.movie.release_date?.slice(0, 4) ?? "—"} />
                <StatBox label="Language" value={data.movie.original_language.toUpperCase()} />
                {data.movie.runtime ? (
                  <StatBox label="Runtime" value={`${Math.floor(data.movie.runtime / 60)}h ${data.movie.runtime % 60}m`} />
                ) : (
                  <StatBox label="Genres" value={data.movie.genres[0] ?? "—"} />
                )}
                <StatBox label="TMDB Rating" value={`${data.movie.vote_average.toFixed(1)} / 10`} />
              </div>

              {/* ── Sentiment Panel ── */}
              <div className="mt-8 p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-ai">AI Sentiment</span>
                      <span className="text-xs text-[#5C5A58]">
                        {data.sentiment.is_fallback
                          ? "Rating / overview fallback"
                          : `Based on ${data.reviews_count} audience reviews`}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3C3A38]">
                      Analyzed via NLTK VADER · {data.sentiment.sentiment_summary}
                    </p>
                  </div>
                  {/* Overall score ring */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center border-2"
                      style={{
                        borderColor: sentimentScore >= 0.7 ? "#22C55E" : sentimentScore >= 0.45 ? "#D9A441" : "#EF4444",
                        background: sentimentScore >= 0.7
                          ? "rgba(34,197,94,0.08)"
                          : sentimentScore >= 0.45
                          ? "rgba(217,164,65,0.08)"
                          : "rgba(239,68,68,0.08)",
                      }}
                    >
                      <span
                        className="text-lg font-black font-mono"
                        style={{
                          color: sentimentScore >= 0.7 ? "#22C55E" : sentimentScore >= 0.45 ? "#D9A441" : "#EF4444",
                        }}
                      >
                        {Math.round(sentimentScore * 100)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5C5A58] mt-1">Positive</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SentimentBar
                    label="Positive"
                    value={Math.max(0, Math.min(1, positiveRatio))}
                    color="#22C55E"
                    icon={<ThumbsUp className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />}
                  />
                  <SentimentBar
                    label="Neutral"
                    value={Math.max(0, Math.min(1, neutralRatio))}
                    color="#D9A441"
                    icon={<Minus className="w-3.5 h-3.5" style={{ color: "#D9A441" }} />}
                  />
                  <SentimentBar
                    label="Negative"
                    value={Math.max(0, Math.min(1, negativeRatio))}
                    color="#EF4444"
                    icon={<ThumbsDown className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
                  />
                </div>
              </div>

              {/* ── Trailer ── */}
              {trailerKey && (
                <div className="mt-8">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5A58] mb-3">Trailer</h2>
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-surface-2 border border-white/[0.06]">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}`}
                      title="Movie Trailer"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* ── Cast ── */}
              {topCast.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5A58] mb-3">Cast</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {topCast.map((actor) => (
                      <div key={actor.name} className="flex flex-col items-center text-center gap-1.5">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-3 border border-white/[0.07]">
                          {actor.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg text-[#3C3A38] font-bold">
                              {actor.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-[#F0EDE8] leading-tight">{actor.name}</p>
                          <p className="text-[9px] text-[#5C5A58] leading-tight truncate max-w-[80px]">{actor.character}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Keywords ── */}
              {data.movie.keywords && data.movie.keywords.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#5C5A58] mb-3">Keywords</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {data.movie.keywords.slice(0, 20).map((kw) => (
                      <span
                        key={kw}
                        className="text-[11px] text-[#5C5A58] px-2.5 py-1 rounded-full bg-surface-2 border border-white/[0.05]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Similar Movies (Feature 13) ── */}
              {similarMovies.length > 0 && (
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#F0EDE8]">Similar Films You May Enjoy</h2>
                      <p className="text-xs text-[#5C5A58]">Hybrid recommendations based on story, sentiment & audience affinity</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {similarMovies.map((sim) => (
                      <div
                        key={sim.tmdb_id}
                        onClick={() => router.push(`/movie/${sim.tmdb_id}`)}
                        className="group cursor-pointer rounded-xl overflow-hidden bg-surface-2 border border-white/[0.06] hover:border-white/[0.15] transition-all flex flex-col"
                      >
                        <div className="poster-box">
                          <MoviePoster src={sim.poster_url} alt={sim.title} />
                          <div className="absolute top-1.5 right-1.5 badge-match text-[9px] px-1.5 py-0.5">
                            {sim.match_percentage}%
                          </div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <p className="text-xs font-bold text-[#F0EDE8] truncate group-hover:text-[var(--amber)] transition-colors">
                            {sim.title}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-[#5C5A58]">
                            <span>{sim.release_date?.slice(0, 4)}</span>
                            <span className="text-[var(--gold)] flex items-center gap-0.5">★ {sim.vote_average.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 pb-8" />
            </div>

            {/* Compare Modal */}
            {isCompareOpen && watchlistMovie && compareMovie && (
              <CompareModal
                movieA={watchlistMovie}
                movieB={compareMovie}
                onClose={() => setIsCompareOpen(false)}
                onFindMatches={(id, title) => router.push(`/?recommend=${id}&title=${encodeURIComponent(title)}`)}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
