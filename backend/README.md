# DocRelief AI Backend

## Quick Start

### 1. Build the Docker image

```bash
docker build -t docrelief-ai-backend:latest .
```

### 2. Start PostgreSQL (local)

```bash
docker-compose up -d
```

### 3. Run the application

**Option A: Using Docker**

```bash
docker run -p 8000:8000 --env-file=.env docrelief-ai-backend:latest
```

**Option B: Run locally**

```bash
alembic upgrade head
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Access

- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Usage Example

Generate a README for a GitHub repository:

```bash
curl --location 'http://localhost:8000/api/readme/generate' \
--header 'Content-Type: application/json' \
--data '{
    "github_url": "https://github.com/scaiocesar/tef-softwareexpress-java"
}'
```

## Environment Variables

Make sure your `.env` file contains:

```
DATABASE_URL=postgresql://postgres:docrelief123@localhost:5432/docrelief
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_secret_key_here
```
