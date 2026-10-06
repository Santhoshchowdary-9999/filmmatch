export interface Provenance {
  status: "ok" | "empty" | "degraded" | "failed";
  source: "tmdb" | "offline_demo" | "mixed" | "none";
  cache: "fresh" | "cached" | "stale" | "mixed" | "none";
  fetched_at: string | null;
  stale: boolean;
  errors: { code: string; message: string; upstream_status?: number | null }[];
  components: { endpoint: string; source: string; cache: string; fetched_at?: string | null }[];
}

export interface MovieSearchResponse {
  query: string;
  results: MovieSearchItem[];
  total_results: number;
  provenance: Provenance;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProvidersData {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  link?: string;
}

export interface ScoreBreakdown {
  content_similarity: number;
  sentiment_score: number;
  collaborative_score: number | null;
  is_cold_start: boolean;
  explanation: string;
}

export interface MovieRecommendation {
  tmdb_id: number;
  title: string;
  overview: string;
  release_date: string;
  original_language: string;
  poster_url: string;
  backdrop_url: string;
  genres: string[];
  vote_average: number;
  vote_count: number;
  hybrid_score: number;
  match_percentage: number;
  score_breakdown: ScoreBreakdown;
  watch_providers?: WatchProvidersData | null;
}

export interface SourceMovie {
  tmdb_id: number;
  title: string;
  release_date: string;
  original_language: string;
  poster_url: string;
  backdrop_url?: string;
  genres: string[];
  overview: string;
}

export interface RecommendationResponse {
  provenance: Provenance;
  signal_provenance?: {
    content: string;
    collaborative: { source: string; freshness: string; initialized: boolean };
    sentiment: Record<string, { source: string; review_count: number; freshness: string }>;
  };
  source_movie: SourceMovie;
  recommendations: MovieRecommendation[];
  applied_weights: {
    content: number;
    sentiment: number;
    collaborative: number;
  };
  execution_time_ms: number;
}

export interface MovieSearchItem {
  tmdb_id: number;
  title: string;
  release_date: string;
  original_language: string;
  poster_url: string;
  poster_path?: string | null;
  backdrop_url?: string;
  backdrop_path?: string | null;
  vote_average: number;
  overview: string;
  genres: string[];
}

export interface CatalogMovie {
  id: number;
  tmdb_id: number;
  title: string;
  year: string;
  rating: number;
  genres: string[];
  language: string;
  languageCode: string;
  director: string;
  cast: string[];
  poster: string;
  poster_path?: string | null;
  backdrop: string;
  backdrop_path?: string | null;
  overview: string;
  sentiment: string;
  isTrending?: boolean;
}
