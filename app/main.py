"""
Synapse v2 — AI-Powered Text Triage SaaS
FastAPI Application Entry Point
"""

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routers import auth, triage, items, analytics


# ── Lifespan ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    init_db()
    yield


# ── App Factory ──

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Text Triage SaaS",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

# ── Include Routers ──

app.include_router(auth.router)
app.include_router(triage.router)
app.include_router(items.router)
app.include_router(analytics.router)


# ── Root Route ──

@app.get("/")
async def serve_index():
    """Serve the main frontend."""
    index_path = STATIC_DIR / "index.html"
    return FileResponse(str(index_path))


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {"status": "healthy", "version": settings.APP_VERSION}


# Mount static files AFTER API routes
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
