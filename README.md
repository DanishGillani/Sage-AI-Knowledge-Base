# Sage — AI Knowledge Base

> Drop in your docs. Ask questions. Get answers with sources.

Sage is a full-stack RAG (Retrieval-Augmented Generation) application that lets teams upload documents, index them into a vector store, and query them through a conversational interface. Built as a portfolio project demonstrating production-grade AI engineering on a modern TypeScript + Python stack.

**Live demo:** _self-host with `docker compose up`_

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  Next.js 15 App Router  (React 19 + TanStack Query)     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (same origin)
┌────────────────────────▼────────────────────────────────┐
│  Next.js BFF  (Route Handlers)                          │
│  • Validates & transforms requests                      │
│  • Owns Prisma → PostgreSQL  (KB / Document / Session)  │
│  • Forwards AI work to FastAPI via x-internal-secret    │
└───────────┬──────────────────────────┬──────────────────┘
            │ Prisma                   │ HTTP (internal)
┌───────────▼──────────┐  ┌───────────▼──────────────────┐
│  PostgreSQL + pgvector│  │  FastAPI RAG service         │
│  • knowledge_bases    │  │  • /documents/{id}/ingest    │
│  • documents          │  │    extract → chunk → embed   │
│  • sessions           │  │  • /chat                     │
│  • messages           │  │    embed → retrieve → LLM    │
│  • chunks (vectors)   │  │  • SQLAlchemy + asyncpg      │
└──────────────────────┘  └──────────┬───────────────────┘
                                     │
                          ┌──────────▼───────────────────┐
                          │  Ollama  (native, or OpenAI)  │
                          │  • nomic-embed-text           │
                          │  • llama3.1:8b                │
                          │  runs on host, not in Docker  │
                          └──────────────────────────────┘
```

### Why two backends?

The Next.js BFF owns the relational data (Prisma → PostgreSQL) and generates TypeScript types directly from the schema. FastAPI owns the AI workload — Python's ecosystem (LangChain, pdfplumber, faster-whisper, pgvector) is significantly richer for document processing and embedding than any Node.js equivalent. The two talk over HTTP with a shared secret, keeping concerns cleanly separated.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 App Router + React 19 | File-based routing, server components, built-in BFF |
| Server state | TanStack Query v5 | Optimistic updates, background refetch for processing status |
| Styling | Tailwind CSS v4 | CSS-variable theming via `@theme inline`, zero runtime |
| API (BFF) | Next.js Route Handlers | Co-located with frontend, Prisma types flow directly to client |
| API (AI) | FastAPI + uvicorn | Async, fast, excellent for Python AI libraries |
| ORM (relational) | Prisma | Type-safe queries, auto-generated TypeScript client |
| ORM (vectors) | SQLAlchemy + pgvector | `ChunkModel.embedding.cosine_distance()` — clean ORM-level vector ops |
| Database | PostgreSQL 16 + pgvector | Single DB for both relational data and HNSW vector index |
| AI orchestration | LangChain | Provider-agnostic — swap Ollama ↔ OpenAI via `AI_PROVIDER` env var |
| Embeddings | nomic-embed-text (768d) | Free, local, quality on-par with `text-embedding-ada-002` |
| LLM | llama3.1:8b / GPT-4o | Same prompt interface, different backends |
| Doc processing | pdfplumber, python-docx, faster-whisper | PDF, DOCX, TXT, CSV, images (OCR), video (transcription) |
| Testing (unit) | Vitest + MSW | Fast, browser-compatible, mocks at the fetch layer |
| Testing (E2E) | Playwright | Cross-browser, `page.route()` mocks for deterministic CI runs |
| Monorepo | pnpm workspaces + Turborepo | Shared `@sage/types` (Zod schemas) between BFF and frontend |

---

## Key Design Decisions

**Single source of truth for types** — `packages/types` contains Zod schemas that are the authority for both runtime validation (TypeScript) and are mirrored as Pydantic schemas in FastAPI. No drift between frontend and backend contracts.

**`ApiResult<TPayload, TFailure>` discriminated union** — every API call returns `{ success: true; data: T } | { success: false; error: E }`. No try/catch spaghetti; TypeScript enforces exhaustive error handling at the call site.

**Dual-ORM architecture** — Prisma manages all application tables and generates TypeScript types. SQLAlchemy manages only the `chunks` table (pgvector operations require the Python pgvector library). Alembic handles the chunks migration; Prisma handles everything else.

**Provider-agnostic AI layer** — setting `AI_PROVIDER=openai` swaps the entire embedding + chat stack to OpenAI with no code changes. The same LangChain interface (`aembed_documents`, `ainvoke`) works for both.

**Background ingestion (202 Accepted)** — document ingestion is kicked off as a FastAPI `BackgroundTask` after the BFF creates the document row. The client polls for status. This keeps the upload response fast regardless of document size.

**Source attribution without a JOIN** — chunk metadata stores `{"filename": filename}` at ingestion time, so vector search results carry source information without an additional database round-trip.

---

## Quick Start (Docker)

Prerequisites:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x
- [Ollama](https://ollama.com) running natively on your machine (see note below)

> **Why native Ollama?** Running Ollama inside Docker adds significant overhead — model inference is noticeably slower because Docker on macOS runs in a Linux VM without direct access to Apple Silicon (Metal/ANE). Running Ollama natively gives you full GPU/Metal acceleration and far better response times.

### 1 — Install and start Ollama

**macOS (recommended):**
```bash
brew install ollama
ollama serve   # keep this running in a terminal tab
```

Or download the [Ollama desktop app](https://ollama.com/download) which starts automatically on login.

**Pull the required models** (one-time, ~5 GB total):
```bash
ollama pull llama3.1:8b        # ~4.7 GB — chat model
ollama pull nomic-embed-text   # ~274 MB — embedding model
```

### 2 — Start the rest of the stack

```bash
git clone https://github.com/your-username/sage.git
cd sage

# Starts Postgres, FastAPI, and Next.js — Ollama runs on your host
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) once all services are healthy.

---

## Local Development

### Prerequisites

- Node.js ≥ 22 + pnpm ≥ 9
- Python ≥ 3.12 + [uv](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com) running natively — `brew install ollama && ollama serve`
- PostgreSQL 16 with the pgvector extension

### 1 — Ollama + Database

```bash
# Pull required models (one-time)
ollama pull nomic-embed-text
ollama pull llama3.1:8b

# Start Postgres + pgvector (or use your own instance)
docker compose -f infra/docker-compose.yml up -d
```

### 2 — Environment

```bash
# Next.js BFF
cp .env.example .env

# FastAPI service
cp apps/api/.env.example apps/api/.env
```

### 3 — Install dependencies

```bash
pnpm install
```

### 4 — Run database migrations

```bash
# Prisma migrations (knowledge_bases, documents, sessions, messages)
pnpm --filter @sage/db exec prisma migrate dev

# Alembic migration (chunks table + HNSW vector index)
cd apps/api && uv run alembic upgrade head
```

### 5 — Start dev servers

```bash
# Terminal 1 — FastAPI
cd apps/api && uv run uvicorn app.main:app --reload

# Terminal 2 — Next.js + BFF
pnpm --filter @sage/web dev
```

Open [http://localhost:3000](http://localhost:3000).

### Using OpenAI instead of Ollama

In `apps/api/.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

No other changes needed.

---

## Running Tests

```bash
# Unit tests (Vitest + MSW)
pnpm --filter @sage/web test

# FastAPI tests (pytest)
cd apps/api && uv run pytest

# E2E tests (Playwright — requires dev server running)
pnpm --filter @sage/web test:e2e

# E2E with Playwright UI
pnpm --filter @sage/web test:e2e:ui
```

---

## Project Structure

```
sage/
├── apps/
│   ├── api/                      # FastAPI RAG service
│   │   ├── app/
│   │   │   ├── core/             # Exceptions, prompts, logging
│   │   │   ├── models/           # SQLAlchemy models (chunks)
│   │   │   ├── repositories/     # DB access layer
│   │   │   ├── routers/          # HTTP handlers (documents, chat, health)
│   │   │   ├── schemas/          # Pydantic request/response schemas
│   │   │   └── services/
│   │   │       ├── ingestion/    # extract → chunk → embed pipeline
│   │   │       └── chat_service  # embed → retrieve → LLM pipeline
│   │   └── tests/
│   └── web/                      # Next.js BFF + React frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (dashboard)/  # KB list, KB detail, chat sessions
│       │   │   └── api/          # BFF route handlers
│       │   ├── components/
│       │   │   ├── chat/         # MessageBubble, ChatInput, NewSessionDialog
│       │   │   ├── knowledge-base/ # KbCard, DocumentList, DocumentUploader
│       │   │   ├── layout/       # Sidebar
│       │   │   └── ui/           # Button, Input, Badge, Dialog, Spinner…
│       │   └── lib/api/          # Typed fetch wrappers (ApiResult pattern)
│       └── playwright/           # E2E tests + page objects
├── packages/
│   ├── types/                    # Zod schemas shared by BFF and frontend
│   └── db/                       # Prisma schema + generated client
├── infra/
│   └── docker-compose.yml        # Dev infrastructure (Postgres + pgvector)
└── docker-compose.yml            # Full stack (Postgres + FastAPI + Next.js; Ollama runs natively)
```

---

## Supported File Types

| Category | Formats | Processor |
|---|---|---|
| Documents | PDF, DOCX, DOC, TXT, MD | pdfplumber, python-docx |
| Spreadsheets | XLSX, XLS, CSV | pandas |
| Images | JPG, PNG, GIF, WEBP | Ollama vision model (OCR) |
| Video | MP4, MOV, AVI, MKV | faster-whisper (audio track) |

Max upload size: 500 MB per file.

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `develop` | Active development — push all changes here first |
| `main` | Production — Coolify auto-deploys on every push |

**Workflow:**
1. Do all work on `develop` (or feature branches off it)
2. Test locally
3. Open a PR from `develop` → `main` (or merge directly)
4. Coolify detects the push to `main` and redeploys automatically

---

## Server Deployment (Hetzner + Coolify)

This section documents how to deploy Sage on a self-hosted VPS using [Hetzner](https://hetzner.com) and [Coolify](https://coolify.io).

### Recommended server spec

[Hetzner CPX32](https://www.hetzner.com/cloud) — 4 vCPU, 8 GB RAM, 160 GB disk (~€13/month). Enough headroom for Postgres, FastAPI, Next.js, and a concurrency-limited OCR pipeline while leaving cores free for Ollama inference.

### 1 — Provision the server

1. Create a Hetzner Cloud account, add a project, create a CPX32 (or larger) instance running **Ubuntu 24.04**.
2. Add your SSH public key during setup.
3. SSH in: `ssh root@<server-ip>`

### 2 — Install Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 3 — Install Ollama natively (not in Docker)

Running Ollama natively gives full CPU/Metal performance; Docker on Linux VMs adds overhead.

```bash
curl -fsSL https://ollama.com/install.sh | sh
systemctl enable --now ollama
```

**Make Ollama listen on all interfaces** (required so Docker containers can reach it via `host.docker.internal`):

```bash
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
EOF
systemctl daemon-reload
systemctl restart ollama
```

**Allow Docker subnet through UFW** (Docker containers are on `172.17.0.0/16`):

```bash
ufw allow from 172.17.0.0/16 to any port 11434
ufw enable   # if not already enabled
```

**Pull the required models:**

```bash
ollama pull nomic-embed-text   # ~274 MB — embedding model
ollama pull llama3.2:3b        # ~2 GB — chat model (or llama3.1:8b for better quality)
```

### 4 — Install Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Coolify runs on port `8000`. Open `http://<server-ip>:8000` in your browser, register, and complete the setup wizard.

> **Port note:** Coolify itself occupies port 8000 and its Traefik proxy occupies port 8080. The `docker-compose.yml` does **not** expose any port for the FastAPI service — the web container reaches it via the internal Docker network (`http://api:8000`).

### 5 — Connect your GitHub repository

1. In Coolify: **Sources → GitHub App → Install** — authorize access to your Sage repo.
2. Create a new **Resource → Docker Compose** service.
3. Set the repository to your fork/clone of this repo.
4. Set the branch to **`main`**.
5. Set **Docker Compose Location** to `/docker-compose.yml` (note: `.yml`, not `.yaml`).

### 6 — Set environment variables in Coolify

In the Coolify service **Environment Variables** tab, add:

| Variable | Value |
|---|---|
| `POSTGRES_USER` | `sage` |
| `POSTGRES_PASSWORD` | (strong random password) |
| `POSTGRES_DB` | `sage` |
| `INTERNAL_SECRET` | (strong random value — at least 32 chars) |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` |
| `OLLAMA_CHAT_MODEL` | `llama3.2:3b` |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` |
| `CORS_ORIGINS` | `["http://<server-ip>:3000"]` or your domain |

> **`INTERNAL_SECRET`**: Pydantic validates this in production and rejects the placeholder default `dev-secret-change-in-prod`. Generate a secure value: `openssl rand -hex 32`.

### 7 — Deploy

Click **Deploy** in Coolify. The first deploy takes 5-10 minutes (Docker image builds). Subsequent deploys are faster (layer caching).

Open `http://<server-ip>:3000` once all containers are healthy.

---

## Production Debugging Guide

A log of every deployment error encountered when first deploying to Hetzner + Coolify, and how each was fixed.

### Docker Compose file not found at `/docker-compose.yaml`

**Cause:** Coolify defaults to the `.yaml` extension but this repo uses `.yml`.

**Fix:** In the Coolify service settings, change **Docker Compose Location** to `/docker-compose.yml`.

---

### Database container unhealthy — `init.sql` bind mount fails

**Cause:** The original `docker-compose.yml` mounted `./infra/init.sql` into the db container. Coolify runs compose inside a build container where local paths don't exist.

**Fix:** Remove the bind mount entirely. The `migrate-api` service already runs Alembic migration `001` which executes `CREATE EXTENSION IF NOT EXISTS vector`, so no manual SQL init is needed.

---

### Port `8000` already allocated

**Cause:** Coolify itself runs on port 8000. The original `docker-compose.yml` tried to bind `8000:8000` for the FastAPI service.

**Fix:** Remove all `ports:` from the `api` service. The `web` container reaches it via the internal Docker network on `http://api:8000`.

---

### Port `8080` already allocated

**Cause:** Coolify's Traefik reverse proxy occupies port 8080.

**Fix:** Same as above — no port bindings needed for the api service.

---

### `API_INTERNAL_SECRET` validation error at startup

**Cause:** Pydantic rejects the default value `dev-secret-change-in-prod` when `ENVIRONMENT=production`.

**Fix:** Set `INTERNAL_SECRET` to a strong random value (≥32 chars) in Coolify's Environment Variables tab.

Generate one: `openssl rand -hex 32`

---

### API healthcheck timing out

**Cause:** The HTTP-based healthcheck called the `/health` endpoint, which in turn pinged Ollama with a 5-second timeout — creating a race condition where Docker's healthcheck timeout fired before Ollama responded.

**Fix:** Replace the HTTP healthcheck with a lightweight TCP port check:

```yaml
healthcheck:
  test: ["CMD-SHELL", "python3 -c 'import socket; s=socket.create_connection((\"localhost\",8000),10); s.close()'"]
  interval: 15s
  timeout: 15s
  retries: 5
  start_period: 60s
```

---

### `ctranslate2` model download fails at container startup (no internet in container)

**Cause:** Using `uv run uvicorn ...` in the Docker CMD caused uv to attempt package management at startup, triggering a network download that fails because Coolify containers have no outbound internet access by default.

**Fix:** Pre-install all packages at **build time** and invoke uvicorn directly:

```dockerfile
# Install deps at build time (not runtime)
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

COPY . .
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Ollama unreachable from Docker containers (`connection refused` / `connection timeout`)

**Cause (1):** Ollama defaults to `127.0.0.1:11434`, which is only reachable from the host, not from Docker containers.

**Fix:** Configure Ollama to listen on all interfaces via systemd override (see [Step 3](#3--install-ollama-natively-not-in-docker) above).

**Cause (2):** UFW was blocking connections from Docker's subnet (`172.17.0.0/16`) to the host's port 11434.

**Fix:**

```bash
ufw allow from 172.17.0.0/16 to any port 11434
```

**Verify connectivity from inside a running container:**

```bash
# Find any running container name/id
docker ps

# Test Ollama is reachable
docker exec <container-name> python3 -c "
import urllib.request
r = urllib.request.urlopen('http://host.docker.internal:11434/api/tags', timeout=5)
print(r.read()[:200])
"
```

---

### OCR taking 1+ hour (CPU thrashing on all pages in parallel)

**Cause:** All PDF pages were submitted for OCR in parallel, pinning all CPU cores at 350%+ and causing severe throughput degradation due to context switching.

**Fix:** Cap concurrent OCR workers with `asyncio.Semaphore(3)`:

```python
_sem = asyncio.Semaphore(3)

async def _ocr_image(img, idx):
    async with _sem:
        text = await asyncio.to_thread(_run_ocr, img)
    return ExtractedPage(text=text, page_number=idx)
```

Also replaced `pytesseract` (requires `tesseract-ocr` system package, slow) with `rapidocr-onnxruntime` (pure Python ONNX, 2-4x faster on CPU, no system deps).

---

### General debugging commands

```bash
# View all container statuses
docker ps -a

# Tail logs for a specific service
docker logs sage-api-1 -f --tail=100

# Check which ports are in use on the host
ss -tlnp

# Test a port from inside a container
docker exec sage-web-1 python3 -c "
import socket; s = socket.create_connection(('api', 8000), 5); print('OK'); s.close()
"

# Inspect container network / hosts file
docker exec sage-api-1 cat /etc/hosts
docker exec sage-api-1 ip route
```
