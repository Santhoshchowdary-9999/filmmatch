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
