"""
Compliance Catalog Service
Problem Statement: SIH26155 (NTRO)

Loads, validates, and indexes data-driven compliance rules for CIS, NIST, DISA STIG, and ISO 27001.
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from app.services.compliance.models import ComplianceRule, FrameworkSourceMeta


def resolve_data_dir() -> Path:
    """
    Resolves the 'data' directory across local development and container deployments.
    Searches parent directory hierarchy for an existing 'data/compliance' structure.
    """
    current = Path(__file__).resolve()
    for p in current.parents:
        candidate = p / "data"
        if (candidate / "compliance" / "mappings" / "unified_catalog.json").exists():
            return candidate

    for candidate in [Path("/app/data"), Path.cwd() / "data", Path("/workspace/data")]:
        if (candidate / "compliance" / "mappings" / "unified_catalog.json").exists():
            return candidate

    return current.parents[min(3, len(current.parents) - 1)] / "data"


class ComplianceCatalog:
    """In-memory indexed compliance catalog with fast lookups by framework and category."""

    def __init__(self, catalog_path: Optional[str] = None):
        if not catalog_path:
            data_dir = resolve_data_dir()
            self.catalog_path = data_dir / "compliance" / "mappings" / "unified_catalog.json"
            self.frameworks_dir = data_dir / "compliance" / "controls"
        else:
            self.catalog_path = Path(catalog_path)
            self.frameworks_dir = self.catalog_path.parent.parent / "controls"

        self._rules: List[ComplianceRule] = []
        self._rules_by_id: Dict[str, ComplianceRule] = {}
        self._framework_metadata: Dict[str, Dict] = {}
        self._load_catalog()

    def _load_catalog(self) -> None:
        """Loads and parses data-driven rules from disk."""
        if not self.catalog_path.exists():
            raise FileNotFoundError(f"Compliance catalog file not found at: {self.catalog_path}")

        with open(self.catalog_path, "r", encoding="utf-8") as f:
            raw_rules = json.load(f)

        self._rules = []
        self._rules_by_id = {}

        for item in raw_rules:
            # Parse framework mappings
            mappings = {}
            for fw, meta in item.get("framework_mappings", {}).items():
                mappings[fw.upper()] = FrameworkSourceMeta(
                    control_id=meta.get("control_id", "N/A"),
                    title=meta.get("title", item.get("title")),
                    document=meta.get("document", "Standard Benchmark"),
                    version=meta.get("version", "1.0"),
                    reference=meta.get("reference", "General"),
                    verified=meta.get("verified", True),
                    source_type=meta.get("source_type", "official"),
                )

            rule = ComplianceRule(
                id=item["id"],
                normalized_control_id=item.get("normalized_control_id", item["id"]),
                title=item["title"],
                description=item.get("description", ""),
                category=item.get("category", "General"),
                severity=item.get("severity", "MEDIUM"),
                fact_path=item["fact_path"],
                operator=item.get("operator", "equals"),
                expected_value=item["expected_value"],
                explanation=item.get("explanation", ""),
                remediation_key=item.get("remediation_key", ""),
                applicability=item.get("applicability"),
                framework_mappings=mappings,
            )
            self._rules.append(rule)
            self._rules_by_id[rule.id] = rule

        # Load framework definitions
        for fw_key in ["CIS", "NIST", "STIG", "ISO"]:
            fw_file = self.frameworks_dir / f"{fw_key.lower()}.json"
            if fw_file.exists():
                with open(fw_file, "r", encoding="utf-8") as ff:
                    self._framework_metadata[fw_key] = json.load(ff)
            else:
                self._framework_metadata[fw_key] = {
                    "framework": fw_key,
                    "name": f"{fw_key} Compliance Benchmark",
                    "version": "1.0",
                    "description": f"Standard {fw_key} configuration control coverage",
                    "verified": True,
                }

    def get_all_rules(self) -> List[ComplianceRule]:
        """Returns all loaded compliance rules."""
        return self._rules

    def get_rule_by_id(self, rule_id: str) -> Optional[ComplianceRule]:
        """Fetch rule by unique ID."""
        return self._rules_by_id.get(rule_id)

    def get_rules_for_framework(self, framework: str) -> List[ComplianceRule]:
        """Filters rules that have a mapping for the specified framework."""
        fw_upper = framework.upper()
        return [r for r in self._rules if fw_upper in r.framework_mappings]

    def list_supported_frameworks(self) -> List[Dict]:
        """Returns list of supported framework metadata."""
        return list(self._framework_metadata.values())


# Global catalog singleton
compliance_catalog = ComplianceCatalog()
