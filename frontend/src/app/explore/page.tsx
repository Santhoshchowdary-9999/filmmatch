"use client";

import React, { useState, useEffect, useRef } from "react";
import { Compass, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MovieGrid } from "@/components/MovieGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { LanguageFilter } from "@/components/LanguageFilter";
import { RecommendationSection } from "@/components/RecommendationSection";
import { MovieModal } from "@/components/MovieModal";
import { Footer } from "@/components/Footer";
import { useRouter } from "next/navigation";

import { CatalogMovie, MovieRecommendation, MovieSearchItem, MovieSearchResponse, RecommendationResponse } from "@/types";
import { fetchFromApi, describeProvenance, requestError } from "@/utils/api";

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

export default function ExplorePage() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [exploreStatus, setExploreStatus] = useState("");
  const recRequestId = useRef(0);
  const [allExploreMovies, setAllExploreMovies] = useState<CatalogMovie[]>([]);
  const [displayCount, setDisplayCount] = useState<number>(INITIAL_DISPLAY_COUNT);
  const [isExploreLoading, setIsExploreLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [loadingMovieId, setLoadingMovieId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalMovie, setModalMovie] = useState<CatalogMovie | MovieRecommendation | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      setIsExploreLoading(true);
      setAllExploreMovies([]);
      setExploreStatus("");
      setDisplayCount(INITIAL_DISPLAY_COUNT);
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
          setAllExploreMovies(sortByQuality(mapped));
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

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate brief loading feel
    setTimeout(() => {
      setDisplayCount((prev) => prev + LOAD_MORE_STEP);
      setIsLoadingMore(false);
    }, 300);
  };

  const handleGetRecommendations = async (tmdbId: number, query: string) => {
    const requestId = ++recRequestId.current;
    setRecommendationData(null);
    setIsLoadingRec(true);
    setLoadingMovieId(tmdbId > 0 ? tmdbId : null);
    setError(null);

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
        setIsLoadingRec(false);
        setLoadingMovieId(null);
      }
    }
  };

  const visibleMovies = allExploreMovies.slice(0, displayCount);
  const hasMore = displayCount < allExploreMovies.length;

  return (
    <div className="min-h-screen bg-obsidian text-gray-100 flex flex-col font-sans">
      <Navbar
        onSearchFocus={() => searchInputRef.current?.focus()}
        onTrendingClick={() => router.push("/trending")}
        onExploreClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onHowItWorksClick={() => router.push("/how-it-works")}
      />

      <Hero
        onSearchMovie={(id, title) => handleGetRecommendations(id, title)}
        searchRef={searchInputRef}
        isSubmitting={isLoadingRec}
      />

      <main className="flex-1">
        {/* Recommendation Results Anchor */}
        <div ref={recSectionRef} className="scroll-mt-24 sm:scroll-mt-28">
          {isLoadingRec && (
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
              <button
                onClick={() => setError(null)}
                className="px-3 py-1 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30"
              >
                Dismiss
              </button>
            </div>
          )}

          {recommendationData && !isLoadingRec && (
            <RecommendationSection
              data={recommendationData}
              onReset={() => setRecommendationData(null)}
              onSelectMovie={(rec) => setModalMovie(rec)}
              onFindMatchesForRec={(rec) => handleGetRecommendations(rec.tmdb_id, rec.title)}
            />
          )}
        </div>

        {/* Dedicated Explore Cinema View */}
        <section className="scroll-mt-24 sm:scroll-mt-28 py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="py-20 text-center text-gray-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-sm">Discovering regional cinema...</span>
            </div>
          ) : (
            <>
              {/* Movie count indicator */}
              {allExploreMovies.length > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  Showing <span className="text-indigo-400 font-semibold">{Math.min(displayCount, allExploreMovies.length)}</span> of{" "}
                  <span className="text-gray-400 font-semibold">{allExploreMovies.length}</span> curated titles
                </p>
              )}

              <MovieGrid
                movies={visibleMovies}
                loadingMovieId={loadingMovieId}
                onSelectMovie={(movie) => setModalMovie(movie)}
                onFindMatches={(movie) => handleGetRecommendations(movie.tmdb_id, movie.title)}
              />

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="group flex items-center space-x-2.5 px-7 py-3 rounded-2xl bg-surface-2 hover:bg-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed border border-white/[0.08] hover:border-indigo-500/40 text-gray-300 hover:text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-glow-card"
                    aria-label="Load more movies"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-indigo-300">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More</span>
                        <ChevronDown className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-xs text-gray-500 font-normal">
                          ({allExploreMovies.length - displayCount} more)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <MovieModal
        movie={modalMovie}
        onClose={() => setModalMovie(null)}
        onFindMatches={(id, title) => handleGetRecommendations(id, title)}
      />

      <Footer />
    </div>
  );
}
