"""
Unit tests for Collaborative Filtering Engine.
"""
import pytest
from ml.collab_engine import CollaborativeFilteringEngine


def test_collab_engine_mapping_and_scoring():
    engine = CollaborativeFilteringEngine()
    success = engine.load_and_fit()
    assert success is True
    assert engine.is_initialized is True

    # 1. Test mapped movie: Inception (TMDB ID: 27205)
    candidate_ids = [
        680,     # Pulp Fiction (TMDB 680)
        13,      # Forrest Gump (TMDB 13)
        9999999  # Unmapped dummy ID
    ]

    results = engine.calculate_similarity(27205, candidate_ids)

    assert len(results) == 3
    assert 680 in results
    assert 13 in results
    assert 9999999 in results

    # Mapped movies must have valid float scores
    res_680 = results[680]
    assert res_680.is_mapped is True
    assert res_680.collab_score is not None
    assert 0.0 <= res_680.collab_score <= 1.0

    # Unmapped movie must have collab_score=None and is_mapped=False
    res_unmapped = results[9999999]
    assert res_unmapped.is_mapped is False
    assert res_unmapped.collab_score is None


def test_collab_cold_start_source():
    engine = CollaborativeFilteringEngine()
    engine.load_and_fit()

    # Source movie that is not in MovieLens (Cold Start)
    unmapped_source = 99999999
    results = engine.calculate_similarity(unmapped_source, [680, 13])

    for tmdb_id, res in results.items():
        assert res.collab_score is None
        assert res.is_mapped is False
