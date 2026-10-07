/**
 * FilmMatch AI — Viewing History Hook
 * Tracks recently viewed / searched movies in localStorage under "fm_history".
 * Keeps the last 50 entries, most-recent first.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export type HistoryItem = {
  tmdb_id: number;
  title: string;
  poster: string;
  year: string;
  genres: string[];
  rating: number;
  language: string;
  viewedAt: number; // Unix ms
};

const STORAGE_KEY = "fm_history";
const MAX_HISTORY = 50;

function readStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setItems(readStorage());
  }, []);

  const addToHistory = useCallback((item: Omit<HistoryItem, "viewedAt">) => {
    setItems((prev) => {
      // Remove duplicate if already in history, then prepend
      const deduped = prev.filter((i) => i.tmdb_id !== item.tmdb_id);
      const next = [{ ...item, viewedAt: Date.now() }, ...deduped].slice(0, MAX_HISTORY);
      writeStorage(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((tmdb_id: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.tmdb_id !== tmdb_id);
      writeStorage(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { items, addToHistory, removeFromHistory, clearHistory };
}
