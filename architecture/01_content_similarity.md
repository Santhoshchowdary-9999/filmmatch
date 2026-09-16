# Architecture SOP 01: Content-Based Similarity Engine

## 1. Objective & Scope
The **Content-Based Similarity Engine** (`ml/content_engine.py`) calculates pairwise narrative and metadata similarity between a source film and candidate films.

---

## 2. Feature Engineering: The Metadata Soup

To ensure high discrimination power across genres, directors, actors, languages, and thematic keywords, the engine constructs a structured **Metadata Soup** string for each movie:

```
Soup = [Cleaned Overview] + " " +
       [Genres * 2] + " " +
       [Director * 2] + " " +
       [Top 5 Cast Members (sanitized)] + " " +
       [Keywords] + " " +
       ["lang_" + OriginalLanguage]
```

### Sanitization Rules:
1. **Name Token Merging**: Cast and director names are lowercased and spaces removed (e.g., `"S. S. Rajamouli"` $\rightarrow$ `"ssrajamouli"`, `"Ram Charan"` $\rightarrow$ `"ramcharan"`, `"Leonardo DiCaprio"` $\rightarrow$ `"leonardodicaprio"`) so that single-word tokens do not collide across different people.
2. **Feature Weighting via Repetition**: Key structural attributes (Director and Genres) are repeated $2\times$ in the soup to increase their TF-IDF vector weight relative to generic overview words.
3. **Language Anchoring**: An explicit prefix token (e.g., `lang_te`, `lang_hi`, `lang_ta`, `lang_en`) is included to preserve regional affinity when recommending similar regional cinema.

---

## 3. Mathematical Model: TF-IDF & Cosine Similarity

1. **TF-IDF Transformation**:
   $$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \log\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
   - Vectorizer settings: `TfidfVectorizer(stop_words='english', ngram_range=(1, 2), max_features=15000)`

2. **Cosine Similarity**:
   $$S_{content}(A, B) = \frac{\mathbf{v}_A \cdot \mathbf{v}_B}{\|\mathbf{v}_A\|_2 \|\mathbf{v}_B\|_2}$$
   - Normalized range: $S_{content} \in [0.0, 1.0]$.

---

## 4. Input & Output Contract

### Input:
```python
@dataclass
class MovieMetadata:
    tmdb_id: int
    title: str
    overview: str
    genres: list[str]
    director: str
    cast: list[str]      # Top 5 actors
    keywords: list[str]
    original_language: str
```

### Output:
```python
@dataclass
class ContentScoreResult:
    tmdb_id: int
    content_similarity: float  # Range: [0.0, 1.0]
    matched_features: list[str] # e.g. ["Director: S. S. Rajamouli", "Genre: Action, Drama", "Language: Telugu"]
```

---

## 5. Standalone Test SOP
1. Instantiate `ContentEngine` in isolation with a fixture of sample movies (Telugu, Hindi, Global).
2. Query *"RRR"* $\rightarrow$ verify top matches include high overlap on director (S.S. Rajamouli), action/historical genre, and Telugu language (e.g. *Baahubali*, *Magadheera*).
3. Assert that all similarity scores are strictly within $[0.0, 1.0]$.
