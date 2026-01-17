from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text  # ADD THIS IMPORT
from app.db.session import get_db

app = FastAPI(title="DocRelief AI")

# CORS configuration for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    # This should be changed to the actual frontend URL in production
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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