from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Use the database_url property which constructs the URL automatically
database_url = settings.database_url

engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()