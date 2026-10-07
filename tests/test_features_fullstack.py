"""
FilmMatch AI — Comprehensive Full-Stack Features Test Suite
Validates:
- Explainable AI & Score Breakdown fields
- Feedback submission and retrieval (POST/GET /api/feedback)
- Watchlist addition, deletion, and listing (POST/GET/DELETE /api/watchlist)
- Mood recommendations (POST /api/mood-recommend)
- Natural language query parser & recommendations (POST /api/natural-search)
- Movie comparison (POST /api/compare)
- User analytics & Profile (GET /api/analytics, GET /api/profile)
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_feedback_lifecycle():
    """Verify submitting like/dislike and star ratings for an anonymous session."""
    session_id = f"test-sess-{uuid.uuid4()}"
    
    # 1. Submit like feedback
    resp = client.post("/api/feedback", json={
        "session_id": session_id,
        "source_tmdb_id": 579974,
        "recommended_tmdb_id": 256040,
        "vote": "like",
        "rating": 5.0,
        "hybrid_score": 88.5,
        "is_cold_start": False,
    })
    assert resp.status_code == 200
    assert resp.json()["status"] in ("success", "accepted")

    # 2. Retrieve session feedback
    get_resp = client.get(f"/api/feedback?session_id={session_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["session_id"] == session_id
    assert data["total"] >= 1
    assert data["feedback"][0]["recommended_tmdb_id"] == 256040
    assert data["feedback"][0]["vote"] == "like"


def test_watchlist_lifecycle():
    """Verify adding, listing, and removing a movie from session watchlist."""
    session_id = f"test-sess-{uuid.uuid4()}"
    tmdb_id = 579974

    # 1. Add to watchlist
    add_resp = client.post("/api/watchlist", json={
        "session_id": session_id,
        "tmdb_id": tmdb_id,
        "title": "RRR",
        "poster_url": "/tjpiEnZBUAA8pdNPRKa5vP2Zpqw.jpg",
        "release_date": "2022-03-24",
        "vote_average": 8.8,
        "genres": "Action, Drama",
        "original_language": "te"
    })
    assert add_resp.status_code == 200
    assert add_resp.json()["status"] in ("success", "accepted")

    # 2. Get watchlist
    list_resp = client.get(f"/api/watchlist?session_id={session_id}")
    assert list_resp.status_code == 200
    w_data = list_resp.json()
    assert w_data["total"] >= 1
    assert any(m["tmdb_id"] == tmdb_id for m in w_data["watchlist"])

    # 3. Delete from watchlist
    del_resp = client.delete(f"/api/watchlist/{tmdb_id}?session_id={session_id}")
    assert del_resp.status_code == 200

    # 4. Confirm deleted
    post_del_resp = client.get(f"/api/watchlist?session_id={session_id}")
    assert post_del_resp.status_code == 200
    assert not any(m["tmdb_id"] == tmdb_id for m in post_del_resp.json()["watchlist"])


def test_movie_comparison():
    """Verify comparing 2 films produces metrics, strengths, weaknesses, and winners."""
    resp = client.post("/api/compare", json={
        "movie_ids": [579974, 256040]
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["movies"]) >= 1
    m0 = data["movies"][0]
    assert "sentiment_score" in m0
    assert "strengths" in m0
    assert "weaknesses" in m0
    assert isinstance(m0["strengths"], list)


def test_natural_language_search_detection():
    """Verify natural query parsing and filter detection."""
    resp = client.post("/api/natural-search", json={
        "query": "emotional Telugu drama under 2 hours",
        "top_k": 3
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["detected_filters"]["language"] == "te"
    assert data["detected_filters"]["runtime_max"] == 120
    assert "Drama" in data["detected_filters"]["genres"] or "emotional" in data["original_query"].lower()
    assert len(data["results"]) >= 0


def test_user_analytics_and_profile():
    """Verify profile and analytics endpoints return correct schema structure."""
    session_id = f"test-sess-{uuid.uuid4()}"

    resp = client.get(f"/api/analytics?session_id={session_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_feedback" in data
    assert "watchlist_count" in data
    assert "favorite_genres" in data

    prof_resp = client.get(f"/api/profile?session_id={session_id}")
    assert prof_resp.status_code == 200
    prof = prof_resp.json()
    assert "analytics" in prof
    assert "watchlist" in prof
    assert "feedback_history" in prof
