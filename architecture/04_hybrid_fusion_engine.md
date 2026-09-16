# Architecture SOP 04: Hybrid Fusion & Explainability Engine

## 1. Objective & Scope
The **Hybrid Fusion Engine** (`ml/hybrid_engine.py`) synthesizes outputs from the Content-Based, Audience Sentiment, and Collaborative Filtering engines to generate **ranked recommendations** with explainable sub-score breakdowns.

---

## 2. Mathematical Scoring Formulas

### 2.1 Standard Mode (When Collaborative Data is Present)
$$\text{Final Score} = (0.50 \cdot S_{content}) + (0.20 \cdot S_{sentiment}) + (0.30 \cdot S_{collab})$$

- $\text{Hybrid Score} = \text{round}(\text{Final Score} \times 100, 1) \quad (\text{Range: } 0.0 - 100.0)$
- $\text{Match Percentage} = \text{int}(\text{round}(\text{Final Score} \times 100)) \quad (\text{Range: } 0 - 100\%)$

### 2.2 Cold-Start Mode (When Collaborative Data is Absent)
$$\text{Final Score} = (0.65 \cdot S_{content}) + (0.35 \cdot S_{sentiment}) + (0.00 \cdot S_{collab})$$

- Badge & Explanation Tag: `"New Release / Content + Audience Match"`
- Applied Weights: `{ "content": 0.65, "sentiment": 0.35, "collaborative": 0.00 }`

---

## 3. Explainability Generation Rules

Every recommendation item must provide a human-readable explanation derived deterministically from its sub-scores:

| Dominant Factor | Condition | Explanation Template |
| :--- | :--- | :--- |
| **High Content Affinity** | $S_{content} \ge 0.65$ | *"Strong narrative and cast alignment with {Source}, sharing {Genres} themes and {Director} style."* |
| **Audience Acclaim** | $S_{sentiment} \ge 0.80$ | *"Overwhelming audience praise ({SentimentPct}% positive sentiment) highlighting compelling storytelling and performances."* |
| **Community Co-Rating** | $S_{collab} \ge 0.70$ | *"Frequently rated 4.5+ stars by audience members who also highly rated {Source}."* |
| **Balanced Match** | Moderate across all 3 | *"Well-rounded match combining similar cinematic themes, high audience praise, and strong viewer affinity."* |
| **Cold Start** | `is_cold_start == True` | *"New Release / Content + Audience Match: Strong stylistic affinity and positive viewer sentiment."* |

---

## 4. Input & Output Contract

### Input:
```python
@dataclass
class HybridInput:
    source_movie: MovieMetadata
    content_scores: dict[int, ContentScoreResult]
    sentiment_scores: dict[int, SentimentScoreResult]
    collab_scores: dict[int, CollabScoreResult]
    top_k: int = 10
```

### Output:
```python
@dataclass
class RankedRecommendationPayload:
    source_movie: MovieMetadata
    recommendations: list[MovieRecommendation] # Top-10 ranked
    applied_weights: dict[str, float]
    execution_time_ms: float
```

---

## 5. Integration Test SOP
1. Execute `HybridEngine.recommend(source_movie="RRR")`.
2. Verify top 10 movies are returned, sorted in strictly descending order of `hybrid_score`.
3. Verify that each item includes non-null sub-scores, a valid `match_percentage`, and an explainability string.
4. Verify execution time $< 250\text{ms}$ on pre-indexed candidate pools.
