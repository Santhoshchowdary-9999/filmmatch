import { Provenance } from "@/types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public provenance?: Provenance) {
    super(message);
    this.name = "ApiError";
  }
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
    if (!data || !data.provenance) {
      throw new ApiError("The backend returned data without provenance. Deploy the matching backend version.", response.status);
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
