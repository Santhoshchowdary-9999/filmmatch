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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.routes.recommendations import hybrid_engine, router as rec_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm ML engines and MovieLens index on application startup."""
    print("[*] Starting FilmMatch AI Backend...")
    try:
        print("[*] Initializing and pre-warming Collaborative Filtering Engine...")
        hybrid_engine.collab_engine.load_and_fit()
        mapped_count = len(hybrid_engine.collab_engine.tmdb_to_movie)
        print(f"[+] Collaborative Filtering Engine ready with {mapped_count:,} mapped movies.")
    except Exception as e:
        print(f"[-] Warning: Failed to pre-warm MovieLens engine on startup: {e}")
    yield
    print("[*] Shutting down FilmMatch AI Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI movie recommendation system combining Content Similarity, VADER Audience Sentiment, and MovieLens Collaborative Filtering.",
    lifespan=lifespan
)

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
