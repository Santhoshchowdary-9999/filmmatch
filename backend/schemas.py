"""
FilmMatch AI — Pydantic Schemas
Strictly implementing the JSON data schemas defined in gemini.md.
"""
import re
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, field_validator


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



class ScoreBreakdownSchema(BaseModel):
    content_similarity: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")
    sentiment_score: float = Field(..., description="Normalized VADER audience sentiment score (0.0 to 1.0)")
    collaborative_score: Optional[float] = Field(None, description="MovieLens collaborative match (0.0 to 1.0) or None if cold start")
    is_cold_start: bool = Field(..., description="True if film lacks collaborative data in MovieLens")
    explanation: str = Field(..., description="Human-readable rationale for the recommendation")


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
    hybrid_score: float = Field(..., description="Overall score out of 100")
    match_percentage: int = Field(..., description="Normalized integer percentage 0-100%")
    score_breakdown: ScoreBreakdownSchema
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
