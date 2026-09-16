# FilmMatch AI — Findings & Research

## Architectural Decisions & Insights

### 1. Hybrid Recommendation Architecture (Phase 3 Specifications)
- **Content Engine**:
  - Metadata Soup structure: `[Cleaned Overview] + [Genres * 2] + [Director * 2] + [Top 5 Cast Members (joined)] + [Keywords] + ["lang_" + OriginalLanguage]`.
  - Linear TF-IDF vectorization with bigrams (`ngram_range=(1, 2)`) and cosine distance calculation.
  - Full multiregional indexing (Telugu `te`, Hindi `hi`, Tamil `ta`, Malayalam `ml`, Kannada `kn`, English `en`, and international cinema).
- **Audience Sentiment Analyzer**:
  - NLTK VADER analyzer applied to TMDB **audience viewer reviews** (never professional critics).
  - Multi-review compound score normalized linearly from $[-1.0, 1.0]$ to $[0.0, 1.0]$.
  - Overview narrative tone fallback when direct user reviews are unavailable on TMDB.
- **Collaborative Filtering Engine**:
  - Item-Item adjusted cosine similarity over 100,836 ratings across 610 users from `ml-latest-small`.
  - Mean-centered user ratings to eliminate user rating scale biases.
  - Strict `links.csv` verification: 9,734 mapped movies participating; unmapped movies excluded.
- **Hybrid Fusion Engine**:
  - Standard Mode: $\text{Final} = 0.50 \cdot S_{content} + 0.20 \cdot S_{sentiment} + 0.30 \cdot S_{collab}$.
  - Cold Start Mode: $\text{Final} = 0.65 \cdot S_{content} + 0.35 \cdot S_{sentiment} + 0.00 \cdot S_{collab}$ with badge `"New Release / Content + Audience Match"`.
  - Dynamic natural-language explainability synthesis based on dominant scoring factor.

### 2. Frontend UI/UX Design System Specification
- **Visual Identity**: Obsidian Cinematic Theme with deep charcoal/black base (`#07080C`, `#0F121C`), atmospheric violet/indigo lighting (`#6366F1`, `#8B5CF6`), and gold rating highlights.
- **Component Architecture**: Reusable atomic hierarchy (`Navbar`, `Hero`, `SearchBar`, `MovieCard`, `MovieGrid`, `SectionHeader`, `LanguageFilter`, `HowItWorks`, `Footer`).
- **Interaction Model**: Card lift (`translateY(-6px) scale(1.02)`), 200ms ease-out, WCAG AA compliant contrast, `>=44px` touch targets, and `prefers-reduced-motion` compliance.
- **Mock Data Isolation**: Temporary high-fidelity mock dataset with regional and global titles for early frontend development without live TMDB coupling.
