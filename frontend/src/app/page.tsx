"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Film, Flame, Compass, Loader2, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MovieGrid } from "@/components/MovieGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { LanguageFilter } from "@/components/LanguageFilter";
import { HowItWorks } from "@/components/HowItWorks";
import { RecommendationSection } from "@/components/RecommendationSection";
import { MovieModal } from "@/components/MovieModal";
import { Footer } from "@/components/Footer";

import { CatalogMovie, MovieRecommendation, MovieSearchItem, MovieSearchResponse, RecommendationResponse } from "@/types";
import { fetchFromApi, describeProvenance, requestError } from "@/utils/api";
import { getTmdbPosterUrl, getTmdbBackdropUrl } from "@/utils/image";

// How many movies to show initially and how many to add on each "Load More"
const INITIAL_DISPLAY_COUNT = 12;
const LOAD_MORE_STEP = 12;

/** Sort movies: prioritize those with posters while preserving incoming backend ranking */
function sortByQuality(movies: CatalogMovie[]): CatalogMovie[] {
  return [...movies].sort((a, b) => {
    // Movies with valid posters first
    const aPoster = a.poster && a.poster.trim() !== "" ? 1 : 0;
    const bPoster = b.poster && b.poster.trim() !== "" ? 1 : 0;
    return bPoster - aPoster;
  });
}

export default function HomePage() {
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMovieId, setLoadingMovieId] = useState<number | null>(null);
  const [lastQuery, setLastQuery] = useState<{ id: number; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Catalog State
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [exploreMovies, setExploreMovies] = useState<CatalogMovie[]>([]);
  const [displayCountExplore, setDisplayCountExplore] = useState<number>(INITIAL_DISPLAY_COUNT);
  const [isExploreLoading, setIsExploreLoading] = useState<boolean>(false);
  const [isLoadingMoreExplore, setIsLoadingMoreExplore] = useState<boolean>(false);

  // Dynamic Trending State
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

  // 1. Fetch Dynamic Trending Movies from /api/trending
  const loadTrending = async (forceRefresh: boolean = false) => {
    const requestId = ++trendingRequestId.current;
    if (forceRefresh) {
      setIsRefreshingTrending(true);
    } else {
      setIsLoadingTrending(true);
    }
    setDisplayCountTrending(INITIAL_DISPLAY_COUNT);
    try {
      const endpoint = forceRefresh ? "/api/trending?refresh=true" : "/api/trending";
      const data = await fetchFromApi<MovieSearchResponse>(endpoint);
      if (requestId !== trendingRequestId.current) return;
      if (Array.isArray(data.results)) {
        const mapped: CatalogMovie[] = data.results.map((item: MovieSearchItem) => {
          // Construct poster URL using canonical poster_path
          const posterUrl = item.poster_path
            ? getTmdbPosterUrl(item.poster_path)
            : (item.poster_url || "");
          const backdropUrl = item.backdrop_path
            ? getTmdbBackdropUrl(item.backdrop_path)
            : (item.backdrop_url || posterUrl);

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
        // Render EXACTLY the movies returned by /api/trending in canonical TMDB trending order
        setTrendingMovies(mapped);
        lastSuccessfulTrendingStatus.current = describeProvenance(data.provenance);
        setTrendingStatus(lastSuccessfulTrendingStatus.current);
        setLastTrendingUpdated(data.provenance.fetched_at ? new Date(data.provenance.fetched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
      } else {
        throw new Error("The backend returned invalid trending results.");
      }
    } catch (err) {
      if (requestId === trendingRequestId.current) {
        const previous = lastSuccessfulTrendingStatus.current;
        setTrendingStatus(`Refresh failed: ${requestError(err)}${previous ? ` · Retained results are not refreshed. Previous source: ${previous}` : " · No results available."}`);
      }
    } finally {
      if (requestId === trendingRequestId.current) {
        setIsLoadingTrending(false);
        setIsRefreshingTrending(false);
      }
    }
  };

  useEffect(() => {
    loadTrending(false);
  }, []);

  // 2. Fetch Dynamic Catalog whenever selectedLanguage changes
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
    setTimeout(() => {
      setDisplayCountTrending((prev) => prev + LOAD_MORE_STEP);
      setIsLoadingMoreTrending(false);
    }, 300);
  };

  const handleLoadMoreExplore = () => {
    setIsLoadingMoreExplore(true);
    setTimeout(() => {
      setDisplayCountExplore((prev) => prev + LOAD_MORE_STEP);
      setIsLoadingMoreExplore(false);
    }, 300);
  };

  // 3. Trigger Recommendation Request
  const handleGetRecommendations = async (tmdbId: number, query: string) => {
    const requestId = ++recRequestId.current;
    setRecommendationData(null);
    setIsLoading(true);
    setLoadingMovieId(tmdbId > 0 ? tmdbId : null);
    setLastQuery({ id: tmdbId, title: query });
    setError(null);

    // Scroll to recommendation section
    setTimeout(() => {
      recSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      const payload = {
        query: query,
        tmdb_id: tmdbId > 0 ? tmdbId : null,
        top_k: 10,
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
      if (requestId === recRequestId.current) {
        setIsLoading(false);
        setLoadingMovieId(null);
      }
    }
  };

  const visibleTrendingMovies = trendingMovies.slice(0, displayCountTrending);
  const hasMoreTrending = displayCountTrending < trendingMovies.length;

  const visibleExploreMovies = exploreMovies.slice(0, displayCountExplore);
  const hasMoreExplore = displayCountExplore < exploreMovies.length;

  return (
    <div className="min-h-screen bg-obsidian text-gray-100 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        onSearchFocus={() => searchInputRef.current?.focus()}
        onTrendingClick={() => trendingSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
        onExploreClick={() => exploreSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
        onHowItWorksClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* Hero with Dynamic Search */}
      <Hero
        onSearchMovie={(id, title) => handleGetRecommendations(id, title)}
        searchRef={searchInputRef}
        isSubmitting={isLoading}
      />

      <main className="flex-1">
        {/* Recommendation Anchor & Loader/View */}
        <div ref={recSectionRef} className="scroll-mt-24 sm:scroll-mt-28">
          {isLoading && (
            <section className="py-20 text-center bg-obsidian-100/40 border-b border-white/[0.06]">
              <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-surface-2 border border-indigo-500/30 shadow-glow-indigo mb-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-white">Synthesizing Hybrid Match Scores...</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">
                Extracting TF-IDF metadata soup, querying live TMDB candidate discovery, parsing VADER audience review polarity, and calculating MovieLens collaborative co-ratings.
              </p>
            </section>
          )}

          {error && (
            <div className="max-w-3xl mx-auto my-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-300 text-sm">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
              {lastQuery && (
                <button
                  onClick={() => handleGetRecommendations(lastQuery.id, lastQuery.title)}
                  className="flex items-center space-x-1 px-3 py-1 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {recommendationData && !isLoading && (
            <RecommendationSection
              data={recommendationData}
              onReset={() => setRecommendationData(null)}
              onSelectMovie={(rec) => setModalMovie(rec)}
              onFindMatchesForRec={(rec) => handleGetRecommendations(rec.tmdb_id, rec.title)}
            />
          )}
        </div>

        {/* Trending Cinema Section */}
        <section id="trending-section" ref={trendingSectionRef} className="scroll-mt-24 sm:scroll-mt-28 py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Trending Cinema"
            subtitle={trendingStatus || "TMDB daily trending — awaiting data"}
            icon={Flame}
            badgeText="Daily discovery"
            action={
              <div className="flex items-center space-x-3">
                {lastTrendingUpdated && (
                  <span className="text-[11px] text-gray-500 hidden sm:inline-block">
                    Updated {lastTrendingUpdated}
                  </span>
                )}
                <button
                  id="refresh-trending-btn"
                  onClick={() => loadTrending(true)}
                  disabled={isLoadingTrending || isRefreshingTrending}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-indigo-600/20 text-gray-300 hover:text-white border border-white/[0.08] hover:border-indigo-500/40 text-xs font-medium transition-all disabled:opacity-50 shadow-sm"
                  title="Refresh trending movies from TMDB"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshingTrending ? "animate-spin" : ""}`} />
                  <span>{isRefreshingTrending ? "Refreshing..." : "Refresh"}</span>
                </button>
              </div>
            }
          />

          {isLoadingTrending ? (
            <div className="py-16 text-center text-gray-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-sm">Fetching trending cinema...</span>
            </div>
          ) : (
            <>
              {/* Trending Count Indicator */}
              {trendingMovies.length > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  Showing <span className="text-indigo-400 font-semibold">{Math.min(displayCountTrending, trendingMovies.length)}</span> of{" "}
                  <span className="text-gray-400 font-semibold">{trendingMovies.length}</span> trending titles
                </p>
              )}

              <MovieGrid
                movies={visibleTrendingMovies}
                loadingMovieId={loadingMovieId}
                onSelectMovie={(movie) => setModalMovie(movie)}
                onFindMatches={(movie) => handleGetRecommendations(movie.tmdb_id, movie.title)}
              />

              {/* Load More Trending Button */}
              {hasMoreTrending && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={handleLoadMoreTrending}
                    disabled={isLoadingMoreTrending}
                    className="group flex items-center space-x-2.5 px-7 py-3 rounded-2xl bg-surface-2 hover:bg-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.08] hover:border-indigo-500/40 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-glow-card"
                    aria-label="Load more trending movies"
                  >
                    {isLoadingMoreTrending ? (
                      <>
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-indigo-300">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More</span>
                        <ChevronDown className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-xs text-gray-500 font-normal">
                          ({trendingMovies.length - displayCountTrending} more)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Explore Cinema by Language Section */}
        <section id="explore-section" ref={exploreSectionRef} className="scroll-mt-24 sm:scroll-mt-28 py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/[0.06]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <SectionHeader
              title="Explore Cinema by Language"
              subtitle={exploreStatus || "Browse regional and international cinema — awaiting data"}
              icon={Compass}
              badgeText="Broad Discovery"
            />
            <LanguageFilter
              selectedLanguage={selectedLanguage}
              onSelectLanguage={(lang) => setSelectedLanguage(lang)}
            />
          </div>

          {isExploreLoading ? (
            <div className="py-16 text-center text-gray-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-sm">Discovering regional cinema...</span>
            </div>
          ) : (
            <>
              {/* Explore Count Indicator */}
              {exploreMovies.length > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  Showing <span className="text-indigo-400 font-semibold">{Math.min(displayCountExplore, exploreMovies.length)}</span> of{" "}
                  <span className="text-gray-400 font-semibold">{exploreMovies.length}</span> curated titles
                </p>
              )}

              <MovieGrid
                movies={visibleExploreMovies}
                loadingMovieId={loadingMovieId}
                onSelectMovie={(movie) => setModalMovie(movie)}
                onFindMatches={(movie) => handleGetRecommendations(movie.tmdb_id, movie.title)}
              />

              {/* Load More Explore Button */}
              {hasMoreExplore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={handleLoadMoreExplore}
                    disabled={isLoadingMoreExplore}
                    className="group flex items-center space-x-2.5 px-7 py-3 rounded-2xl bg-surface-2 hover:bg-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.08] hover:border-indigo-500/40 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-glow-card"
                    aria-label="Load more curated movies"
                  >
                    {isLoadingMoreExplore ? (
                      <>
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-indigo-300">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More</span>
                        <ChevronDown className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-xs text-gray-500 font-normal">
                          ({exploreMovies.length - displayCountExplore} more)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* How It Works Section */}
        <HowItWorks />
      </main>

      {/* Movie Details Modal */}
      <MovieModal
        movie={modalMovie}
        onClose={() => setModalMovie(null)}
        onFindMatches={(id, title) => handleGetRecommendations(id, title)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
