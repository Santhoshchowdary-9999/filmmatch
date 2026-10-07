"""
FilmMatch AI — Pydantic Schemas
Strictly implementing the JSON data schemas defined in gemini.md.
"""
import re
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class ProvenanceSchema(BaseModel):
    status: Literal["ok", "empty", "degraded", "failed"]
    source: Literal["tmdb", "offline_demo", "mixed", "none"]
    cache: Literal["fresh", "cached", "stale", "mixed", "none"]
    fetched_at: Optional[str] = None
    stale: bool = False
    errors: list[dict[str, Any]] = Field(default_factory=list)
    components: list[dict[str, Any]] = Field(default_factory=list)


class CustomWeights(BaseModel):
    content: float = Field(0.50, ge=0.0, le=1.0, description="Story DNA weight (0.0–1.0)")
    sentiment: float = Field(0.20, ge=0.0, le=1.0, description="Audience Sentiment weight (0.0–1.0)")
    collaborative: float = Field(0.30, ge=0.0, le=1.0, description="Viewer Affinity weight (0.0–1.0)")


class RecommendationRequest(BaseModel):
    query: str = Field(..., description="Movie title or search term", min_length=1, max_length=200)
    tmdb_id: Optional[int] = Field(None, description="Optional explicit TMDB ID if selected from autocomplete")
    top_k: int = Field(10, description="Number of recommendations to return", ge=1, le=50)
    custom_weights: Optional[CustomWeights] = Field(None, description="Optional custom hybrid weights (must not all be 0)")
    year_min: Optional[int] = Field(None, ge=1880, le=2100, description="Minimum release year")
    year_max: Optional[int] = Field(None, ge=1880, le=2100, description="Maximum release year")
    runtime_max: Optional[int] = Field(None, ge=1, le=1000, description="Maximum movie runtime in minutes")
    genres: Optional[list[str]] = Field(None, description="List of genre names to include")
    min_rating: Optional[float] = Field(None, ge=0.0, le=10.0, description="Minimum TMDB vote_average (0-10)")
    language: Optional[list[str]] = Field(None, description="List of ISO 639-1 language codes, e.g. ['te', 'hi']")
    hidden_gems: Optional[bool] = Field(False, description="Filter for hidden gems: sentiment_score >= threshold and vote_count < threshold")
    session_id: Optional[str] = Field(None, description="Optional anonymous session ID for personalized ranking")

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Query must be a string.")
        # Strip control characters (ASCII 0-31, 127-159)
        sanitized = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", v).strip()
        if not sanitized:
            raise ValueError("Query cannot be empty or purely whitespace/control characters.")
        if len(sanitized) > 200:
            raise ValueError("Query exceeds maximum allowed length of 200 characters.")
        return sanitized

    @model_validator(mode="after")
    def validate_year_range(self) -> "RecommendationRequest":
        if self.year_min is not None and self.year_max is not None and self.year_min > self.year_max:
            raise ValueError("year_min cannot be greater than year_max.")
        return self


class WatchProviderItem(BaseModel):
    """A single streaming/rental/purchase provider entry from TMDB JustWatch data."""
    provider_id: int
    provider_name: str
    logo_path: str = Field(..., description="Relative TMDB image path, e.g. /abc.jpg")


class WatchProvidersData(BaseModel):
    """IN-region watch providers from TMDB /movie/{id}/watch/providers. Never invented."""
    flatrate: list[WatchProviderItem] = Field(default_factory=list, description="Subscription streaming")
    rent: list[WatchProviderItem] = Field(default_factory=list, description="Rental providers")
    buy: list[WatchProviderItem] = Field(default_factory=list, description="Purchase providers")
    link: Optional[str] = Field(None, description="JustWatch attribution URL for IN region")



class ExplanationDetails(BaseModel):
    title: str = "Why this movie?"
    reasons: list[str] = Field(default_factory=list)


class ScoreBreakdownSchema(BaseModel):
    content_similarity: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")
    sentiment_score: float = Field(..., description="Normalized VADER audience sentiment score (0.0 to 1.0)")
    collaborative_score: Optional[float] = Field(None, description="MovieLens collaborative match (0.0 to 1.0) or None if cold start")
    is_cold_start: bool = Field(..., description="True if film lacks collaborative data in MovieLens")
    explanation: str = Field(..., description="Human-readable rationale for the recommendation")
    explanation_details: Optional[ExplanationDetails] = None


class MovieRecommendationSchema(BaseModel):
    tmdb_id: int
    title: str
    overview: str
    release_date: str
    original_language: str
    poster_url: str
    backdrop_url: str
    genres: list[str]
    vote_average: float
    vote_count: int
    runtime: Optional[int] = Field(None, description="Movie runtime in minutes")
    hybrid_score: float = Field(..., description="Overall score out of 100")
    match_percentage: int = Field(..., description="Normalized integer percentage 0-100%")
    score_breakdown: ScoreBreakdownSchema
    explanation_details: Optional[ExplanationDetails] = None
    is_personalized: Optional[bool] = Field(False, description="True if boosted/personalized for user session")
    watch_providers: Optional[WatchProvidersData] = Field(
        None,
        description="IN-region streaming providers from TMDB JustWatch. Empty/None when unavailable."
    )


class SourceMovieSchema(BaseModel):
    tmdb_id: int
    title: str
    release_date: str
    original_language: str
    poster_url: str
    genres: list[str]
    overview: str


class RecommendationResponse(BaseModel):
    source_movie: SourceMovieSchema
    recommendations: list[MovieRecommendationSchema]
    applied_weights: dict[str, float]
    execution_time_ms: float
    filter_info: Optional[str] = Field(None, description="Optional note when recommendations are filtered")
    provenance: ProvenanceSchema
    signal_provenance: dict[str, Any] = Field(default_factory=dict)


class MovieSearchItem(BaseModel):
    tmdb_id: int
    title: str
    release_date: str
    original_language: str
    poster_url: str
    poster_path: Optional[str] = None
    backdrop_url: Optional[str] = None
    backdrop_path: Optional[str] = None
    vote_average: float
    overview: str
    genres: list[str] = []


class MovieSearchResponse(BaseModel):
    query: str
    results: list[MovieSearchItem]
    total_results: int
    provenance: ProvenanceSchema


class HealthResponse(BaseModel):
    status: str
    ready: bool
    version: str
    tmdb_configured: bool
    movielens_mapped_count: int
    database_target: str
    dependencies: dict[str, Any]
    provenance: ProvenanceSchema


# ── Feedback Schemas (Feature 3) ─────────────────────────────────────────────

class FeedbackCreateRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=64, description="Anonymous or user session UUID")
    source_tmdb_id: Optional[int] = Field(None, description="Source seed movie TMDB ID if applicable")
    recommended_tmdb_id: int = Field(..., description="Target recommended movie TMDB ID")
    vote: Literal["like", "dislike", "up", "down"] = Field(..., description="Binary feedback vote")
    rating: Optional[float] = Field(None, ge=1.0, le=5.0, description="Optional 1-5 star user rating")
    hybrid_score: Optional[float] = Field(None, description="Recorded hybrid match score at recommendation time")
    is_cold_start: Optional[bool] = Field(False, description="Whether cold-start weights were applied")


class FeedbackItemSchema(BaseModel):
    session_id: str
    source_tmdb_id: Optional[int] = None
    recommended_tmdb_id: int
    vote: str
    rating: Optional[float] = None
    hybrid_score: Optional[float] = None
    is_cold_start: bool = False
    created_at: Optional[Any] = None


class FeedbackResponse(BaseModel):
    session_id: str
    feedback: list[FeedbackItemSchema]
    total: int


# ── Watchlist Schemas (Feature 5) ────────────────────────────────────────────

class WatchlistAddRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=64)
    tmdb_id: int
    title: str = Field(..., min_length=1, max_length=255)
    poster_url: Optional[str] = ""
    release_date: Optional[str] = ""
    vote_average: Optional[float] = 0.0
    genres: Optional[str] = ""
    original_language: Optional[str] = "en"


class WatchlistItemSchema(BaseModel):
    id: Optional[int] = None
    session_id: str
    tmdb_id: int
    title: str
    poster_url: str = ""
    release_date: str = ""
    vote_average: float = 0.0
    genres: str = ""
    original_language: str = "en"
    created_at: Optional[Any] = None


class WatchlistResponse(BaseModel):
    session_id: str
    watchlist: list[WatchlistItemSchema]
    total: int


# ── Mood Recommendations Schema (Feature 6) ──────────────────────────────────

class MoodRecommendationRequest(BaseModel):
    mood: str = Field(..., description="E.g., Happy, Emotional, Excited, Romantic, Thoughtful, Thrilling, Funny, Relaxed, Motivated")
    session_id: Optional[str] = None
    top_k: int = Field(10, ge=1, le=50)
    language: Optional[str] = None


# ── Natural Language Search Schema (Feature 7) ───────────────────────────────

class NaturalSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=300)
    session_id: Optional[str] = None
    top_k: int = Field(10, ge=1, le=50)


class DetectedFilters(BaseModel):
    language: Optional[str] = None
    mood: Optional[str] = None
    genres: list[str] = Field(default_factory=list)
    runtime_max: Optional[int] = None
    year_min: Optional[int] = None
    keywords: list[str] = Field(default_factory=list)


class NaturalSearchResponse(BaseModel):
    original_query: str
    detected_filters: DetectedFilters
    results: list[MovieRecommendationSchema]
    total_results: int


# ── Movie Comparison Schema (Feature 8) ──────────────────────────────────────

class CompareRequest(BaseModel):
    movie_ids: list[int] = Field(..., min_length=2, max_length=4, description="2 to 4 TMDB IDs to compare")


class MovieComparisonItem(BaseModel):
    tmdb_id: int
    title: str
    poster_url: str
    backdrop_url: str = ""
    release_date: str
    year: str
    genres: list[str]
    runtime: Optional[int] = None
    vote_average: float
    vote_count: int
    sentiment_score: float
    sentiment_label: str
    strengths: list[str]
    weaknesses: list[str]
    watch_providers: Optional[WatchProvidersData] = None


class CompareResponse(BaseModel):
    movies: list[MovieComparisonItem]
    winner_ratings: Optional[str] = None
    winner_sentiment: Optional[str] = None


# ── User Analytics Schema (Feature 15) ────────────────────────────────────────

class UserAnalyticsResponse(BaseModel):
    session_id: str
    total_feedback: int
    liked_count: int
    disliked_count: int
    average_rating: Optional[float] = None
    watchlist_count: int
    favorite_genres: list[dict[str, Any]] = Field(default_factory=list)
    favorite_languages: list[dict[str, Any]] = Field(default_factory=list)
    personalized_ready: bool = False

