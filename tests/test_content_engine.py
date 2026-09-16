"""
Unit tests for Content-Based Similarity Engine.
"""
import pytest
from ml.content_engine import ContentSimilarityEngine, MovieMetadata, sanitize_name


def test_sanitize_name():
    assert sanitize_name("S. S. Rajamouli") == "ssrajamouli"
    assert sanitize_name("Ram Charan") == "ramcharan"
    assert sanitize_name("Christopher Nolan") == "christophernolan"
    assert sanitize_name("") == ""


def test_content_engine_similarity():
    engine = ContentSimilarityEngine()

    source = MovieMetadata(
        tmdb_id=579974,
        title="RRR",
        overview="A fearless warrior and an ambitious officer embark on an epic journey.",
        genres=["Action", "Drama", "History"],
        director="S. S. Rajamouli",
        cast=["N. T. Rama Rao Jr.", "Ram Charan", "Alia Bhatt", "Ajay Devgn"],
        keywords=["revolution", "friendship", "british empire"],
        original_language="te",
        release_date="2022-03-24"
    )

    candidate_high_match = MovieMetadata(
        tmdb_id=256040,
        title="Baahubali: The Beginning",
        overview="A courageous hero discovers his royal heritage and battles for his kingdom.",
        genres=["Action", "Drama", "Fantasy"],
        director="S. S. Rajamouli",
        cast=["Prabhas", "Rana Daggubati", "Anushka Shetty", "Ramya Krishnan"],
        keywords=["kingdom", "warrior", "destiny"],
        original_language="te",
        release_date="2015-07-10"
    )

    candidate_low_match = MovieMetadata(
        tmdb_id=13,
        title="Forrest Gump",
        overview="A kind-hearted man experiences historical moments in America.",
        genres=["Comedy", "Drama", "Romance"],
        director="Robert Zemeckis",
        cast=["Tom Hanks", "Robin Wright", "Gary Sinise"],
        keywords=["vietnam war", "running", "destiny"],
        original_language="en",
        release_date="1994-07-06"
    )

    results = engine.calculate_similarity(source, [candidate_high_match, candidate_low_match])

    assert len(results) == 2
    assert 256040 in results
    assert 13 in results

    score_high = results[256040].content_similarity
    score_low = results[13].content_similarity

    # Scores must be strictly within [0.0, 1.0]
    assert 0.0 <= score_high <= 1.0
    assert 0.0 <= score_low <= 1.0

    # High match (same director, regional Telugu, Action/Drama) must score substantially higher
    assert score_high > score_low
    assert any("S. S. Rajamouli" in feat for feat in results[256040].matched_features)
    assert any("telugu" in feat.lower() for feat in results[256040].matched_features)
