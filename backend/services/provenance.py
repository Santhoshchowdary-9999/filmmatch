"""Request-local provenance. Never store credentials or raw upstream errors."""
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

_events: ContextVar[list[dict] | None] = ContextVar("provenance_events", default=None)
_demo: ContextVar[bool] = ContextVar("demo_mode", default=False)


def timestamp(value: float) -> str:
    return datetime.fromtimestamp(value, timezone.utc).isoformat()


def begin_request(demo: bool = False):
    return _events.set([]), _demo.set(demo)


def end_request(tokens):
    _events.reset(tokens[0])
    _demo.reset(tokens[1])


def is_demo() -> bool:
    return _demo.get()


def record(**event: Any):
    events = _events.get()
    if events is not None:
        events.append(event)


def report(empty: bool = False, failed: bool = False) -> dict:
    events = list(_events.get() or [])
    sources = {e["source"] for e in events if e.get("source") not in (None, "none")}
    caches = {e["cache"] for e in events if e.get("source") == "tmdb"}
    fetched = [e["fetched_at"] for e in events if e.get("fetched_at")]
    errors = [e["error"] for e in events if e.get("error")]
    return {
        "status": "failed" if failed else "degraded" if errors else "empty" if empty else "ok",
        "source": next(iter(sources)) if len(sources) == 1 else "mixed" if sources else "none",
        "cache": next(iter(caches)) if len(caches) == 1 else "mixed" if caches else "none",
        "fetched_at": min(fetched) if fetched else None,
        "stale": any(e.get("cache") == "stale" for e in events),
        "errors": errors,
        "components": events,
    }


class TMDBFailure(Exception):
    def __init__(self, code: str, message: str, upstream_status: int | None = None):
        self.error = {"code": code, "message": message, "upstream_status": upstream_status}
        super().__init__(message)
