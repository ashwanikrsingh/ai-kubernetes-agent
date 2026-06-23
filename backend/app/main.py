from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from app.core.config import settings
from app.api import health, investigation

app = FastAPI(title="AI Kubernetes Agent", version="0.1.0")

logger.remove()
logger.add(sys.stderr, level="INFO")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("FastAPI app initialized with CORS enabled")

app.include_router(health.router)
app.include_router(investigation.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutdown")
