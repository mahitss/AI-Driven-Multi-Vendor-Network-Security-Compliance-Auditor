"""
Mock AI Provider (Deterministic, Offline & CI-Safe)
Problem Statement: SIH26155 (NTRO)

Provides high-fidelity deterministic responses strictly following requested Pydantic schemas.
Guarantees fast, reproducible unit/integration tests and offline air-gapped operation.
"""
import json
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel
from app.core.config import settings
from app.services.ai.base_provider import BaseAIProvider

T = TypeVar("T", bound=BaseModel)


class MockAIProvider(BaseAIProvider):
    """Deterministic Mock AI Provider for testing and keyless environments."""

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        if "Audit Co-Pilot" in system_prompt or "ACTIVE AUDIT SESSION DATA" in user_prompt:
            return "Based on the audit session data, the highest risk issues stem from unencrypted management access (SSHv1 and Telnet). Immediate remediation of VTY lines is recommended."
        elif "Finding Analyst" in system_prompt or "EVALUATED FINDING CONTEXT" in user_prompt:
            return "This finding violates the baseline standard because unencrypted cleartext management is active."
        return "NetVigil Mock AI Provider: Analysis complete."

    async def generate_structured(
        self,
        schema: Type[T],
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> T:
        schema_name = schema.__name__

        # 1. Finding Explanation Schema
        if "FindingExplanationResponse" in schema_name:
            mock_data = {
                "summary": "Administrative remote management violates security baseline requirements.",
                "why_it_matters": "Insecure management services expose credentials and administrative sessions to passive network eavesdropping and session hijacking.",
                "technical_explanation": "The device configuration permits cleartext or outdated protocol suites without enforcing strict transport encryption on management lines.",
                "risk_context": "Attackers on adjacent broadcast domains or intermediary routing hops can capture administrative credentials in transit.",
                "recommended_action": "Enforce SSH Version 2 with modern cipher suites and disable legacy cleartext services (Telnet/HTTP).",
                "confidence": 0.95,
                "evidence_used": ["Evaluated directly from configuration directives."],
                "source_lines": [],
                "disclaimer": "AI-assisted explanation grounded in verified audit evidence.",
            }
            return schema.model_validate(mock_data)

        # 2. Audit Assistant Schema
        elif "AuditAssistantQueryResponse" in schema_name:
            mock_data = {
                "query": "Audit Query",
                "audit_id": "audit-mock-id",
                "answer": (
                    "### Top Compliance Action Items:\n"
                    "1. **Enforce SSH Version 2** (`CIS-1.2.1` / `NIST-AC-17`): Eliminate weak cryptographic suites on management VTY lines.\n"
                    "2. **Deactivate Telnet Service** (`CIS-1.2.2` / `STIG-NET0410`): Prevent cleartext credentials from being transmitted over the wire.\n"
                    "3. **Enable Centralized Remote Logging** (`CIS-2.1.1` / `NIST-AU-2`): Ensure security event logs are offloaded to your central SIEM."
                ),
                "supporting_findings": ["CIS-1.2.1", "CIS-1.2.2", "CIS-2.1.1"],
                "confidence": 0.94,
                "sources_count": 3,
            }
            return schema.model_validate(mock_data)

        # 3. Unknown Configuration Interpretation Schema
        elif "UnknownConfigInterpretationResponse" in schema_name:
            mock_data = {
                "status": "candidate",
                "normalized_category": "remote_access",
                "semantic_meaning": "Configures administrative remote session parameters or timeout policy",
                "candidate_property": "inactivity_timeout_minutes",
                "candidate_value": 15,
                "confidence": 0.85,
                "reasoning_summary": "Command syntax matches known device virtual terminal management directives.",
                "evidence": ["Syntax inspected from raw configuration snippet."],
                "alternative_interpretations": ["authentication.timeout"],
                "confidence_tier": "review",
            }
            return schema.model_validate(mock_data)

        # Generic fallback
        return schema.model_validate({})

    async def check_health(self) -> Dict[str, Any]:
        return {
            "provider": "mock",
            "model": "mock-deterministic-v1",
            "status": "online",
            "has_api_key": False,
            "temperature": 0.0,
            "timeout_seconds": settings.AI_TIMEOUT_SECONDS,
        }
