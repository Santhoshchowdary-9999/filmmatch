# Architecture SOP 02: Audience Sentiment Analysis (VADER)

## 1. Objective & Scope
The **Audience Sentiment Analyzer** (`ml/sentiment_engine.py`) evaluates the real audience reception of candidate films using **NLTK VADER** (Valence Aware Dictionary and sEntiment Reasoner).

> [!IMPORTANT]
> VADER analyzes **audience user reviews** submitted by real viewers on TMDB, NOT professional movie critic reviews.

---

## 2. Ingestion & Preprocessing Pipeline

1. **Review Fetching**:
   - Queries TMDB endpoint `/movie/{tmdb_id}/reviews` to retrieve real viewer reviews.
2. **Text Normalization**:
   - Strips HTML tags, Markdown artifacts, and excessive whitespace.
   - Preserves capitalization, exclamation points, and positive/negative emojis, as VADER uses these to gauge sentiment intensity.
3. **Fallback Handling**:
   - If a movie has zero audience reviews on TMDB, the engine evaluates the narrative tone of `tagline + " " + overview` and marks `is_overview_fallback = True`.

---

## 3. Mathematical Model & Score Normalization

1. **VADER Compound Scoring**:
   VADER computes four metrics: `pos`, `neu`, `neg`, and `compound` ($C$).
   The compound score $C \in [-1.0, 1.0]$ is a sum of valence scores of each word, normalized via hyperbolic tangent:
   $$C = \frac{x}{\sqrt{x^2 + \alpha}}, \quad \text{where } \alpha = 15$$

2. **Linear Normalization to $[0.0, 1.0]$**:
   $$S_{sentiment} = \frac{C + 1.0}{2.0}$$

3. **Multi-Review Aggregation**:
   When $N$ audience reviews are present:
   $$S_{sentiment, \text{final}} = \frac{1}{N} \sum_{i=1}^{N} S_{sentiment, i}$$

---

## 4. Input & Output Contract

### Input:
```python
@dataclass
class SentimentInput:
    tmdb_id: int
    reviews: list[str]       # List of audience review texts
    overview_fallback: str  # Movie overview if reviews are empty
```

### Output:
```python
@dataclass
class SentimentScoreResult:
    tmdb_id: int
    sentiment_score: float   # Normalized [0.0, 1.0]
    raw_compound: float      # Original [-1.0, 1.0]
    review_count: int        # Number of audience reviews analyzed
    is_fallback: bool        # True if calculated from overview
    sentiment_summary: str   # e.g. "Overwhelmingly Positive (89% Audience Praise)"
```

---

## 5. Standalone Test SOP
1. Instantiate `SentimentEngine` in isolation.
2. Pass known positive, neutral, and negative text fixtures.
3. Verify that positive text produces $S_{sentiment} > 0.70$, negative text produces $S_{sentiment} < 0.35$.
4. Assert output range $\forall S_{sentiment} \in [0.0, 1.0]$.
