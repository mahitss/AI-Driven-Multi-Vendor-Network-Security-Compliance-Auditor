FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api /app/apps/api
COPY storage /app/storage
COPY data /app/data

RUN mkdir -p /app/storage/uploads

# Create non-root system user for security
RUN useradd -m -u 1001 netvigil && \
    chown -R netvigil:netvigil /app

USER netvigil

WORKDIR /app/apps/api
ENV PYTHONPATH=/app/apps/api \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

EXPOSE 10000 8000 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
