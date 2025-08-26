import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)

DEFAULT_URI = os.getenv('MONGO_URL', 'mongodb://127.0.0.1:8801')
DEFAULT_DB = os.getenv('MONGO_DB', 'hcp')

client = None
db = None


async def connect_db(uri: str = DEFAULT_URI, db_name: str = DEFAULT_DB):
    global client, db
    if db is not None:
        return db
    
    client = AsyncIOMotorClient(uri)
    db = client[db_name]
    logger.info(f"[DB] Connected to {uri}/{db_name}")
    await ensure_indexes()
    return db


def get_db():
    if db is None:
        raise RuntimeError('DB not connected. Call connect_db() first.')
    return db


def get_collections():
    database = get_db()
    return {
        'consumers': database['consumers'],
        'providers': database['providers'],
        'verificationTokens': database['verificationTokens'],
        'events': database['events'],
    }


def get_bucket(bucket_name: str = 'uploads'):
    return AsyncIOMotorGridFSBucket(get_db(), bucket_name=bucket_name)


async def ensure_indexes():
    collections = get_collections()
    
    # Create indexes
    try:
        await collections['consumers'].create_index("id", unique=True)
        await collections['consumers'].create_index("email", unique=True)
        await collections['providers'].create_index("id", unique=True)
        await collections['providers'].create_index("email", unique=True)
        await collections['events'].create_index("id", unique=True)
        await collections['events'].create_index([("requesterId", 1), ("start", 1)])
        await collections['events'].create_index([("participantId", 1), ("start", 1)])
        await collections['verificationTokens'].create_index("token", unique=True)
        await collections['verificationTokens'].create_index(
            "createdAt", 
            expireAfterSeconds=60 * 60 * 24 * 3  # 3 days
        )
        logger.info("[DB] Indexes created successfully")
    except DuplicateKeyError:
        logger.info("[DB] Indexes already exist")
    except Exception as e:
        logger.error(f"[DB] Error creating indexes: {e}")


async def ensure_seed_providers():
    """Seed initial AI providers if collection is empty"""
    try:
        from src.services.seed_providers import seed_providers
        collections = get_collections()
        count = await collections['providers'].estimated_document_count()
        if count == 0:
            await seed_providers()
            logger.info("[SEED] Providers seeded successfully")
        else:
            logger.info("[SEED] Providers already exist, skipping seed")
    except Exception as e:
        logger.warning(f"[SEED] Seed providers failed: {e}")
