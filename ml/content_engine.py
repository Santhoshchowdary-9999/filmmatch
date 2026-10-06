"""
FilmMatch AI — Content-Based Similarity Engine
Calculates pairwise narrative, genre, cast, director, and metadata similarity using TF-IDF and Cosine Similarity.
"""
from dataclasses import dataclass, field
import re
from typing import Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

LANGUAGE_NAMES = {
    "te": "Telugu",
    "hi": "Hindi",
    "ta": "Tamil",
    "ml": "Malayalam",
    "kn": "Kannada",
    "en": "English",
    "ko": "Korean",
    "ja": "Japanese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
}


@dataclass
class MovieMetadata:
    tmdb_id: int
    title: str
    overview: str = ""
    genres: list[str] = field(default_factory=list)
    director: str = ""
    cast: list[str] = field(default_factory=list)  # Top 3-5 actors
    keywords: list[str] = field(default_factory=list)
    original_language: str = "en"
    release_date: str = ""
    poster_url: str = ""
    backdrop_url: str = ""
    vote_average: float = 0.0
    vote_count: int = 0
    runtime: Optional[int] = None


@dataclass
class ContentScoreResult:
    tmdb_id: int
    content_similarity: float  # Range: [0.0, 1.0]
    matched_features: list[str] = field(default_factory=list)


def sanitize_name(name: str) -> str:
    """Normalize names (e.g. 'S. S. Rajamouli' -> 'ssrajamouli') to prevent token collision."""
    if not name:
        return ""
    clean = re.sub(r"[^a-zA-Z0-9]", "", name).lower()
    return clean


class ContentSimilarityEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=25000,
            sublinear_tf=True
        )

    def build_soup(self, movie: MovieMetadata) -> str:
        """
        Constructs a weighted metadata soup string.
        - Genres & Director repeated 2x for feature emphasis.
        - Cast members normalized as single tokens.
        - Language token prefixed for regional affinity.
        """
        clean_overview = re.sub(r"[^\w\s]", " ", movie.overview or "").lower()
        
        # Format and repeat genres (2x)
        genre_tokens = " ".join([re.sub(r"[^\w\s]", "", g).lower() for g in movie.genres])
        genre_str = f"{genre_tokens} {genre_tokens}".strip()
        
        # Format and repeat director (2x)
        director_clean = sanitize_name(movie.director)
        director_str = f"{director_clean} {director_clean}".strip() if director_clean else ""
        
        # Cast tokens (top 5 sanitized)
        cast_tokens = " ".join([sanitize_name(actor) for actor in movie.cast[:5] if actor])
        
        # Keywords
        kw_tokens = " ".join([re.sub(r"[^\w\s]", "", kw).lower() for kw in movie.keywords[:10]])
        
        # Language anchor
        lang_token = f"lang_{movie.original_language.lower()}" if movie.original_language else "lang_en"
        
        components = [clean_overview, genre_str, director_str, cast_tokens, kw_tokens, lang_token]
        soup = " ".join([c for c in components if c])
        return soup.strip()

    def calculate_similarity(
        self, source_movie: MovieMetadata, candidates: list[MovieMetadata]
    ) -> dict[int, ContentScoreResult]:
        """
        Calculates normalized composite content similarity between the source movie and a list of candidates.
        Combines calibrated metadata soup TF-IDF cosine similarity with structured genre, director, cast, and language signals.
        """
        if not candidates:
            return {}

        def build_weighted_soup(m: MovieMetadata) -> str:
            ov = re.sub(r"[^\w\s]", " ", m.overview or "").lower()
            genres = " ".join([re.sub(r"[^\w\s]", "", g).lower() for g in m.genres] * 3)
            director = f"{sanitize_name(m.director)} " * 3 if m.director else ""
            cast = " ".join([sanitize_name(a) for a in m.cast[:5] if a] * 2)
            kw = " ".join([re.sub(r"[^\w\s]", "", k).lower() for k in m.keywords[:10]] * 2)
            lang = f"lang_{m.original_language.lower()} " * 2
            return f"{ov} {genres} {director} {cast} {kw} {lang}".strip()

        source_soup = build_weighted_soup(source_movie)
        candidate_soups = [build_weighted_soup(c) for c in candidates]
        all_soups = [source_soup] + candidate_soups

        tfidf_matrix = self.vectorizer.fit_transform(all_soups)
        soup_sims = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

        s_genres = set(source_movie.genres)
        s_cast = set(sanitize_name(a) for a in source_movie.cast if a)
        s_dir = sanitize_name(source_movie.director)

        results: dict[int, ContentScoreResult] = {}
        for idx, candidate in enumerate(candidates):
            c_genres = set(candidate.genres)
            c_cast = set(sanitize_name(a) for a in candidate.cast if a)
            c_dir = sanitize_name(candidate.director)

            # 1. Genre Jaccard overlap [0.0, 1.0]
            shared_genres = s_genres.intersection(c_genres)
            union_genres = s_genres.union(c_genres)
            genre_jaccard = len(shared_genres) / len(union_genres) if union_genres else 0.0

            # 2. Director match (binary 1.0 or 0.0)
            dir_match = 1.0 if (s_dir and c_dir and s_dir == c_dir) else 0.0

            # 3. Cast overlap Jaccard [0.0, 1.0]
            shared_cast = s_cast.intersection(c_cast)
            cast_overlap = len(shared_cast) / max(1, min(len(s_cast), len(c_cast))) if (s_cast and c_cast) else 0.0

            # 4. Regional language match [0.0 or 1.0]
            lang_match = 1.0 if (source_movie.original_language and candidate.original_language == source_movie.original_language) else 0.0

            # 5. Calibrated High-Dimensional Soup Similarity
            raw_soup = float(soup_sims[idx])
            soup_calibrated = min(1.0, raw_soup * 3.5)

            # Composite Content DNA Fusion:
            # 40% Calibrated Soup + 30% Genre Jaccard + 15% Director Match + 10% Cast Overlap + 5% Language
            content_score = (
                0.40 * soup_calibrated +
                0.30 * genre_jaccard +
                0.15 * dir_match +
                0.10 * cast_overlap +
                0.05 * lang_match
            )
            norm_score = float(np.clip(content_score, 0.0, 1.0))

            # Matched features for explainability
            matched = []
            if dir_match:
                matched.append(f"Directed by {candidate.director}")
            if shared_genres:
                matched.append(f"Genre overlap ({', '.join(sorted(shared_genres))})")
            if shared_cast:
                matched.append("Shared Cast")
            if lang_match:
                lang_name = LANGUAGE_NAMES.get(candidate.original_language.lower(), candidate.original_language.upper())
                matched.append(f"Language: {lang_name}")

            results[candidate.tmdb_id] = ContentScoreResult(
                tmdb_id=candidate.tmdb_id,
                content_similarity=round(norm_score, 4),
                matched_features=matched,
            )

        return results
