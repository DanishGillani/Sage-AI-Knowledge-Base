# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

WORKDIR /app

# System deps for document processors and AI libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    # pdf2image (PDF → image OCR)
    poppler-utils \
    # opencv-python-headless
    libglib2.0-0 \
    libgl1 \
    # faster-whisper (audio/video transcription)
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install uv — fast Python package manager
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

# Install dependencies before copying source so Docker caches this layer
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

# Copy application source
COPY . .

EXPOSE 8000

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
