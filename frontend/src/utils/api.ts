import { Provenance } from "@/types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public provenance?: Provenance) {
    super(message);
    this.name = "ApiError";
  }
}

function validProvenance(value: unknown): value is Provenance {
  if (!value || typeof value !== "object") return false;
  const p = value as Provenance;
  return ["ok", "empty", "degraded", "failed"].includes(p.status)
    && ["tmdb", "offline_demo", "mixed", "none"].includes(p.source)
    && ["fresh", "cached", "stale", "mixed", "none"].includes(p.cache)
    && typeof p.stale === "boolean"
    && (p.fetched_at === null || (typeof p.fetched_at === "string" && !Number.isNaN(Date.parse(p.fetched_at))))
    && Array.isArray(p.errors) && p.errors.every(e => e && typeof e.message === "string" && typeof e.code === "string")
    && Array.isArray(p.components);
}

export async function fetchFromApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 30000);
  try {
    const response = await fetch(endpoint, { ...options, cache: "no-store", signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof data?.detail === "string" ? data.detail : data?.detail?.message;
      throw new ApiError(message || `Request failed (HTTP ${response.status}).`, response.status, data?.provenance);
    }
    if (!data || !validProvenance(data.provenance)) {
      throw new ApiError("The backend returned data without valid provenance. Deploy the matching backend version.", response.status);
    }
    if (data.provenance.status === "failed") {
      throw new ApiError(data.provenance.errors[0]?.message || "The backend reported a failed request.", response.status, data.provenance);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? "The request timed out." : "The backend could not be reached.", 0);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function describeProvenance(p: Provenance): string {
  const source = p.source === "offline_demo" ? "Offline/demo data — not live TMDB"
    : p.source === "mixed" ? "Mixed data sources"
    : p.source === "tmdb" ? (p.stale ? "Last-known-good TMDB data (stale)" : p.cache === "cached" ? "Cached-live TMDB data" : p.cache === "mixed" ? "Live and cached TMDB inputs" : "Live TMDB data")
    : "No data source available";
  const date = p.fetched_at ? new Date(p.fetched_at) : null;
  const freshness = date && !Number.isNaN(date.getTime()) ? ` · fetched ${date.toLocaleString()}` : " · freshness unavailable";
  const state = p.status === "empty" ? " · no results" : p.status === "degraded" ? " · some requests failed" : p.status === "failed" ? " · request failed" : "";
  return source + freshness + state + (p.errors.length ? ` · ${p.errors[0].message}` : "");
}

export function requestError(error: unknown): string {
  return error instanceof Error ? error.message : "The request failed.";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  const KEY = "filmmatch_session_id";
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = "fm_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

export async function apiJsonRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const msg = typeof data?.detail === "string" ? data.detail : data?.detail?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Feature 3: Feedback API ────────────────────────────────────────────────
export async function sendFeedback(payload: {
  recommended_tmdb_id: number;
  vote: "like" | "dislike" | "up" | "down";
  source_tmdb_id?: number | null;
  rating?: number | null;
  hybrid_score?: number | null;
  is_cold_start?: boolean;
}) {
  const session_id = getSessionId();
  return apiJsonRequest<{ status: string; message: string }>("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ session_id, ...payload }),
  });
}

export async function getFeedbackHistory() {
  const session_id = getSessionId();
  return apiJsonRequest<{ session_id: string; feedback: any[]; total: number }>(`/api/feedback?session_id=${session_id}`);
}

// ── Feature 4: Watchlist API ───────────────────────────────────────────────
export async function addToWatchlistApi(movie: {
  tmdb_id: number;
  title: string;
  poster_url?: string;
  release_date?: string;
  vote_average?: number;
  genres?: string;
  original_language?: string;
}) {
  const session_id = getSessionId();
  return apiJsonRequest<{ status: string; message: string }>("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ session_id, ...movie }),
  });
}

export async function removeFromWatchlistApi(tmdb_id: number) {
  const session_id = getSessionId();
  return apiJsonRequest<{ status: string; message: string }>(`/api/watchlist/${tmdb_id}?session_id=${session_id}`, {
    method: "DELETE",
  });
}

export async function getWatchlistApi() {
  const session_id = getSessionId();
  return apiJsonRequest<{ session_id: string; watchlist: any[]; total: number }>(`/api/watchlist?session_id=${session_id}`);
}

// ── Feature 6: Mood Recommendations API ────────────────────────────────────
export async function getMoodRecommendationsApi(mood: string, language?: string) {
  const session_id = getSessionId();
  return apiJsonRequest<any>("/api/mood-recommend", {
    method: "POST",
    body: JSON.stringify({ mood, session_id, top_k: 10, language }),
  });
}

// ── Feature 7: Natural Language Search API ─────────────────────────────────
export async function naturalSearchApi(query: string) {
  const session_id = getSessionId();
  return apiJsonRequest<any>("/api/natural-search", {
    method: "POST",
    body: JSON.stringify({ query, session_id, top_k: 10 }),
  });
}

// ── Feature 8: Compare Movies API ──────────────────────────────────────────
export async function compareMoviesApi(movie_ids: number[]) {
  return apiJsonRequest<any>("/api/compare", {
    method: "POST",
    body: JSON.stringify({ movie_ids }),
  });
}

// ── Feature 14 & 15: Analytics & Profile API ───────────────────────────────
export async function getAnalyticsApi(sessionId?: string) {
  const session_id = sessionId || getSessionId();
  return apiJsonRequest<any>(`/api/analytics?session_id=${session_id}`);
}

export async function getProfileApi(sessionId?: string) {
  const session_id = sessionId || getSessionId();
  return apiJsonRequest<any>(`/api/profile?session_id=${session_id}`);
}

