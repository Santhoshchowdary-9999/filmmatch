"""
FilmMatch AI — Hybrid Recommendation & Explainability Fusion Engine
Combines Content, Sentiment, and Collaborative signals with standard and cold-start weights.
"""
from dataclasses import dataclass, field
import time
from typing import Optional

from ml.content_engine import ContentSimilarityEngine, MovieMetadata, ContentScoreResult
from ml.sentiment_engine import AudienceSentimentEngine, SentimentScoreResult
from ml.collab_engine import CollaborativeFilteringEngine, CollabScoreResult


@dataclass
class ScoreBreakdown:
    content_similarity: float
    sentiment_score: float
    collaborative_score: Optional[float]
    is_cold_start: bool
    explanation: str
    reasons: list[str] = field(default_factory=list)


@dataclass
class MovieRecommendation:
    tmdb_id: int
    title: str
    overview: str
    release_date: str
    original_language: str
    poster_url: str
    backdrop_url: str
    genres: list[str]
    vote_average: float
    vote_count: int
    hybrid_score: float         # 0.0 to 100.0
    match_percentage: int       # 0 to 100%
    score_breakdown: ScoreBreakdown
    runtime: Optional[int] = None


@dataclass
class RecommendationResponsePayload:
    source_movie: MovieMetadata
    recommendations: list[MovieRecommendation]
    applied_weights: dict[str, float]
    execution_time_ms: float


class HybridRecommendationEngine:
    # Standard Default Weights
    DEFAULT_CONTENT_WEIGHT = 0.50
    DEFAULT_SENTIMENT_WEIGHT = 0.20
    DEFAULT_COLLAB_WEIGHT = 0.30

    # Cold-Start Weights (Missing or unmapped collaborative data)
    COLD_START_CONTENT_WEIGHT = 0.65
    COLD_START_SENTIMENT_WEIGHT = 0.35
    COLD_START_COLLAB_WEIGHT = 0.00

    def __init__(
        self,
        content_engine: Optional[ContentSimilarityEngine] = None,
        sentiment_engine: Optional[AudienceSentimentEngine] = None,
        collab_engine: Optional[CollaborativeFilteringEngine] = None,
    ):
        self.content_engine = content_engine or ContentSimilarityEngine()
        self.sentiment_engine = sentiment_engine or AudienceSentimentEngine()
        self.collab_engine = collab_engine or CollaborativeFilteringEngine()

    def generate_explanation_details(
        self,
        source_movie: MovieMetadata,
        candidate: MovieMetadata,
        content_res: ContentScoreResult,
        sentiment_res: SentimentScoreResult,
        collab_res: CollabScoreResult,
        is_cold_start: bool,
    ) -> list[str]:
        """Generates structured, bulleted reasons explaining the recommendation."""
        reasons: list[str] = []
        c_pct = int(round(content_res.content_similarity * 100))
        reasons.append(f"{c_pct}% story and narrative similarity with {source_movie.title}")

        s_val = sentiment_res.sentiment_score
        if s_val >= 0.75:
            reasons.append(f"Strong positive audience sentiment ({int(round(s_val * 100))}% praise)")
        elif s_val >= 0.55:
            reasons.append(f"Favorable viewer reviews ({int(round(s_val * 100))}% positive rating)")
        else:
            reasons.append("Balanced critical and audience reception")

        if not is_cold_start and collab_res.collab_score is not None and collab_res.collab_score > 0.4:
            reasons.append(f"Similar viewers on MovieLens highly enjoyed this film ({int(round(collab_res.collab_score * 100))}% affinity)")
        else:
            reasons.append("Trending new release match (Content + Audience score)")

        common_genres = [g for g in candidate.genres if g in source_movie.genres]
        if common_genres:
            reasons.append(f"Matches preferred genres ({', '.join(common_genres[:3])})")
        elif content_res.matched_features:
            reasons.append(f"Shared themes: {', '.join(content_res.matched_features[:2])}")

        return reasons

    def generate_explanation(
        self,
        source_movie: MovieMetadata,
        candidate: MovieMetadata,
        content_res: ContentScoreResult,
        sentiment_res: SentimentScoreResult,
        collab_res: CollabScoreResult,
        is_cold_start: bool,
    ) -> str:
        """
        Synthesizes a transparent, explainable explanation based on dominant contributors.
        """
        if is_cold_start:
            reasons = []
            if content_res.matched_features:
                reasons.append(content_res.matched_features[0])
            reasons.append(f"{int(round(sentiment_res.sentiment_score * 100))}% audience approval")
            return f"New Release / Content + Audience Match: {' & '.join(reasons)}."

        # Standard mode: identify highest relative contributor
        c_val = content_res.content_similarity
        s_val = sentiment_res.sentiment_score
        cb_val = collab_res.collab_score if collab_res.collab_score is not None else 0.0

        if c_val >= 0.70 and content_res.matched_features:
            feature_desc = ", ".join(content_res.matched_features[:2])
            return f"Strong narrative & cast affinity with '{source_movie.title}' ({feature_desc})."
        elif s_val >= 0.85:
            return f"Exceptional audience reception ({int(round(s_val * 100))}% positive praise) with high thematic overlap."
        elif cb_val >= 0.75:
            return f"High community co-rating correlation: avid fans of '{source_movie.title}' rated this film 4.5+ stars."
        elif content_res.matched_features:
            return f"Recommended for shared {', '.join(content_res.matched_features[:2])} and strong viewer ratings."
        else:
            return f"Balanced match with consistent thematic overlap and positive viewer sentiment."

    def score_and_rank(
        self,
        source_movie: MovieMetadata,
        candidates: list[MovieMetadata],
        candidate_reviews_map: Optional[dict[int, tuple[list[str], str]]] = None,
        top_k: int = 10,
        custom_weights: Optional[dict[str, float]] = None,
    ) -> RecommendationResponsePayload:
        """
        Executes end-to-end hybrid recommendation pipeline across candidates.
        """
        t0 = time.perf_counter()

        if not candidates:
            return RecommendationResponsePayload(
                source_movie=source_movie,
                recommendations=[],
                applied_weights={
                    "content": self.DEFAULT_CONTENT_WEIGHT,
                    "sentiment": self.DEFAULT_SENTIMENT_WEIGHT,
                    "collaborative": self.DEFAULT_COLLAB_WEIGHT,
                },
                execution_time_ms=0.0,
            )

        candidate_ids = [c.tmdb_id for c in candidates]

        # 1. Content Scoring
        content_results = self.content_engine.calculate_similarity(source_movie, candidates)

        # 2. Sentiment Scoring
        if candidate_reviews_map:
            sentiment_results = self.sentiment_engine.analyze_batch(candidate_reviews_map)
        else:
            sentiment_results = {
                c.tmdb_id: self.sentiment_engine.analyze_movie_sentiment(
                    c.tmdb_id, [], c.overview, vote_average=c.vote_average
                )
                for c in candidates
            }

        # 3. Collaborative Scoring
        collab_results = self.collab_engine.calculate_similarity(
            source_movie.tmdb_id, candidate_ids
        )

        # 4. Hybrid Fusion & Ranking
        ranked_items: list[MovieRecommendation] = []
        is_overall_cold_start = False

        for candidate in candidates:
            c_res = content_results.get(
                candidate.tmdb_id,
                ContentScoreResult(tmdb_id=candidate.tmdb_id, content_similarity=0.0),
            )
            s_res = sentiment_results.get(
                candidate.tmdb_id,
                SentimentScoreResult(
                    tmdb_id=candidate.tmdb_id,
                    sentiment_score=0.50,
                    raw_compound=0.0,
                    review_count=0,
                    is_fallback=True,
                    sentiment_summary="Neutral",
                ),
            )
            cb_res = collab_results.get(
                candidate.tmdb_id,
                CollabScoreResult(
                    tmdb_id=candidate.tmdb_id,
                    collab_score=None,
                    is_mapped=False,
                    co_rating_count=0,
                    explanation="Unmapped",
                ),
            )

            # Determine whether this item is cold-start
            is_item_cold_start = (cb_res.collab_score is None) or (not cb_res.is_mapped)

            # Determine weights to use
            if is_item_cold_start:
                # Cold-Start Formula always fixed — ignore custom_weights
                w_content = self.COLD_START_CONTENT_WEIGHT
                w_sentiment = self.COLD_START_SENTIMENT_WEIGHT
                w_collab = self.COLD_START_COLLAB_WEIGHT
                final_score = (w_content * c_res.content_similarity) + (
                    w_sentiment * s_res.sentiment_score
                )
                applied_collab_val = None
            else:
                # Standard or custom weights
                if custom_weights:
                    w_content = custom_weights.get("content", self.DEFAULT_CONTENT_WEIGHT)
                    w_sentiment = custom_weights.get("sentiment", self.DEFAULT_SENTIMENT_WEIGHT)
                    w_collab = custom_weights.get("collaborative", self.DEFAULT_COLLAB_WEIGHT)
                else:
                    w_content = self.DEFAULT_CONTENT_WEIGHT
                    w_sentiment = self.DEFAULT_SENTIMENT_WEIGHT
                    w_collab = self.DEFAULT_COLLAB_WEIGHT
                final_score = (
                    (w_content * c_res.content_similarity)
                    + (w_sentiment * s_res.sentiment_score)
                    + (w_collab * cb_res.collab_score)
                )
                applied_collab_val = cb_res.collab_score

            # Normalize final score strictly to [0.0, 1.0]
            final_score = max(0.0, min(1.0, final_score))
            hybrid_score_100 = round(final_score * 100.0, 1)
            match_percentage = int(round(final_score * 100.0))

            explanation = self.generate_explanation(
                source_movie=source_movie,
                candidate=candidate,
                content_res=c_res,
                sentiment_res=s_res,
                collab_res=cb_res,
                is_cold_start=is_item_cold_start,
            )

            reasons = self.generate_explanation_details(
                source_movie=source_movie,
                candidate=candidate,
                content_res=c_res,
                sentiment_res=s_res,
                collab_res=cb_res,
                is_cold_start=is_item_cold_start,
            )

            breakdown = ScoreBreakdown(
                content_similarity=c_res.content_similarity,
                sentiment_score=s_res.sentiment_score,
                collaborative_score=applied_collab_val,
                is_cold_start=is_item_cold_start,
                explanation=explanation,
                reasons=reasons,
            )

            rec = MovieRecommendation(
                tmdb_id=candidate.tmdb_id,
                title=candidate.title,
                overview=candidate.overview,
                release_date=candidate.release_date,
                original_language=candidate.original_language,
                poster_url=candidate.poster_url,
                backdrop_url=candidate.backdrop_url,
                genres=candidate.genres,
                vote_average=candidate.vote_average,
                vote_count=candidate.vote_count,
                hybrid_score=hybrid_score_100,
                match_percentage=match_percentage,
                score_breakdown=breakdown,
                runtime=getattr(candidate, "runtime", None),
            )
            ranked_items.append(rec)

        # Sort descending by hybrid_score
        ranked_items.sort(key=lambda x: x.hybrid_score, reverse=True)
        top_recommendations = ranked_items[:top_k]

        execution_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Report which weights were actually used
        effective_content = custom_weights.get("content", self.DEFAULT_CONTENT_WEIGHT) if custom_weights else self.DEFAULT_CONTENT_WEIGHT
        effective_sentiment = custom_weights.get("sentiment", self.DEFAULT_SENTIMENT_WEIGHT) if custom_weights else self.DEFAULT_SENTIMENT_WEIGHT
        effective_collab = custom_weights.get("collaborative", self.DEFAULT_COLLAB_WEIGHT) if custom_weights else self.DEFAULT_COLLAB_WEIGHT

        return RecommendationResponsePayload(
            source_movie=source_movie,
            recommendations=top_recommendations,
            applied_weights={
                "content": effective_content,
                "sentiment": effective_sentiment,
                "collaborative": effective_collab,
            },
            execution_time_ms=execution_ms,
        )
