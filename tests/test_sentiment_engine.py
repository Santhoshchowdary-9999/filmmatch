"""
Unit tests for Audience Sentiment Engine.
"""
import pytest
from ml.sentiment_engine import AudienceSentimentEngine


def test_sentiment_polarity_discrimination():
    engine = AudienceSentimentEngine()

    # Highly positive audience review
    pos_reviews = [
        "An astonishing visual masterpiece with brilliant acting, heart-pumping action, and breathtaking music!",
        "Absolutely loved every minute of it! A triumph of Indian cinema."
    ]
    res_pos = engine.analyze_movie_sentiment(579974, pos_reviews, "Epic action drama.")
    assert 0.0 <= res_pos.sentiment_score <= 1.0
    assert res_pos.sentiment_score >= 0.70
    assert res_pos.review_count == 2
    assert not res_pos.is_fallback
    assert "Positive" in res_pos.sentiment_summary

    # Highly negative audience review
    neg_reviews = [
        "A boring, clichéd mess with terrible dialogue and lifeless performances.",
        "Worst movie of the year. Completely wasted 3 hours."
    ]
    res_neg = engine.analyze_movie_sentiment(999, neg_reviews, "A disappointing thriller.")
    assert 0.0 <= res_neg.sentiment_score <= 1.0
    assert res_neg.sentiment_score <= 0.35
    assert res_pos.sentiment_score > res_neg.sentiment_score

    # Fallback mode with zero reviews
    res_fallback = engine.analyze_movie_sentiment(1234, [], "A wonderful inspiring story about friendship.")
    assert res_fallback.is_fallback
    assert res_fallback.review_count == 0
    assert 0.0 <= res_fallback.sentiment_score <= 1.0
