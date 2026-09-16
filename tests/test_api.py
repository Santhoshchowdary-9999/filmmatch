"""
Integration tests for FastAPI REST Endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_target"] == "PostgreSQL"
    assert data["tmdb_configured"] is True


def test_search_endpoint_regional():
    # Test Telugu query
    res_te = client.get("/api/search?q=RRR")
    assert res_te.status_code == 200
    data_te = res_te.json()
    assert len(data_te["results"]) > 0
    assert any("RRR" in m["title"] for m in data_te["results"])

    # Test Hindi query
    res_hi = client.get("/api/search?q=Dangal")
    assert res_hi.status_code == 200
    data_hi = res_hi.json()
    assert any("Dangal" in m["title"] for m in data_hi["results"])

    # Test Global query
    res_en = client.get("/api/search?q=Inception")
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert any("Inception" in m["title"] for m in data_en["results"])


def test_discover_endpoint():
    # Test Telugu dynamic discovery
    res_te = client.get("/api/discover?language=te")
    assert res_te.status_code == 200
    data_te = res_te.json()
    assert len(data_te["results"]) >= 10
    assert all(m["original_language"] == "te" for m in data_te["results"])

    # Test Hindi dynamic discovery
    res_hi = client.get("/api/discover?language=hi")
    assert res_hi.status_code == 200
    data_hi = res_hi.json()
    assert len(data_hi["results"]) >= 10
    assert all(m["original_language"] == "hi" for m in data_hi["results"])

    # Test Tamil dynamic discovery
    res_ta = client.get("/api/discover?language=ta")
    assert res_ta.status_code == 200
    data_ta = res_ta.json()
    assert len(data_ta["results"]) >= 10


def test_trending_endpoint():
    res = client.get("/api/trending")
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) >= 10


def test_recommend_endpoint_e2e():
    payload = {
        "query": "Inception",
        "top_k": 10
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "source_movie" in data
    assert data["source_movie"]["title"] == "Inception"
    assert len(data["recommendations"]) == 10

    applied_weights = data["applied_weights"]
    assert applied_weights["content"] == 0.50
    assert applied_weights["sentiment"] == 0.20
    assert applied_weights["collaborative"] == 0.30

    for rec in data["recommendations"]:
        assert 0.0 <= rec["hybrid_score"] <= 100.0
        assert 0 <= rec["match_percentage"] <= 100
        assert "score_breakdown" in rec
        bd = rec["score_breakdown"]
        assert 0.0 <= bd["content_similarity"] <= 1.0
        assert 0.0 <= bd["sentiment_score"] <= 1.0
        assert len(bd["explanation"]) > 0

    scores = [r["hybrid_score"] for r in data["recommendations"]]
    assert scores == sorted(scores, reverse=True)
