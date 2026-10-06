# Architecture SOP 07: Recommendation Filters & Hidden Gems Discovery

## 1. Objective
Enable fine-grained post-scoring filtering of recommendations by release year, runtime, genre, TMDB rating, and original language, along with a dedicated "Hidden Gems" discovery filter to spotlight high-sentiment films with modest mainstream vote counts.

---

## 2. Architectural Invariants
1. **Post-Scoring Invariant**:
   - Filtering occurs strictly **after** hybrid scoring and ranking.
   - Scores ($w_{content} \cdot S_{content} + w_{sentiment} \cdot S_{sentiment} + w_{collab} \cdot S_{collab}$) must NEVER be modified or reweighted by filter parameters.
2. **Hidden Gems Invariant**:
   - A recommendation qualifies as a "Hidden Gem" if and only if:
     $$\text{sentiment\_score} \ge \text{HIDDEN\_GEMS\_MIN\_SENTIMENT} \quad \text{AND} \quad \text{vote\_count} < \text{HIDDEN\_GEMS\_MAX\_VOTES}$$
   - Threshold values MUST be read from `backend/config.py` (`Settings.HIDDEN_GEMS_MIN_SENTIMENT` and `Settings.HIDDEN_GEMS_MAX_VOTES`), NEVER hardcoded in routes or ML modules.
3. **Response & Empty State Invariant**:
   - If active filters reduce available matches below `top_k`, the response includes a descriptive `filter_info` string (e.g. `"Showing 3 of 10 recommendations matching your filters."`).
   - If no items match, return HTTP 200 with `recommendations: []` and `filter_info: "No movies matched your current filter criteria. Try adjusting or clearing filters."`.
4. **Validation Invariant**:
   - All parameters must be validated with Pydantic:
     - `year_min` & `year_max`: $1880 \le year \le 2100$, with `year_min <= year_max`.
     - `runtime_max`: $1 \le runtime \le 1000$ minutes.
     - `min_rating`: $0.0 \le rating \le 10.0$.
     - `genres`: list of strings.
     - `language`: list of strings.
     - `hidden_gems`: boolean.

---

## 3. Backend Endpoints & Schemas
- `POST /api/recommend` accepts filter parameters in the request body (and optionally query params).
- `RecommendationResponse` includes `filter_info: Optional[str] = None`.
- Candidates retain metadata (`release_date`, `runtime`, `genres`, `vote_average`, `original_language`, `vote_count`, `score_breakdown.sentiment_score`) for accurate filtering.

---

## 4. Frontend Experience
- Collapsible filter drawer / bar with smooth toggle animation.
- Controls:
  - Year preset chips / min-max inputs
  - Runtime max slider
  - Genre multi-select chips
  - Min rating selector
  - "Hidden Gems" glowing toggle badge
  - Clear all filters button
- Touch target minimum: 44px x 44px on all interactive controls.
- Non-destructive integration with existing `LanguageFilter`.
