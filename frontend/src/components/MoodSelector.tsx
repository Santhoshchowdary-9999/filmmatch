"use client";

import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { getMoodRecommendationsApi } from "@/utils/api";
import { MovieRecommendation } from "@/types";

interface MoodSelectorProps {
  onMoodSelect?: (moodTitle: string, recommendations: MovieRecommendation[]) => void;
  onSelectMood?: (mood: string) => void;
  selectedMood?: string | null;
}

const MOODS = [
  { id: "happy", label: "Happy", emoji: "😊", description: "Feel-good, uplifting & joyous stories", color: "from-amber-500/20 to-orange-500/10 border-amber-500/30" },
  { id: "emotional", label: "Emotional", emoji: "😢", description: "Deep, heartfelt & tear-jerker dramas", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30" },
  { id: "excited", label: "Excited", emoji: "🔥", description: "High-adrenaline action & thrills", color: "from-rose-500/20 to-red-500/10 border-rose-500/30" },
  { id: "romantic", label: "Romantic", emoji: "❤️", description: "Passionate connections & charm", color: "from-pink-500/20 to-rose-500/10 border-pink-500/30" },
  { id: "thoughtful", label: "Thoughtful", emoji: "🧠", description: "Intricate, philosophical & complex", color: "from-purple-500/20 to-violet-500/10 border-purple-500/30" },
  { id: "thrilling", label: "Thrilling", emoji: "😱", description: "Suspense, edge-of-seat tension & mystery", color: "from-teal-500/20 to-emerald-500/10 border-teal-500/30" },
  { id: "funny", label: "Funny", emoji: "😂", description: "Pure comedy, banter & laughs", color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30" },
  { id: "relaxed", label: "Relaxed", emoji: "😌", description: "Chill, aesthetic & soothing cinema", color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30" },
  { id: "motivated", label: "Motivated", emoji: "💪", description: "Inspiring comebacks & underdog triumph", color: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30" },
];

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  onMoodSelect,
  onSelectMood,
  selectedMood,
}) => {
  const [activeMood, setActiveMood] = useState<string | null>(selectedMood || null);
  const [loadingMood, setLoadingMood] = useState<string | null>(null);

  const handleSelectMood = async (moodId: string, label: string) => {
    if (loadingMood) return;
    setActiveMood(moodId);

    if (onSelectMood) {
      onSelectMood(moodId);
      return;
    }

    setLoadingMood(moodId);

    try {
      const resp = await getMoodRecommendationsApi(label);
      if (resp?.recommendations && onMoodSelect) {
        onMoodSelect(label, resp.recommendations);
      }
    } catch (err) {
      console.error("Failed to fetch mood recommendations:", err);
    } finally {
      setLoadingMood(null);
    }
  };

  return (
    <section className="my-8" aria-label="Choose your mood">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[var(--amber)]" />
        <h2 className="text-xl font-bold text-warm-white">Choose Your Mood</h2>
        <span className="text-xs text-[#A8A5A0] ml-2 hidden sm:inline">
          AI adjusts tone, genre archetypes, and review sentiment
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {MOODS.map((m) => {
          const isSelected = activeMood === m.id;
          const isLoading = loadingMood === m.id;

          return (
            <button
              key={m.id}
              onClick={() => handleSelectMood(m.id, m.label)}
              disabled={isLoading}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 group relative ${
                isSelected
                  ? `bg-gradient-to-b ${m.color} ring-2 ring-[var(--amber)] scale-[1.02]`
                  : "bg-surface-1/70 border-white/[0.08] hover:border-white/[0.2] hover:bg-surface-2"
              }`}
              title={m.description}
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                {m.emoji}
              </span>
              <span className="text-xs font-bold text-warm-white group-hover:text-[var(--amber)]">
                {m.label}
              </span>
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-[var(--amber)] animate-spin" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
