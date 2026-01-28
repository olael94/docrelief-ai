from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.routers import readme
import logging
import sys

# Configure logging BEFORE creating the app
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ],
    force=True  # Override any existing configuration
)

# Set specific loggers
logging.getLogger("app").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Reduce access log noise

logger = logging.getLogger(__name__)
logger.info("Application logging configured")

app = FastAPI(title="DocRelief AI")

# CORS configuration for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    # This should be changed to the actual frontend URL in production
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
    "http://192.168.0.169:5173", "http://66.7.119.183:5173", "http://192.168.86.249:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(readme.router)

@app.get("/")
async def read_root():
    return {"message": "Welcome to DocRelief AI"}

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    # Test database connection
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}