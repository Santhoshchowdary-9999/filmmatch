"""
VADER Sentiment Verification Tool
Validates NLTK VADER lexicon download and sentiment analysis execution on sample movie reviews.
"""
import ssl
import sys

def verify_vader():
    print("=" * 60)
    print(" NLTK VADER SENTIMENT ANALYZER VERIFICATION")
    print("=" * 60)
    
    # Configure unverified SSL context for nltk downloader on Windows if needed
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context

    try:
        import nltk
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
    except ImportError as e:
        print(f"[-] NLTK not installed: {e}")
        return False

    print("[*] Ensuring NLTK 'vader_lexicon' resource is downloaded...")
    try:
        nltk.download("vader_lexicon", quiet=False)
        sia = SentimentIntensityAnalyzer()
        print("[+] VADER SentimentIntensityAnalyzer successfully initialized.")
    except Exception as e:
        print(f"[-] Failed to initialize VADER: {e}")
        return False

    # Test sample reviews (positive, mixed/neutral, negative)
    test_reviews = [
        ("A breathtaking cinematic masterpiece with stunning visuals and brilliant acting!", "Positive"),
        ("An average film. Good cinematography but the pacing dragged in the second half.", "Neutral/Mixed"),
        ("Utterly disappointing, terrible plot and poor character development.", "Negative")
    ]

    print("\n[*] Testing Sentiment Scoring on Sample Text:")
    for text, label in test_reviews:
        scores = sia.polarity_scores(text)
        compound = scores["compound"]
        # Normalize compound (-1..1) to (0..1)
        normalized = (compound + 1.0) / 2.0
        print(f"    - Review ({label}): \"{text[:50]}...\"")
        print(f"      Compound: {compound:+.3f} | Normalized (0-1): {normalized:.3f} | Pos: {scores['pos']:.2f}, Neg: {scores['neg']:.2f}, Neu: {scores['neu']:.2f}")

    print("\n" + "=" * 60)
    print(" RESULT: VADER SENTIMENT ANALYZER VERIFIED SUCCESSFULLY")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = verify_vader()
    sys.exit(0 if success else 1)
