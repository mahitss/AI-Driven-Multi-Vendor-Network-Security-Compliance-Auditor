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

WORKDIR /app/apps/api
ENV PYTHONPATH=/app/apps/api

EXPOSE 8000 8080 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
