"""
FilmMatch AI — Audience Sentiment Engine
Analyzes real TMDB audience reviews using NLTK VADER and normalizes compound sentiment polarity to [0.0, 1.0].
Includes precomputed CSV lookup and in-memory caching to prevent redundant calculations.
"""
from dataclasses import dataclass
from pathlib import Path
import re
import ssl
from typing import Optional
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import numpy as np
import pandas as pd


@dataclass
class SentimentScoreResult:
    tmdb_id: int
    sentiment_score: float  # Normalized [0.0, 1.0]
    raw_compound: float     # Original VADER compound [-1.0, 1.0]
    review_count: int       # Number of audience reviews parsed
    is_fallback: bool       # True if overview text was used due to zero reviews
    sentiment_summary: str  # Human-readable summary for explainability


class AudienceSentimentEngine:
    def __init__(self, data_path: Optional[Path] = None):
        # Configure SSL context for downloading if needed
        try:
            _create_unverified_https_context = ssl._create_unverified_context
        except AttributeError:
            pass
        else:
            ssl._create_default_https_context = _create_unverified_https_context

        try:
            nltk.download("vader_lexicon", quiet=True)
            self.analyzer = SentimentIntensityAnalyzer()
        except Exception:
            self.analyzer = SentimentIntensityAnalyzer()

        # In-memory and precomputed CSV cache: tmdb_id -> SentimentScoreResult
        self.cache: dict[int, SentimentScoreResult] = {}
        
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent / "data" / "movie_sentiment_scores.csv"
        
        self.csv_path = Path(data_path)
        self._load_precomputed_csv()

    def _load_precomputed_csv(self):
        """Loads precomputed sentiment scores if available."""
        if self.csv_path.exists():
            try:
                df = pd.read_csv(self.csv_path)
                if "tmdb_id" in df.columns and "sentiment_score" in df.columns:
                    for _, row in df.iterrows():
                        tmdb_id = int(row["tmdb_id"])
                        score = float(row["sentiment_score"])
                        raw = float(row.get("raw_compound", (score * 2.0) - 1.0))
                        count = int(row.get("review_count", 0))
                        fallback = bool(row.get("is_fallback", False))
                        summary = str(row.get("sentiment_summary", "Precomputed Sentiment"))
                        self.cache[tmdb_id] = SentimentScoreResult(
                            tmdb_id=tmdb_id,
                            sentiment_score=score,
                            raw_compound=raw,
                            review_count=count,
                            is_fallback=fallback,
                            sentiment_summary=summary,
                        )
            except Exception as e:
                print(f"[-] Note loading precomputed sentiment CSV: {e}")

    def clean_text(self, text: str) -> str:
        """Strip HTML tags and excessive whitespace while preserving sentiment markers."""
        if not text:
            return ""
        # Remove HTML tags
        clean = re.sub(r"<[^>]+>", " ", text)
        # Remove excessive whitespace
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean

    def analyze_text(self, text: str) -> tuple[float, float]:
        """
        Returns (raw_compound, normalized_score) where:
        raw_compound in [-1.0, 1.0]
        normalized_score in [0.0, 1.0]
        """
        clean = self.clean_text(text)
        if not clean:
            # Default neutral score (0.50 in [0, 1])
            return 0.0, 0.50
            
        scores = self.analyzer.polarity_scores(clean)
        compound = float(scores["compound"])
        
        # Linear normalization: (-1.0..1.0) -> (0.0..1.0)
        normalized = (compound + 1.0) / 2.0
        normalized = max(0.0, min(1.0, normalized))
        return compound, normalized

    def analyze_movie_sentiment(
        self,
        tmdb_id: int,
        audience_reviews: list[str],
        overview_fallback: str = "",
        vote_average: float = 0.0,
    ) -> SentimentScoreResult:
        """
        Analyzes audience reviews for a specific movie with caching to eliminate duplicate computation.
        If audience reviews are available, aggregates review compound scores via NLTK VADER.
        Otherwise falls back to the film's verified audience vote reception (vote_average / 10.0) or overview text.
        """
        if tmdb_id in self.cache and not audience_reviews:
            return self.cache[tmdb_id]

        valid_reviews = [r for r in audience_reviews if r and len(r.strip()) > 10]

        if valid_reviews:
            compound_sum = 0.0
            norm_sum = 0.0
            for rev in valid_reviews:
                comp, norm = self.analyze_text(rev)
                compound_sum += comp
                norm_sum += norm

            n = len(valid_reviews)
            avg_compound = compound_sum / n
            avg_norm = norm_sum / n
            is_fallback = False
            review_count = n
        else:
            if vote_average > 0.0:
                avg_norm = float(np.clip(vote_average / 10.0, 0.0, 1.0)) if "np" in globals() else min(1.0, max(0.0, vote_average / 10.0))
                avg_compound = (avg_norm * 2.0) - 1.0
            else:
                avg_compound, avg_norm = self.analyze_text(overview_fallback)
            is_fallback = True
            review_count = 0

        # Generate summary description
        pct = int(round(avg_norm * 100))
        if avg_norm >= 0.75:
            summary = f"Overwhelmingly Positive ({pct}% approval)"
        elif avg_norm >= 0.60:
            summary = f"Favorable Reception ({pct}% approval)"
        elif avg_norm >= 0.40:
            summary = f"Balanced Reaction ({pct}% approval)"
        else:
            summary = f"Mixed/Critical Audience Reaction ({pct}% approval)"

        result = SentimentScoreResult(
            tmdb_id=tmdb_id,
            sentiment_score=round(avg_norm, 4),
            raw_compound=round(avg_compound, 4),
            review_count=review_count,
            is_fallback=is_fallback,
            sentiment_summary=summary,
        )

        self.cache[tmdb_id] = result
        return result

    def analyze_batch(
        self, movies_data: dict[int, tuple[list[str], str]]
    ) -> dict[int, SentimentScoreResult]:
        """
        Analyzes sentiment for a dictionary of candidate movies:
        {tmdb_id: (reviews_list, overview_fallback)} or {tmdb_id: (reviews_list, overview_fallback, vote_average)}
        """
        results = {}
        for tmdb_id, item in movies_data.items():
            reviews = item[0]
            overview = item[1] if len(item) > 1 else ""
            vote_avg = float(item[2]) if len(item) > 2 else 0.0
            results[tmdb_id] = self.analyze_movie_sentiment(
                tmdb_id=tmdb_id,
                audience_reviews=reviews,
                overview_fallback=overview,
                vote_average=vote_avg,
            )
        return results
