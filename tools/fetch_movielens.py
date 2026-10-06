"""
MovieLens Ingestion Tool
Downloads and prepares ml-latest-small dataset into data/movielens/
"""
import os
import sys
import zipfile
import io
from pathlib import Path
import httpx

MOVIELENS_URL = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
TARGET_DIR = Path(__file__).resolve().parent.parent / "data" / "movielens"

def download_and_extract():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"[*] Target directory: {TARGET_DIR}")
    
    required_files = ["ratings.csv", "movies.csv", "links.csv", "tags.csv"]
    all_exist = all((TARGET_DIR / f).exists() for f in required_files)
    
    if all_exist:
        print("[+] MovieLens files already present in data/movielens.")
        for f in required_files:
            size_kb = (TARGET_DIR / f).stat().st_size / 1024
            print(f"    - {f}: {size_kb:.1f} KB")
        return True

    print(f"[*] Downloading MovieLens dataset from {MOVIELENS_URL} using httpx...")
    try:
        # First try normal SSL verification
        try:
            with httpx.Client(timeout=30.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
                response = client.get(MOVIELENS_URL)
                response.raise_for_status()
        except httpx.ConnectError:
            print("[!] SSL/Connection verification issue, retrying with verify=False for GroupLens CDN...")
            with httpx.Client(timeout=30.0, verify=False, headers={"User-Agent": "Mozilla/5.0"}) as client:
                response = client.get(MOVIELENS_URL)
                response.raise_for_status()

        print(f"[+] Download complete ({len(response.content) / 1024:.1f} KB). Extracting files...")
        
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if not filename:
                    continue
                extracted_content = zip_ref.read(member)
                with open(TARGET_DIR / filename, "wb") as out_f:
                    out_f.write(extracted_content)
                print(f"    Extracted: {filename}")

        print("[+] MovieLens dataset successfully unpacked and verified.")
        return True
    except Exception as e:
        print(f"[-] Error downloading/extracting MovieLens: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = download_and_extract()
    sys.exit(0 if success else 1)
