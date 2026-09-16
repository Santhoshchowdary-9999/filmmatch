"""
FilmMatch AI — Collaborative Filtering Engine
Item-Item collaborative filtering based on mean-centered MovieLens ratings with strict links.csv TMDB mapping.
"""
from dataclasses import dataclass
import os
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class CollabScoreResult:
    tmdb_id: int
    collab_score: Optional[float]  # Range: [0.0, 1.0] or None if unmapped / cold-start
    is_mapped: bool                # True if present in verified MovieLens index
    co_rating_count: int           # Overlapping user ratings count
    explanation: str               # Human-readable rationale


class CollaborativeFilteringEngine:
    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).resolve().parent.parent / "data" / "movielens"
        self.data_dir = Path(data_dir)
        
        self.movie_to_tmdb: dict[int, int] = {}    # movieId -> tmdbId
        self.tmdb_to_movie: dict[int, int] = {}    # tmdbId -> movieId
        self.item_user_matrix: Optional[csr_matrix] = None
        self.movie_id_to_matrix_idx: dict[int, int] = {}
        self.matrix_idx_to_movie_id: dict[int, int] = {}
        self.is_initialized = False

    def load_and_fit(self) -> bool:
        """
        Loads MovieLens ratings, links, and builds mean-centered item-item representation.
        Enforces strict TMDB mapping invariant.
        """
        links_path = self.data_dir / "links.csv"
        ratings_path = self.data_dir / "ratings.csv"

        if not links_path.exists() or not ratings_path.exists():
            print(f"[-] MovieLens files not found in {self.data_dir}")
            return False

        # 1. Parse links.csv strictly
        links_df = pd.read_csv(links_path)
        valid_links = links_df.dropna(subset=["tmdbId"]).copy()
        valid_links["tmdbId"] = valid_links["tmdbId"].astype(int)

        self.movie_to_tmdb = dict(zip(valid_links["movieId"], valid_links["tmdbId"]))
        self.tmdb_to_movie = dict(zip(valid_links["tmdbId"], valid_links["movieId"]))

        # 2. Filter ratings to only include strictly mapped movies
        ratings_df = pd.read_csv(ratings_path)
        ratings_df = ratings_df[ratings_df["movieId"].isin(self.movie_to_tmdb)].copy()

        # 3. Mean-center ratings per user to eliminate rating scale bias
        user_means = ratings_df.groupby("userId")["rating"].transform("mean")
        ratings_df["rating_centered"] = ratings_df["rating"] - user_means

        # Map IDs to continuous matrix indices
        unique_movies = ratings_df["movieId"].unique()
        unique_users = ratings_df["userId"].unique()

        self.movie_id_to_matrix_idx = {m_id: idx for idx, m_id in enumerate(unique_movies)}
        self.matrix_idx_to_movie_id = {idx: m_id for idx, m_id in enumerate(unique_movies)}
        user_to_idx = {u_id: idx for idx, u_id in enumerate(unique_users)}

        row_indices = [self.movie_id_to_matrix_idx[m] for m in ratings_df["movieId"]]
        col_indices = [user_to_idx[u] for u in ratings_df["userId"]]
        data_values = ratings_df["rating_centered"].values

        # Shape: (n_items, n_users)
        self.item_user_matrix = csr_matrix(
            (data_values, (row_indices, col_indices)),
            shape=(len(unique_movies), len(unique_users)),
            dtype=np.float32
        )

        self.is_initialized = True
        return True

    def calculate_similarity(
        self, source_tmdb_id: int, candidate_tmdb_ids: list[int]
    ) -> dict[int, CollabScoreResult]:
        """
        Calculates item-item collaborative filtering scores between source movie and candidate pool.
        """
        if not self.is_initialized:
            self.load_and_fit()

        results: dict[int, CollabScoreResult] = {}

        # Check if source movie is mapped in MovieLens
        source_movie_id = self.tmdb_to_movie.get(source_tmdb_id)
        if source_movie_id is None or source_movie_id not in self.movie_id_to_matrix_idx:
            # Source movie is not mapped in MovieLens (Cold Start)
            for c_id in candidate_tmdb_ids:
                results[c_id] = CollabScoreResult(
                    tmdb_id=c_id,
                    collab_score=None,
                    is_mapped=False,
                    co_rating_count=0,
                    explanation="No collaborative data available for source movie (Cold Start)"
                )
            return results

        source_matrix_idx = self.movie_id_to_matrix_idx[source_movie_id]
        source_vector = self.item_user_matrix[source_matrix_idx]

        for c_id in candidate_tmdb_ids:
            cand_movie_id = self.tmdb_to_movie.get(c_id)
            if cand_movie_id is None or cand_movie_id not in self.movie_id_to_matrix_idx:
                # Candidate not in MovieLens
                results[c_id] = CollabScoreResult(
                    tmdb_id=c_id,
                    collab_score=None,
                    is_mapped=False,
                    co_rating_count=0,
                    explanation="New or unmapped movie in collaborative database"
                )
                continue

            cand_matrix_idx = self.movie_id_to_matrix_idx[cand_movie_id]
            cand_vector = self.item_user_matrix[cand_matrix_idx]

            # Compute co-rating overlap count
            overlap = source_vector.multiply(cand_vector)
            co_ratings = overlap.nnz

            # Compute cosine similarity
            sim = cosine_similarity(source_vector, cand_vector)[0][0]
            
            # Dampen similarity if co-ratings count is low
            if co_ratings < 2:
                norm_score = 0.50  # Baseline neutral
            else:
                # Normalize cosine (-1..1) to (0..1)
                norm_score = float(np.clip((sim + 1.0) / 2.0, 0.0, 1.0))

            pct = int(round(norm_score * 100))
            if norm_score >= 0.70:
                explanation = f"Frequently co-rated 4.5+ stars by community members ({co_ratings} shared raters)"
            elif norm_score >= 0.55:
                explanation = f"Positive audience co-rating correlation ({co_ratings} shared raters)"
            else:
                explanation = f"Moderate viewer affinity overlap ({co_ratings} shared raters)"

            results[c_id] = CollabScoreResult(
                tmdb_id=c_id,
                collab_score=round(norm_score, 4),
                is_mapped=True,
                co_rating_count=co_ratings,
                explanation=explanation
            )

        return results
