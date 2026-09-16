# Architecture SOP 05: Frontend Design System & UI/UX Specification

## 1. Visual Identity & Design Philosophy
**FilmMatch AI** is designed with a bespoke, obsidian-grade **Cinematic Dark Theme**. It does not look like a generic corporate dashboard or copy existing streaming apps; it embodies a sophisticated cinematic experience with deep atmospheric lighting, luminous accents, and editorial typography.

---

## 2. Color Palette & Design Tokens

### 2.1 Backgrounds & Surfaces
- **Background Root**: `#07080C` (Deepest Obsidian Abyss)
- **Surface 1 (Cards & Panels)**: `#0F121C` (Midnight Slate)
- **Surface 2 (Elevated & Popovers)**: `#161B2A` (Smoky Charcoal)
- **Surface Border**: `rgba(255, 255, 255, 0.08)` (Subtle Luminescence)
- **Glassmorphism Base**: `rgba(15, 18, 28, 0.75)` with `backdrop-blur-xl`

### 2.2 Cinematic Brand Accents & Gradients
- **Primary Accent (Indigo/Electric Violet)**: `#6366F1` $\rightarrow$ `#8B5CF6`
- **Secondary Accent (Cyan/Azure Glow)**: `#38BDF8` $\rightarrow$ `#3B82F6`
- **Highlight Accent (Warm Amber / Gold Rating)**: `#F59E0B`
- **Hero Ambient Glow**: Radial gradient `radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.18), transparent 70%)`

### 2.3 Typography Hierarchy
- **Display Headings**: *Outfit* / *Plus Jakarta Sans*, Bold (700/800), tracking-tight
- **Body & Subtitles**: *Inter*, Regular (400) and Medium (500), tracking-normal
- **Data & Badges**: *JetBrains Mono* / *Inter*, Semi-Bold (600), uppercase tracking-wider

---

## 3. Homepage Architecture & Component Hierarchy

```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout with font imports, metadata, dark theme
│   ├── page.tsx                # Homepage orchestrator
│   └── globals.css             # Tailwind directives, custom scrollbars, gradient utilities
├── components/
│   ├── Navbar.tsx              # Brand logo, language badges, How It Works link, GitHub
│   ├── Hero.tsx                # Cinematic headline, ambient backdrop, search integration
│   ├── SearchBar.tsx           # Search input, language filters, keyboard shortcuts
│   ├── MovieCard.tsx           # Poster, title, year, rating badge, language tag, hover lift
│   ├── MovieGrid.tsx           # Responsive 2-to-5 column grid with staggered entry
│   ├── SectionHeader.tsx       # Section title, glowing subtitle, and action buttons
│   ├── LanguageFilter.tsx      # Filter tabs: All, Telugu, Hindi, Tamil, Malayalam, Global
│   ├── HowItWorks.tsx          # 3-pillar breakdown (Content DNA, Audience VADER, MovieLens CF)
│   ├── ExplainabilityBadge.tsx # Radial score gauge and sub-score bar visualizer
│   └── Footer.tsx              # Attribution (TMDB / MovieLens), legal, social links
└── data/
    └── mock_movies.ts          # High-fidelity mock movie dataset for initial UI rendering
```

---

## 4. Component Design Specifications

### 4.1 MovieCard
- **Dimensions**: Aspect ratio `2:3` for poster container.
- **Card Elements**:
  1. High-resolution poster with fallback gradient.
  2. Language pill (e.g. `TELUGU`, `HINDI`, `ENGLISH`) in upper-left corner.
  3. Rating badge (e.g. `★ 8.4`) in upper-right corner.
  4. Title (clamp to 1-2 lines), Release Year, and primary Genre.
  5. Explainable match badge (when in recommendation view).
- **Hover Micro-Interaction**:
  - Transform: `translateY(-6px) scale(1.02)`
  - Duration: `200ms ease-out`
  - Border glow: `border-indigo-500/40 shadow-[0_12px_30px_rgba(99,102,241,0.2)]`

### 4.2 How It Works Section (The 3 Pillars)
1. **Pillar 1: Narrative DNA (50%)**: Feature extraction over plot overviews, genres, directors, and top cast using TF-IDF.
2. **Pillar 2: Audience Pulse (20%)**: Live sentiment polarity scored by NLTK VADER across thousands of real TMDB audience reviews.
3. **Pillar 3: Community Affinity (30%)**: Behavioral co-rating matrix computed over 100,000+ MovieLens user ratings.

---

## 5. Responsive Design & Accessibility

- **Breakpoints**:
  - `sm` (640px): 2 columns
  - `md` (768px): 3 columns
  - `lg` (1024px): 4 columns
  - `xl` (1280px): 5 columns
- **Accessibility Invariants**:
  - All interactive elements must maintain minimum `44px x 44px` touch targets.
  - Visible focus rings: `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none`.
  - Contrast ratio $> 4.5:1$ across all text against dark surfaces (WCAG AA compliant).
  - Respect `@media (prefers-reduced-motion: reduce)`: disable heavy scale transforms for motion-sensitive users.
