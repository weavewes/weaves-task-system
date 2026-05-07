"""Weaves Task API — FastAPI Application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes import health, members, tasks, nexus, clients, projects
from app.database import init_db
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: verify database connection
    try:
        await init_db()
    except Exception as e:
        print(f"⚠️  Database connection warning: {e}")
    yield
    # Shutdown: nothing special needed
    print("👋 Task API shutting down")


app = FastAPI(
    title="Weaves Task API",
    description="Task orchestration API for the Weaves agent system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(members.router)
app.include_router(tasks.router)
app.include_router(nexus.router)
app.include_router(clients.router)
app.include_router(projects.router)


@app.get("/")
async def root():
    return {
        "service": "weaves-task-api",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }