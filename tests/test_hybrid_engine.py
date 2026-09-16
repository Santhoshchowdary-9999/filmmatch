"""
Unit & Integration tests for Hybrid Recommendation & Explainability Engine.
"""
import pytest
from ml.content_engine import MovieMetadata
from ml.hybrid_engine import HybridRecommendationEngine


def test_hybrid_engine_standard_and_cold_start():
    engine = HybridRecommendationEngine()

    source = MovieMetadata(
        tmdb_id=27205,
        title="Inception",
        overview="A thief who steals corporate secrets through dream-sharing technology.",
        genres=["Action", "Science Fiction", "Adventure"],
        director="Christopher Nolan",
        cast=["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
        keywords=["dream", "subconscious", "heist"],
        original_language="en",
        release_date="2010-07-15"
    )

    # Candidate 1: In MovieLens (Standard Mode)
    cand_matrix = MovieMetadata(
        tmdb_id=603,
        title="The Matrix",
        overview="A computer hacker learns about the true nature of reality.",
        genres=["Action", "Science Fiction"],
        director="Lana Wachowski",
        cast=["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        keywords=["virtual reality", "chosen one", "cyberpunk"],
        original_language="en",
        release_date="1999-03-30"
    )

    # Candidate 2: Brand new / unmapped (Cold-Start Mode)
    cand_unmapped = MovieMetadata(
        tmdb_id=88888888,
        title="New Indie Sci-Fi",
        overview="A dream experiment goes beyond expectations.",
        genres=["Science Fiction", "Drama"],
        director="Christopher Nolan",
        cast=["Leonardo DiCaprio"],
        keywords=["dream"],
        original_language="en",
        release_date="2026-01-01"
    )

    reviews_map = {
        603: (["A visionary action sci-fi masterpiece with iconic visuals!"], "Matrix overview"),
        88888888: (["Incredible fresh direction and wonderful performances."], "Indie overview")
    }

    payload = engine.score_and_rank(source, [cand_matrix, cand_unmapped], reviews_map, top_k=10)

    assert len(payload.recommendations) == 2
    assert payload.execution_time_ms < 500.0  # Must be fast

    rec_map = {r.tmdb_id: r for r in payload.recommendations}

    # Verify candidate 1 (standard)
    rec_standard = rec_map[603]
    assert 0.0 <= rec_standard.hybrid_score <= 100.0
    assert 0 <= rec_standard.match_percentage <= 100
    assert not rec_standard.score_breakdown.is_cold_start
    assert rec_standard.score_breakdown.collaborative_score is not None

    # Verify candidate 2 (cold start)
    rec_cold = rec_map[88888888]
    assert 0.0 <= rec_cold.hybrid_score <= 100.0
    assert rec_cold.score_breakdown.is_cold_start is True
    assert rec_cold.score_breakdown.collaborative_score is None
    assert "New Release / Content + Audience Match" in rec_cold.score_breakdown.explanation

    # Verify recommendations are sorted strictly descending by hybrid_score
    scores = [r.hybrid_score for r in payload.recommendations]
    assert scores == sorted(scores, reverse=True)
