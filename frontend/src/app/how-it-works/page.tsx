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

async function fetchFromApi(endpoint: string, options?: RequestInit) {
  try {
    const res = await fetch(endpoint, options);
    if (res.ok) return await res.json();
  } catch (e) {}

  const ports = [8000, 8001];
  for (const port of ports) {
    try {
      const url = `http://127.0.0.1:${port}${endpoint}`;
      const res = await fetch(url, options);
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  throw new Error(`Failed to connect to backend at ${endpoint}`);
}

export default function HowItWorksPage() {
  const router = useRouter();
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalMovie, setModalMovie] = useState<CatalogMovie | MovieRecommendation | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const recSectionRef = useRef<HTMLDivElement>(null);

  const handleGetRecommendations = async (tmdbId: number, query: string) => {
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

      setRecommendationData(data);
    } catch (err: any) {
      console.warn("API Error:", err.message);
      setError("Unable to generate hybrid recommendations right now. Please try again.");
    } finally {
      setIsLoadingRec(false);
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
