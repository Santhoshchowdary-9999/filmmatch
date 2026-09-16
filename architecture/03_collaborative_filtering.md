# Architecture SOP 03: Collaborative Filtering Engine

## 1. Objective & Scope
The **Collaborative Filtering Engine** (`ml/collab_engine.py`) predicts behavioral audience affinity based on co-rating patterns in the MovieLens dataset (`ml-latest-small`).

---

## 2. Invariant: Strict TMDB ID Mapping via `links.csv`

> [!IMPORTANT]
> **Strict Mapping Enforcement**:
> - Only MovieLens records with valid, verified `tmdbId` values in `links.csv` are indexed.
> - Exactly **9,734 movies (99.92%)** participate in collaborative scoring.
> - The 8 unmapped movies are strictly excluded from the item index to prevent corrupted IDs.
> - If a source movie is unmapped or absent from MovieLens, the engine returns a cold-start signal (`is_mapped = False, score = None`).

---

## 3. Mathematical Model: Item-Item Cosine Similarity

1. **User Rating Normalization (Mean-Centering)**:
   To eliminate user rating bias (some users rate everything 5/5, others 2/5):
   $$\tilde{r}_{u, i} = r_{u, i} - \bar{r}_u$$
   where $\bar{r}_u$ is the mean rating of user $u$.

2. **Adjusted Item-Item Cosine Similarity**:
   For movie $i$ and candidate movie $j$:
   $$\text{Sim}(i, j) = \frac{\sum_{u \in U_{i,j}} \tilde{r}_{u, i} \cdot \tilde{r}_{u, j}}{\sqrt{\sum_{u \in U_{i,j}} \tilde{r}_{u, i}^2} \cdot \sqrt{\sum_{u \in U_{i,j}} \tilde{r}_{u, j}^2}}$$
   where $U_{i, j}$ represents users who co-rated both film $i$ and film $j$.
   - **Co-rater Threshold**: Minimum $|U_{i, j}| \ge 2$ required; otherwise defaults to baseline population mean.

3. **Score Normalization to $[0.0, 1.0]$**:
   $$S_{collab}(i, j) = \text{clip}\left(\frac{\text{Sim}(i, j) + 1.0}{2.0}, 0.0, 1.0\right)$$

---

## 4. Input & Output Contract

### Input:
```python
@dataclass
class CollabInput:
    source_tmdb_id: int
    candidate_tmdb_ids: list[int]
```

### Output:
```python
@dataclass
class CollabScoreResult:
    tmdb_id: int
    collab_score: float | None # Range: [0.0, 1.0] if mapped, None if unmapped
    is_mapped: bool            # True if present in MovieLens index
    co_rating_count: int       # Number of overlapping user ratings
    explanation: str           # e.g. "Frequently rated 4.5+ stars by users who loved Inception"
```

---

## 5. Standalone Test SOP
1. Instantiate `CollabEngine` in isolation and load `data/movielens/`.
2. Query source TMDB `#27205` (*Inception*) against known sci-fi/thriller candidates (e.g. *The Matrix*, *Shutter Island*, *Interstellar*).
3. Verify that high co-rating correlation is identified ($S_{collab} > 0.65$).
4. Query an unmapped ID (e.g., `#99999999`) $\rightarrow$ verify `is_mapped = False` and `collab_score is None`.
