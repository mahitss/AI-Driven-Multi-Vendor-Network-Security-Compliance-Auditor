# ADR-001: Modular Monolith Architecture for MVP

## Status
**ACCEPTED**

## Context
NetVigil is designed for **SIH26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor** (NTRO). The platform encompasses configuration ingestion, parsing, multi-framework compliance analysis, AI intelligence, adaptive training, risk scoring, and remediation.

Distributing these components across multiple microservices (with gRPC/RabbitMQ communication) would introduce unnecessary operational overhead, distributed transaction failures, network latency, and deployment complexity during competition evaluation and on-premise government agency deployment.

## Decision
We implement NetVigil as a **clean, domain-separated Modular Monolith**:
- **Backend**: FastAPI with async SQLAlchemy, organized into explicit service domains (`ingestion`, `parser`, `compliance`, `ai`, `training`, `risk`, `remediation`, `reporting`).
- **Frontend**: Next.js 15 App Router with TanStack Query and dark-first SOC UI.
- **Database**: PostgreSQL (production) with full SQLite async compatibility (local demo/air-gapped evaluation).

## Consequences
- **Positive**: Single-command startup (`seed_demo.py` & `docker compose up`), sub-second audit response times, atomic database transactions, zero network serialization lag.
- **Negative**: Scaled as a single deployment unit rather than independent microservices (mitigated by stateless API workers behind a load balancer).
