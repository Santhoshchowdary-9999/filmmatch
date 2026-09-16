"""No external network, credentials, dataset, or NLP resources required."""
import asyncio
import json

import httpx
import pytest

from backend.services.provenance import begin_request, end_request, report, TMDBFailure
from backend.services.tmdb_service import TMDBService
from ml.content_engine import MovieMetadata

MOVIE = {"id": 42, "title": "Fixture movie", "release_date": "1990-01-01",
         "original_language": "en", "vote_average": 7.0, "overview": "A journey.", "genre_ids": [18]}
REAL_CLIENT = httpx.AsyncClient


@pytest.fixture
def service(monkeypatch):
    instance = TMDBService()
    instance.api_key = "test-only-key"
    instance.read_token = ""
    instance.headers = {}
    return instance


def transport(monkeypatch, handler):
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: REAL_CLIENT(transport=httpx.MockTransport(handler), **kwargs))


async def observed(awaitable, demo=False):
    tokens = begin_request(demo=demo)
    try:
        value = await awaitable
        return value, report(empty=not value)
    finally:
        end_request(tokens)


@pytest.mark.asyncio
async def test_live_then_cached_keeps_original_timestamp(service, monkeypatch):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"results": [MOVIE]})
    transport(monkeypatch, handler)
    first, fresh = await observed(service.search_movies("Fixture"))
    second, cached = await observed(service.search_movies("Fixture"))
    assert first == second
    assert fresh["source"] == cached["source"] == "tmdb"
    assert fresh["cache"] == "fresh"
    assert cached["cache"] == "cached"
    assert cached["fetched_at"] == fresh["fetched_at"]
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_empty_response_is_cached_and_not_replaced(service, monkeypatch):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={"results": []})
    transport(monkeypatch, handler)
    movies, metadata = await observed(service.search_movies("RRR"))
    assert movies == []
    assert metadata["status"] == "empty"
    assert metadata["source"] == "tmdb"
    await observed(service.search_movies("RRR"))
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_demo_is_explicit_and_does_not_poison_live_cache(service, monkeypatch):
    transport(monkeypatch, lambda request: httpx.Response(200, json={"results": []}))
    movies, metadata = await observed(service.search_movies("RRR"), demo=True)
    assert movies and metadata["source"] == "offline_demo"
    assert metadata["fetched_at"] is None
    assert service._cache == {}
    movies, metadata = await observed(service.search_movies("RRR"))
    assert movies == [] and metadata["source"] == "tmdb"


@pytest.mark.asyncio
@pytest.mark.parametrize("demo", [False, True])
@pytest.mark.parametrize("status", [401, 403, 404, 429, 500])
async def test_http_failures_are_not_offline_success(service, monkeypatch, status, demo):
    transport(monkeypatch, lambda request: httpx.Response(status, text="private upstream response"))
    tokens = begin_request(demo=demo)
    try:
        with pytest.raises(TMDBFailure):
            await service.get_trending_movies()
        metadata = report(failed=True)
        assert metadata["status"] == "failed" and metadata["source"] == "none"
        assert metadata["errors"][0]["upstream_status"] == status
        assert "private upstream response" not in json.dumps(metadata)
        assert "test-only-key" not in json.dumps(metadata)
        assert service._cache == {}
    finally:
        end_request(tokens)


@pytest.mark.asyncio
async def test_missing_credentials_never_calls_network(service, monkeypatch):
    service.api_key = ""
    def forbidden(request):
        pytest.fail("Unexpected network call")
    transport(monkeypatch, forbidden)
    with pytest.raises(TMDBFailure, match="not configured"):
        await service.discover_movies()


@pytest.mark.asyncio
async def test_stale_is_bounded_and_never_retimestamped(service, monkeypatch):
    clock = [10000.0]
    monkeypatch.setattr("backend.services.tmdb_service.time.time", lambda: clock[0])
    transport(monkeypatch, lambda request: httpx.Response(200, json={"results": [MOVIE]}))
    original, fresh = await observed(service.get_trending_movies())
    def timeout(request):
        raise httpx.ReadTimeout("do not expose this URL or credential", request=request)
    transport(monkeypatch, timeout)
    clock[0] += 700
    retained, stale = await observed(service.get_trending_movies())
    assert retained == original
    assert stale["cache"] == "stale" and stale["status"] == "degraded"
    assert stale["fetched_at"] == fresh["fetched_at"]
    assert stale["errors"][0]["code"] == "tmdb_timeout"
    clock[0] += 3000
    with pytest.raises(TMDBFailure):
        await observed(service.get_trending_movies())


@pytest.mark.asyncio
async def test_refresh_bypasses_cache_and_empty_replaces_old_data(service, monkeypatch):
    transport(monkeypatch, lambda request: httpx.Response(200, json={"results": [MOVIE]}))
    await observed(service.get_trending_movies())
    transport(monkeypatch, lambda request: httpx.Response(200, json={"results": []}))
    movies, metadata = await observed(service.get_trending_movies(force_refresh=True))
    assert movies == [] and metadata["status"] == "empty"
    assert metadata["cache"] == "fresh"
    movies, metadata = await observed(service.get_trending_movies())
    assert movies == [] and metadata["cache"] == "cached"


@pytest.mark.asyncio
async def test_auth_failure_does_not_serve_stale(service, monkeypatch):
    transport(monkeypatch, lambda request: httpx.Response(200, json={"results": [MOVIE]}))
    await observed(service.get_trending_movies())
    transport(monkeypatch, lambda request: httpx.Response(401))
    with pytest.raises(TMDBFailure):
        await observed(service.get_trending_movies(force_refresh=True))


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [{}, {"results": None}, {"results": ["bad"]}, {"results": [{"id": 1}]}])
async def test_invalid_payload_never_enters_cache(service, monkeypatch, payload):
    transport(monkeypatch, lambda request: httpx.Response(200, json=payload))
    with pytest.raises(TMDBFailure):
        await observed(service.search_movies("x"))
    assert service._cache == {}


@pytest.mark.asyncio
async def test_partial_live_candidates_are_preserved(service, monkeypatch):
    def handler(request):
        if request.url.path.endswith("/recommendations"):
            return httpx.Response(200, json={"results": [MOVIE]})
        if request.url.path.endswith("/similar"):
            return httpx.Response(503)
        return httpx.Response(200, json={**MOVIE, "genres": []})
    transport(monkeypatch, handler)
    candidates, metadata = await observed(service.get_candidate_pool(MovieMetadata(1, "Seed")))
    assert [m.tmdb_id for m in candidates] == [42]
    assert metadata["status"] == "degraded"
    assert metadata["source"] == "tmdb"
    assert all(e["source"] != "offline_demo" for e in metadata["components"])


@pytest.mark.asyncio
async def test_review_failure_is_visible_for_existing_sentiment_fallback(service, monkeypatch):
    transport(monkeypatch, lambda request: httpx.Response(503))
    reviews, metadata = await observed(service.get_movie_reviews(42))
    assert reviews == []
    assert metadata["status"] == "degraded" and metadata["errors"]


@pytest.mark.asyncio
async def test_request_provenance_is_isolated_across_tasks(service, monkeypatch):
    transport(monkeypatch, lambda request: httpx.Response(200, json={"results": []}))
    demo, live = await asyncio.gather(observed(service.search_movies("RRR"), demo=True), observed(service.search_movies("RRR")))
    assert demo[1]["source"] == "offline_demo"
    assert live[1]["source"] == "tmdb"
    assert report()["components"] == []


@pytest.mark.asyncio
@pytest.mark.parametrize("demo", [False, True])
@pytest.mark.parametrize("language, expected", [
    (None, [7, 9, 3, 11]), ("all", [7, 9, 3, 11]),
    ("te", [7, 3]), ("en", [9]), ("global", [9, 11]), ("hi", []),
])
async def test_trending_endpoint_order_filters_cache_and_refresh(service, monkeypatch, demo, language, expected):
    # Incoming rank intentionally differs from ID, rating and poster-presence order.
    rows = [
        {**MOVIE, "id": 7, "original_language": "te", "vote_average": 1, "poster_path": None},
        {**MOVIE, "id": 9, "original_language": "en", "vote_average": 10, "poster_path": "/fixture.jpg"},
        {**MOVIE, "id": 3, "original_language": "te", "vote_average": 9, "poster_path": "/fixture.jpg"},
        {**MOVIE, "id": 11, "original_language": "ko", "vote_average": 8},
    ]
    calls = []
    def handler(request):
        calls.append(request)
        assert request.url.path == "/3/trending/movie/day"
        assert dict(request.url.params) == {"page": "2", "api_key": "test-only-key"}
        return httpx.Response(200, json={"results": rows})
    transport(monkeypatch, handler)
    for refresh, cache in [(False, "fresh"), (False, "cached"), (True, "fresh")]:
        movies, metadata = await observed(service.get_trending_movies(language=language, page=2, force_refresh=refresh), demo=demo)
        assert [m.tmdb_id for m in movies] == expected
        assert metadata["source"] == "tmdb" and metadata["cache"] == cache
        assert metadata["status"] == ("ok" if expected else "empty")
        assert metadata["errors"] == []
        assert [e["endpoint"] for e in metadata["components"]] == ["/trending/movie/day"]
    assert len(calls) == 2
    assert all(entry[1] == 600.0 for entry in service._cache.values())


@pytest.mark.asyncio
@pytest.mark.parametrize("demo", [False, True])
async def test_trending_requires_tmdb_even_in_demo_mode(service, monkeypatch, demo):
    service.api_key = ""
    def forbidden(request):
        pytest.fail("Missing credentials must not issue an upstream request")
    transport(monkeypatch, forbidden)
    with pytest.raises(TMDBFailure, match="not configured"):
        await observed(service.get_trending_movies(), demo=demo)
