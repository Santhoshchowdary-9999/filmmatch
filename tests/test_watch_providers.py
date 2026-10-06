"""
Unit tests for Feature 1: Where to Watch (IN Region).
Tests: get_watch_providers with valid IN data, empty IN data, and network failure.
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from backend.services.tmdb_service import TMDBService
from backend.schemas import WatchProviderItem, WatchProvidersData


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

MOCK_PROVIDER_RESPONSE = {
    "id": 579974,
    "results": {
        "IN": {
            "link": "https://www.justwatch.com/in/movie/rrr",
            "flatrate": [
                {
                    "display_priority": 1,
                    "logo_path": "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
                    "provider_id": 8,
                    "provider_name": "Netflix",
                }
            ],
            "rent": [
                {
                    "display_priority": 2,
                    "logo_path": "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
                    "provider_id": 10,
                    "provider_name": "Amazon Video",
                }
            ],
            "buy": [],
        },
        "US": {
            "flatrate": [],
        },
    },
}

MOCK_NO_IN_RESPONSE = {
    "id": 123,
    "results": {
        "US": {
            "flatrate": [{"provider_id": 8, "provider_name": "Netflix", "logo_path": "/abc.jpg"}]
        }
    },
}

MOCK_EMPTY_RESULTS_RESPONSE = {
    "id": 456,
    "results": {},
}


# ---------------------------------------------------------------------------
# Helper: build a TMDBService with a mocked _request
# ---------------------------------------------------------------------------

def _make_service() -> TMDBService:
    svc = TMDBService.__new__(TMDBService)
    svc.base_url = "https://api.themoviedb.org/3"
    svc.image_base_url = "https://image.tmdb.org/t/p"
    svc.api_key = "test-key"
    svc.read_token = ""
    svc.headers = {"User-Agent": "FilmMatch-AI/1.0"}
    svc._cache = {}
    svc._cache_ttl_seconds = 300.0
    return svc


# ---------------------------------------------------------------------------
# Tests: get_watch_providers — happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_watch_providers_returns_in_region():
    """When TMDB returns IN region data, only IN is extracted and returned."""
    svc = _make_service()
    svc._request = AsyncMock(return_value=MOCK_PROVIDER_RESPONSE)

    result = await svc.get_watch_providers(579974)

    assert isinstance(result, dict)
    assert "flatrate" in result
    assert "link" in result
    assert result["link"] == "https://www.justwatch.com/in/movie/rrr"
    assert len(result["flatrate"]) == 1
    assert result["flatrate"][0]["provider_name"] == "Netflix"
    assert result["flatrate"][0]["logo_path"] == "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg"


@pytest.mark.asyncio
async def test_get_watch_providers_includes_rent():
    """The rent key is extracted from IN region data."""
    svc = _make_service()
    svc._request = AsyncMock(return_value=MOCK_PROVIDER_RESPONSE)

    result = await svc.get_watch_providers(579974)

    assert "rent" in result
    assert len(result["rent"]) == 1
    assert result["rent"][0]["provider_name"] == "Amazon Video"


@pytest.mark.asyncio
async def test_get_watch_providers_us_only_returns_empty():
    """When TMDB has no IN region, returns empty dict."""
    svc = _make_service()
    svc._request = AsyncMock(return_value=MOCK_NO_IN_RESPONSE)

    result = await svc.get_watch_providers(123)

    assert result == {}


@pytest.mark.asyncio
async def test_get_watch_providers_empty_results_returns_empty():
    """When results dict is empty, returns empty dict."""
    svc = _make_service()
    svc._request = AsyncMock(return_value=MOCK_EMPTY_RESULTS_RESPONSE)

    result = await svc.get_watch_providers(456)

    assert result == {}


# ---------------------------------------------------------------------------
# Tests: get_watch_providers — failure / degraded mode
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_watch_providers_network_failure_returns_empty():
    """On any exception from _request, returns {} and does not raise."""
    from backend.services.provenance import TMDBFailure
    svc = _make_service()
    svc._request = AsyncMock(side_effect=TMDBFailure("tmdb_timeout", "Timed out."))

    result = await svc.get_watch_providers(999)

    assert result == {}


@pytest.mark.asyncio
async def test_get_watch_providers_unexpected_exception_returns_empty():
    """On unexpected exceptions, returns {} and does not crash the recommendation pipeline."""
    svc = _make_service()
    svc._request = AsyncMock(side_effect=RuntimeError("Unexpected"))

    result = await svc.get_watch_providers(999)

    assert result == {}


# ---------------------------------------------------------------------------
# Tests: Pydantic schema validation for WatchProvidersData
# ---------------------------------------------------------------------------

def test_watch_provider_item_schema():
    """WatchProviderItem validates correctly from provider dict."""
    item = WatchProviderItem(
        provider_id=8,
        provider_name="Netflix",
        logo_path="/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
    )
    assert item.provider_id == 8
    assert item.provider_name == "Netflix"
    assert item.logo_path.startswith("/")


def test_watch_providers_data_defaults_empty_lists():
    """WatchProvidersData defaults all lists to empty when not provided."""
    data = WatchProvidersData()
    assert data.flatrate == []
    assert data.rent == []
    assert data.buy == []
    assert data.link is None


def test_watch_providers_data_with_providers():
    """WatchProvidersData accepts populated provider lists."""
    item = WatchProviderItem(provider_id=8, provider_name="Netflix", logo_path="/abc.jpg")
    data = WatchProvidersData(
        flatrate=[item],
        link="https://www.justwatch.com/in/movie/test"
    )
    assert len(data.flatrate) == 1
    assert data.flatrate[0].provider_name == "Netflix"
    assert data.link is not None


# ---------------------------------------------------------------------------
# Tests: TTL is set to 6 hours for watch/providers calls
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_watch_providers_uses_6_hour_ttl():
    """Verify that _request is called with ttl=21600.0 (6 hours) for watch/providers."""
    svc = _make_service()
    svc._request = AsyncMock(return_value=MOCK_PROVIDER_RESPONSE)

    await svc.get_watch_providers(579974)

    svc._request.assert_awaited_once()
    _, kwargs = svc._request.call_args
    # ttl is passed as keyword arg
    assert kwargs.get("ttl") == 21600.0
