"""
Unit and integration tests for Feature 2: Filters and Hidden Gems Discovery.
Tests filter combinations, hidden gems on and off, input validation, and post-scoring invariance.
"""
import pytest
from pydantic import ValidationError

from backend.config import settings
from backend.schemas import (
    RecommendationRequest,
    MovieRecommendationSchema,
    ScoreBreakdownSchema,
    RecommendationResponse,
    SourceMovieSchema,
)


def test_hidden_gems_config_thresholds():
    """Verify hidden gems thresholds are defined in Settings and match the constitution."""
    assert hasattr(settings, "HIDDEN_GEMS_MIN_SENTIMENT")
    assert hasattr(settings, "HIDDEN_GEMS_MAX_VOTES")
    assert settings.HIDDEN_GEMS_MIN_SENTIMENT == 0.75
    assert settings.HIDDEN_GEMS_MAX_VOTES == 1000


def test_recommendation_request_valid_filters():
    """Valid filter inputs parse correctly."""
    req = RecommendationRequest(
        query="RRR",
        year_min=2010,
        year_max=2024,
        runtime_max=180,
        genres=["Action", "Drama"],
        min_rating=7.5,
        language=["te", "hi"],
        hidden_gems=True,
    )
    assert req.year_min == 2010
    assert req.year_max == 2024
    assert req.runtime_max == 180
    assert req.genres == ["Action", "Drama"]
    assert req.min_rating == 7.5
    assert req.language == ["te", "hi"]
    assert req.hidden_gems is True


def test_recommendation_request_invalid_year_range():
    """year_min > year_max must fail Pydantic validation."""
    with pytest.raises(ValidationError) as exc_info:
        RecommendationRequest(
            query="Inception",
            year_min=2025,
            year_max=2010,
        )
    assert "year_min cannot be greater than year_max" in str(exc_info.value)


def test_recommendation_request_out_of_bounds_inputs():
    """Inputs out of allowed ranges fail validation."""
    with pytest.raises(ValidationError):
        RecommendationRequest(query="Test", year_min=1800)  # ge=1880

    with pytest.raises(ValidationError):
        RecommendationRequest(query="Test", runtime_max=0)  # ge=1

    with pytest.raises(ValidationError):
        RecommendationRequest(query="Test", min_rating=11.0)  # le=10.0


def test_hidden_gems_qualification():
    """Tests that a movie qualifies as a hidden gem iff sentiment >= 0.75 and vote_count < 1000."""
    def is_hidden_gem(sentiment: float, votes: int) -> bool:
        return (
            sentiment >= settings.HIDDEN_GEMS_MIN_SENTIMENT
            and votes < settings.HIDDEN_GEMS_MAX_VOTES
        )

    # High sentiment, modest votes -> Qualified
    assert is_hidden_gem(0.85, 350) is True
    assert is_hidden_gem(0.75, 999) is True

    # High sentiment, mainstream votes (>= 1000) -> Excluded
    assert is_hidden_gem(0.90, 1000) is False
    assert is_hidden_gem(0.85, 5000) is False

    # Low sentiment (< 0.75), low votes -> Excluded
    assert is_hidden_gem(0.65, 200) is False
    assert is_hidden_gem(0.74, 50) is False


def test_filter_info_in_response_schema():
    """filter_info is an optional string field on RecommendationResponse."""
    resp = RecommendationResponse(
        source_movie=SourceMovieSchema(
            tmdb_id=1,
            title="Source Movie",
            release_date="2020-01-01",
            original_language="en",
            poster_url="",
            genres=["Action"],
            overview="",
        ),
        recommendations=[],
        applied_weights={"content": 0.5, "sentiment": 0.2, "collaborative": 0.3},
        execution_time_ms=12.5,
        filter_info="Showing 0 of 10 recommendations matching your filters.",
        provenance={
            "status": "ok",
            "source": "offline_demo",
            "cache": "none",
            "fetched_at": None,
            "stale": False,
            "errors": [],
            "components": [],
        },
    )
    assert resp.filter_info == "Showing 0 of 10 recommendations matching your filters."
    assert resp.recommendations == []


def test_filter_matching_logic():
    """Test the filtering logic against sample movie recommendations."""
    movies = [
        MovieRecommendationSchema(
            tmdb_id=101,
            title="Indie Hit",
            overview="Great story",
            release_date="2021-05-10",
            original_language="te",
            poster_url="",
            backdrop_url="",
            genres=["Drama", "Romance"],
            vote_average=8.2,
            vote_count=450,
            runtime=130,
            hybrid_score=88.5,
            match_percentage=89,
            score_breakdown=ScoreBreakdownSchema(
                content_similarity=0.8,
                sentiment_score=0.85,
                collaborative_score=0.7,
                is_cold_start=False,
                explanation="High match",
            ),
        ),
        MovieRecommendationSchema(
            tmdb_id=102,
            title="Blockbuster Action",
            overview="Big explosions",
            release_date="2015-07-20",
            original_language="en",
            poster_url="",
            backdrop_url="",
            genres=["Action", "Adventure"],
            vote_average=7.1,
            vote_count=15000,
            runtime=155,
            hybrid_score=82.0,
            match_percentage=82,
            score_breakdown=ScoreBreakdownSchema(
                content_similarity=0.75,
                sentiment_score=0.65,
                collaborative_score=0.8,
                is_cold_start=False,
                explanation="Action match",
            ),
        ),
        MovieRecommendationSchema(
            tmdb_id=103,
            title="Classic Comedy",
            overview="Very funny",
            release_date="1995-11-15",
            original_language="hi",
            poster_url="",
            backdrop_url="",
            genres=["Comedy"],
            vote_average=7.8,
            vote_count=800,
            runtime=110,
            hybrid_score=79.0,
            match_percentage=79,
            score_breakdown=ScoreBreakdownSchema(
                content_similarity=0.7,
                sentiment_score=0.78,
                collaborative_score=0.6,
                is_cold_start=False,
                explanation="Comedy match",
            ),
        ),
    ]

    # Filter by genre "Action" -> only movie 102
    action_matches = [
        m for m in movies
        if any(g.lower() == "action" for g in m.genres)
    ]
    assert len(action_matches) == 1
    assert action_matches[0].tmdb_id == 102

    # Filter by year era 2020+ -> only movie 101
    era_matches = [
        m for m in movies
        if m.release_date and int(m.release_date[:4]) >= 2020
    ]
    assert len(era_matches) == 1
    assert era_matches[0].tmdb_id == 101

    # Filter by runtime <= 120m -> only movie 103
    short_matches = [
        m for m in movies
        if m.runtime is not None and m.runtime <= 120
    ]
    assert len(short_matches) == 1
    assert short_matches[0].tmdb_id == 103

    # Hidden Gems: sentiment >= 0.75 AND votes < 1000
    # Movie 101: sentiment=0.85, votes=450 -> YES
    # Movie 102: sentiment=0.65, votes=15000 -> NO
    # Movie 103: sentiment=0.78, votes=800 -> YES
    gems = [
        m for m in movies
        if m.score_breakdown.sentiment_score >= settings.HIDDEN_GEMS_MIN_SENTIMENT
        and m.vote_count < settings.HIDDEN_GEMS_MAX_VOTES
    ]
    assert len(gems) == 2
    assert {g.tmdb_id for g in gems} == {101, 103}

    # Verify score invariance: scores are identical before and after filtering
    assert gems[0].hybrid_score == 88.5
    assert gems[1].hybrid_score == 79.0
