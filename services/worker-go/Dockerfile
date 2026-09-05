# Multi-stage Dockerfile for NetVigil Go Worker Service

# Stage 1: Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git and ca-certificates if needed
RUN apk add --no-cache ca-certificates tzdata

# Copy dependency files
COPY go.mod ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/bin/worker \
    ./cmd/worker/main.go

# Stage 2: Minimal runtime stage
FROM alpine:3.19

WORKDIR /app

# Create unprivileged non-root user
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Copy CA certs and zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy compiled binary
COPY --from=builder /app/bin/worker /app/worker

# Use unprivileged user
USER appuser:appgroup

# Environment defaults
ENV PORT=8081 \
    WORKER_PORT=8081 \
    WORKER_HOST=0.0.0.0 \
    WORKER_ENV=production \
    WORKER_LOG_LEVEL=INFO

EXPOSE 8081

# Lightweight healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8081/health || exit 1

# Run worker
ENTRYPOINT ["/app/worker"]
