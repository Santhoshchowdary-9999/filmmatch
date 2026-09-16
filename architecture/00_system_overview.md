# Architecture SOP 00: System Overview & Topology — FilmMatch AI

## 1. System Mission & Scope
FilmMatch AI is a full-stack AI-driven movie recommendation application delivering **ranked, explainable recommendations** powered by a tripartite hybrid engine:
1. **Content-Based Similarity** (TF-IDF & Cosine Similarity over metadata soup)
2. **Audience Sentiment Analysis** (NLTK VADER on TMDB audience reviews)
3. **Collaborative Filtering** (MovieLens item-item cosine similarity strictly mapped via `links.csv`)

The platform supports **global cinema** while explicitly prioritizing **Indian cinema (Telugu `te`, Hindi `hi`, Tamil `ta`, Malayalam `ml`, Kannada `kn`)** alongside English (`en`) and international titles.

---

## 2. System Architecture & Topology

```
+---------------------------------------------------------------------------------+
|                        Frontend: Next.js 14+ (App Router)                       |
|   - Obsidian Dark Theme (Tailwind CSS, Framer Motion, Lucide Icons)             |
|   - Navbar, Hero, SearchBar, Trending Now, Explore by Language, How It Works   |
|   - Explainability Radial Gauge & Score Breakdown Cards                         |
+----------------------------------------+----------------------------------------+
                                         | REST API (JSON / HTTP)
                                         v
+---------------------------------------------------------------------------------+
|                         Backend: FastAPI REST Service                           |
|   - Endpoints: /api/search, /api/recommend, /api/movie/{id}, /api/health        |
|   - Pydantic v2 validation & response formatting                                |
|   - CORS Middleware & async execution pipeline                                  |
+-------------------+--------------------+--------------------+-------------------+
                    |                    |                    |
                    v                    v                    v
          +------------------+ +------------------+ +-------------------+
          |  Content Engine  | | Sentiment Engine | |  Collab Engine    |
          |  (TF-IDF / Soup) | |  (NLTK VADER)    | | (MovieLens Mapped)|
          +--------+---------+ +--------+---------+ +---------+---------+
                   |                    |                     |
                   +--------------------+---------------------+
                                        |
                                        v
                            +-----------------------+
                            | Hybrid Fusion Engine  |
                            | - Standard: 50/20/30  |
                            | - Cold-Start: 65/35/0 |
                            | - Explainability Tag  |
                            +-----------+-----------+
                                        |
                               +--------+--------+
                               |                 |
                               v                 v
                       +---------------+ +---------------+
                       | TMDB API      | | PostgreSQL    |
                       | (Metadata,    | | (Target DB /  |
                       | Reviews, Art) | | Mocked early) |
                       +---------------+ +---------------+
```

---

## 3. Data Flow & Execution Order

1. **User Query Input**:
   - User types a query in the frontend search bar.
   - Autocomplete / search resolves candidate movie with metadata (TMDB ID, title, genres, cast, director, overview, keywords, language, poster path).

2. **Candidate Retrieval & Scoring**:
   - **Content Engine (`ml/content_engine.py`)**: Computes TF-IDF cosine similarity against candidate metadata corpus ($S_{content} \in [0, 1]$).
   - **Sentiment Engine (`ml/sentiment_engine.py`)**: Fetches audience reviews from TMDB, cleans text, runs NLTK VADER, computes compound sentiment polarity normalized to $S_{sentiment} \in [0, 1]$.
   - **Collaborative Engine (`ml/collab_engine.py`)**: Looks up TMDB ID in verified MovieLens `links.csv` index. If mapped, calculates item-item CF affinity $S_{collab} \in [0, 1]$. If unmapped, excludes CF and triggers cold-start mode.

3. **Hybrid Fusion & Normalization**:
   - **Standard Mode (CF Available)**:
     $$S_{hybrid} = (0.50 \cdot S_{content}) + (0.20 \cdot S_{sentiment}) + (0.30 \cdot S_{collab})$$
   - **Cold-Start Mode (CF Unavailable)**:
     $$S_{hybrid} = (0.65 \cdot S_{content}) + (0.35 \cdot S_{sentiment}) + (0.00 \cdot S_{collab})$$
     Badge: `"New Release / Content + Audience Match"`

4. **Payload Delivery**:
   - Top 10 ranked movies returned with artwork URLs, match percentages, sub-scores, and human-readable explanation sentences.

---

## 4. Architectural Invariants Checklist
- [x] No silent SQLite fallback (PostgreSQL target; early phases mock DB operations).
- [x] Strict MovieLens `links.csv` ID verification (unmapped entries excluded from CF scoring).
- [x] VADER sentiment explicitly represents **audience reviews** (never professional critics).
- [x] Zero API keys in client code or Git.
- [x] High-precision modularity: each ML engine is testable independently.
