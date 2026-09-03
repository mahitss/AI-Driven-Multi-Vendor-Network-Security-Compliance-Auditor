"""
Compliance Scoring Engine
Problem Statement: SIH26155 (NTRO)

Transparent, reproducible compliance scoring methodology:
- NetVigil Compliance Score = PASS / (PASS + FAIL + UNKNOWN) * 100
- NOT_APPLICABLE controls are excluded from denominator
- UNKNOWN coverage is surfaced explicitly and penalizes posture
"""
from collections import defaultdict
from typing import Dict, List
from app.services.compliance.models import (
    AuditScoreSummary,
    EvaluationStatus,
    FrameworkScore,
    RuleEvaluationResult,
    SeverityLevel,
    SeverityStats,
)


class ComplianceScoringEngine:
    """Computes transparent, reproducible framework scores and posture summaries."""

    @classmethod
    def calculate_scores(
        cls,
        audit_id: str,
        configuration_id: str,
        results: List[RuleEvaluationResult],
    ) -> AuditScoreSummary:
        """
        Aggregates individual rule evaluation results into an AuditScoreSummary.
        """
        results_by_framework: Dict[str, List[RuleEvaluationResult]] = defaultdict(list)
        severity_counts = SeverityStats()
        status_counts: Dict[str, int] = defaultdict(int)

        for res in results:
            results_by_framework[res.framework].append(res)
            status_counts[res.status.value] += 1

            # Only count failures and unknowns towards actionable severity distribution
            if res.status in [EvaluationStatus.FAIL, EvaluationStatus.UNKNOWN]:
                if res.severity == SeverityLevel.CRITICAL:
                    severity_counts.critical += 1
                elif res.severity == SeverityLevel.HIGH:
                    severity_counts.high += 1
                elif res.severity == SeverityLevel.MEDIUM:
                    severity_counts.medium += 1
                elif res.severity == SeverityLevel.LOW:
                    severity_counts.low += 1
                elif res.severity == SeverityLevel.INFO:
                    severity_counts.info += 1

        framework_scores: Dict[str, FrameworkScore] = {}
        total_passed = 0
        total_applicable = 0

        for fw, fw_results in results_by_framework.items():
            fw_passed = sum(1 for r in fw_results if r.status == EvaluationStatus.PASS)
            fw_failed = sum(1 for r in fw_results if r.status == EvaluationStatus.FAIL)
            fw_unknown = sum(1 for r in fw_results if r.status == EvaluationStatus.UNKNOWN)
            fw_na = sum(1 for r in fw_results if r.status == EvaluationStatus.NOT_APPLICABLE)

            fw_applicable = fw_passed + fw_failed + fw_unknown
            fw_score_val = (fw_passed / fw_applicable * 100.0) if fw_applicable > 0 else 100.0

            total_passed += fw_passed
            total_applicable += fw_applicable

            framework_scores[fw] = FrameworkScore(
                framework=fw,
                score=round(fw_score_val, 1),
                passed_count=fw_passed,
                failed_count=fw_failed,
                unknown_count=fw_unknown,
                not_applicable_count=fw_na,
                total_applicable=fw_applicable,
                total_evaluated=len(fw_results),
            )

        overall_score_val = (total_passed / total_applicable * 100.0) if total_applicable > 0 else 100.0

        return AuditScoreSummary(
            audit_id=audit_id,
            configuration_id=configuration_id,
            overall_score=round(overall_score_val, 1),
            framework_scores=framework_scores,
            severity_breakdown=severity_counts,
            status_breakdown=dict(status_counts),
            total_findings=len(results),
            total_applicable=total_applicable,
        )
