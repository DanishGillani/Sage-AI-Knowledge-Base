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
                          │  Ollama  (or OpenAI)          │
                          │  • nomic-embed-text           │
                          │  • llama3.1:8b                │
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

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 4.x

```bash
git clone https://github.com/your-username/sage.git
cd sage

# Start the full stack (Postgres, Ollama, FastAPI, Next.js)
docker compose up
```

> **First run:** Ollama will pull `llama3.1:8b` (~4.7 GB) and `nomic-embed-text` (~274 MB). This takes a few minutes. Watch progress with `docker compose logs -f ollama`.

Open [http://localhost:3000](http://localhost:3000) once all services are healthy.

---

## Local Development

### Prerequisites

- Node.js ≥ 22 + pnpm ≥ 9
- Python ≥ 3.12 + [uv](https://docs.astral.sh/uv/)
- [Ollama](https://ollama.com) (or an OpenAI API key)
- PostgreSQL 16 with the pgvector extension

### 1 — Database

```bash
# Start Postgres + pgvector (or use your own instance)
docker compose -f infra/docker-compose.yml up -d

# Pull required Ollama models
ollama pull nomic-embed-text
ollama pull llama3.1:8b
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
└── docker-compose.yml            # Full stack for reviewers
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
