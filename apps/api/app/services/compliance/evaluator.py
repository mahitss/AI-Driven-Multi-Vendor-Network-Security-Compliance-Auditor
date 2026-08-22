"""
Deterministic Rule Evaluator
Problem Statement: SIH26155 (NTRO)

Evaluates compliance rules against the canonical Universal Security Model.
Calculates PASS / FAIL / PARTIAL / NOT_APPLICABLE / UNKNOWN with complete line evidence.
"""
from typing import Any, List, Optional, Tuple
from app.services.compliance.models import (
    ComplianceRule,
    EvaluationStatus,
    RuleEvaluationResult,
)
from app.services.parser.models import NormalizedSecurityProfile, SecurityFact


class RuleEvaluator:
    """Deterministic rule evaluation engine."""

    @staticmethod
    def _resolve_fact(profile: NormalizedSecurityProfile, fact_path: str) -> Tuple[Any, Optional[SecurityFact]]:
        """
        Navigates dot-notation path on NormalizedSecurityProfile.
        Returns (extracted_value, underlying_security_fact_container).
        """
        parts = fact_path.split(".")
        current: Any = profile

        fact_container: Optional[SecurityFact] = None

        for part in parts:
            if current is None:
                return None, None

            if isinstance(current, SecurityFact):
                fact_container = current
                if part == "value":
                    current = current.value
                    continue

            if hasattr(current, part):
                current = getattr(current, part)
                if isinstance(current, SecurityFact):
                    fact_container = current
            elif isinstance(current, dict) and part in current:
                current = current[part]
                if isinstance(current, dict) and "value" in current:
                    try:
                        fact_container = SecurityFact.model_validate(current)
                    except Exception:
                        pass
            else:
                return None, None

        if isinstance(current, SecurityFact):
            fact_container = current
            current = current.value

        return current, fact_container

    @classmethod
    def evaluate_rule(
        cls,
        rule: ComplianceRule,
        profile: NormalizedSecurityProfile,
        framework: str,
    ) -> RuleEvaluationResult:
        """
        Evaluates a single compliance rule against a NormalizedSecurityProfile for a given framework.
        """
        fw_upper = framework.upper()
        mapping = rule.framework_mappings.get(fw_upper)

        control_id = mapping.control_id if mapping else rule.id
        title = mapping.title if mapping else rule.title
        source_dict = mapping.model_dump() if mapping else {"framework": framework, "verified": False}

        actual_val, fact_container = cls._resolve_fact(profile, rule.fact_path)

        evidence: List[str] = fact_container.evidence if fact_container else []
        source_lines: List[int] = fact_container.source_lines if fact_container else []
        confidence: float = fact_container.confidence if fact_container else 1.0

        # If fact container explicitly marks status as unknown or fact was completely unresolved
        if fact_container and fact_container.status == "unknown":
            status = EvaluationStatus.UNKNOWN
        elif actual_val is None:
            status = EvaluationStatus.UNKNOWN
        else:
            status = cls._evaluate_operator(actual_val, rule.operator, rule.expected_value)

        return RuleEvaluationResult(
            rule_id=rule.id,
            framework=fw_upper,
            control_id=control_id,
            title=title,
            category=rule.category,
            severity=rule.severity,
            status=status,
            actual_value=actual_val,
            expected_value=rule.expected_value,
            evidence=evidence,
            source_lines=source_lines,
            explanation=rule.explanation,
            remediation=f"Remediate via rule [{rule.remediation_key}]",
            source=source_dict,
            confidence=confidence,
        )

    @staticmethod
    def _evaluate_operator(actual: Any, operator: str, expected: Any) -> EvaluationStatus:
        """Evaluates comparison operator deterministically."""
        op = operator.lower().strip()

        try:
            if op == "equals":
                return EvaluationStatus.PASS if actual == expected else EvaluationStatus.FAIL
            elif op == "not_equals":
                return EvaluationStatus.PASS if actual != expected else EvaluationStatus.FAIL
            elif op in ["is_true", "true"]:
                return EvaluationStatus.PASS if bool(actual) is True else EvaluationStatus.FAIL
            elif op in ["is_false", "false"]:
                return EvaluationStatus.PASS if bool(actual) is False else EvaluationStatus.FAIL
            elif op == "contains":
                if isinstance(actual, (list, set, tuple, str)):
                    return EvaluationStatus.PASS if expected in actual else EvaluationStatus.FAIL
                return EvaluationStatus.FAIL
            elif op == "not_contains":
                if isinstance(actual, (list, set, tuple, str)):
                    return EvaluationStatus.PASS if expected not in actual else EvaluationStatus.FAIL
                return EvaluationStatus.FAIL
            elif op == "in":
                if isinstance(expected, (list, set, tuple)):
                    return EvaluationStatus.PASS if actual in expected else EvaluationStatus.FAIL
                return EvaluationStatus.FAIL
            elif op == "not_in":
                if isinstance(expected, (list, set, tuple)):
                    return EvaluationStatus.PASS if actual not in expected else EvaluationStatus.FAIL
                return EvaluationStatus.FAIL
            elif op == "greater_than":
                return EvaluationStatus.PASS if actual > expected else EvaluationStatus.FAIL
            elif op == "greater_than_or_equal":
                return EvaluationStatus.PASS if actual >= expected else EvaluationStatus.FAIL
            elif op == "less_than":
                return EvaluationStatus.PASS if actual < expected else EvaluationStatus.FAIL
            elif op == "less_than_or_equal":
                return EvaluationStatus.PASS if actual <= expected else EvaluationStatus.FAIL
            elif op == "exists":
                return EvaluationStatus.PASS if actual is not None else EvaluationStatus.FAIL
            elif op == "not_exists":
                return EvaluationStatus.PASS if actual is None else EvaluationStatus.FAIL
            else:
                # Default fallback comparison
                return EvaluationStatus.PASS if str(actual) == str(expected) else EvaluationStatus.FAIL
        except Exception:
            return EvaluationStatus.UNKNOWN
