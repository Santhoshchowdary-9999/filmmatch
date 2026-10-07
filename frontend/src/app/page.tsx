"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Flame, Compass, Loader2, AlertCircle, RefreshCw, ChevronDown,
  Sparkles, Gem, Clock, Bookmark, ArrowRight, ArrowLeftRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MovieGrid } from "@/components/MovieGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { LanguageFilter } from "@/components/LanguageFilter";
import { HowItWorks } from "@/components/HowItWorks";
import { RecommendationSection } from "@/components/RecommendationSection";
import { MovieModal } from "@/components/MovieModal";
import { MoodSelector } from "@/components/MoodSelector";
import { NaturalSearchBar } from "@/components/NaturalSearchBar";
import { CompareModal } from "@/components/CompareModal";
import { MoviePoster } from "@/components/MoviePoster";
import { Footer } from "@/components/Footer";
import { useWatchlist } from "@/utils/useWatchlist";

import {
  CatalogMovie, MovieRecommendation, MovieSearchItem,
  MovieSearchResponse, RecommendationResponse, RecommendationFilters,
} from "@/types";
import {
  fetchFromApi, describeProvenance, requestError,
  getSessionId, naturalSearchApi, getMoodRecommendationsApi,
} from "@/utils/api";
import { getTmdbPosterUrl, getTmdbBackdropUrl } from "@/utils/image";

const INITIAL_DISPLAY_COUNT = 12;
const LOAD_MORE_STEP = 12;

function sortByQuality(movies: CatalogMovie[]): CatalogMovie[] {
  return [...movies].sort((a, b) => {
    const aPoster = a.poster && a.poster.trim() !== "" ? 1 : 0;
    const bPoster = b.poster && b.poster.trim() !== "" ? 1 : 0;
    return bPoster - aPoster;
  });
}

// ── Skeleton grid placeholder ──
function PosterSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-surface-2">
          {/* 2:3 aspect skeleton poster */}
          <div className="poster-box skeleton" />
          <div className="p-3 space-y-2">
            <div className="skeleton h-3 rounded-md w-4/5" style={{ height: "12px" }} />
            <div className="skeleton h-2.5 rounded-md w-2/5" style={{ height: "10px" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [recFilters, setRecFilters] = useState<RecommendationFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMovieId, setLoadingMovieId] = useState<number | null>(null);
  const [lastQuery, setLastQuery] = useState<{ id: number; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Catalog
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [exploreMovies, setExploreMovies] = useState<CatalogMovie[]>([]);
  const [displayCountExplore, setDisplayCountExplore] = useState<number>(INITIAL_DISPLAY_COUNT);
  const [isExploreLoading, setIsExploreLoading] = useState<boolean>(false);
  const [isLoadingMoreExplore, setIsLoadingMoreExplore] = useState<boolean>(false);

  // Trending
  const [trendingMovies, setTrendingMovies] = useState<CatalogMovie[]>([]);
  const [displayCountTrending, setDisplayCountTrending] = useState<number>(INITIAL_DISPLAY_COUNT);
  const [isLoadingTrending, setIsLoadingTrending] = useState<boolean>(false);
  const [isRefreshingTrending, setIsRefreshingTrending] = useState<boolean>(false);
  const [isLoadingMoreTrending, setIsLoadingMoreTrending] = useState<boolean>(false);
  const [lastTrendingUpdated, setLastTrendingUpdated] = useState<string>("");
  const [trendingStatus, setTrendingStatus] = useState("");
  const lastSuccessfulTrendingStatus = useRef("");
  const trendingRequestId = useRef(0);
  const [exploreStatus, setExploreStatus] = useState("");
  const recRequestId = useRef(0);

  // User Features & State
  const { watchlist } = useWatchlist();
  const [activeMood, setActiveMood] = useState<string>("");
  const [isIndianCinemaMode, setIsIndianCinemaMode] = useState<boolean>(false);
  const [recentlyViewed, setRecentlyViewed] = useState<CatalogMovie[]>([]);
  const [compareMovieA, setCompareMovieA] = useState<CatalogMovie | MovieRecommendation | null>(null);
  const [compareMovieB, setCompareMovieB] = useState<CatalogMovie | MovieRecommendation | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const [modalMovie, setModalMovie] = useState<CatalogMovie | MovieRecommendation | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recSectionRef = useRef<HTMLDivElement>(null);
  const trendingSectionRef = useRef<HTMLDivElement>(null);

  // Recently Viewed persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem("filmmatch_recent");
      if (saved) setRecentlyViewed(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const recordRecentlyViewed = (movie: CatalogMovie | MovieRecommendation) => {
    try {
      const item: CatalogMovie = {
        id: movie.tmdb_id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: "release_date" in movie && movie.release_date ? movie.release_date.slice(0, 4) : ((movie as CatalogMovie).year || ""),
        rating: "vote_average" in movie ? (movie as MovieRecommendation).vote_average : (movie as CatalogMovie).rating,
        genres: movie.genres || [],
        language: "original_language" in movie ? (movie as MovieRecommendation).original_language : ((movie as CatalogMovie).language || "EN"),
        languageCode: "original_language" in movie ? (movie as MovieRecommendation).original_language : ((movie as CatalogMovie).languageCode || "en"),
        director: "",
        cast: [],
        poster: "poster_url" in movie ? (movie as MovieRecommendation).poster_url : ((movie as CatalogMovie).poster || ""),
        backdrop: "backdrop_url" in movie ? (movie as MovieRecommendation).backdrop_url : ((movie as CatalogMovie).backdrop || ""),
        overview: movie.overview,
        sentiment: "Audience Acclaimed",
      };
      setRecentlyViewed(prev => {
        const filtered = prev.filter(p => p.tmdb_id !== item.tmdb_id);
        const updated = [item, ...filtered].slice(0, 6);
        localStorage.setItem("filmmatch_recent", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {}
  };

  const handleOpenMovie = (m: CatalogMovie | MovieRecommendation) => {
    recordRecentlyViewed(m);
    setModalMovie(m);
  };

  // Feature 6: Mood recommendation handler
  const handleMoodSelect = async (mood: string) => {
    setActiveMood(mood);
    setIsLoading(true);
    setError(null);
    setTimeout(() => recSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    try {
      const res = await getMoodRecommendationsApi(
        mood,
        selectedLanguage !== "all" ? selectedLanguage : undefined
      );
      setRecommendationData(res);
    } catch (err) {
      setError(requestError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Feature 7: Natural language search handler
  const handleNaturalSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => recSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    try {
      const res = await naturalSearchApi(query);
      setRecommendationData({
        provenance: res.provenance || { source: "tmdb", cached: false, fetched_at: new Date().toISOString() },
        source_movie: {
          tmdb_id: 0,
          title: `Natural Search: "${query}"`,
          release_date: "",
          original_language: "",
          poster_url: "",
          genres: [],
          overview: `Search criteria: ${query}`,
        },
        recommendations: res.recommendations || [],
        applied_weights: { content: 0.5, sentiment: 0.2, collaborative: 0.3 },
        execution_time_ms: 0,
      });
    } catch (err) {
      setError(requestError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Feature 11: Hidden Gems quick trigger
  const handleLoadHiddenGems = () => {
    setRecFilters({ hidden_gems: true });
    handleGetRecommendations(579974, "Hidden Gems", { hidden_gems: true });
  };

  // Handle URL params (?recommend=ID&title=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const recId = params.get("recommend");
      const recTitle = params.get("title");
      if (recId) {
        handleGetRecommendations(Number(recId), recTitle || "Recommended Film");
      }
    }
  }, []);
  const exploreSectionRef = useRef<HTMLDivElement>(null);

  // ── Load trending ──
  const loadTrending = async (forceRefresh: boolean = false) => {
    const requestId = ++trendingRequestId.current;
    forceRefresh ? setIsRefreshingTrending(true) : setIsLoadingTrending(true);
    setDisplayCountTrending(INITIAL_DISPLAY_COUNT);
    try {
      const endpoint = forceRefresh ? "/api/trending?refresh=true" : "/api/trending";
      const data = await fetchFromApi<MovieSearchResponse>(endpoint);
      if (requestId !== trendingRequestId.current) return;
      if (Array.isArray(data.results)) {
        const mapped: CatalogMovie[] = data.results.map((item: MovieSearchItem) => {
          const posterUrl = item.poster_path ? getTmdbPosterUrl(item.poster_path) : (item.poster_url || "");
          const backdropUrl = item.backdrop_path ? getTmdbBackdropUrl(item.backdrop_path) : (item.backdrop_url || posterUrl);
          return {
            id: item.tmdb_id,
            tmdb_id: item.tmdb_id,
            title: item.title || "Untitled",
            year: item.release_date ? item.release_date.slice(0, 4) : "",
            rating: item.vote_average,
            genres: item.genres && item.genres.length > 0 ? item.genres : ["Trending"],
            language: (item.original_language || "en").toUpperCase(),
            languageCode: item.original_language || "en",
            director: "",
            cast: [],
            poster: posterUrl,
            poster_path: item.poster_path,
            backdrop: backdropUrl,
            backdrop_path: item.backdrop_path,
            overview: item.overview,
            sentiment: "Audience Acclaimed",
            isTrending: true,
          };
        });
        setTrendingMovies(mapped);
        lastSuccessfulTrendingStatus.current = describeProvenance(data.provenance);
        setTrendingStatus(lastSuccessfulTrendingStatus.current);
        setLastTrendingUpdated(
          data.provenance.fetched_at
            ? new Date(data.provenance.fetched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : ""
        );
      } else {
        throw new Error("The backend returned invalid trending results.");
      }
    } catch (err) {
      if (requestId === trendingRequestId.current) {
        const previous = lastSuccessfulTrendingStatus.current;
        setTrendingStatus(
          `Refresh failed: ${requestError(err)}${previous ? ` · Previous: ${previous}` : " · No results available."}`
        );
      }
    } finally {
      if (requestId === trendingRequestId.current) {
        setIsLoadingTrending(false);
        setIsRefreshingTrending(false);
      }
    }
  };

  useEffect(() => { loadTrending(false); }, []);

  // ── Load explore catalog ──
  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      setIsExploreLoading(true);
      setExploreMovies([]);
      setExploreStatus("");
      setDisplayCountExplore(INITIAL_DISPLAY_COUNT);
      try {
        const data = await fetchFromApi<MovieSearchResponse>(`/api/discover?language=${selectedLanguage}`);
        if (!active) return;
        if (Array.isArray(data.results)) {
          const mapped: CatalogMovie[] = data.results.map((item: MovieSearchItem) => ({
            id: item.tmdb_id,
            tmdb_id: item.tmdb_id,
            title: item.title || "Untitled",
            year: item.release_date ? item.release_date.slice(0, 4) : "",
            rating: item.vote_average,
            genres: item.genres || ["Drama"],
            language: item.original_language.toUpperCase(),
            languageCode: item.original_language,
            director: "",
            cast: [],
            poster: item.poster_url,
            backdrop: item.backdrop_url || item.poster_url,
            overview: item.overview,
            sentiment: "Audience Rated",
          }));
          setExploreMovies(sortByQuality(mapped));
          setExploreStatus(describeProvenance(data.provenance));
        } else {
          throw new Error("The backend returned invalid discovery results.");
        }
      } catch (err) {
        if (active) setExploreStatus(`Discovery unavailable: ${requestError(err)}`);
      } finally {
        if (active) setIsExploreLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, [selectedLanguage]);

  const handleLoadMoreTrending = () => {
    setIsLoadingMoreTrending(true);
    setTimeout(() => { setDisplayCountTrending(prev => prev + LOAD_MORE_STEP); setIsLoadingMoreTrending(false); }, 300);
  };

  const handleLoadMoreExplore = () => {
    setIsLoadingMoreExplore(true);
    setTimeout(() => { setDisplayCountExplore(prev => prev + LOAD_MORE_STEP); setIsLoadingMoreExplore(false); }, 300);
  };

  // ── Recommendations ──
  const handleGetRecommendations = async (
    tmdbId: number,
    query: string,
    filters: RecommendationFilters = recFilters
  ) => {
    const requestId = ++recRequestId.current;
    setIsLoading(true);
    setLoadingMovieId(tmdbId > 0 ? tmdbId : null);
    setLastQuery({ id: tmdbId, title: query });
    setError(null);
    setTimeout(() => recSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    try {
      const payload = {
        query,
        tmdb_id: tmdbId > 0 ? tmdbId : null,
        top_k: 10,
        ...(filters.year_min !== undefined ? { year_min: filters.year_min } : {}),
        ...(filters.year_max !== undefined ? { year_max: filters.year_max } : {}),
        ...(filters.runtime_max !== undefined ? { runtime_max: filters.runtime_max } : {}),
        ...(filters.genres && filters.genres.length > 0 ? { genres: filters.genres } : {}),
        ...(filters.min_rating !== undefined ? { min_rating: filters.min_rating } : {}),
        ...(filters.language && filters.language.length > 0 ? { language: filters.language } : {}),
        ...(filters.hidden_gems ? { hidden_gems: true } : {}),
      };
      const data: RecommendationResponse = await fetchFromApi("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (requestId === recRequestId.current) setRecommendationData(data);
    } catch (err) {
      if (requestId === recRequestId.current) setError(requestError(err));
    } finally {
      if (requestId === recRequestId.current) { setIsLoading(false); setLoadingMovieId(null); }
    }
  };

  const handleFiltersChange = (newFilters: RecommendationFilters) => {
    setRecFilters(newFilters);
    if (lastQuery) {
      handleGetRecommendations(lastQuery.id, lastQuery.title, newFilters);
    }
  };

  const handleClearFilters = () => {
    setRecFilters({});
    if (lastQuery) {
      handleGetRecommendations(lastQuery.id, lastQuery.title, {});
    }
  };

  const visibleTrendingMovies = trendingMovies.slice(0, displayCountTrending);
  const hasMoreTrending = displayCountTrending < trendingMovies.length;
  const visibleExploreMovies = exploreMovies.slice(0, displayCountExplore);
  const hasMoreExplore = displayCountExplore < exploreMovies.length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)", color: "#F0EDE8" }}>

      {/* Navigation */}
      <Navbar
        onSearchFocus={() => searchInputRef.current?.focus()}
        onTrendingClick={() => trendingSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
        onExploreClick={() => exploreSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
        onHowItWorksClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* Hero */}
      <Hero
        onSearchMovie={(id, title) => {
          setRecFilters({});
          handleGetRecommendations(id, title, {});
        }}
        searchRef={searchInputRef}
        isSubmitting={isLoading}
        trendingBackdropPath={trendingMovies[0]?.backdrop_path ?? null}
      />

      <main className="flex-1">

        {/* ── Feature 7: Natural Language Movie Search ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 mb-6 relative z-20">
          <NaturalSearchBar onSearch={handleNaturalSearch} isLoading={isLoading} />
        </section>

        {/* ── Feature 6: Choose Your Mood Section ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <MoodSelector selectedMood={activeMood} onSelectMood={handleMoodSelect} />
        </section>

        {/* ── Features 11 & 12: Quick Discovery Modes ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const nextState = !isIndianCinemaMode;
                  setIsIndianCinemaMode(nextState);
                  if (nextState) {
                    setSelectedLanguage("te");
                  } else {
                    setSelectedLanguage("all");
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isIndianCinemaMode
                    ? "bg-amber-500/20 text-[var(--amber)] border border-amber-500/40 shadow-sm"
                    : "btn-ghost"
                }`}
                aria-pressed={isIndianCinemaMode}
              >
                <span>🇮🇳 Indian Cinema Mode</span>
                {isIndianCinemaMode && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--amber)] text-black font-extrabold">Active</span>
                )}
              </button>

              <button
                onClick={handleLoadHiddenGems}
                className="btn-ghost flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold hover:border-purple-500/40 hover:text-purple-300 transition-all"
                aria-label="Discover Hidden Gems"
              >
                <span>💎 Hidden Gems Mode</span>
              </button>
            </div>

            {isIndianCinemaMode && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs animate-fade-in">
                <span className="text-[11px] text-[#5C5A58] font-semibold mr-1">Region:</span>
                {[
                  { code: "te", label: "Telugu" },
                  { code: "hi", label: "Hindi" },
                  { code: "ta", label: "Tamil" },
                  { code: "ml", label: "Malayalam" },
                  { code: "kn", label: "Kannada" },
                  { code: "bn", label: "Bengali" },
                  { code: "mr", label: "Marathi" },
                ].map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => {
                      setSelectedLanguage(code);
                      exploreSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedLanguage === code
                        ? "bg-[var(--amber)] text-black font-bold"
                        : "bg-surface-2 text-[#A8A5A0] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Recommendation anchor ── */}
        <div ref={recSectionRef} className="scroll-mt-20">

          {/* Loading state — quiet skeleton */}
          {isLoading && (
            <section className="py-12 sm:py-16 section-divider" aria-live="polite" aria-label="Loading recommendations">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 mb-8">
                  <Loader2 className="w-5 h-5 text-[#5C5A58] animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-warm-white">Computing recommendations…</p>
                    <p className="text-xs text-[#5C5A58] mt-0.5">
                      Story DNA · Audience Sentiment · Viewer Affinity
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-surface-2">
                      <div className="poster-box skeleton" />
                      <div className="p-3 space-y-2">
                        <div className="skeleton h-3 rounded w-4/5" style={{ height: "12px" }} />
                        <div className="skeleton h-2.5 rounded w-2/5" style={{ height: "10px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Error */}
          {error && (
            <div className="max-w-3xl mx-auto my-8 px-4">
              <div className="p-4 rounded-2xl bg-red-500/[0.08] border border-red-500/20 flex items-center justify-between text-red-400 text-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" style={{ width: "18px", height: "18px" }} />
                  <span>{error}</span>
                </div>
                {lastQuery && (
                  <button
                    onClick={() => handleGetRecommendations(lastQuery.id, lastQuery.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500/[0.1] hover:bg-red-500/[0.18] text-red-300 border border-red-500/20"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {recommendationData && !isLoading && (
            <RecommendationSection
              data={recommendationData}
              onReset={() => { setRecommendationData(null); setRecFilters({}); }}
              onSelectMovie={rec => handleOpenMovie(rec)}
              onFindMatchesForRec={rec => {
                setRecFilters({});
                handleGetRecommendations(rec.tmdb_id, rec.title, {});
              }}
              filters={recFilters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              isLoadingFilters={isLoading}
            />
          )}
        </div>

        {/* ── Trending Today ── */}
        <section
          id="trending-section"
          ref={trendingSectionRef}
          className="scroll-mt-20 py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          aria-labelledby="trending-heading"
        >
          <SectionHeader
            title="Trending Today"
            subtitle={trendingStatus || "Awaiting TMDB data…"}
            icon={Flame}
            action={
              <div className="flex items-center gap-2.5">
                {lastTrendingUpdated && (
                  <span className="text-[11px] text-[#3C3A38] hidden sm:inline">
                    {lastTrendingUpdated}
                  </span>
                )}
                <span className="text-[11px] text-[#5C5A58] font-medium hidden sm:inline">Live TMDB</span>
                <button
                  id="refresh-trending-btn"
                  onClick={() => loadTrending(true)}
                  disabled={isLoadingTrending || isRefreshingTrending}
                  className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                  title="Refresh from TMDB"
                  aria-label="Refresh trending movies from TMDB"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTrending ? "animate-spin" : ""}`} />
                  <span>{isRefreshingTrending ? "Refreshing…" : "Refresh"}</span>
                </button>
              </div>
            }
          />

          {isLoadingTrending ? (
            <PosterSkeletonGrid count={12} />
          ) : (
            <>
              {trendingMovies.length > 0 && (
                <p className="text-[11px] text-[#3C3A38] mb-4">
                  {Math.min(displayCountTrending, trendingMovies.length)} of {trendingMovies.length} titles
                </p>
              )}
              <MovieGrid
                movies={visibleTrendingMovies}
                loadingMovieId={loadingMovieId}
                onSelectMovie={movie => handleOpenMovie(movie)}
                onFindMatches={movie => handleGetRecommendations(movie.tmdb_id, movie.title)}
              />
              {hasMoreTrending && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMoreTrending}
                    disabled={isLoadingMoreTrending}
                    className="btn-ghost flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                    aria-label="Load more trending movies"
                  >
                    {isLoadingMoreTrending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Loading…</span></>
                    ) : (
                      <>
                        <span>Load More</span>
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-xs text-[#3C3A38]">({trendingMovies.length - displayCountTrending} more)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Explore Cinema ── */}
        <section
          id="explore-section"
          ref={exploreSectionRef}
          className="scroll-mt-20 py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]"
          aria-labelledby="explore-heading"
        >
          <div className="flex flex-col gap-4 mb-6">
            <SectionHeader
              title="Explore Cinema"
              subtitle={exploreStatus || "Browse regional and international cinema…"}
              icon={Compass}
              badgeText="By Language"
            />
            <LanguageFilter
              selectedLanguage={selectedLanguage}
              onSelectLanguage={lang => setSelectedLanguage(lang)}
            />
          </div>

          {isExploreLoading ? (
            <PosterSkeletonGrid count={12} />
          ) : (
            <>
              {exploreMovies.length > 0 && (
                <p className="text-[11px] text-[#3C3A38] mb-4">
                  {Math.min(displayCountExplore, exploreMovies.length)} of {exploreMovies.length} titles
                </p>
              )}
              <MovieGrid
                movies={visibleExploreMovies}
                loadingMovieId={loadingMovieId}
                onSelectMovie={movie => handleOpenMovie(movie)}
                onFindMatches={movie => handleGetRecommendations(movie.tmdb_id, movie.title)}
              />
              {hasMoreExplore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMoreExplore}
                    disabled={isLoadingMoreExplore}
                    className="btn-ghost flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                    aria-label="Load more cinema titles"
                  >
                    {isLoadingMoreExplore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Loading…</span></>
                    ) : (
                      <>
                        <span>Load More</span>
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-xs text-[#3C3A38]">({exploreMovies.length - displayCountExplore} more)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Feature 16: Recently Viewed ── */}
        {recentlyViewed.length > 0 && (
          <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]">
            <SectionHeader
              title="Recently Viewed"
              subtitle="Films you recently explored"
              icon={Clock}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4">
              {recentlyViewed.map((m) => (
                <div
                  key={m.tmdb_id}
                  onClick={() => handleOpenMovie(m)}
                  className="group cursor-pointer rounded-xl overflow-hidden bg-surface-2 border border-white/[0.06] hover:border-white/[0.14] transition-all flex flex-col"
                >
                  <div className="poster-box">
                    <MoviePoster src={m.poster} alt={m.title} />
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-bold text-[#F0EDE8] truncate group-hover:text-[var(--amber)] transition-colors">
                      {m.title}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-[#5C5A58]">
                      <span>{m.year}</span>
                      <span className="text-[var(--gold)]">★ {m.rating ? m.rating.toFixed(1) : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Feature 16: Watchlist Preview ── */}
        {watchlist.length > 0 && (
          <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                title="Your Watchlist"
                subtitle={`${watchlist.length} saved films awaiting your view`}
                icon={Bookmark}
              />
              <Link
                href="/profile"
                className="text-xs text-[var(--amber)] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Full Watchlist</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {watchlist.slice(0, 6).map((m) => (
                <div
                  key={m.tmdb_id}
                  onClick={() => handleOpenMovie({
                    id: m.tmdb_id,
                    tmdb_id: m.tmdb_id,
                    title: m.title,
                    year: m.year || "",
                    rating: m.rating || 0,
                    genres: m.genres || [],
                    language: "EN",
                    languageCode: "en",
                    director: "",
                    cast: [],
                    poster: m.poster || "",
                    backdrop: m.poster || "",
                    overview: m.overview || "",
                    sentiment: "Audience Rated",
                  })}
                  className="group cursor-pointer rounded-xl overflow-hidden bg-surface-2 border border-white/[0.06] hover:border-white/[0.14] transition-all flex flex-col"
                >
                  <div className="poster-box">
                    <MoviePoster src={m.poster} alt={m.title} />
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-bold text-[#F0EDE8] truncate group-hover:text-[var(--amber)] transition-colors">
                      {m.title}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-[#5C5A58]">
                      <span>{m.year}</span>
                      <span className="text-[var(--gold)]">★ {m.rating ? m.rating.toFixed(1) : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How It Works */}
        <HowItWorks />
      </main>

      {/* Movie Modal */}
      <MovieModal
        movie={modalMovie}
        onClose={() => setModalMovie(null)}
        onFindMatches={(id, title) => handleGetRecommendations(id, title)}
      />

      {/* Compare Modal */}
      {isCompareModalOpen && compareMovieA && compareMovieB && (
        <CompareModal
          movieA={compareMovieA}
          movieB={compareMovieB}
          onClose={() => setIsCompareModalOpen(false)}
          onFindMatches={(id, title) => handleGetRecommendations(id, title)}
        />
      )}

      <Footer />
    </div>
  );
}
