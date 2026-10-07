"""
Tests for Phase 6 Backend Hardening:
- Input sanitization & validation (bounds, query length, whitespace)
- Weight configuration validation at startup (non-negative, sum to 1.0)
- Rate limiting on /api/search and /api/recommend
- Resilient TMDB error handling & graceful partial results
"""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.config import Settings
from backend.main import app
from backend.schemas import RecommendationRequest
from backend.limiter import limiter


def test_settings_weights_validation_success():
    """Valid weights summing to 1.0 should pass."""
    cfg = Settings(
        DEFAULT_CONTENT_WEIGHT=0.50,
        DEFAULT_SENTIMENT_WEIGHT=0.20,
        DEFAULT_COLLAB_WEIGHT=0.30,
        COLD_START_CONTENT_WEIGHT=0.65,
        COLD_START_SENTIMENT_WEIGHT=0.35,
        COLD_START_COLLAB_WEIGHT=0.00,
    )
    assert cfg.DEFAULT_CONTENT_WEIGHT == 0.50


def test_settings_weights_invalid_sum():
    """Weights that do not sum to 1.0 must fail fast."""
    with pytest.raises(ValidationError):
        Settings(
            DEFAULT_CONTENT_WEIGHT=0.80,
            DEFAULT_SENTIMENT_WEIGHT=0.30,
            DEFAULT_COLLAB_WEIGHT=0.10,
        )


def test_settings_weights_negative():
    """Negative weights must fail fast."""
    with pytest.raises(ValidationError):
        Settings(
            DEFAULT_CONTENT_WEIGHT=-0.10,
            DEFAULT_SENTIMENT_WEIGHT=0.50,
            DEFAULT_COLLAB_WEIGHT=0.60,
        )


def test_recommendation_request_sanitizes_query():
    """Query with leading/trailing spaces and control characters is sanitized."""
    req = RecommendationRequest(query="  Inception \x00\x1f  ", top_k=10)
    assert req.query == "Inception"


def test_recommendation_request_rejects_empty():
    """Purely whitespace or empty query must fail validation."""
    with pytest.raises(ValidationError):
        RecommendationRequest(query="   \t\n  ", top_k=10)


def test_recommendation_request_top_k_bounds():
    """top_k must be between 1 and 50."""
    with pytest.raises(ValidationError):
        RecommendationRequest(query="RRR", top_k=0)
    with pytest.raises(ValidationError):
        RecommendationRequest(query="RRR", top_k=51)

    valid_1 = RecommendationRequest(query="RRR", top_k=1)
    valid_50 = RecommendationRequest(query="RRR", top_k=50)
    assert valid_1.top_k == 1
    assert valid_50.top_k == 50


def test_recommendation_request_max_length():
    """Query exceeding 200 characters must fail validation."""
    with pytest.raises(ValidationError):
        RecommendationRequest(query="A" * 201, top_k=10)


def test_search_empty_or_whitespace_returns_422():
    """API endpoint rejects whitespace-only search query with 422."""
    client = TestClient(app)
    response = client.get("/api/search?q=%20%20%20")
    assert response.status_code == 422


def test_rate_limiting_on_recommend():
    """Exceeding endpoint rate limit returns 429."""
    client = TestClient(app)
    # The recommend endpoint is limited to 30/minute
    # Rapidly call recommend with empty/invalid payload or valid structure to trigger rate limiter
    hit_429 = False
    for _ in range(40):
        res = client.post("/api/recommend", json={"query": "RRR", "top_k": 5})
        if res.status_code == 429:
            hit_429 = True
            assert res.json()["detail"]["code"] == "rate_limit_exceeded"
            break
    # Reset limiter for subsequent tests
    limiter.reset()
    assert hit_429, "Rate limiter should have triggered HTTP 429"
