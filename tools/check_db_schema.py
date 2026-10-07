import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/filmmatch")
        rows = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        print("Existing tables:", [r["table_name"] for r in rows])
        await conn.close()
    except Exception as e:
        print("Database error:", e)

if __name__ == "__main__":
    asyncio.run(main())
