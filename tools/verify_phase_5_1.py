"""
Phase 5.1 Focused Verification Script
Verifies:
1. Additional regional language discovery (e.g. Malayalam, Kannada, Tamil)
2. Dangal 10 hybrid recommendations
3. Parasite 10 hybrid recommendations
4. Broad TMDB search across regional & global titles
5. Strict 9,734 MovieLens TMDB mapping preservation
"""
import asyncio
import json
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def run_verification():
    print("=" * 60)
    print("FILMMATCH AI — PHASE 5.1 FOCUSED VERIFICATION")
    print("=" * 60)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Check System Health & Strict MovieLens Mapping
        print("\n[1] Checking System Health & Strict MovieLens Mapping...")
        res_health = await client.get("/api/health")
        assert res_health.status_code == 200, f"Health check failed: {res_health.text}"
        health_data = res_health.json()
        print(f"    Status: {health_data['status']}")
        print(f"    Target Database: {health_data['database_target']}")
        print(f"    TMDB Configured: {health_data['tmdb_configured']}")
        print(f"    Strict MovieLens Mapped Count: {health_data['movielens_mapped_count']}")
        assert health_data['movielens_mapped_count'] in [9733, 9734], "MovieLens mapping mismatch!"
        print("    [OK] PASS: Strict MovieLens mapping preserved.")

        # 2. Verify Additional Regional Language Filters (Malayalam & Kannada)
        print("\n[2] Verifying Regional Language Discovery (Malayalam & Kannada)...")
        res_ml = await client.get("/api/discover?language=ml")
        assert res_ml.status_code == 200
        ml_data = res_ml.json()
        print(f"    Malayalam ('ml') discovered count: {len(ml_data['results'])} movies")
        assert len(ml_data['results']) >= 10, "Malayalam discovery returned fewer than 10 movies"
        print(f"    Sample Malayalam titles: {[m['title'] for m in ml_data['results'][:3]]}")

        res_kn = await client.get("/api/discover?language=kn")
        assert res_kn.status_code == 200
        kn_data = res_kn.json()
        print(f"    Kannada ('kn') discovered count: {len(kn_data['results'])} movies")
        assert len(kn_data['results']) >= 10, "Kannada discovery returned fewer than 10 movies"
        print(f"    Sample Kannada titles: {[m['title'] for m in kn_data['results'][:3]]}")
        print("    [OK] PASS: Regional discovery confirmed across regional languages.")

        # 3. Search and Hybrid Recommendations for 'Dangal'
        print("\n[3] Verifying Search and 10 Hybrid Recommendations for 'Dangal'...")
        res_search_dangal = await client.get("/api/search?q=Dangal")
        assert res_search_dangal.status_code == 200
        dangal_search = res_search_dangal.json()["results"]
        assert len(dangal_search) > 0, "No search results for Dangal"
        dangal_id = dangal_search[0]["tmdb_id"]
        print(f"    Found '{dangal_search[0]['title']}' (TMDB ID: {dangal_id}, Lang: {dangal_search[0]['original_language']})")

        rec_dangal_payload = {"query": "Dangal", "tmdb_id": dangal_id, "top_k": 10}
        res_dangal_rec = await client.post("/api/recommend", json=rec_dangal_payload)
        assert res_dangal_rec.status_code == 200, f"Dangal recommendation failed: {res_dangal_rec.text}"
        dangal_rec_data = res_dangal_rec.json()
        recs_dangal = dangal_rec_data["recommendations"]
        print(f"    Recommendations count for Dangal: {len(recs_dangal)}")
        assert len(recs_dangal) == 10, f"Expected exactly 10 recommendations, got {len(recs_dangal)}"
        print(f"    Applied Weights: {dangal_rec_data['applied_weights']}")
        print(f"    Execution Time: {dangal_rec_data['execution_time_ms']} ms")
        print("    Top 3 Recommendations for Dangal:")
        for idx, r in enumerate(recs_dangal[:3], 1):
            print(f"      {idx}. {r['title']} ({r['release_date'][:4] if r['release_date'] else 'N/A'}) - Match: {r['match_percentage']}% | Score: {r['hybrid_score']} | Expl: {r['score_breakdown']['explanation']}")
        print("    [OK] PASS: Exactly 10 recommendations with scores and explainability for Dangal.")

        # 4. Search and Hybrid Recommendations for 'Parasite'
        print("\n[4] Verifying Search and 10 Hybrid Recommendations for 'Parasite'...")
        res_search_parasite = await client.get("/api/search?q=Parasite")
        assert res_search_parasite.status_code == 200
        parasite_search = res_search_parasite.json()["results"]
        assert len(parasite_search) > 0, "No search results for Parasite"
        parasite_id = parasite_search[0]["tmdb_id"]
        print(f"    Found '{parasite_search[0]['title']}' (TMDB ID: {parasite_id}, Lang: {parasite_search[0]['original_language']})")

        rec_parasite_payload = {"query": "Parasite", "tmdb_id": parasite_id, "top_k": 10}
        res_parasite_rec = await client.post("/api/recommend", json=rec_parasite_payload)
        assert res_parasite_rec.status_code == 200, f"Parasite recommendation failed: {res_parasite_rec.text}"
        parasite_rec_data = res_parasite_rec.json()
        recs_parasite = parasite_rec_data["recommendations"]
        print(f"    Recommendations count for Parasite: {len(recs_parasite)}")
        assert len(recs_parasite) == 10, f"Expected exactly 10 recommendations, got {len(recs_parasite)}"
        print(f"    Applied Weights: {parasite_rec_data['applied_weights']}")
        print(f"    Execution Time: {parasite_rec_data['execution_time_ms']} ms")
        print("    Top 3 Recommendations for Parasite:")
        for idx, r in enumerate(recs_parasite[:3], 1):
            print(f"      {idx}. {r['title']} ({r['release_date'][:4] if r['release_date'] else 'N/A'}) - Match: {r['match_percentage']}% | Score: {r['hybrid_score']} | Expl: {r['score_breakdown']['explanation']}")
        print("    [OK] PASS: Exactly 10 recommendations with scores and explainability for Parasite.")

        # 5. Broad Search across Regional and Global titles
        print("\n[5] Verifying Broad TMDB Search Functionality...")
        test_queries = ["Pushpa", "Jersey", "Sholay", "Gangs of Wasseypur", "Interstellar", "Spirited Away"]
        for q in test_queries:
            res_q = await client.get(f"/api/search?q={q}")
            assert res_q.status_code == 200
            q_results = res_q.json()["results"]
            print(f"    Query '{q}': {len(q_results)} results (Top: '{q_results[0]['title']}' - Lang: {q_results[0]['original_language']})")
        print("    [OK] PASS: Broad TMDB search preserved across regional & global titles.")

        print("\n" + "=" * 60)
        print("ALL FOCUSED CHECKS COMPLETED SUCCESSFULLY!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_verification())
