# Customer Support AI Agent

This project contains a FastAPI backend and a Next.js frontend.

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Start the backend

From the project root:

```bash
cd RAGAgent/backend
python3 -m venv .venv
source .venv/bin/activate
python -V
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will run at:

- http://localhost:8000

> Note: on Linux, use `python3` rather than `python`. If `pip install` fails with a proxy/network error, the environment cannot reach PyPI; install the dependencies in a network-enabled Python environment before running the server.

## Start the frontend

Open a second terminal and run:

```bash
cd RAGAgent/frontend
npm install
npm run dev
```

The frontend will run at:

- http://localhost:3000

## Useful endpoints

The backend exposes the following API routes:

- GET /api/health
- GET /api/demo-questions
- GET /api/documents
- POST /api/documents/upload
- POST /api/chat
- GET /api/how-it-works

## Notes

- The frontend is expected to call the backend on port 8000.
- If you are running the app locally, make sure both services are started before testing the full flow.
