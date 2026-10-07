"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Bookmark, ThumbsUp, ThumbsDown, Star, BarChart3,
  Sparkles, Film, ArrowRight, Trash2, Loader2, AlertCircle, Heart,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MoviePoster } from "@/components/MoviePoster";
import { getSessionId, getProfileApi, getAnalyticsApi, removeFromWatchlistApi } from "@/utils/api";
import { useWatchlist } from "@/utils/useWatchlist";
import type { UserAnalytics, WatchlistItem, FeedbackItem } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"watchlist" | "feedback" | "analytics">("watchlist");

  const { watchlist, removeFromWatchlist, reloadWatchlist } = useWatchlist();

  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);

    async function loadData() {
      setIsLoading(true);
      try {
        const [prof, anal] = await Promise.allSettled([
          getProfileApi(sid),
          getAnalyticsApi(sid),
        ]);
        if (prof.status === "fulfilled") setProfileData(prof.value);
        if (anal.status === "fulfilled") setAnalytics(anal.value);
      } catch (e) {
        console.error("Failed to load profile data:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const likedFeedback = profileData?.feedback?.filter((f: FeedbackItem) => f.vote === "like") || [];
  const dislikedFeedback = profileData?.feedback?.filter((f: FeedbackItem) => f.vote === "dislike") || [];
  const ratedFeedback = profileData?.feedback?.filter((f: FeedbackItem) => f.rating !== null && f.rating !== undefined) || [];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)", color: "#F0EDE8" }}>
      <Navbar
        onSearchFocus={() => router.push("/")}
        onTrendingClick={() => router.push("/#trending-section")}
        onExploreClick={() => router.push("/#explore-section")}
        onHowItWorksClick={() => router.push("/#how-it-works")}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Profile Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-1 border border-white/[0.08] shadow-card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--amber)] to-amber-600/60 flex items-center justify-center text-black font-black text-2xl shadow-lg">
                <User className="w-8 h-8 text-[#0B0B0D]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#F0EDE8] tracking-tight">
                    Personal Profile & Taste
                  </h1>
                  <span className="badge-ai text-[10px]">Active</span>
                </div>
                <p className="text-xs text-[#5C5A58] mt-1 font-mono">
                  Anonymous Session ID: <span className="text-[#A8A5A0]">{sessionId ? `${sessionId.slice(0, 18)}…` : "Loading…"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="btn-amber flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
              >
                <span>Find Recommendations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#A8A5A0] border-t border-white/[0.06] pt-3 leading-relaxed">
            Your movie likes, dislikes, and watchlist refine your hybrid recommendation weights without tracking personal data.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 mb-8">
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "watchlist"
                ? "bg-[rgba(240,180,41,0.15)] text-[var(--amber)] border border-[rgba(240,180,41,0.3)]"
                : "text-[#A8A5A0] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Watchlist ({watchlist.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-[rgba(240,180,41,0.15)] text-[var(--amber)] border border-[rgba(240,180,41,0.3)]"
                : "text-[#A8A5A0] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Taste Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "feedback"
                ? "bg-[rgba(240,180,41,0.15)] text-[var(--amber)] border border-[rgba(240,180,41,0.3)]"
                : "text-[#A8A5A0] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Feedback History</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-[var(--amber)] animate-spin" />
            <p className="text-sm text-[#5C5A58]">Loading your taste profile…</p>
          </div>
        )}

        {/* Tab 1: Watchlist */}
        {!isLoading && activeTab === "watchlist" && (
          <div>
            {watchlist.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <Bookmark className="w-12 h-12 text-[#3C3A38] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#F0EDE8]">Your watchlist is empty</h3>
                <p className="text-xs text-[#5C5A58] mt-1 max-w-sm mx-auto">
                  Click "+ Add to Watchlist" on any movie card or detail page to save films for later.
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-5 btn-ghost text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
                >
                  Explore Films
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {watchlist.map((m) => (
                  <div
                    key={m.tmdb_id}
                    className="group rounded-xl overflow-hidden bg-surface-2 border border-white/[0.06] hover:border-white/[0.14] transition-all flex flex-col"
                  >
                    <div
                      onClick={() => router.push(`/movie/${m.tmdb_id}`)}
                      className="poster-box cursor-pointer"
                    >
                      <MoviePoster src={m.poster} alt={m.title} />
                      {m.rating ? (
                        <div className="absolute top-1.5 right-1.5 badge-gold text-[10px]">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {m.rating.toFixed(1)}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          onClick={() => router.push(`/movie/${m.tmdb_id}`)}
                          className="text-xs font-bold text-[#F0EDE8] truncate cursor-pointer group-hover:text-[var(--amber)] transition-colors"
                        >
                          {m.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#5C5A58] mt-1">
                          {m.year && <span>{m.year}</span>}
                          {m.genres?.[0] && (
                            <>
                              <span>·</span>
                              <span className="truncate">{m.genres[0]}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between">
                        <button
                          onClick={() => router.push(`/movie/${m.tmdb_id}`)}
                          className="text-[10px] text-[var(--amber)] hover:underline font-medium"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(m.tmdb_id)}
                          className="p-1 rounded text-[#5C5A58] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove from watchlist"
                          aria-label={`Remove ${m.title} from watchlist`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Taste Analytics (Feature 15) */}
        {!isLoading && activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <p className="text-[10px] font-bold text-[#5C5A58] uppercase tracking-wider">Total Interactions</p>
                <p className="text-2xl font-black text-[#F0EDE8] mt-1 font-mono">
                  {analytics?.total_feedback ?? profileData?.stats?.total_feedback ?? 0}
                </p>
                <p className="text-[10px] text-[#A8A5A0] mt-1">Ratings & feedback votes</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <p className="text-[10px] font-bold text-[#5C5A58] uppercase tracking-wider">Liked Recommendations</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  {analytics?.liked_count ?? profileData?.stats?.likes_count ?? 0}
                </p>
                <p className="text-[10px] text-[#A8A5A0] mt-1">Positive affinity signals</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <p className="text-[10px] font-bold text-[#5C5A58] uppercase tracking-wider">Disliked Recommendations</p>
                <p className="text-2xl font-black text-rose-400 mt-1 font-mono">
                  {analytics?.disliked_count ?? profileData?.stats?.dislikes_count ?? 0}
                </p>
                <p className="text-[10px] text-[#A8A5A0] mt-1">Negative penalty filters</p>
              </div>

              <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <p className="text-[10px] font-bold text-[#5C5A58] uppercase tracking-wider">Average Star Rating</p>
                <p className="text-2xl font-black text-[var(--gold)] mt-1 font-mono">
                  {analytics?.average_rating ? `${analytics.average_rating.toFixed(1)} ★` : "—"}
                </p>
                <p className="text-[10px] text-[#A8A5A0] mt-1">From user feedback</p>
              </div>
            </div>

            {/* Affinity Breakdown: Genres & Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Favorite Genres */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <h3 className="text-sm font-bold text-[#F0EDE8] mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--amber)]" />
                  <span>Favorite Genres Affinity</span>
                </h3>
                {analytics?.favorite_genres && analytics.favorite_genres.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analytics.favorite_genres.map((g, idx) => {
                      const name = typeof g === "string" ? g : (g as any).genre || String(g);
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-surface-2 border border-white/[0.08] text-xs font-semibold text-[#F0EDE8]"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#5C5A58]">
                    No genre signals yet. Like or rate films to let FilmMatch AI detect your genre taste.
                  </p>
                )}
              </div>

              {/* Favorite Languages */}
              <div className="p-6 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <h3 className="text-sm font-bold text-[#F0EDE8] mb-4 flex items-center gap-2">
                  <Film className="w-4 h-4 text-[var(--amber)]" />
                  <span>Preferred Languages</span>
                </h3>
                {analytics?.favorite_languages && analytics.favorite_languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analytics.favorite_languages.map((l, idx) => {
                      const name = typeof l === "string" ? l : (l as any).language || String(l);
                      return (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-surface-2 border border-white/[0.08] text-xs font-bold uppercase text-[var(--amber)]"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#5C5A58]">
                    Explore regional cinema (Telugu, Hindi, English, etc.) to discover your language profile.
                  </p>
                )}
              </div>
            </div>

            {/* Cold Start vs Personalized Status */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-surface-1 to-surface-2 border border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--amber)]">Personalization Status</p>
                <h4 className="text-base font-bold text-[#F0EDE8] mt-1">
                  {(analytics?.liked_count ?? 0) >= 2
                    ? "✓ Personalized Recommendation Engine Active"
                    : "Hybrid Cold-Start Mode Active"}
                </h4>
                <p className="text-xs text-[#A8A5A0] mt-0.5">
                  {(analytics?.liked_count ?? 0) >= 2
                    ? "Your feedback actively boosts matching films in Story DNA, Sentiment, and Affinity calculations."
                    : "Rate or like at least 2 movies to transition from baseline cold-start to personalized re-ranking."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Feedback History */}
        {!isLoading && activeTab === "feedback" && (
          <div className="space-y-6">
            {profileData?.feedback?.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <Heart className="w-12 h-12 text-[#3C3A38] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#F0EDE8]">No feedback recorded yet</h3>
                <p className="text-xs text-[#5C5A58] mt-1 max-w-sm mx-auto">
                  Use the 👍 Like, 👎 Dislike, or star rating controls on movie recommendations to personalize future suggestions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData?.feedback?.map((item: FeedbackItem, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-1 border border-white/[0.06] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#F0EDE8]">
                        Film #{item.recommended_tmdb_id}
                      </p>
                      <p className="text-[10px] text-[#5C5A58] mt-0.5 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.vote === "like" && (
                        <span className="badge-match flex items-center gap-1 text-xs">
                          <ThumbsUp className="w-3 h-3" /> Liked
                        </span>
                      )}
                      {item.vote === "dislike" && (
                        <span className="px-2 py-0.5 rounded text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" /> Disliked
                        </span>
                      )}
                      {item.rating && (
                        <span className="badge-gold text-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" /> {item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
