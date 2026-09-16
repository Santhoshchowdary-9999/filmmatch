/**
 * FilmMatch AI — Image URL Construction and Sanitization Helper
 * Strictly implements the TMDB image URL pattern:
 * https://image.tmdb.org/t/p/{size}/{poster_path}
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/**
 * Returns a valid, normalized TMDB poster image URL.
 * Handles:
 * - Direct poster_path (e.g. "/i0Y0wP8H6SRgjr6QmuwbtQbS24D.jpg" or "i0Y0wP8H6SRgjr6QmuwbtQbS24D.jpg")
 * - Already fully qualified URLs (e.g. "https://image.tmdb.org/t/p/w500/...")
 * - Missing / null / empty poster path
 */
export function getTmdbPosterUrl(
  pathOrUrl?: string | null,
  size: "w300" | "w500" | "w780" | "original" = "w500"
): string {
  if (!pathOrUrl || typeof pathOrUrl !== "string") {
    return "";
  }

  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return "";
  }

  // If already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Clean path by ensuring a leading slash
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${TMDB_IMAGE_BASE}/${size}${cleanPath}`;
}

/**
 * Returns a valid, normalized TMDB backdrop image URL.
 */
export function getTmdbBackdropUrl(
  pathOrUrl?: string | null,
  size: "w780" | "w1280" | "original" = "w1280"
): string {
  if (!pathOrUrl || typeof pathOrUrl !== "string") {
    return "";
  }

  const trimmed = pathOrUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${TMDB_IMAGE_BASE}/${size}${cleanPath}`;
}
