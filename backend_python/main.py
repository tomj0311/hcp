import os
import ssl
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

# Add current directory to Python path for imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from src.db import connect_db, ensure_seed_providers
from src.routes import auth, users, payments, uploads, meetups, profile
from src.ws.matchmaking import setup_websocket_routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables FIRST
load_dotenv()

# Debug: Check if Google OAuth variables are loaded
logger.info("🔍 Environment Variables Check:")
logger.info(f"- GOOGLE_CLIENT_ID: {'Loaded ✅' if os.getenv('GOOGLE_CLIENT_ID') else 'Missing ❌'}")
logger.info(f"- GOOGLE_CLIENT_SECRET: {'Loaded ✅' if os.getenv('GOOGLE_CLIENT_SECRET') else 'Missing ❌'}")

# Basic startup diagnostics (non-sensitive)
if not os.getenv('JWT_SECRET'):
    os.environ['JWT_SECRET'] = 'dev_jwt_secret'
    logger.warning('[WARN] JWT_SECRET not set; using insecure development fallback.')

logger.info('[BOOT] Starting API with config: {}'.format({
    'PORT': os.getenv('PORT', 4000),
    'CLIENT_URL': os.getenv('CLIENT_URL'),
    'TLS': bool(os.getenv('TLS_KEY') and os.getenv('TLS_CERT')),
    'ENVIRONMENT': os.getenv('ENVIRONMENT', 'development')
}))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await connect_db()
        await ensure_seed_providers()
        logger.info("Database connected and seeded successfully")
        yield
    except Exception as e:
        logger.error(f"[BOOT] Failed to connect to MongoDB: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="ConsultFlow API",
    description="Healthcare consultation platform API",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv('CLIENT_URL', '*')],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
app.include_router(meetups.router, prefix="/meetups", tags=["meetups"])

# Setup WebSocket routes
setup_websocket_routes(app)


if __name__ == "__main__":
    port = int(os.getenv('PORT', 4000))
    use_tls = os.getenv('TLS_KEY') and os.getenv('TLS_CERT')
    
    if use_tls:
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(
            os.getenv('TLS_CERT'),
            os.getenv('TLS_KEY')
        )
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            ssl_context=ssl_context,
            reload=True
        )
    else:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=port,
            reload=True
        )
