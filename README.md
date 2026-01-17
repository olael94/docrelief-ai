# DocRelief AI

AI-powered README documentation generator

## Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop
- pnpm

## Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/olael94/docrelief-ai.git
cd docrelief-ai
```

### 2. Start PostgreSQL
```bash
docker-compose up postgres
```

Keep this terminal running!

### 3. Setup Backend

Open a new terminal:
```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env

# Edit .env and add your API keys:
# - Get OpenAI API key from: https://platform.openai.com/api-keys
# - On any terminal Generate SECRET_KEY: python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Run database migrations (If you make changes to models, run these commands again)
1. Modify your model files (e.g., `app/models/user.py`)
2. Create migration on terminal: `alembic revision --autogenerate -m "Description" # Create new migration file
3. Apply migrations to DB Locally on terminal: alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

Backend runs on: http://localhost:8000

### 4. Setup Frontend

Open a new terminal:
```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend runs on: http://localhost:5173

### 5. Verify Setup

- Visit http://localhost:5173 - Should show "DocRelief AI" and "Backend Status: healthy"
- Visit http://localhost:8000/health - Should show `{"status": "healthy", "database": "connected"}`

## Daily Development

You need 3 terminals running:

**Terminal 1 - PostgreSQL:**
```bash
docker-compose up postgres
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 3 - Frontend:**
```bash
cd frontend
pnpm dev
```

## Project Structure
```
docrelief-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── db/
│   │   ├── main.py
│   │   └── config.py
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Tech Stack

- **Backend:** Python, FastAPI, LangChain, OpenAI
- **Frontend:** React, Vite, Tailwind CSS
- **Database:** PostgreSQL
- **Tools:** Docker, Alembic, pnpm

## Every time you start new work:
```bash
git checkout main
git pull
git checkout -b feature/my-feature

# Make changes then commit:
git add .
git commit -m "feat: description"
git push origin feature/my-feature
```
 Then create PR on GitHub, it will be reviewed and merged.



## Team Members

- Oliver Rivera (Product Owner - CS 480)
- Ataide dos Santos (CS 380)
- Caio Vaz (CS 360)
- Brad Erickson (CS 360)