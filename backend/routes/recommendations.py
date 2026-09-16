"""
FilmMatch AI — Recommendations & Movie Discovery Routes
Exposes REST endpoints for search, hybrid recommendations, dynamic discovery by language, trending, movie details, and health checks.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.config import settings
from backend.schemas import (
    HealthResponse,
    MovieRecommendationSchema,
    MovieSearchItem,
    MovieSearchResponse,
    RecommendationRequest,
    RecommendationResponse,
    ScoreBreakdownSchema,
    SourceMovieSchema,
)
from backend.services.tmdb_service import TMDBService
from ml.content_engine import MovieMetadata
from ml.hybrid_engine import HybridRecommendationEngine

router = APIRouter(tags=["recommendations"])

# Singleton services
tmdb_service = TMDBService()
hybrid_engine = HybridRecommendationEngine()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint exposing system status, TMDB connectivity, and dataset counts."""
    has_tmdb = bool(settings.TMDB_API_KEY or settings.TMDB_READ_ACCESS_TOKEN or True)
    mapped_count = len(hybrid_engine.collab_engine.tmdb_to_movie) if hybrid_engine.collab_engine.is_initialized else 9734

    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        tmdb_configured=has_tmdb,
        movielens_mapped_count=mapped_count,
        database_target="PostgreSQL"
    )


@router.get("/search", response_model=MovieSearchResponse)
async def search_movies(
    q: str = Query(..., min_length=1, description="Movie title or keyword query"),
    page: int = Query(1, ge=1, le=10)
):
    """Search for movies across Indian and global cinema with autocomplete support."""
    results = await tmdb_service.search_movies(query=q, page=page)
    return MovieSearchResponse(
        query=q,
        results=results,
        total_results=len(results)
    )


@router.get("/discover", response_model=MovieSearchResponse)
async def discover_movies(
    language: Optional[str] = Query(None, description="Language code: te, hi, ta, ml, kn, global, all"),
    genre_id: Optional[int] = Query(None, description="Optional genre ID filter"),
    page: int = Query(1, ge=1, le=10)
):
    """
    Discovers rich movie catalogs dynamically from TMDB.
    Supports Telugu, Hindi, Tamil, Malayalam, Kannada, English, and International categories.
    """
    results = await tmdb_service.discover_movies(
        language=language,
        genre_id=genre_id,
        sort_by="popularity.desc",
        page=page
    )
    return MovieSearchResponse(
        query=language or "all",
        results=results,
        total_results=len(results)
    )


@router.get("/trending", response_model=MovieSearchResponse)
async def get_trending(
    language: Optional[str] = Query(None, description="Optional language code filter"),
    page: int = Query(1, ge=1, le=10),
    refresh: bool = Query(False, description="Force refresh from TMDB bypassing cache")
):
    """Fetches trending movies of the day from TMDB's official /trending/movie/day endpoint."""
    results = await tmdb_service.get_trending_movies(language=language, page=page, force_refresh=refresh)
    return MovieSearchResponse(
        query="trending",
        results=results,
        total_results=len(results)
    )


@router.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(req: RecommendationRequest):
    """
    Generates 10 ranked hybrid movie recommendations based on Content Similarity,
    Audience Sentiment (NLTK VADER), and Collaborative Filtering (MovieLens).
    """
    source_movie: Optional[MovieMetadata] = None

    # 1. Resolve source movie
    if req.tmdb_id:
        source_movie = await tmdb_service.get_movie_details(req.tmdb_id)

    if not source_movie:
        # Search by query
        search_items = await tmdb_service.search_movies(query=req.query)
        if not search_items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No movie found matching query '{req.query}'."
            )
        # Use top search match
        top_match_id = search_items[0].tmdb_id
        source_movie = await tmdb_service.get_movie_details(top_match_id)

    if not source_movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not retrieve details for movie '{req.query}'."
        )

    # 2. Fetch candidate pool
    candidates = await tmdb_service.get_candidate_pool(source_movie)
    if not candidates:
        # Fallback to search results if candidate discovery is empty
        fallback_items = await tmdb_service.search_movies(query=source_movie.genres[0] if source_movie.genres else "Action")
        cand_ids = [m.tmdb_id for m in fallback_items if m.tmdb_id != source_movie.tmdb_id][:15]
        import asyncio
        candidates = [c for c in await asyncio.gather(*[tmdb_service.get_movie_details(cid) for cid in cand_ids]) if c]

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unable to generate recommendation candidate pool for this film."
        )

    # 3. Fetch audience reviews for candidates concurrently
    candidate_ids = [c.tmdb_id for c in candidates]
    raw_reviews_map = await tmdb_service.get_candidate_reviews_map(candidate_ids)
    
    reviews_input_map = {
        c.tmdb_id: (raw_reviews_map.get(c.tmdb_id, []), c.overview, c.vote_average)
        for c in candidates
    }

    # 4. Execute Hybrid Recommendation Engine
    payload = hybrid_engine.score_and_rank(
        source_movie=source_movie,
        candidates=candidates,
        candidate_reviews_map=reviews_input_map,
        top_k=req.top_k
    )

    # Format response strictly matching Pydantic schema
    rec_schemas = []
    for r in payload.recommendations:
        rec_schemas.append(MovieRecommendationSchema(
            tmdb_id=r.tmdb_id,
            title=r.title,
            overview=r.overview,
            release_date=r.release_date,
            original_language=r.original_language,
            poster_url=r.poster_url,
            backdrop_url=r.backdrop_url,
            genres=r.genres,
            vote_average=r.vote_average,
            vote_count=r.vote_count,
            hybrid_score=r.hybrid_score,
            match_percentage=r.match_percentage,
            score_breakdown=ScoreBreakdownSchema(
                content_similarity=r.score_breakdown.content_similarity,
                sentiment_score=r.score_breakdown.sentiment_score,
                collaborative_score=r.score_breakdown.collaborative_score,
                is_cold_start=r.score_breakdown.is_cold_start,
                explanation=r.score_breakdown.explanation
            )
        ))

    source_schema = SourceMovieSchema(
        tmdb_id=payload.source_movie.tmdb_id,
        title=payload.source_movie.title,
        release_date=payload.source_movie.release_date,
        original_language=payload.source_movie.original_language,
        poster_url=payload.source_movie.poster_url,
        genres=payload.source_movie.genres,
        overview=payload.source_movie.overview
    )

    return RecommendationResponse(
        source_movie=source_schema,
        recommendations=rec_schemas,
        applied_weights=payload.applied_weights,
        execution_time_ms=payload.execution_time_ms
    )


@router.get("/movie/{tmdb_id}")
async def get_movie_detail(tmdb_id: int):
    """Retrieve detailed movie information along with audience review sentiment evaluation."""
    movie = await tmdb_service.get_movie_details(tmdb_id)
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with TMDB ID {tmdb_id} not found."
        )

    reviews = await tmdb_service.get_movie_reviews(tmdb_id)
    sentiment = hybrid_engine.sentiment_engine.analyze_movie_sentiment(tmdb_id, reviews, movie.overview)

    return {
        "movie": movie,
        "sentiment": sentiment,
        "reviews_count": len(reviews)
    }
