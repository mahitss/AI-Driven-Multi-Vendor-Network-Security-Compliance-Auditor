"""
Persistent Agent Memory & State Management
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)

Stores agent execution sessions, approval tokens, organizational policies,
and historical verification records. Supports Google Cloud Firestore with
resilient local persistence fallback.
"""
import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.core.logging import logger
from app.services.agent.models import AgentSessionState, FinalExecutiveReport


class AgentMemoryManager:
    """Manages persistent state across agent execution sessions."""

    _in_memory_store: Dict[str, AgentSessionState] = {}
    _policies_store: Dict[str, Any] = {
        "default_baseline": "CIS",
        "approval_required_for": ["CRITICAL", "HIGH"],
        "protected_subsystems": ["ssh"],
    }
    _firestore_client = None
    _use_firestore = False

    @classmethod
    def _init_firestore_if_available(cls):
        """Attempts to initialize Google Cloud Firestore client if environment is configured."""
        if cls._firestore_client is not None or not cls._use_firestore:
            return

        gcp_project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT")
        if gcp_project:
            try:
                from google.cloud import firestore
                cls._firestore_client = firestore.AsyncClient(project=gcp_project)
                logger.info(f"Google Cloud Firestore connected for GCP Project: {gcp_project}")
            except Exception as e:
                logger.warning(f"Firestore not available, utilizing local memory persistence: {e}")
                cls._firestore_client = None

    @classmethod
    async def save_session(cls, session: AgentSessionState) -> None:
        """Saves or updates an agent execution session."""
        session.updated_at = datetime.now(timezone.utc).isoformat()
        cls._in_memory_store[session.session_id] = session

        # Firestore Cloud Persistence
        if cls._firestore_client:
            try:
                doc_ref = cls._firestore_client.collection("netvigil_agent_sessions").document(session.session_id)
                await doc_ref.set(session.model_dump(mode="json"))
            except Exception as e:
                logger.warning(f"Failed to persist session to Firestore: {e}")

    @classmethod
    async def get_session(cls, session_id: str) -> Optional[AgentSessionState]:
        """Retrieves an agent session by ID."""
        if session_id in cls._in_memory_store:
            return cls._in_memory_store[session_id]

        if cls._firestore_client:
            try:
                doc_ref = cls._firestore_client.collection("netvigil_agent_sessions").document(session_id)
                doc = await doc_ref.get()
                if doc.exists:
                    data = doc.to_dict()
                    session = AgentSessionState.model_validate(data)
                    cls._in_memory_store[session_id] = session
                    return session
            except Exception as e:
                logger.warning(f"Failed to read session from Firestore: {e}")

        return None

    @classmethod
    async def list_recent_sessions(cls, limit: int = 10) -> List[AgentSessionState]:
        """Lists recent agent execution sessions."""
        sessions = list(cls._in_memory_store.values())
        sessions.sort(key=lambda s: s.created_at, reverse=True)
        return sessions[:limit]

    @classmethod
    async def save_report(cls, report: FinalExecutiveReport) -> None:
        """Persists a final executive report."""
        session = await cls.get_session(report.session_id)
        if session:
            session.final_report = report
            await cls.save_session(session)

    @classmethod
    def get_policies(cls) -> Dict[str, Any]:
        """Retrieves global agent security policies."""
        return cls._policies_store
