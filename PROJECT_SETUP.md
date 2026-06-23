# AI Kubernetes Troubleshooting Agent - Project Setup

## Project Structure

```
ai-kubernetes-agent/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── kubernetes/     # Kubernetes investigation layer
│   │   ├── ai/             # AI reasoning module
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Pydantic schemas
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile
│   └── .env
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── services/          # API client services
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.local
├── docker-compose.yml     # Docker Compose configuration
├── prompts/               # Project prompts and documentation
└── docs/                  # Documentation
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Python 3.12+** - Programming language
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **Loguru** - Logging
- **HTTPX** - Async HTTP client

### Frontend
- **Next.js 14** - React framework with SSR
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 3.4** - Utility-first CSS
- **React Query** - Data fetching library
- **Axios** - HTTP client

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ (for local development)

### Quick Start with Docker

```bash
docker compose up --build
```

This will:
- Build and start the FastAPI backend on port 8000
- Build and start the Next.js frontend on port 3000

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend Health Check**: http://localhost:8000/health

### Local Development Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
OPENROUTER_API_KEY=       # InsForge provisioned OpenRouter key
OPENROUTER_MODEL=          # Model to use for AI reasoning
KUBECONFIG_PATH=           # Path to kubeconfig file
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## API Endpoints

### Health Check
- **GET** `/health` - Returns service health status

Response:
```json
{
  "status": "healthy",
  "service": "ai-kubernetes-agent"
}
```

## Next Steps

1. ✅ Implement Kubernetes investigation layer
2. Add AI reasoning with OpenRouter via InsForge
3. ✅ Create investigation endpoints
4. Build UI for diagnosis display
5. Add authentication (when needed)
6. Implement real-time updates (when needed)

## Notes

- CORS is enabled for localhost:3000 and localhost:8000
- Logging is configured with Loguru
- Environment variables are loaded from .env files
- Docker Compose includes hot-reload for both services
