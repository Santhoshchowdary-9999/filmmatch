import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FilmMatch AI — Cinematic Movie Discovery",
  description:
    "Discover your next unforgettable film powered by Story DNA, TMDB Audience Sentiment, and MovieLens Collaborative Filtering.",
  keywords: [
    "movie recommendation",
    "AI movie matcher",
    "Telugu cinema",
    "Hindi cinema",
    "MovieLens",
    "VADER sentiment",
    "hybrid recommendations",
    "cinematic discovery",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-charcoal text-warm-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
