from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.routes import users

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

# Include routers
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])

@app.get("/")
def read_root():
    return {"message": "Welcome to DocRelief AI"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Test database connection
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}