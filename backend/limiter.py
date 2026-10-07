"""
FilmMatch AI — Rate Limiting Configuration
Centralized slowapi Limiter instance for FastAPI endpoints.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Default limiter using client IP address
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
