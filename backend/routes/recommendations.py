"""
FilmMatch AI — Recommendations & Movie Discovery Routes
Exposes REST endpoints for search, hybrid recommendations, dynamic discovery by language, trending, movie details, and health checks.
"""
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from backend.config import settings
from backend.limiter import limiter
from backend.schemas import (
    HealthResponse,
    CustomWeights,
    MovieRecommendationSchema,
    MovieSearchItem,
    MovieSearchResponse,
    RecommendationRequest,
    RecommendationResponse,
    ScoreBreakdownSchema,
    SourceMovieSchema,
    WatchProviderItem,
    WatchProvidersData,
)
from backend.services.tmdb_service import TMDBService
from backend.services.provenance import TMDBFailure, report
from ml.content_engine import MovieMetadata
from ml.hybrid_engine import HybridRecommendationEngine

router = APIRouter(tags=["recommendations"])

# Singleton services
tmdb_service = TMDBService()
try:
    hybrid_engine = HybridRecommendationEngine()
except Exception:
    # Keep discovery and readiness reachable even when an ML resource is missing.
    hybrid_engine = None


def require_engine():
    if hybrid_engine is None:
        raise HTTPException(status_code=503, detail="Recommendation engine dependencies are unavailable.")
    return hybrid_engine


@router.get("/health", response_model=HealthResponse)
async def health_check(response: Response):
    """Full readiness, not just process liveness. PostgreSQL is not implemented."""
    import time
    from backend.services.provenance import timestamp
    configured = bool(tmdb_service.api_key or tmdb_service.read_token)
    tmdb_ok = False
    tmdb_error = None
    try:
        await tmdb_service._request("/configuration", force_refresh=True, allow_stale=False)
        tmdb_ok = True
    except TMDBFailure as exc:
        tmdb_error = exc.error
    collab = hybrid_engine.collab_engine if hybrid_engine is not None else None
    initialized = collab is not None and collab.is_initialized
    mapped_count = len(collab.tmdb_to_movie) if initialized else 0
    indexed_count = len(collab.movie_id_to_matrix_idx) if initialized else 0
    collab_ok = bool(initialized and collab.item_user_matrix is not None and indexed_count)
    sentiment_ok = hybrid_engine is not None and getattr(hybrid_engine.sentiment_engine, "analyzer", None) is not None
    ready = tmdb_ok and collab_ok and sentiment_ok
    response.status_code = 200 if ready else 503
    return HealthResponse(
        status="healthy" if ready else "degraded", ready=ready,
        version=settings.VERSION, tmdb_configured=configured,
        movielens_mapped_count=mapped_count, database_target="PostgreSQL",
        dependencies={
            "tmdb": {"status": "available" if tmdb_ok else "unavailable", "configured": configured,
                     "checked_at": timestamp(time.time()), "error": tmdb_error},
            "movielens": {"status": "ready" if collab_ok else "unavailable", "mapped_count": mapped_count,
                          "indexed_count": indexed_count},
            "sentiment": {"status": "ready" if sentiment_ok else "unavailable"},
            "database": {"status": "not_implemented", "required": False},
        },
        provenance=report(failed=not ready),
    )


@router.get("/search", response_model=MovieSearchResponse)
@limiter.limit("60/minute")
async def search_movies(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200, description="Movie title or keyword query"),
    page: int = Query(1, ge=1, le=10)
):
    """Search for movies across Indian and global cinema with autocomplete support."""
    sanitized_q = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", q).strip()
    if not sanitized_q:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query cannot be empty or purely whitespace."
        )
    results = await tmdb_service.search_movies(query=sanitized_q, page=page)
    return MovieSearchResponse(
        query=sanitized_q,
        results=results,
        total_results=len(results),
        provenance=report(empty=not results),
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
        total_results=len(results),
        provenance=report(empty=not results),
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
        total_results=len(results),
        provenance=report(empty=not results),
    )


@router.post("/recommend", response_model=RecommendationResponse)
@limiter.limit("30/minute")
async def get_recommendations(
    request: Request,
    req: RecommendationRequest,
    year_min: Optional[int] = Query(None, ge=1880, le=2100, description="Minimum release year"),
    year_max: Optional[int] = Query(None, ge=1880, le=2100, description="Maximum release year"),
    runtime_max: Optional[int] = Query(None, ge=1, le=1000, description="Maximum movie runtime in minutes"),
    genres: Optional[list[str]] = Query(None, description="Optional genre filters"),
    min_rating: Optional[float] = Query(None, ge=0.0, le=10.0, description="Minimum rating"),
    language: Optional[list[str]] = Query(None, description="Optional language code filters"),
    hidden_gems: Optional[bool] = Query(None, description="Filter for hidden gems"),
):
    """
    Generates ranked hybrid movie recommendations based on Content Similarity,
    Audience Sentiment (NLTK VADER), and Collaborative Filtering (MovieLens).
    Supports post-scoring filtering (year range, runtime, genres, min rating, language, hidden gems).
    """
    require_engine()
    source_movie: Optional[MovieMetadata] = None

    # Merge body and query filters (body takes precedence if specified)
    eff_year_min = req.year_min if req.year_min is not None else year_min
    eff_year_max = req.year_max if req.year_max is not None else year_max
    eff_runtime_max = req.runtime_max if req.runtime_max is not None else runtime_max
    eff_genres = req.genres if req.genres is not None else genres
    eff_min_rating = req.min_rating if req.min_rating is not None else min_rating
    eff_language = req.language if req.language is not None else language
    eff_hidden_gems = req.hidden_gems if req.hidden_gems is not None else (hidden_gems or False)

    if eff_year_min is not None and eff_year_max is not None and eff_year_min > eff_year_max:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="year_min cannot be greater than year_max."
        )

    # 1. Resolve source movie
    if req.tmdb_id:
        source_movie = await tmdb_service.get_movie_details(req.tmdb_id)
        if source_movie is None:
            raise HTTPException(status_code=404, detail="The selected movie was not found.")

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

    # 4. Execute Hybrid Recommendation Engine (scoring all candidates before filtering)
    custom_w = None
    if req.custom_weights:
        cw = req.custom_weights
        total = cw.content + cw.sentiment + cw.collaborative
        if total > 0:
            custom_w = {
                "content": cw.content / total,
                "sentiment": cw.sentiment / total,
                "collaborative": cw.collaborative / total,
            }

    payload = hybrid_engine.score_and_rank(
        source_movie=source_movie,
        candidates=candidates,
        candidate_reviews_map=reviews_input_map,
        top_k=len(candidates),
        custom_weights=custom_w,
    )

    # 5. Apply Filters STRICTLY AFTER Scoring
    filter_genres: list[str] = []
    if eff_genres:
        for g in eff_genres:
            for sub in g.split(","):
                if sub.strip():
                    filter_genres.append(sub.strip().lower())

    filter_langs: list[str] = []
    if eff_language:
        for l in eff_language:
            for sub in l.split(","):
                if sub.strip():
                    filter_langs.append(sub.strip().lower())

    def _matches_filter(r) -> bool:
        if eff_year_min is not None or eff_year_max is not None:
            movie_year = None
            if r.release_date and len(r.release_date) >= 4 and r.release_date[:4].isdigit():
                movie_year = int(r.release_date[:4])
            if eff_year_min is not None and (movie_year is None or movie_year < eff_year_min):
                return False
            if eff_year_max is not None and (movie_year is None or movie_year > eff_year_max):
                return False

        if eff_runtime_max is not None and r.runtime is not None:
            if r.runtime > eff_runtime_max:
                return False

        if filter_genres:
            movie_genres_lower = {g.lower() for g in r.genres}
            if not any(fg in movie_genres_lower for fg in filter_genres):
                return False

        if eff_min_rating is not None:
            if r.vote_average < eff_min_rating:
                return False

        if filter_langs:
            if r.original_language.lower() not in filter_langs:
                return False

        if eff_hidden_gems:
            min_sentiment = settings.HIDDEN_GEMS_MIN_SENTIMENT
            max_votes = settings.HIDDEN_GEMS_MAX_VOTES
            if not (r.score_breakdown.sentiment_score >= min_sentiment and r.vote_count < max_votes):
                return False

        return True

    has_active_filters = (
        eff_year_min is not None
        or eff_year_max is not None
        or eff_runtime_max is not None
        or bool(filter_genres)
        or eff_min_rating is not None
        or bool(filter_langs)
        or bool(eff_hidden_gems)
    )

    filtered_candidates = [r for r in payload.recommendations if _matches_filter(r)] if has_active_filters else payload.recommendations
    final_recommendations = filtered_candidates[:req.top_k]

    filter_info: Optional[str] = None
    if has_active_filters:
        if len(final_recommendations) == 0:
            filter_info = "No movies matched your current filter criteria. Try adjusting or clearing filters."
        elif len(filtered_candidates) < req.top_k:
            filter_info = f"Showing {len(final_recommendations)} of {req.top_k} requested recommendations matching your active filters."

    # Fetch watch providers concurrently for filtered winners
    import asyncio as _asyncio
    watch_providers_list = await _asyncio.gather(
        *[tmdb_service.get_watch_providers(r.tmdb_id) for r in final_recommendations],
        return_exceptions=True
    )

    def _parse_providers(raw: object) -> WatchProvidersData | None:
        """Convert raw TMDB IN-region dict to schema. Returns None on bad data."""
        if not isinstance(raw, dict) or not raw:
            return None
        def _items(key: str) -> list[WatchProviderItem]:
            return [
                WatchProviderItem(
                    provider_id=int(p.get("provider_id", 0)),
                    provider_name=str(p.get("provider_name", "")),
                    logo_path=str(p.get("logo_path", "")),
                )
                for p in (raw.get(key) or [])
                if isinstance(p, dict) and p.get("provider_name") and p.get("logo_path")
            ]
        return WatchProvidersData(
            flatrate=_items("flatrate"),
            rent=_items("rent"),
            buy=_items("buy"),
            link=raw.get("link") if isinstance(raw.get("link"), str) else None,
        )

    rec_schemas = []
    for r, raw_wp in zip(final_recommendations, watch_providers_list):
        wp = _parse_providers(raw_wp) if not isinstance(raw_wp, BaseException) else None
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
            runtime=r.runtime,
            hybrid_score=r.hybrid_score,
            match_percentage=r.match_percentage,
            score_breakdown=ScoreBreakdownSchema(
                content_similarity=r.score_breakdown.content_similarity,
                sentiment_score=r.score_breakdown.sentiment_score,
                collaborative_score=r.score_breakdown.collaborative_score,
                is_cold_start=r.score_breakdown.is_cold_start,
                explanation=r.score_breakdown.explanation
            ),
            watch_providers=wp,
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
        execution_time_ms=payload.execution_time_ms,
        filter_info=filter_info,
        provenance=report(empty=not rec_schemas),
        signal_provenance={
            "content": "derived from the movie metadata described in provenance",
            "collaborative": {"source": "local_movielens", "freshness": "local snapshot; not live",
                              "initialized": hybrid_engine.collab_engine.is_initialized},
            "sentiment": {
                str(r.tmdb_id): {
                    "source": "rating_or_overview_fallback" if hybrid_engine.sentiment_engine.cache[r.tmdb_id].is_fallback else "audience_reviews",
                    "review_count": hybrid_engine.sentiment_engine.cache[r.tmdb_id].review_count,
                    "freshness": "derived or engine-cached; calculation timestamp unavailable",
                } for r in payload.recommendations if r.tmdb_id in hybrid_engine.sentiment_engine.cache
            },
        },
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

    require_engine()
    reviews = await tmdb_service.get_movie_reviews(tmdb_id)
    sentiment = hybrid_engine.sentiment_engine.analyze_movie_sentiment(tmdb_id, reviews, movie.overview)

    return {
        "movie": movie,
        "sentiment": sentiment,
        "reviews_count": len(reviews),
        "provenance": report(),
        "signal_provenance": {"sentiment": {
            "source": "rating_or_overview_fallback" if sentiment.is_fallback else "audience_reviews",
            "review_count": sentiment.review_count,
            "freshness": "derived or engine-cached; calculation timestamp unavailable",
        }},
    }
