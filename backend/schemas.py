"""
FilmMatch AI — Pydantic Schemas
Strictly implementing the JSON data schemas defined in gemini.md.
"""
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field


class ProvenanceSchema(BaseModel):
    status: Literal["ok", "empty", "degraded", "failed"]
    source: Literal["tmdb", "offline_demo", "mixed", "none"]
    cache: Literal["fresh", "cached", "stale", "mixed", "none"]
    fetched_at: Optional[str] = None
    stale: bool = False
    errors: list[dict[str, Any]] = Field(default_factory=list)
    components: list[dict[str, Any]] = Field(default_factory=list)


class RecommendationRequest(BaseModel):
    query: str = Field(..., description="Movie title or search term", min_length=1)
    tmdb_id: Optional[int] = Field(None, description="Optional explicit TMDB ID if selected from autocomplete")
    top_k: int = Field(10, description="Number of recommendations to return", ge=1, le=50)


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
