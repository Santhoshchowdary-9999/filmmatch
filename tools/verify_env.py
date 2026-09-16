"""
Environment Configuration Verification Tool
Audits .env presence and masks credentials securely without revealing secrets.
"""
import os
import sys
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

def mask_credential(val: str) -> str:
    if not val:
        return "[NOT SET]"
    val = val.strip()
    if len(val) <= 8:
        return "****"
    return f"{val[:4]}...{val[-4:]} (length: {len(val)})"

def verify_environment():
    print("=" * 60)
    print(" ENVIRONMENT & SECRETS AUDIT")
    print("=" * 60)
    
    if not ENV_FILE.exists():
        print(f"[-] .env file not found at {ENV_FILE}")
        print("    Please create .env using .env.example as a template.")
        return False
    
    print(f"[+] Found .env file at: {ENV_FILE}")
    
    # Simple .env parser to avoid external dependencies
    env_vars = {}
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()
            
    tmdb_key = env_vars.get("TMDB_API_KEY") or os.environ.get("TMDB_API_KEY", "")
    tmdb_token = env_vars.get("TMDB_READ_ACCESS_TOKEN") or os.environ.get("TMDB_READ_ACCESS_TOKEN", "")
    db_url = env_vars.get("DATABASE_URL") or os.environ.get("DATABASE_URL", "")

    print(f"[*] TMDB_API_KEY:            {mask_credential(tmdb_key)}")
    print(f"[*] TMDB_READ_ACCESS_TOKEN:  {mask_credential(tmdb_token)}")
    print(f"[*] DATABASE_URL:            {db_url.split('@')[0].split('://')[0] + '://***' if db_url else '[NOT SET]'}")

    if not tmdb_key and not tmdb_token:
        print("\n[-] Missing TMDB Credentials in .env!")
        print("    Add either TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to .env.")
        return False

    print("\n[+] Environment credentials structure verified.")
    return True

if __name__ == "__main__":
    success = verify_environment()
    sys.exit(0 if success else 1)
