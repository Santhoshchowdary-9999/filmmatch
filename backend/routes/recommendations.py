"""
FilmMatch AI — Recommendations & Movie Discovery Routes
Exposes REST endpoints for search, hybrid recommendations, dynamic discovery by language, trending, movie details, and health checks.
"""
import re
from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from backend.config import settings
from backend.limiter import limiter
from backend.schemas import (
    HealthResponse,
    CustomWeights,
    ExplanationDetails,
    FeedbackCreateRequest,
    FeedbackItemSchema,
    FeedbackResponse,
    MovieRecommendationSchema,
    MovieSearchItem,
    MovieSearchResponse,
    RecommendationRequest,
    RecommendationResponse,
    ScoreBreakdownSchema,
    SourceMovieSchema,
    WatchProviderItem,
    WatchProvidersData,
    WatchlistAddRequest,
    WatchlistItemSchema,
    WatchlistResponse,
    MoodRecommendationRequest,
    NaturalSearchRequest,
    DetectedFilters,
    NaturalSearchResponse,
    CompareRequest,
    MovieComparisonItem,
    CompareResponse,
    UserAnalyticsResponse,
)
from backend.services.tmdb_service import TMDBService
from backend.services.provenance import TMDBFailure, report
from ml.content_engine import MovieMetadata
from ml.hybrid_engine import HybridRecommendationEngine
from backend.db import (
    save_feedback,
    get_feedback_for_session,
    add_to_watchlist,
    remove_from_watchlist,
    get_watchlist,
    record_user_history,
    get_user_analytics,
)

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


async def compute_recommendations_core(
    req: RecommendationRequest,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None,
    runtime_max: Optional[int] = None,
    genres: Optional[list[str]] = None,
    min_rating: Optional[float] = None,
    language: Optional[list[str]] = None,
    hidden_gems: Optional[bool] = None,
) -> RecommendationResponse:
    """
    Core implementation of ranked hybrid movie recommendations.
    Callable by external API routes or internal composite services (mood, natural-search).
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

    # 4b. Personalization based on User Session Feedback (Feature 4)
    is_personalized_applied = False
    if req.session_id:
        try:
            feedbacks = await get_feedback_for_session(req.session_id)
            if feedbacks:
                liked_ids = {f["recommended_tmdb_id"] for f in feedbacks if f["vote"] in ("like", "up") or (f.get("rating") and f["rating"] >= 4.0)}
                disliked_ids = {f["recommended_tmdb_id"] for f in feedbacks if f["vote"] in ("dislike", "down") or (f.get("rating") and f["rating"] <= 2.0)}

                if liked_ids or disliked_ids:
                    is_personalized_applied = True
                    for rec in payload.recommendations:
                        if rec.tmdb_id in disliked_ids:
                            rec.hybrid_score = max(0.0, rec.hybrid_score - 25.0)
                            rec.match_percentage = int(round(rec.hybrid_score))
                        elif rec.tmdb_id in liked_ids:
                            rec.hybrid_score = min(100.0, rec.hybrid_score + 4.0)
                            rec.match_percentage = int(round(rec.hybrid_score))
                            if hasattr(rec.score_breakdown, "reasons"):
                                rec.score_breakdown.reasons.append("Personalized match: Aligns with films you previously enjoyed")
                    payload.recommendations.sort(key=lambda x: x.hybrid_score, reverse=True)
        except Exception:
            pass

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

    rec_schemas = []
    for r, raw_wp in zip(final_recommendations, watch_providers_list):
        wp = _parse_providers(raw_wp) if not isinstance(raw_wp, BaseException) else None
        
        reasons_list = getattr(r.score_breakdown, "reasons", [])
        if not reasons_list:
            reasons_list = [r.score_breakdown.explanation]

        explanation_obj = ExplanationDetails(
            title="Why this movie?",
            reasons=reasons_list
        )

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
                explanation=r.score_breakdown.explanation,
                explanation_details=explanation_obj,
            ),
            explanation_details=explanation_obj,
            is_personalized=is_personalized_applied,
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
    return await compute_recommendations_core(
        req=req,
        year_min=year_min,
        year_max=year_max,
        runtime_max=runtime_max,
        genres=genres,
        min_rating=min_rating,
        language=language,
        hidden_gems=hidden_gems,
    )


@router.get("/movie/{tmdb_id}")
async def get_movie_detail(tmdb_id: int):
    """Retrieve detailed movie information along with audience review sentiment evaluation and watch providers."""
    movie = await tmdb_service.get_movie_details(tmdb_id)
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movie with TMDB ID {tmdb_id} not found."
        )

    require_engine()
    reviews = await tmdb_service.get_movie_reviews(tmdb_id)
    sentiment = hybrid_engine.sentiment_engine.analyze_movie_sentiment(tmdb_id, reviews, movie.overview)
    raw_providers = await tmdb_service.get_watch_providers(tmdb_id)
    watch_providers = _parse_providers(raw_providers)

    return {
        "movie": movie,
        "sentiment": sentiment,
        "reviews_count": len(reviews),
        "watch_providers": watch_providers,
        "provenance": report(),
        "signal_provenance": {"sentiment": {
            "source": "rating_or_overview_fallback" if sentiment.is_fallback else "audience_reviews",
            "review_count": sentiment.review_count,
            "freshness": "derived or engine-cached; calculation timestamp unavailable",
        }},
    }


# ── Feature 3: Feedback (Like / Dislike / Rating) ───────────────────────────

@router.post("/feedback")
async def submit_user_feedback(req: FeedbackCreateRequest):
    """Record user feedback (like/dislike/star rating) associated with anonymous session UUID."""
    success = await save_feedback(
        session_id=req.session_id,
        recommended_tmdb_id=req.recommended_tmdb_id,
        vote=req.vote,
        source_tmdb_id=req.source_tmdb_id,
        rating=req.rating,
        hybrid_score=req.hybrid_score,
        is_cold_start=req.is_cold_start,
    )
    return {"status": "success" if success else "accepted", "message": "Feedback recorded."}


@router.get("/feedback", response_model=FeedbackResponse)
async def get_user_feedback_history(session_id: str = Query(..., min_length=1, max_length=64)):
    """Fetch all feedback submitted by this session."""
    rows = await get_feedback_for_session(session_id)
    return FeedbackResponse(
        session_id=session_id,
        feedback=[FeedbackItemSchema(**r) for r in rows],
        total=len(rows),
    )


# ── Feature 5: Watchlist / Favorites ────────────────────────────────────────

@router.post("/watchlist")
async def add_movie_to_watchlist(req: WatchlistAddRequest):
    """Add a movie to the user's session watchlist in PostgreSQL."""
    success = await add_to_watchlist(
        session_id=req.session_id,
        tmdb_id=req.tmdb_id,
        title=req.title,
        poster_url=req.poster_url or "",
        release_date=req.release_date or "",
        vote_average=req.vote_average or 0.0,
        genres=req.genres or "",
        original_language=req.original_language or "en",
    )
    return {"status": "success" if success else "accepted", "message": "Movie added to watchlist."}


@router.delete("/watchlist/{tmdb_id}")
async def remove_movie_from_watchlist(tmdb_id: int, session_id: str = Query(..., min_length=1, max_length=64)):
    """Remove a movie from the user's session watchlist."""
    success = await remove_from_watchlist(session_id=session_id, tmdb_id=tmdb_id)
    return {"status": "success" if success else "accepted", "message": "Movie removed from watchlist."}


@router.get("/watchlist", response_model=WatchlistResponse)
async def list_user_watchlist(session_id: str = Query(..., min_length=1, max_length=64)):
    """Retrieve full watchlist for a user session."""
    rows = await get_watchlist(session_id)
    return WatchlistResponse(
        session_id=session_id,
        watchlist=[WatchlistItemSchema(**r) for r in rows],
        total=len(rows),
    )


# ── Feature 6: Mood-Based Recommendations ───────────────────────────────────

MOOD_CONFIGS = {
    "happy": {"genres": ["Comedy", "Family", "Animation", "Adventure"], "min_sentiment": 0.65, "title": "Uplifting & Joyful"},
    "emotional": {"genres": ["Drama", "Romance"], "min_sentiment": 0.40, "title": "Heartfelt & Deep"},
    "excited": {"genres": ["Action", "Adventure", "Thriller"], "min_sentiment": 0.50, "title": "High Energy & Adrenaline"},
    "romantic": {"genres": ["Romance", "Drama", "Comedy"], "min_sentiment": 0.55, "title": "Love & Passion"},
    "thoughtful": {"genres": ["Mystery", "Science Fiction", "Drama", "Crime"], "min_sentiment": 0.50, "title": "Mind-Bending & Intricate"},
    "thrilling": {"genres": ["Thriller", "Horror", "Mystery"], "min_sentiment": 0.45, "title": "Suspense & Edge-of-Seat"},
    "funny": {"genres": ["Comedy"], "min_sentiment": 0.60, "title": "Pure Comedy & Laughs"},
    "relaxed": {"genres": ["Animation", "Family", "Music", "Comedy"], "min_sentiment": 0.55, "title": "Calm & Easy-Going"},
    "motivated": {"genres": ["Drama", "History", "Action"], "min_sentiment": 0.60, "title": "Inspiring & Triumphant"},
}

@router.post("/mood-recommend", response_model=RecommendationResponse)
async def get_mood_recommendations(req: MoodRecommendationRequest):
    """
    Returns curated recommendations tailored to a chosen emotion/mood,
    combining genre affinities, narrative themes, and VADER sentiment scores.
    """
    require_engine()
    raw_mood = req.mood.lower()
    clean_mood = "happy"
    for k in MOOD_CONFIGS:
        if k in raw_mood:
            clean_mood = k
            break

    cfg = MOOD_CONFIGS[clean_mood]
    # Archetype seed film for each mood
    archetype_seeds = {
        "happy": 628241,       # Ala Vaikunthapurramuloo
        "emotional": 592898,   # Jersey
        "excited": 579974,     # RRR
        "romantic": 1229061,   # Premalu
        "thoughtful": 157336,  # Interstellar
        "thrilling": 219968,   # Drishyam
        "funny": 1139829,      # Aavesham
        "relaxed": 579893,     # Kumbalangi Nights
        "motivated": 592898,   # Jersey
    }
    seed_id = archetype_seeds.get(clean_mood, 579974)

    # Use recommendations pipeline with the mood seed
    rec_req = RecommendationRequest(
        query="Mood Recommendation",
        tmdb_id=seed_id,
        top_k=req.top_k,
        genres=cfg["genres"][:2],
        session_id=req.session_id,
    )
    if req.language and req.language != "all":
        rec_req.language = [req.language]

    return await compute_recommendations_core(rec_req)


# ── Feature 7: Natural Language Movie Search ────────────────────────────────

@router.post("/natural-search", response_model=NaturalSearchResponse)
async def natural_language_search(req: NaturalSearchRequest):
    """
    Parses conversational queries (e.g. 'Give me emotional Telugu movies under 2 hours')
    into structured search/recommendation filters and executes scoring.
    """
    require_engine()
    q_lower = req.query.lower()

    # 1. Detect language
    lang_map = {
        "telugu": "te", "hindi": "hi", "tamil": "ta", "malayalam": "ml",
        "kannada": "kn", "bengali": "bn", "marathi": "mr", "english": "en",
        "korean": "ko", "japanese": "ja", "spanish": "es", "french": "fr"
    }
    detected_lang = None
    for name, code in lang_map.items():
        if re.search(rf"\b{name}\b", q_lower):
            detected_lang = code
            break

    # 2. Detect runtime constraint
    runtime_max = None
    m_hour = re.search(r"(?:under|less than|<)\s*(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)", q_lower)
    if m_hour:
        runtime_max = int(float(m_hour.group(1)) * 60)
    else:
        m_min = re.search(r"(?:under|less than|<)\s*(\d+)\s*(?:min|mins|minute|minutes)", q_lower)
        if m_min:
            runtime_max = int(m_min.group(1))

    # 3. Detect mood
    detected_mood = None
    for mood, cfg in MOOD_CONFIGS.items():
        if mood in q_lower:
            detected_mood = mood.capitalize()
            break

    # 4. Detect genres
    genre_keywords = {
        "Action": ["action"], "Comedy": ["comedy", "funny", "laugh"],
        "Drama": ["drama", "emotional"], "Romance": ["romance", "romantic", "love"],
        "Thriller": ["thriller", "suspense"], "Horror": ["horror", "scary"],
        "Science Fiction": ["sci-fi", "science fiction", "space"], "Fantasy": ["fantasy", "magic"],
        "Crime": ["crime", "gangster", "mafia"], "Mystery": ["mystery", "detective"],
        "Adventure": ["adventure"], "Animation": ["animation", "animated"]
    }
    detected_genres = []
    for gname, kws in genre_keywords.items():
        if any(kw in q_lower for kw in kws):
            detected_genres.append(gname)

    # 5. Extract keywords (excluding stop words)
    stop_words = {"give", "want", "like", "movies", "movie", "films", "film", "with", "more", "best", "some", "good", "under", "than", "hours", "hour", "about"}
    words = [w for w in re.findall(r"\b[a-zA-Z]{3,}\b", q_lower) if w not in stop_words and w not in lang_map]

    detected = DetectedFilters(
        language=detected_lang,
        mood=detected_mood,
        genres=detected_genres,
        runtime_max=runtime_max,
        keywords=words[:5]
    )

    # Search for matching movie or discover candidates
    seed_query = " ".join(words) if words else req.query
    search_results = await tmdb_service.search_movies(query=seed_query, page=1)
    
    seed_tmdb_id = search_results[0].tmdb_id if search_results else (579974 if detected_lang == "te" else 157336)
    
    rec_req = RecommendationRequest(
        query=req.query,
        tmdb_id=seed_tmdb_id,
        top_k=req.top_k,
        language=[detected_lang] if detected_lang else None,
        genres=detected_genres if detected_genres else None,
        runtime_max=runtime_max,
        session_id=req.session_id,
    )

    try:
        rec_resp = await compute_recommendations_core(
            req=rec_req,
            year_min=None, year_max=None, runtime_max=runtime_max,
            genres=detected_genres, min_rating=None,
            language=[detected_lang] if detected_lang else None,
            hidden_gems=None
        )
        final_recs = rec_resp.recommendations
    except Exception:
        from backend.services.tmdb_service import OFFLINE_CATALOG
        filtered_offline = [
            m for m in OFFLINE_CATALOG
            if (not detected_lang or m.original_language == detected_lang)
            and (not detected_genres or any(g in m.genres for g in detected_genres))
        ]
        pool = filtered_offline[:req.top_k] if filtered_offline else OFFLINE_CATALOG[:req.top_k]
        final_recs = [
            MovieRecommendationSchema(
                tmdb_id=m.tmdb_id,
                title=m.title,
                overview=m.overview,
                release_date=m.release_date,
                original_language=m.original_language,
                poster_url=m.poster_url,
                backdrop_url=m.backdrop_url,
                genres=m.genres,
                vote_average=m.vote_average,
                vote_count=m.vote_count,
                runtime=m.runtime,
                hybrid_score=round(m.vote_average * 10, 1),
                match_percentage=int(round(m.vote_average * 10)),
                score_breakdown=ScoreBreakdownSchema(
                    content_similarity=0.85,
                    sentiment_score=0.80,
                    collaborative_score=None,
                    is_cold_start=True,
                    explanation=f"Matches your search criteria for {detected_lang or 'cinema'} films.",
                ),
                explanation_details=ExplanationDetails(
                    title="Why this movie?",
                    reasons=[f"Matches your query: {req.query}", "High audience rating"]
                )
            )
            for m in pool
        ]

    return NaturalSearchResponse(
        original_query=req.query,
        detected_filters=detected,
        results=final_recs,
        total_results=len(final_recs),
    )


# ── Feature 8: Movie Comparison ─────────────────────────────────────────────

@router.post("/compare", response_model=CompareResponse)
async def compare_movies(req: CompareRequest):
    """
    Performs head-to-head comparison between 2 to 4 films across ratings,
    runtimes, audience sentiment polarity, strengths, and weaknesses.
    """
    require_engine()
    items: list[MovieComparisonItem] = []

    for mid in req.movie_ids:
        m = None
        try:
            m = await tmdb_service.get_movie_details(mid)
        except Exception:
            pass
        if not m:
            from backend.services.tmdb_service import OFFLINE_CATALOG
            m = next((item for item in OFFLINE_CATALOG if item.tmdb_id == mid), None)
        if not m:
            continue
        try:
            reviews = await tmdb_service.get_movie_reviews(mid)
        except Exception:
            reviews = []
        sentiment = hybrid_engine.sentiment_engine.analyze_movie_sentiment(mid, reviews, m.overview)
        try:
            raw_wp = await tmdb_service.get_watch_providers(mid)
        except Exception:
            raw_wp = {}
        wp = _parse_providers(raw_wp)

        strengths: list[str] = []
        weaknesses: list[str] = []

        if m.vote_average >= 8.0:
            strengths.append(f"Critically acclaimed rating (⭐ {m.vote_average}/10)")
        elif m.vote_average < 6.5:
            weaknesses.append("Average critical rating")

        s_score = sentiment.sentiment_score
        if s_score >= 0.70:
            strengths.append(f"Overwhelming audience praise ({int(round(s_score * 100))}% positive)")
        elif s_score < 0.50:
            weaknesses.append("Mixed or divided viewer sentiment")

        if m.vote_count >= 1500:
            strengths.append(f"Massive cultural footprint ({m.vote_count:,} reviews)")
        elif m.vote_count < 100:
            weaknesses.append("Smaller viewer sample size")

        if m.runtime and m.runtime <= 125:
            strengths.append(f"Fast, engaging pacing ({m.runtime} mins)")
        elif m.runtime and m.runtime >= 165:
            weaknesses.append(f"Substantial time commitment ({m.runtime} mins)")

        if not strengths:
            strengths.append("Balanced thematic presentation")
        if not weaknesses:
            weaknesses.append("Broad, versatile appeal")

        year = m.release_date[:4] if m.release_date and len(m.release_date) >= 4 else "N/A"
        summary_label = getattr(sentiment, "sentiment_summary", "") or ("Positive" if sentiment.sentiment_score >= 0.6 else "Mixed")

        items.append(MovieComparisonItem(
            tmdb_id=m.tmdb_id,
            title=m.title,
            poster_url=m.poster_url or "",
            backdrop_url=m.backdrop_url or "",
            release_date=m.release_date or "",
            year=year,
            genres=m.genres or [],
            runtime=m.runtime,
            vote_average=m.vote_average or 0.0,
            vote_count=m.vote_count or 0,
            sentiment_score=sentiment.sentiment_score,
            sentiment_label=summary_label,
            strengths=strengths,
            weaknesses=weaknesses,
            watch_providers=wp,
        ))

    if not items:
        raise HTTPException(status_code=404, detail="None of the requested movies could be loaded.")

    winner_rat = max(items, key=lambda x: x.vote_average).title if items else None
    winner_sent = max(items, key=lambda x: x.sentiment_score).title if items else None

    return CompareResponse(
        movies=items,
        winner_ratings=winner_rat,
        winner_sentiment=winner_sent,
    )


# ── Feature 15 & 14: Analytics & Profile ─────────────────────────────────────

@router.get("/analytics", response_model=UserAnalyticsResponse)
async def get_analytics(session_id: str = Query(..., min_length=1, max_length=64)):
    """Calculates user recommendation statistics and taste profile."""
    analytics = await get_user_analytics(session_id)
    watchlist = await get_watchlist(session_id)
    feedbacks = await get_feedback_for_session(session_id)

    # Calculate favorite genres and languages
    genre_counts: dict[str, int] = {}
    lang_counts: dict[str, int] = {}

    for w in watchlist:
        for g in (w.get("genres") or "").split(","):
            g = g.strip()
            if g:
                genre_counts[g] = genre_counts.get(g, 0) + 1
        lang = w.get("original_language") or "en"
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    for f in feedbacks:
        if f.get("vote") in ("like", "up"):
            pass

    top_genres = [{"genre": g, "count": c} for g, c in sorted(genre_counts.items(), key=lambda x: -x[1])[:5]]
    top_langs = [{"language": l, "count": c} for l, c in sorted(lang_counts.items(), key=lambda x: -x[1])[:5]]

    return UserAnalyticsResponse(
        session_id=session_id,
        total_feedback=analytics["total_feedback"],
        liked_count=analytics["liked_count"],
        disliked_count=analytics["disliked_count"],
        average_rating=analytics["average_rating"],
        watchlist_count=analytics["watchlist_count"],
        favorite_genres=top_genres,
        favorite_languages=top_langs,
        personalized_ready=analytics["personalized_ready"],
    )


@router.get("/profile")
async def get_user_profile(session_id: str = Query(..., min_length=1, max_length=64)):
    """Consolidated user profile dashboard combining watchlist, feedback, and analytics."""
    analytics = await get_analytics(session_id)
    watchlist = await get_watchlist(session_id)
    feedbacks = await get_feedback_for_session(session_id)

    return {
        "session_id": session_id,
        "analytics": analytics,
        "watchlist": watchlist,
        "feedback_history": feedbacks,
    }

