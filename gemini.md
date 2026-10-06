# FilmMatch AI — Project Constitution (`gemini.md`)

## 1. System Identity & Mission
**FilmMatch AI** is a full-stack, AI-powered movie recommendation platform delivering explainable, ranked hybrid recommendations combining **Content-Based Similarity**, **Audience Sentiment Analysis (VADER)**, and **Collaborative Filtering (MovieLens)**.

The system supports global cinema while giving explicit prioritization to **Indian cinema, especially Telugu and Hindi movies**, in discovery and recommendation coverage.

---

## 2. Architectural Invariants
1. **Directory Structure**:
   - `frontend/` — Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
   - `backend/` — FastAPI Python backend, REST API endpoints, Pydantic models, CORS middleware
   - `ml/` — Modular recommendation engines (Content similarity, Sentiment analyzer, Collaborative filter, Hybrid scoring pipeline)
   - `data/` — MovieLens datasets, mappings, cached embeddings, precomputed matrices
   - `architecture/` — System design documents, technical SOPs, schema definitions
   - `tools/` — Atomic Python utilities and verification scripts (if needed)

2. **Database Invariant**:
   - **PostgreSQL** is the target database.
   - The application **must NOT silently fall back to SQLite**.
   - During early development, database-dependent features may be mocked until the PostgreSQL phase is reached and provisioned.

3. **MovieLens → TMDB Mapping Invariant**:
   - MovieLens movies must be mapped to TMDB IDs strictly through `links.csv` where available.
   - Any MovieLens movie without a verified, reliable TMDB mapping must be excluded from collaborative scoring rather than assigned an incorrect ID.

4. **Security & Secrets**:
   - Zero secrets in source code or client bundles.
   - All external keys (TMDB API token/key, Database URL) must reside in root/backend `.env` files and loaded via Pydantic `BaseSettings` or `python-dotenv`.

5. **Hybrid Recommendation Formula & Default Weights**:
   $$\text{Final Score} = (w_{content} \cdot \text{ContentSim}) + (w_{sentiment} \cdot \text{SentimentScore}) + (w_{collab} \cdot \text{CollabScore})$$

   - **Standard Default Weights**:
     - Content ($w_{content}$) = `0.50`
     - Sentiment ($w_{sentiment}$) = `0.20`
     - Collaborative ($w_{collab}$) = `0.30`
   - **Cold Start / Missing Collaborative Data Weights**:
     - For movies without reliable MovieLens collaborative data:
       - Content ($w_{content}$) = `0.65`
       - Sentiment ($w_{sentiment}$) = `0.35`
       - Collaborative ($w_{collab}$) = `0.00`
     - Cold-start badge / explanation tag MUST state: `"New Release / Content + Audience Match"`.

6. **Weight Adjuster UI Policy**:
   - User-controlled weight sliders are not a core requirement for the initial working version.
   - Build with deterministic default weights first; slider controls are optional refinements during UI polish after the hybrid engine is evaluated.

7. **Modular Independence**:
   - Each recommendation component (`content_engine`, `sentiment_engine`, `collab_engine`) must be callable and testable independently in isolation before combining into `hybrid_engine`.

---

## 3. Data Schemas (JSON Payloads)

### 3.1 Recommendation Request Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RecommendationRequest",
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Movie title or query searched by the user"
    },
    "tmdb_id": {
      "type": "integer",
      "description": "Optional explicit TMDB Movie ID if selected from autocomplete"
    },
    "top_k": {
      "type": "integer",
      "default": 10,
      "minimum": 1,
      "maximum": 50
    }
  },
  "required": ["query"]
}
```

### 3.2 Recommendation Item Response Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MovieRecommendation",
  "type": "object",
  "properties": {
    "tmdb_id": { "type": "integer" },
    "title": { "type": "string" },
    "overview": { "type": "string" },
    "release_date": { "type": "string" },
    "original_language": { "type": "string", "description": "e.g. te, hi, en" },
    "poster_url": { "type": "string" },
    "backdrop_url": { "type": "string" },
    "genres": {
      "type": "array",
      "items": { "type": "string" }
    },
    "vote_average": { "type": "number" },
    "vote_count": { "type": "integer" },
    "hybrid_score": { "type": "number", "description": "Overall score out of 100" },
    "match_percentage": { "type": "integer", "description": "Normalized integer 0-100%" },
    "score_breakdown": {
      "type": "object",
      "properties": {
        "content_similarity": { "type": "number", "description": "Cosine similarity score (0-1)" },
        "sentiment_score": { "type": "number", "description": "VADER compound sentiment score (0-1) from audience reviews" },
        "collaborative_score": { "type": "number", "description": "MovieLens CF predicted match (0-1) or null if unmapped" },
        "is_cold_start": { "type": "boolean", "description": "True if movie lacks collaborative data" },
        "explanation": { "type": "string", "description": "Human-readable explanation of why this movie is recommended" }
      },
      "required": ["content_similarity", "sentiment_score", "is_cold_start", "explanation"]
    }
  },
  "watch_providers": {
    "type": "object",
    "description": "Where to watch in India (IN region). Sourced from TMDB /movie/{id}/watch/providers. Optional — omit or use empty object/null when unavailable. NEVER invent provider data.",
    "properties": {
      "flatrate": {
        "type": "array",
        "description": "Subscription streaming providers",
        "items": { "$ref": "#/definitions/WatchProvider" }
      },
      "rent": {
        "type": "array",
        "description": "Rental providers",
        "items": { "$ref": "#/definitions/WatchProvider" }
      },
      "buy": {
        "type": "array",
        "description": "Purchase providers",
        "items": { "$ref": "#/definitions/WatchProvider" }
      },
      "link": {
        "type": "string",
        "description": "JustWatch attribution link for the IN region"
      }
    }
  },
  "required": [
    "tmdb_id",
    "title",
    "overview",
    "poster_url",
    "genres",
    "hybrid_score",
    "match_percentage",
    "score_breakdown"
  ]
}
```

### 3.4 WatchProvider Sub-Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WatchProvider",
  "type": "object",
  "properties": {
    "provider_id": { "type": "integer" },
    "provider_name": { "type": "string" },
    "logo_path": { "type": "string", "description": "Relative TMDB image path, e.g. /abcdef.jpg" }
  },
  "required": ["provider_id", "provider_name", "logo_path"]
}
```

### 3.3 Recommendation Response Payload Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RecommendationResponse",
  "type": "object",
  "properties": {
    "source_movie": {
      "type": "object",
      "properties": {
        "tmdb_id": { "type": "integer" },
        "title": { "type": "string" },
        "release_date": { "type": "string" },
        "original_language": { "type": "string" },
        "poster_url": { "type": "string" },
        "genres": { "type": "array", "items": { "type": "string" } },
        "overview": { "type": "string" }
      },
      "required": ["tmdb_id", "title", "poster_url"]
    },
    "recommendations": {
      "type": "array",
      "items": { "$ref": "#/definitions/MovieRecommendation" }
    },
    "applied_weights": {
      "type": "object",
      "properties": {
        "content": { "type": "number" },
        "sentiment": { "type": "number" },
        "collaborative": { "type": "number" }
      },
      "required": ["content", "sentiment", "collaborative"]
    },
    "execution_time_ms": { "type": "number" }
  },
  "required": ["source_movie", "recommendations", "applied_weights", "execution_time_ms"]
}
```

---

## 4. Behavioral & Quality Rules
- **Cinematic Aesthetic**: Sleek obsidian/glassmorphism dark UI, smooth card transitions, luminous badge accents, responsive layout.
- **Fail-Safe Fallbacks**: If MovieLens collaborative data is missing, apply the defined cold-start weights ($0.65$ content, $0.35$ sentiment) and mark the badge `"New Release / Content + Audience Match"`.
- **No Hallucinated Data**: All poster images and metadata must resolve to actual TMDB or verified dataset entries.
- **Language & Regional Prioritization**: Ensure search and candidate generation effectively index Indian languages (`te` for Telugu, `hi` for Hindi, `ta`, `ml`, `kn`) alongside global cinema.

---

## 5. Feature Contracts

### 5.1 Where to Watch (IN Region) — Feature 1
- TMDB endpoint: `GET /movie/{id}/watch/providers` (JustWatch-powered).
- **Region**: `IN` only. Return `flatrate`, `rent`, `buy` arrays. Each entry: `provider_id`, `provider_name`, `logo_path`.
- Cache TTL: **6 hours** in-memory (shared `_cache` dict, same as other endpoints).
- `watch_providers` field is **optional** in the response schema. Return an empty object `{}` (not null) when TMDB returns no IN data.
- **JustWatch Attribution**: The text "Streaming data provided by JustWatch" MUST appear near provider badges in the UI and in the Footer.
- Front-end: provider badges in `MovieModal`. Show on `MovieCard` only if space allows cleanly. Show `"Not available to stream in India"` when the object is empty.
- No secrets in client bundle. Provider logo URLs are constructed from `image.tmdb.org`.

### 5.2 Filters + Hidden Gems — Feature 2
- Filters are applied **after** hybrid scoring. Scores are never modified by filters.
- Optional request fields added to `POST /api/recommend`: `year_min`, `year_max`, `runtime_max`, `genres` (list), `min_rating`, `language` (list), `hidden_gems` (bool).
- **Hidden Gems definition**: `sentiment_score >= HIDDEN_GEMS_MIN_SENTIMENT AND vote_count < HIDDEN_GEMS_MAX_VOTES`. Thresholds are read from `config.py`, NOT hardcoded in route or engine:
  - `HIDDEN_GEMS_MIN_SENTIMENT: float = 0.75`
  - `HIDDEN_GEMS_MAX_VOTES: int = 1000`
- If filtering reduces results below `top_k`, the response MUST include a `filter_info` note stating how many results matched.
- An empty filter result returns 200 with an empty `recommendations` list and a descriptive `filter_info` message.
- Existing `LanguageFilter` on the frontend must continue working unchanged.

### 5.3 Good/Bad Feedback — Feature 3
- Front-end: thumbs up / thumbs down on `MovieCard` and `MovieModal`. Vote persists per session. Allow changing vote.
- **Session ID**: Anonymous UUID generated client-side, stored in `localStorage`. No personal data collected.
- `POST /api/feedback` fields: `session_id` (str), `source_tmdb_id` (int), `recommended_tmdb_id` (int), `vote` ("up"|"down"), `hybrid_score` (float), `is_cold_start` (bool).
- Rate limit: same as `/api/recommend` (30/min). Strict Pydantic validation.
- **Storage interface**: `backend/services/feedback_store.py` with `FeedbackStore` ABC and `JSONLFeedbackStore` implementation.
  - Storage path: `data/feedback/` (gitignored). Append-only `.jsonl` file.
  - Clearly marked `TEMPORARY` in code. Future PostgreSQL table definition lives in `architecture/06_feedback_store.md`.
  - **No SQLite fallback** under any circumstances.
- Privacy: README must include a short note that votes are anonymous and no personal data is collected.
