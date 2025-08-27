import asyncio
import pytest


def test_database_smoke():
    """Connects to DB, checks collections, and seeds providers."""
    async def _run():
        from src.db import connect_db, get_collections
        from src.services.seed_providers import seed_providers

        try:
            db = await connect_db()
        except Exception as exc:
            pytest.skip(f"Database not available: {exc}")
        assert db is not None

        collections = get_collections()
        assert "consumers" in collections and "providers" in collections

        consumers_before = await collections["consumers"].estimated_document_count()
        providers_before = await collections["providers"].estimated_document_count()

        # Seed providers once; should not error and count should be >= before
        await seed_providers()
        providers_after = await collections["providers"].estimated_document_count()

        assert consumers_before >= 0
        assert providers_after >= providers_before

    asyncio.run(_run())
