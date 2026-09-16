"""
FilmMatch AI — FastAPI Application Entrypoint
Initializes FastAPI, mounts CORS middleware, routes, and pre-warms the MovieLens collaborative engine.
"""
import sys
from pathlib import Path

# Ensure root directory is in sys.path so both `uvicorn main:app` and `uvicorn backend.main:app` work
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.services.provenance import begin_request, end_request, report, record, TMDBFailure

from backend.config import settings
from backend.routes.recommendations import hybrid_engine, router as rec_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm ML engines and MovieLens index on application startup."""
    print("[*] Starting FilmMatch AI Backend...")
    try:
        print("[*] Initializing and pre-warming Collaborative Filtering Engine...")
        initialized = hybrid_engine.collab_engine.load_and_fit()
        if initialized:
            mapped_count = len(hybrid_engine.collab_engine.tmdb_to_movie)
            print(f"[+] Collaborative Filtering Engine ready with {mapped_count:,} mapped movies.")
        else:
            print("[-] MovieLens is unavailable; full readiness will report degraded.")
    except Exception:
        hybrid_engine.collab_engine.is_initialized = False
        print("[-] MovieLens initialization failed; full readiness will report degraded.")
    yield
    print("[*] Shutting down FilmMatch AI Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI movie recommendation system combining Content Similarity, VADER Audience Sentiment, and MovieLens Collaborative Filtering.",
    lifespan=lifespan
)

@app.middleware("http")
async def track_provenance(request: Request, call_next):
    # Demo mode is explicit and never changes the health probe into a mock probe.
    tokens = begin_request(demo=request.query_params.get("demo", "").lower() == "true")
    try:
        try:
            response = await call_next(request)
        except Exception:
            error = {"code": "internal_error", "message": "The request could not be completed."}
            record(endpoint=request.url.path, source="none", cache="none", error=error)
            response = JSONResponse(status_code=500, content={"detail": error, "provenance": report(failed=True)})
        # Preserve backend freshness semantics; browser caches must not hide refresh failures.
        response.headers["Cache-Control"] = "no-store"
        return response
    finally:
        end_request(tokens)


@app.exception_handler(TMDBFailure)
async def tmdb_failure_handler(request: Request, exc: TMDBFailure):
    status_code = 503 if exc.error["code"] in ("tmdb_not_configured", "tmdb_unreachable", "tmdb_timeout") else 502
    return JSONResponse(status_code=status_code, content={"detail": exc.error, "provenance": report(failed=True)})


@app.exception_handler(StarletteHTTPException)
async def http_failure_handler(request: Request, exc: StarletteHTTPException):
    detail = {"code": "request_error", "message": exc.detail if isinstance(exc.detail, str) else "The request failed."}
    record(endpoint=request.url.path, source="none", cache="none", error=detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": detail, "provenance": report(failed=True)}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_failure_handler(request: Request, exc: RequestValidationError):
    detail = {"code": "validation_error", "message": "Invalid request parameters."}
    record(endpoint=request.url.path, source="none", cache="none", error=detail)
    return JSONResponse(status_code=422, content={"detail": detail, "provenance": report(failed=True)})


# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API router
app.include_router(rec_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_endpoint": settings.API_V1_STR
    }
