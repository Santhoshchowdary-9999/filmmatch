"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Flame, Compass, Loader2, AlertCircle, RefreshCw, ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MovieGrid } from "@/components/MovieGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { LanguageFilter } from "@/components/LanguageFilter";
import { HowItWorks } from "@/components/HowItWorks";
import { RecommendationSection } from "@/components/RecommendationSection";
import { MovieModal } from "@/components/MovieModal";
import { Footer } from "@/components/Footer";

import {
  CatalogMovie, MovieRecommendation, MovieSearchItem,
  MovieSearchResponse, RecommendationResponse, RecommendationFilters,
} from "@/types";
import { fetchFromApi, describeProvenance, requestError } from "@/utils/api";
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

  const [modalMovie, setModalMovie] = useState<CatalogMovie | MovieRecommendation | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recSectionRef = useRef<HTMLDivElement>(null);
  const trendingSectionRef = useRef<HTMLDivElement>(null);
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
              onSelectMovie={rec => setModalMovie(rec)}
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
                onSelectMovie={movie => setModalMovie(movie)}
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
                onSelectMovie={movie => setModalMovie(movie)}
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

        {/* How It Works */}
        <HowItWorks />
      </main>

      {/* Movie Modal */}
      <MovieModal
        movie={modalMovie}
        onClose={() => setModalMovie(null)}
        onFindMatches={(id, title) => handleGetRecommendations(id, title)}
      />

      <Footer />
    </div>
  );
}
