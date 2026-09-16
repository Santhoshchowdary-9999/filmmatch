"""Phase 1 API contracts with isolated upstream and engine dependencies."""
from types import SimpleNamespace
from unittest.mock import patch
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.services.tmdb_service import TMDBService

REAL_CLIENT = httpx.AsyncClient


@pytest.fixture
def environment(monkeypatch):
    # App import must not download NLTK resources in these contract tests.
    with patch("ml.hybrid_engine.HybridRecommendationEngine", return_value=None):
        import backend.main as main
        from backend.routes import recommendations as routes
    collab = SimpleNamespace(is_initialized=True, tmdb_to_movie={1: 1},
                             movie_id_to_matrix_idx={1: 0}, item_user_matrix=object(),
                             load_and_fit=lambda: True)
    engine = SimpleNamespace(collab_engine=collab, sentiment_engine=SimpleNamespace(analyzer=object()))
    service = TMDBService()
    service.api_key, service.read_token, service.headers = "test-key", "", {}
    monkeypatch.setattr(routes, "tmdb_service", service)
    monkeypatch.setattr(routes, "hybrid_engine", engine)
    monkeypatch.setattr(main, "hybrid_engine", engine)
    state = {"status": 200, "empty": False}
    def handler(request):
        if state["status"] != 200:
            return httpx.Response(state["status"], text="private error")
        if request.url.path.endswith("/configuration"):
            return httpx.Response(200, json={"images": {}})
        return httpx.Response(200, json={"results": [] if state["empty"] else [
            {"id": 1, "title": "Fixture", "release_date": "2000-01-01", "original_language": "en",
             "overview": "A journey", "vote_average": 7, "genre_ids": [18]}]})
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: REAL_CLIENT(transport=httpx.MockTransport(handler), **kw))
    with TestClient(main.app) as client:
        yield client, service, engine, state, routes


def test_health_measures_dependencies(environment):
    client, service, engine, state, routes = environment
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] and data["movielens_mapped_count"] == 1
    assert data["dependencies"]["movielens"]["indexed_count"] == 1
    assert data["dependencies"]["database"]["status"] == "not_implemented"
    engine.collab_engine.is_initialized = False
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json()["movielens_mapped_count"] == 0


def test_health_does_not_mask_outage_or_missing_credentials(environment):
    client, service, engine, state, routes = environment
    assert client.get("/api/health").status_code == 200
    state["status"] = 503
    response = client.get("/api/health")
    assert response.status_code == 503
    assert not response.json()["provenance"]["stale"]
    service.api_key = ""
    response = client.get("/api/health?demo=true")
    assert response.status_code == 503
    assert response.json()["tmdb_configured"] is False


def test_missing_engine_remains_observable(environment, monkeypatch):
    client, service, engine, state, routes = environment
    monkeypatch.setattr(routes, "hybrid_engine", None)
    assert client.get("/api/health").status_code == 503
    response = client.post("/api/recommend", json={"query": "Fixture"})
    assert response.status_code == 503
    assert response.json()["provenance"]["status"] == "failed"


@pytest.mark.parametrize("endpoint", ["/api/search?q=RRR", "/api/discover", "/api/trending"])
def test_catalog_live_cache_empty_and_failure(environment, endpoint):
    client, service, engine, state, routes = environment
    first = client.get(endpoint)
    cached = client.get(endpoint)
    assert first.status_code == cached.status_code == 200
    assert first.json()["provenance"]["cache"] == "fresh"
    assert cached.json()["provenance"]["cache"] == "cached"
    assert first.json()["provenance"]["fetched_at"] == cached.json()["provenance"]["fetched_at"]
    assert cached.headers["cache-control"] == "no-store"
    service._cache.clear()
    state["empty"] = True
    empty = client.get(endpoint).json()
    assert empty["results"] == [] and empty["provenance"]["status"] == "empty"
    assert empty["provenance"]["source"] == "tmdb"
    service._cache.clear()
    state["status"] = 401
    failure = client.get(endpoint)
    assert failure.status_code == 502
    assert failure.json()["provenance"]["status"] == "failed"
    assert "private error" not in failure.text


def test_demo_is_explicit_and_isolated(environment):
    client, service, engine, state, routes = environment
    service.api_key = ""
    demo = client.get("/api/search?q=RRR&demo=true")
    assert demo.status_code == 200 and demo.json()["results"]
    assert demo.json()["provenance"]["source"] == "offline_demo"
    assert demo.json()["provenance"]["fetched_at"] is None
    assert client.get("/api/search?q=RRR").status_code == 503


def test_recommendation_failures_never_return_fabricated_results(environment):
    client, service, engine, state, routes = environment
    service.api_key = ""
    response = client.post("/api/recommend", json={"query": "RRR"})
    assert response.status_code == 503
    assert "recommendations" not in response.json()
    assert response.json()["detail"]["code"] == "tmdb_not_configured"
    response = client.post("/api/recommend", json={"query": ""})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "validation_error"
    service.api_key = "test-key"
    state["empty"] = True
    assert client.post("/api/recommend", json={"query": "No match"}).status_code == 404
