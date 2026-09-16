import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FilmMatch AI — Hybrid AI Movie Recommendations",
  description:
    "Discover your next favorite film powered by Content Similarity, TMDB Audience Sentiment (VADER), and MovieLens Collaborative Filtering.",
  keywords: [
    "movie recommendation",
    "AI movie matcher",
    "Telugu cinema",
    "Hindi cinema",
    "MovieLens",
    "VADER sentiment",
    "hybrid recommendations"
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="bg-obsidian text-gray-100 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
