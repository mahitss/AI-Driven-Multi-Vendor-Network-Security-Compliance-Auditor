"""
Knowledge Matcher Unit Tests
Problem Statement: SIH26155 (NTRO)
"""
from app.models.training import TrainingMapping
from app.services.training.matcher import KnowledgeMatcher


def test_knowledge_matcher_exact_and_pattern():
    # Setup mock mappings
    mapping_exact = TrainingMapping(
        id="m1",
        vendor="cisco",
        raw_pattern="weird-custom-service enable",
        candidate_property="services.finger_disabled",
        normalized_control="services.finger_disabled",
        candidate_value="true",
        category="services",
        semantic_meaning="Disables legacy service",
        confidence=1.0,
        status="APPROVED",
    )

    mapping_pattern = TrainingMapping(
        id="m2",
        vendor="juniper",
        raw_pattern="set system login idle-timeout 15",
        normalized_pattern="set system login idle-timeout <minutes>",
        candidate_property="remote_access.inactivity_timeout_minutes",
        normalized_control="remote_access.inactivity_timeout_minutes",
        candidate_value="15",
        category="remote_access",
        semantic_meaning="Configures idle timeout",
        confidence=0.95,
        status="APPROVED",
    )

    mappings = [mapping_exact, mapping_pattern]

    # Test Exact Match
    match1 = KnowledgeMatcher.match_command(
        command_line="weird-custom-service enable",
        vendor="cisco",
        approved_mappings=mappings,
    )
    assert match1 is not None
    assert match1.pattern_type == "exact"
    assert match1.property_path == "services.finger_disabled"
    assert match1.property_value is True

    # Test Normalized Pattern Match
    match2 = KnowledgeMatcher.match_command(
        command_line="set system login idle-timeout 20",
        vendor="juniper",
        approved_mappings=mappings,
    )
    assert match2 is not None
    assert match2.pattern_type == "normalized_pattern"
    assert match2.property_path == "remote_access.inactivity_timeout_minutes"

    # Test Non-matching Command
    match3 = KnowledgeMatcher.match_command(
        command_line="unknown unrecognized non matching string",
        vendor="cisco",
        approved_mappings=mappings,
    )
    assert match3 is None
