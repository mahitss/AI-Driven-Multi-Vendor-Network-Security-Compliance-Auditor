import pytest
from app.schemas.ai import CopilotChatResponse
from app.services.ai.fallback.offline_provider import OfflineStandbyProvider
from app.services.ai.schemas.models import AITaskType

SAMPLE_FINDINGS = [
    {
        "id": "f-1",
        "control_id": "CIS-1.1.1",
        "framework": "CIS",
        "title": "Ensure AAA is enabled",
        "status": "FAIL",
        "severity": "CRITICAL",
        "source_line": 12,
        "evidence": "no aaa new-model",
        "actual_value": "no aaa new-model",
        "expected_value": "aaa new-model",
        "description": "Authentication, Authorization, and Accounting must be active.",
    },
    {
        "id": "f-2",
        "control_id": "CIS-1.2.1",
        "framework": "CIS",
        "title": "Ensure Telnet service is disabled",
        "status": "FAIL",
        "severity": "HIGH",
        "source_line": 42,
        "evidence": "transport input telnet ssh",
        "actual_value": "telnet enabled",
        "expected_value": "transport input ssh",
        "description": "Plaintext remote management must be disabled.",
    },
    {
        "id": "f-3",
        "control_id": "CIS-2.1.1",
        "framework": "CIS",
        "title": "Ensure password encryption service is enabled",
        "status": "PASS",
        "severity": "MEDIUM",
        "source_line": 5,
        "evidence": "service password-encryption",
        "actual_value": "service password-encryption",
        "expected_value": "service password-encryption",
        "description": "Global reversible password protection.",
    },
]

SAMPLE_CONTEXT = {
    "audit_id": "audit-test-1234",
    "device_hostname": "CORE-RTR-01",
    "vendor": "cisco",
    "compliance_score": 41.7,
    "risk_score": 63.6,
    "priority_counts": {"P0": 1, "P1": 1, "P2": 0, "P3": 0},
    "findings": SAMPLE_FINDINGS,
    "evolution_deltas": {
        "deltas": {
            "before_score": 41.7,
            "after_score": 83.3,
            "score_delta": 41.6,
            "risk_delta": -35.2,
            "resolved_count": 2,
            "regressed_count": 0,
        },
        "transitions": [
            {"control_id": "CIS-1.1.1", "transition_type": "RESOLVED"},
            {"control_id": "CIS-1.2.1", "transition_type": "RESOLVED"},
        ],
    },
}

@pytest.mark.asyncio
async def test_copilot_distinct_answers_across_different_questions():
    """Verify that different analyst queries produce completely different, question-specific answers."""
    queries = [
        "Why is this audit high risk?",
        "Show me the most critical finding.",
        "Why did CIS-1.2.1 fail?",
        "What changed after remediation?",
        "Which controls remain unresolved?",
        "How do I fix these findings?",
    ]

    responses = {}
    for q in queries:
        ctx = dict(SAMPLE_CONTEXT)
        ctx["query"] = q
        resp = await OfflineStandbyProvider.generate_fallback_response(
            task_type=AITaskType.ANALYST_COPILOT,
            user_prompt=q,
            response_schema=CopilotChatResponse,
            context_data=ctx,
        )
        assert isinstance(resp, CopilotChatResponse)
        assert len(resp.answer) > 20
        responses[q] = resp.answer

    # Verify all answers are distinct
    unique_answers = set(responses.values())
    assert len(unique_answers) == len(queries), (
        f"Expected {len(queries)} distinct answers, but got only {len(unique_answers)} unique answers!"
    )

@pytest.mark.asyncio
async def test_copilot_control_specific_evidence():
    """Verify specific control query grounds strictly in that control's evidence line."""
    ctx = dict(SAMPLE_CONTEXT)
    ctx["query"] = "Why did CIS-1.2.1 fail?"
    resp = await OfflineStandbyProvider.generate_fallback_response(
        task_type=AITaskType.ANALYST_COPILOT,
        user_prompt="Why did CIS-1.2.1 fail?",
        response_schema=CopilotChatResponse,
        context_data=ctx,
    )
    assert "CIS-1.2.1" in resp.answer
    assert "transport input telnet ssh" in resp.answer
    assert "LINE 42" in resp.answer
    assert len(resp.grounded_evidence) == 1
    assert resp.grounded_evidence[0].control_id == "CIS-1.2.1"
    assert resp.grounded_evidence[0].line_number == 42

@pytest.mark.asyncio
async def test_copilot_critical_finding_grounding():
    """Verify critical finding query identifies CIS-1.1.1 P0."""
    ctx = dict(SAMPLE_CONTEXT)
    ctx["query"] = "Show me the most critical finding."
    resp = await OfflineStandbyProvider.generate_fallback_response(
        task_type=AITaskType.ANALYST_COPILOT,
        user_prompt="Show me the most critical finding.",
        response_schema=CopilotChatResponse,
        context_data=ctx,
    )
    assert "CIS-1.1.1" in resp.answer
    assert "CRITICAL / P0" in resp.answer
    assert "LINE 12" in resp.answer
    assert any(c.control_id == "CIS-1.1.1" for c in resp.grounded_evidence)

@pytest.mark.asyncio
async def test_copilot_evolution_time_machine_delta():
    """Verify evolution query details score delta +41.6% and resolved controls."""
    ctx = dict(SAMPLE_CONTEXT)
    ctx["query"] = "What changed after remediation?"
    resp = await OfflineStandbyProvider.generate_fallback_response(
        task_type=AITaskType.ANALYST_COPILOT,
        user_prompt="What changed after remediation?",
        response_schema=CopilotChatResponse,
        context_data=ctx,
    )
    assert "+41.6" in resp.answer
    assert "CIS-1.1.1" in resp.answer
    assert "CIS-1.2.1" in resp.answer
    assert "AST simulation" in resp.answer

@pytest.mark.asyncio
async def test_copilot_unresolved_controls():
    """Verify unresolved query lists both failed controls."""
    ctx = dict(SAMPLE_CONTEXT)
    ctx["query"] = "Which controls remain unresolved?"
    resp = await OfflineStandbyProvider.generate_fallback_response(
        task_type=AITaskType.ANALYST_COPILOT,
        user_prompt="Which controls remain unresolved?",
        response_schema=CopilotChatResponse,
        context_data=ctx,
    )
    assert "2 non-compliant (FAIL)" in resp.answer
    assert "CIS-1.1.1" in resp.answer
    assert "CIS-1.2.1" in resp.answer
