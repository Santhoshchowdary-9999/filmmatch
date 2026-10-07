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

export interface ExplanationDetails {
  title: string;
  reasons: string[];
}

export interface ScoreBreakdown {
  content_similarity: number;
  sentiment_score: number;
  collaborative_score: number | null;
  is_cold_start: boolean;
  explanation: string;
  explanation_details?: ExplanationDetails;
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
  runtime?: number | null;
  hybrid_score: number;
  match_percentage: number;
  score_breakdown: ScoreBreakdown;
  explanation_details?: ExplanationDetails;
  is_personalized?: boolean;
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
  filter_info?: string | null;
}

export interface RecommendationFilters {
  year_min?: number;
  year_max?: number;
  runtime_max?: number;
  genres?: string[];
  min_rating?: number;
  language?: string[];
  hidden_gems?: boolean;
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

export interface FeedbackItem {
  session_id: string;
  source_tmdb_id?: number | null;
  recommended_tmdb_id: number;
  vote: string;
  rating?: number | null;
  hybrid_score?: number | null;
  is_cold_start?: boolean;
  created_at?: string;
}

export interface WatchlistItem {
  id?: number;
  session_id: string;
  tmdb_id: number;
  title: string;
  poster_url: string;
  release_date: string;
  vote_average: number;
  genres: string;
  original_language: string;
  created_at?: string;
}

export interface DetectedFilters {
  language?: string | null;
  mood?: string | null;
  genres: string[];
  runtime_max?: number | null;
  year_min?: number | null;
  keywords: string[];
}

export interface NaturalSearchResponse {
  original_query: string;
  detected_filters: DetectedFilters;
  results: MovieRecommendation[];
  total_results: number;
}

export interface MovieComparisonItem {
  tmdb_id: number;
  title: string;
  poster_url: string;
  backdrop_url?: string;
  release_date: string;
  year: string;
  genres: string[];
  runtime?: number | null;
  vote_average: number;
  vote_count: number;
  sentiment_score: number;
  sentiment_label: string;
  strengths: string[];
  weaknesses: string[];
  watch_providers?: WatchProvidersData | null;
}

export interface CompareResponse {
  movies: MovieComparisonItem[];
  winner_ratings?: string | null;
  winner_sentiment?: string | null;
}

export interface UserAnalytics {
  session_id: string;
  total_feedback: number;
  liked_count: number;
  disliked_count: number;
  average_rating: number | null;
  watchlist_count: number;
  favorite_genres: { genre: string; count: number }[];
  favorite_languages: { language: string; count: number }[];
  personalized_ready: boolean;
}
