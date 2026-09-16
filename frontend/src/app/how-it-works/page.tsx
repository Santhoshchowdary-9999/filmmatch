"use client";

import React, { useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { RecommendationSection } from "@/components/RecommendationSection";
import { MovieModal } from "@/components/MovieModal";
import { Footer } from "@/components/Footer";
import { useRouter } from "next/navigation";
import { CatalogMovie, MovieRecommendation, RecommendationResponse } from "@/types";

import { fetchFromApi, requestError } from "@/utils/api";

export default function HowItWorksPage() {
  const router = useRouter();
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalMovie, setModalMovie] = useState<CatalogMovie | MovieRecommendation | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recSectionRef = useRef<HTMLDivElement>(null);
  const recRequestId = useRef(0);

  const handleGetRecommendations = async (tmdbId: number, query: string) => {
    const requestId = ++recRequestId.current;
    setRecommendationData(null);
    setIsLoadingRec(true);
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
      if (requestId === recRequestId.current) setIsLoadingRec(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-100 flex flex-col font-sans">
      <Navbar
        onSearchFocus={() => searchInputRef.current?.focus()}
        onTrendingClick={() => router.push("/trending")}
        onExploreClick={() => router.push("/explore")}
        onHowItWorksClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />

      <Hero
        onSearchMovie={(id, title) => handleGetRecommendations(id, title)}
        searchRef={searchInputRef}
        isSubmitting={isLoadingRec}
      />

      <main className="flex-1">
        <div ref={recSectionRef} className="scroll-mt-24 sm:scroll-mt-28">
          {error && <p role="alert" className="max-w-3xl mx-auto my-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</p>}
          {recommendationData && !isLoadingRec && (
            <RecommendationSection
              data={recommendationData}
              onReset={() => setRecommendationData(null)}
              onSelectMovie={(rec) => setModalMovie(rec)}
              onFindMatchesForRec={(rec) => handleGetRecommendations(rec.tmdb_id, rec.title)}
            />
          )}
        </div>

        <HowItWorks />
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
