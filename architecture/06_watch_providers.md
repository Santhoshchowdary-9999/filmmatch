# Architecture SOP 06: Where to Watch (IN Region)

## 1. Objective
Expose streaming, rental, and purchase availability for Indian viewers (IN region) on each recommended movie, using TMDB's JustWatch-powered Watch Providers API.

---

## 2. TMDB Endpoint

GET /movie/{movie_id}/watch/providers

Only the IN key from results is extracted. TTL: 6 hours (21600 s).

## 3. Backend
- TMDBService.get_watch_providers(tmdb_id) reuses _request() helper with ttl=21600.0
- Returns WatchProvidersData (flatrate, rent, buy, link) or empty {} on failure.
- WatchProviderItem schema: provider_id, provider_name, logo_path.
- watch_providers: Optional[WatchProvidersData] added to MovieRecommendationSchema.

## 4. Frontend
- Provider badges in MovieModal, up to 3 logos on MovieCard (flatrate only).
- Empty state: 'Not available to stream in India'.
- Attribution: 'Streaming data provided by JustWatch' in MovieModal and Footer.
- Logo URL: https://image.tmdb.org/t/p/original{logo_path}

## 5. Architectural Invariants
- No provider data invented.
- Existing _request() retry/backoff/provenance reused.
- TTL 6 hours for /watch/providers cache key.
- JustWatch attribution mandatory in MovieModal and Footer.
