"""
Knowledge Matcher Engine
Problem Statement: SIH26155 (NTRO)

Evaluates unparsed configuration syntax against approved Training Mappings in prioritized order:
1. Exact approved pattern match (Confidence: 1.00)
2. Normalized generalized pattern match (Confidence: 0.95)
3. Prefix/keyword matching (Confidence: 0.85)
"""
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel
from app.models.training import TrainingMapping
from app.services.training.allowlist import validate_and_cast_property_value


class MatchedMappingResult(BaseModel):
    mapping_id: str
    vendor: str
    property_path: str
    property_value: Any
    category: str
    semantic_meaning: str
    confidence: float
    matched_pattern: str
    pattern_type: str  # "exact", "normalized_pattern", "prefix"


class KnowledgeMatcher:
    """Matches unknown configuration directives against human-approved training mappings."""

    @staticmethod
    def _compile_pattern_regex(pattern: str) -> re.Pattern:
        """Converts generalized pattern with placeholders (e.g. <user>, <ip>, <val>) to regex."""
        # Replace <placeholder> before or after escape
        pattern_with_token = re.sub(r"<[a-zA-Z0-9_-]+>", "___PARAM_TOKEN___", pattern)
        escaped = re.escape(pattern_with_token)
        regex_str = escaped.replace("___PARAM_TOKEN___", r"(\S+)")
        return re.compile(f"^{regex_str}$", re.IGNORECASE)

    @classmethod
    def match_command(
        cls,
        command_line: str,
        vendor: str,
        platform: Optional[str] = None,
        approved_mappings: Optional[List[TrainingMapping]] = None,
    ) -> Optional[MatchedMappingResult]:
        """
        Attempts to match command_line against a list of approved TrainingMappings.
        Returns MatchedMappingResult if a match is found.
        """
        if not approved_mappings or not command_line.strip():
            return None

        clean_cmd = command_line.strip()
        cmd_lower = clean_cmd.lower()
        vendor_lower = vendor.lower().strip()

        # Filter mappings for this vendor (or generic)
        vendor_mappings = [
            m
            for m in approved_mappings
            if m.status == "APPROVED" and (m.vendor.lower() == vendor_lower or m.vendor.lower() == "generic")
        ]

        # Stage 1: Exact Pattern Match (Confidence: 1.00)
        for m in vendor_mappings:
            if m.raw_pattern.strip().lower() == cmd_lower:
                parsed_val = json.loads(m.candidate_value) if m.candidate_value else True
                is_valid, _, cast_val = validate_and_cast_property_value(m.candidate_property, parsed_val)
                if is_valid:
                    return MatchedMappingResult(
                        mapping_id=m.id,
                        vendor=m.vendor,
                        property_path=m.candidate_property,
                        property_value=cast_val,
                        category=m.category,
                        semantic_meaning=m.semantic_meaning,
                        confidence=1.0,
                        matched_pattern=m.raw_pattern,
                        pattern_type="exact",
                    )

        # Stage 2: Normalized Pattern Match (e.g. <user> or <val> placeholders) (Confidence: 0.95)
        for m in vendor_mappings:
            if m.normalized_pattern and "<" in m.normalized_pattern:
                regex = cls._compile_pattern_regex(m.normalized_pattern.strip())
                if regex.match(clean_cmd):
                    parsed_val = json.loads(m.candidate_value) if m.candidate_value else True
                    is_valid, _, cast_val = validate_and_cast_property_value(m.candidate_property, parsed_val)
                    if is_valid:
                        return MatchedMappingResult(
                            mapping_id=m.id,
                            vendor=m.vendor,
                            property_path=m.candidate_property,
                            property_value=cast_val,
                            category=m.category,
                            semantic_meaning=m.semantic_meaning,
                            confidence=0.95,
                            matched_pattern=m.normalized_pattern,
                            pattern_type="normalized_pattern",
                        )

        return None


def apply_learned_fact_to_profile(
    profile: Any,
    match: MatchedMappingResult,
    raw_text: str,
    line_number: int,
) -> bool:
    """Attaches a learned SecurityFact to the appropriate category on NormalizedSecurityProfile."""
    try:
        category, field_name = match.property_path.split(".", 1)
        submodel = getattr(profile, category, None)
        if submodel is not None and hasattr(submodel, field_name):
            from app.services.parser.models import SecurityFact

            fact = SecurityFact.create(
                value=match.property_value,
                evidence=[raw_text.strip()],
                source_lines=[line_number] if line_number else [],
                confidence=match.confidence,
                status="extracted",
            )
            fact.method = "learned_mapping"
            setattr(submodel, field_name, fact)
            return True
    except Exception:
        pass
    return False


def enrich_profile_with_learned_mappings(
    profile: Any,
    approved_mappings: Optional[List[Any]] = None,
) -> Any:
    """Evaluates unknown_items on a profile against approved mappings, resolving matched items."""
    if not approved_mappings or not getattr(profile, "unknown_items", None):
        return profile

    remaining_unknowns = []
    for item in profile.unknown_items:
        match = KnowledgeMatcher.match_command(
            command_line=item.raw_text,
            vendor=getattr(profile, "vendor", "generic"),
            platform=getattr(profile, "platform", None),
            approved_mappings=approved_mappings,
        )
        if match:
            applied = apply_learned_fact_to_profile(
                profile=profile,
                match=match,
                raw_text=item.raw_text,
                line_number=item.line_number or 1,
            )
            if applied:
                profile.facts_extracted_count += 1
                continue
        remaining_unknowns.append(item)

    profile.unknown_items = remaining_unknowns
    profile.unknown_items_count = len(remaining_unknowns)
    return profile
