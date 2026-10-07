"""
FilmMatch AI — PostgreSQL Database Manager (asyncpg)
Provides connection pooling, schema initialization, and transactional operations.
No SQLite fallback.
"""
import logging
from typing import Optional, Any
import asyncpg
from backend.config import settings

logger = logging.getLogger("filmmatch.db")

_pool: Optional[asyncpg.Pool] = None


def get_pg_dsn() -> str:
    """Extract standard asyncpg postgresql:// DSN from DATABASE_URL."""
    url = settings.DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


async def get_db_pool() -> Optional[asyncpg.Pool]:
    """Returns singleton connection pool or creates it if not initialized."""
    global _pool
    import asyncio
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _pool is not None:
        try:
            pool_loop = getattr(_pool, "_loop", None)
            if pool_loop is None or pool_loop.is_closed() or (current_loop and pool_loop != current_loop):
                _pool = None
        except Exception:
            _pool = None

    if _pool is None:
        try:
            dsn = get_pg_dsn()
            _pool = await asyncpg.create_pool(
                dsn=dsn,
                min_size=1,
                max_size=10,
                timeout=10.0,
                command_timeout=10.0,
            )
            logger.info("[+] PostgreSQL connection pool established.")
        except Exception as e:
            logger.warning(f"[-] PostgreSQL pool initialization failed: {e}")
            _pool = None
    return _pool


async def close_db_pool() -> None:
    """Gracefully closes PostgreSQL connection pool on shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("[*] PostgreSQL connection pool closed.")


async def init_db() -> bool:
    """Ensures core database schema and tables exist in PostgreSQL."""
    pool = await get_db_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(64) NOT NULL,
                    source_tmdb_id INT,
                    recommended_tmdb_id INT NOT NULL,
                    vote VARCHAR(16) NOT NULL,
                    rating DOUBLE PRECISION,
                    hybrid_score DOUBLE PRECISION,
                    is_cold_start BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
                    UNIQUE (session_id, recommended_tmdb_id)
                );
                CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);

                CREATE TABLE IF NOT EXISTS watchlist (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(64) NOT NULL,
                    tmdb_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    poster_url VARCHAR(512) DEFAULT '',
                    release_date VARCHAR(32) DEFAULT '',
                    vote_average DOUBLE PRECISION DEFAULT 0.0,
                    genres TEXT DEFAULT '',
                    original_language VARCHAR(16) DEFAULT 'en',
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
                    UNIQUE (session_id, tmdb_id)
                );
                CREATE INDEX IF NOT EXISTS idx_watchlist_session ON watchlist(session_id);

                CREATE TABLE IF NOT EXISTS user_history (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(64) NOT NULL,
                    tmdb_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    poster_url VARCHAR(512) DEFAULT '',
                    action VARCHAR(32) DEFAULT 'view',
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
                );
                CREATE INDEX IF NOT EXISTS idx_history_session ON user_history(session_id);
            """)
        return True
    except Exception as e:
        logger.warning(f"[-] PostgreSQL schema initialization error: {e}")
        return False


# ── Feedback Data Access ────────────────────────────────────────────────────────

async def save_feedback(
    session_id: str,
    recommended_tmdb_id: int,
    vote: str,
    source_tmdb_id: Optional[int] = None,
    rating: Optional[float] = None,
    hybrid_score: Optional[float] = None,
    is_cold_start: Optional[bool] = False,
) -> bool:
    """Inserts or updates movie recommendation feedback for a session."""
    pool = await get_db_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO feedback (session_id, source_tmdb_id, recommended_tmdb_id, vote, rating, hybrid_score, is_cold_start)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (session_id, recommended_tmdb_id)
                DO UPDATE SET
                    vote = EXCLUDED.vote,
                    rating = COALESCE(EXCLUDED.rating, feedback.rating),
                    hybrid_score = COALESCE(EXCLUDED.hybrid_score, feedback.hybrid_score),
                    is_cold_start = COALESCE(EXCLUDED.is_cold_start, feedback.is_cold_start),
                    created_at = (NOW() AT TIME ZONE 'utc');
                """,
                session_id, source_tmdb_id, recommended_tmdb_id, vote, rating, hybrid_score, is_cold_start
            )
        return True
    except Exception as e:
        logger.error(f"Error saving feedback: {e}")
        return False


async def get_feedback_for_session(session_id: str) -> list[dict[str, Any]]:
    """Retrieves all feedback submitted by an anonymous session."""
    pool = await get_db_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT session_id, source_tmdb_id, recommended_tmdb_id, vote, rating, hybrid_score, is_cold_start, created_at
                FROM feedback
                WHERE session_id = $1
                ORDER BY created_at DESC;
                """,
                session_id
            )
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error fetching feedback: {e}")
        return []


# ── Watchlist Data Access ───────────────────────────────────────────────────────

async def add_to_watchlist(
    session_id: str,
    tmdb_id: int,
    title: str,
    poster_url: str = "",
    release_date: str = "",
    vote_average: float = 0.0,
    genres: str = "",
    original_language: str = "en",
) -> bool:
    """Adds a movie to the user's session watchlist."""
    pool = await get_db_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO watchlist (session_id, tmdb_id, title, poster_url, release_date, vote_average, genres, original_language)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (session_id, tmdb_id) DO NOTHING;
                """,
                session_id, tmdb_id, title, poster_url, release_date, vote_average, genres, original_language
            )
        return True
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        return False


async def remove_from_watchlist(session_id: str, tmdb_id: int) -> bool:
    """Removes a movie from the user's session watchlist."""
    pool = await get_db_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM watchlist WHERE session_id = $1 AND tmdb_id = $2;",
                session_id, tmdb_id
            )
        return True
    except Exception as e:
        logger.error(f"Error removing from watchlist: {e}")
        return False


async def get_watchlist(session_id: str) -> list[dict[str, Any]]:
    """Fetches all movies currently in the user's watchlist."""
    pool = await get_db_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, session_id, tmdb_id, title, poster_url, release_date, vote_average, genres, original_language, created_at
                FROM watchlist
                WHERE session_id = $1
                ORDER BY created_at DESC;
                """,
                session_id
            )
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Error fetching watchlist: {e}")
        return []


# ── Analytics & History Data Access ─────────────────────────────────────────────

async def record_user_history(
    session_id: str,
    tmdb_id: int,
    title: str,
    poster_url: str = "",
    action: str = "view"
) -> bool:
    """Records interaction history for analytics and personalization."""
    pool = await get_db_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_history (session_id, tmdb_id, title, poster_url, action)
                VALUES ($1, $2, $3, $4, $5);
                """,
                session_id, tmdb_id, title, poster_url, action
            )
        return True
    except Exception as e:
        logger.error(f"Error recording user history: {e}")
        return False


async def get_user_analytics(session_id: str) -> dict[str, Any]:
    """Generates recommendation engagement stats for a user session."""
    pool = await get_db_pool()
    if pool is None:
        return {
            "total_feedback": 0, "liked_count": 0, "disliked_count": 0,
            "average_rating": None, "watchlist_count": 0, "personalized_ready": False,
        }
    try:
        async with pool.acquire() as conn:
            fb_rows = await conn.fetch("SELECT vote, rating FROM feedback WHERE session_id = $1;", session_id)
            wl_count = await conn.fetchval("SELECT COUNT(*) FROM watchlist WHERE session_id = $1;", session_id) or 0

            liked = sum(1 for r in fb_rows if r["vote"] in ("like", "up"))
            disliked = sum(1 for r in fb_rows if r["vote"] in ("dislike", "down"))
            ratings = [r["rating"] for r in fb_rows if r["rating"] is not None]
            avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

            return {
                "total_feedback": len(fb_rows),
                "liked_count": liked,
                "disliked_count": disliked,
                "average_rating": avg_rating,
                "watchlist_count": wl_count,
                "personalized_ready": (liked + disliked) >= 3,
            }
    except Exception as e:
        logger.error(f"Error fetching user analytics: {e}")
        return {
            "total_feedback": 0, "liked_count": 0, "disliked_count": 0,
            "average_rating": None, "watchlist_count": 0, "personalized_ready": False,
        }
