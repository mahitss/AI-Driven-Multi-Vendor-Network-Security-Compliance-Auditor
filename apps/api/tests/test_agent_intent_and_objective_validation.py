"""
Comprehensive Test Suite: Agent Intent Classification & Objective Validation Safety
Taskmaster Track — All Things Agentic Hackathon
Problem Statement: SIH26155 (NTRO)

Tests:
1. Random nonsense objective ("what is it acndjk...")
2. Empty objective
3. Information question ("What is CIS Level 1?")
4. Audit-only objective ("Audit these network configurations against CIS Level 1.")
5. Remediation objective ("Fix high-risk compliance violations.")
6. Audit + remediation objective ("Audit the network and fix high-risk issues.")
7. Ambiguous objective ("Secure my network.")
8. Objective containing explicit SSH constraint ("do not modify SSH")
9. Objective without SSH constraint
10. Invalid objective cannot create approval token
11. Invalid objective cannot create remediation patches
12. Invalid objective cannot modify configuration
13. Ambiguous objective cannot silently gain remediation authority
14. New objective -> new session -> objective validation -> correct state
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.base import Base
from app.db.seed import seed_database_if_empty
from app.services.agent.classifier import ObjectiveClassifier
from app.services.agent.models import AgentObjectiveRequest, AgentSessionState
from app.services.agent.orchestrator import AutonomousSecurityEngineer


# Unit Tests for ObjectiveClassifier
class TestObjectiveClassifier:
    """Deterministic intent and constraint classification unit tests."""

    def test_random_nonsense_objective(self):
        res = ObjectiveClassifier.classify_objective("what is it acndjk...")
        assert res.intent == "INVALID"
        assert res.is_valid is False
        assert res.remediation_authorized is False
        assert len(res.suggested_prompts) > 0

    def test_empty_objective(self):
        res = ObjectiveClassifier.classify_objective("   ")
        assert res.intent == "INVALID"
        assert res.is_valid is False
        assert res.remediation_authorized is False

    def test_keyboard_smash_gibberish(self):
        res = ObjectiveClassifier.classify_objective("asdfghjkl zxcvbnm")
        assert res.intent == "INVALID"
        assert res.is_valid is False
        assert res.remediation_authorized is False

    def test_information_question_cis(self):
        res = ObjectiveClassifier.classify_objective("What is CIS Level 1?")
        assert res.intent == "INFORMATION"
        assert res.is_valid is True
        assert res.remediation_authorized is False
        assert res.information_response is not None
        assert "CIS" in res.information_response

    def test_information_question_stig(self):
        res = ObjectiveClassifier.classify_objective("Explain DISA STIG compliance rules.")
        assert res.intent == "INFORMATION"
        assert res.is_valid is True
        assert res.remediation_authorized is False
        assert "STIG" in res.information_response

    def test_audit_only_objective(self):
        res = ObjectiveClassifier.classify_objective("Audit these network configurations against CIS Level 1.")
        assert res.intent == "AUDIT_ONLY"
        assert res.is_valid is True
        assert res.remediation_authorized is False

    def test_remediation_objective(self):
        res = ObjectiveClassifier.classify_objective("Fix high-risk compliance violations and disable cleartext Telnet.")
        assert res.intent in ["REMEDIATION", "AUDIT_AND_REMEDIATION"]
        assert res.is_valid is True
        assert res.remediation_authorized is True

    def test_audit_and_remediation_objective(self):
        res = ObjectiveClassifier.classify_objective(
            "Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
        )
        assert res.intent == "AUDIT_AND_REMEDIATION"
        assert res.is_valid is True
        assert res.remediation_authorized is True
        assert len(res.user_constraints) == 1
        assert res.user_constraints[0].subsystem == "ssh"
        assert res.user_constraints[0].action == "DO_NOT_MODIFY"

    def test_ambiguous_objective_withholds_remediation(self):
        res = ObjectiveClassifier.classify_objective("Secure my network.")
        assert res.intent == "AMBIGUOUS"
        assert res.is_valid is True
        # Critical Safety: Ambiguous prompt must NOT grant remediation authority!
        assert res.remediation_authorized is False

    def test_objective_without_ssh_constraint(self):
        res = ObjectiveClassifier.classify_objective("Audit the network and fix high-risk compliance issues.")
        assert res.intent == "AUDIT_AND_REMEDIATION"
        assert res.remediation_authorized is True
        assert len(res.user_constraints) == 0


# Orchestrator Integration Tests
@pytest.mark.asyncio
class TestOrchestratorIntentHandling:
    """Full lifecycle testing with SQLite in-memory test database."""

    @pytest.fixture
    async def test_db(self):
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_session() as session:
            await seed_database_if_empty(session)
            yield session
        await engine.dispose()

    async def test_invalid_objective_rejected_zero_side_effects(self, test_db):
        """Case 1: Nonsense objective -> INVALID_OBJECTIVE, 0 patches, 0 tokens, 0 side effects."""
        req = AgentObjectiveRequest(objective="what is it acndjk...")
        session = await AutonomousSecurityEngineer.start_autonomous_run(req, test_db)

        assert session.status == "INVALID_OBJECTIVE"
        assert session.intent == "INVALID"
        assert session.active_approval is None
        assert len(session.proposals) == 0
        assert len(session.discovered_configs) == 0
        assert session.final_report is None
        assert "couldn't determine a valid network security objective" in (session.error or "")

    async def test_information_query_zero_audit(self, test_db):
        """Case 4: Informational inquiry -> COMPLETED with guidance, zero audit/patches."""
        req = AgentObjectiveRequest(objective="What is CIS Level 1?")
        session = await AutonomousSecurityEngineer.start_autonomous_run(req, test_db)

        assert session.status == "COMPLETED"
        assert session.intent == "INFORMATION"
        assert session.active_approval is None
        assert len(session.proposals) == 0
        assert len(session.discovered_configs) == 0
        assert session.intent_explanation is not None

    async def test_audit_only_objective_lifecycle(self, test_db):
        """Case 2: Audit-only objective -> Discovers & audits fleet, 0 proposals, 0 approval token."""
        req = AgentObjectiveRequest(objective="Audit these network configurations against CIS Level 1.")
        session = await AutonomousSecurityEngineer.start_autonomous_run(req, test_db)

        assert session.status == "COMPLETED"
        assert session.intent == "AUDIT_ONLY"
        assert session.active_approval is None
        assert len(session.proposals) == 0
        assert len(session.discovered_configs) > 0
        assert session.final_report is not None
        assert session.final_report.remediations_applied == 0

    async def test_ambiguous_objective_withholds_remediation(self, test_db):
        """Case 5: Ambiguous objective -> Read-only assessment, zero remediation authority assumed."""
        req = AgentObjectiveRequest(objective="Secure my network.")
        session = await AutonomousSecurityEngineer.start_autonomous_run(req, test_db)

        assert session.status == "COMPLETED"
        assert session.intent == "AMBIGUOUS"
        assert session.active_approval is None
        assert len(session.proposals) == 0
        assert session.final_report is not None
        assert session.final_report.remediations_applied == 0
        assert "Remediation withheld" in session.final_report.overall_posture_delta

    async def test_golden_remediation_path_preserved(self, test_db):
        """Golden Path: Valid remediation objective -> WAITING_APPROVAL with SSH constraint enforced."""
        req = AgentObjectiveRequest(
            objective="Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH access."
        )
        session = await AutonomousSecurityEngineer.start_autonomous_run(req, test_db)

        assert session.status == "WAITING_APPROVAL"
        assert session.intent == "AUDIT_AND_REMEDIATION"
        assert session.active_approval is not None
        assert session.active_approval.approval_token.startswith("appr_tok_")
        assert len(session.proposals) > 0
        assert len(session.constraints) == 1
        assert session.constraints[0].subsystem == "ssh"

        # Verify no SSH commands in actionable proposals
        actionable = [p for p in session.proposals if not p.is_constrained]
        for p in actionable:
            assert "ip ssh" not in p.commands.lower()
            assert "crypto key" not in p.commands.lower()
