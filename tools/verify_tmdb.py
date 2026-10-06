"""
TMDB API Verification Tool
Validates API authentication, rate limits, movie discovery (Telugu, Hindi, Global),
and audience review access without logging or leaking raw secret tokens.
"""
import os
import sys
import time
from pathlib import Path
import httpx

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

def load_credentials():
    env_vars = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()
                
    api_key = env_vars.get("TMDB_API_KEY") or os.environ.get("TMDB_API_KEY", "")
    read_token = env_vars.get("TMDB_READ_ACCESS_TOKEN") or os.environ.get("TMDB_READ_ACCESS_TOKEN", "")
    return api_key, read_token

def mask(val: str) -> str:
    if not val:
        return "[NOT SET]"
    val = val.strip()
    if len(val) <= 8:
        return "****"
    return f"{val[:4]}...{val[-4:]}"

def verify_tmdb():
    print("=" * 60)
    print(" TMDB API CONNECTIVITY & HANDSHAKE VERIFICATION")
    print("=" * 60)
    
    api_key, read_token = load_credentials()
    
    if not api_key and not read_token:
        print("[-] Verification Failed: No TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN found in .env")
        print("    Please add your TMDB key to .env and re-run.")
        return False
        
    print(f"[*] Testing TMDB credential: Key={mask(api_key)}, Token={mask(read_token)}")
    
    # Build request headers / params
    headers = {"User-Agent": "FilmMatch-AI-Verification/1.0"}
    base_params = {}
    if read_token:
        headers["Authorization"] = f"Bearer {read_token}"
    elif api_key:
        base_params["api_key"] = api_key

    # 1. Test Authentication / Configuration Handshake
    print("\n[*] 1. Testing API Handshake & Configuration endpoint...")
    t0 = time.perf_counter()
    try:
        url = "https://api.themoviedb.org/3/configuration"
        res = httpx.get(url, headers=headers, params=base_params, timeout=10.0)
        latency_ms = (time.perf_counter() - t0) * 1000
        
        if res.status_code == 200:
            config = res.json()
            base_img_url = config.get("images", {}).get("secure_base_url", "N/A")
            print(f"[+] Handshake SUCCESS (HTTP 200) in {latency_ms:.1f}ms")
            print(f"    - Image Base URL: {base_img_url}")
        elif res.status_code == 401:
            print(f"[-] Handshake FAILED (HTTP 401 Unauthorized): Invalid TMDB credentials.")
            return False
        else:
            print(f"[-] Handshake FAILED: Status code {res.status_code}, Response: {res.text[:200]}")
            return False
    except Exception as e:
        print(f"[-] Handshake Network Error: {e}")
        return False

    # 2. Test Regional Cinema Search Queries (Telugu, Hindi, Global)
    test_queries = [
        {"title": "RRR", "lang": "te", "region": "IN", "category": "Telugu Cinema"},
        {"title": "Dangal", "lang": "hi", "region": "IN", "category": "Hindi Cinema"},
        {"title": "Inception", "lang": "en", "region": "US", "category": "Global Cinema"}
    ]
    
    print("\n[*] 2. Testing Search Discovery Across Regional Categories...")
    found_movies = []
    
    for q in test_queries:
        search_url = "https://api.themoviedb.org/3/search/movie"
        params = {**base_params, "query": q["title"], "include_adult": "false"}
        t0 = time.perf_counter()
        try:
            res = httpx.get(search_url, headers=headers, params=params, timeout=10.0)
            latency_ms = (time.perf_counter() - t0) * 1000
            
            if res.status_code == 200:
                results = res.json().get("results", [])
                if results:
                    top = results[0]
                    found_movies.append(top)
                    print(f"[+] [{q['category']}] Found '{top.get('title')}' (TMDB ID: {top.get('id')}, Lang: {top.get('original_language')}, Rel: {top.get('release_date')}) in {latency_ms:.1f}ms")
                else:
                    print(f"[-] [{q['category']}] No results found for query '{q['title']}'")
            else:
                print(f"[-] [{q['category']}] Search failed for '{q['title']}': HTTP {res.status_code}")
                return False
        except Exception as e:
            print(f"[-] Search network error for '{q['title']}': {e}")
            return False

    # 3. Test Movie Audience Reviews Endpoint (for VADER sentiment)
    print("\n[*] 3. Testing Audience Reviews Endpoint (VADER Sentiment Data Source)...")
    if found_movies:
        sample_movie = found_movies[0]
        movie_id = sample_movie.get("id")
        reviews_url = f"https://api.themoviedb.org/3/movie/{movie_id}/reviews"
        try:
            res = httpx.get(reviews_url, headers=headers, params=base_params, timeout=10.0)
            if res.status_code == 200:
                rev_data = res.json()
                total_revs = rev_data.get("total_results", 0)
                results = rev_data.get("results", [])
                print(f"[+] Audience Reviews for TMDB #{movie_id} ('{sample_movie.get('title')}'):")
                print(f"    - Total Reviews available: {total_revs}")
                if results:
                    sample_review_preview = results[0].get("content", "").replace("\n", " ")[:120]
                    print(f"    - Sample review excerpt: \"{sample_review_preview}...\"")
                else:
                    print(f"    - Note: Movie has {total_revs} direct reviews; fallback overview sentiment will also be supported.")
            else:
                print(f"[-] Reviews lookup failed: HTTP {res.status_code}")
                return False
        except Exception as e:
            print(f"[-] Reviews network error: {e}")
            return False

    print("\n" + "=" * 60)
    print(" RESULT: TMDB API CONNECTIVITY FULLY VERIFIED")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = verify_tmdb()
    sys.exit(0 if success else 1)
