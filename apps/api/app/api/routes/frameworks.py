"""
Compliance Frameworks & Catalog Metadata Routes
Problem Statement: SIH26155 (NTRO)
"""
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status
from app.schemas.audit import FrameworkMetadataResponse
from app.services.compliance.catalog import compliance_catalog

router = APIRouter(prefix="/frameworks", tags=["Compliance Frameworks"])


@router.get(
    "",
    response_model=List[FrameworkMetadataResponse],
    summary="List supported compliance frameworks (CIS, NIST, STIG, ISO)",
)
async def list_frameworks() -> List[FrameworkMetadataResponse]:
    """Retrieve catalog of supported compliance baselines and metadata."""
    raw_list = compliance_catalog.list_supported_frameworks()
    responses = []

    for item in raw_list:
        fw_key = item.get("framework", "UNKNOWN")
        rules = compliance_catalog.get_rules_for_framework(fw_key)
        responses.append(
            FrameworkMetadataResponse(
                framework=fw_key,
                name=item.get("name", f"{fw_key} Benchmark"),
                version=item.get("version", "1.0"),
                description=item.get("description", ""),
                document_reference=item.get("document_reference"),
                source_type=item.get("source_type", "official"),
                verified=item.get("verified", True),
                controls_count=len(rules),
            )
        )

    return responses


@router.get(
    "/{framework}/controls",
    summary="List all controls and rules for a specific framework",
)
async def get_framework_controls(framework: str) -> List[Dict[str, Any]]:
    """Retrieve granular control catalog with verified citations and fact mappings."""
    fw_upper = framework.upper()
    rules = compliance_catalog.get_rules_for_framework(fw_upper)

    if not rules and fw_upper not in ["CIS", "NIST", "STIG", "ISO"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Framework '{framework}' is not registered in the catalog.",
        )

    results = []
    for r in rules:
        mapping = r.framework_mappings.get(fw_upper)
        results.append(
            {
                "rule_id": r.id,
                "framework": fw_upper,
                "control_id": mapping.control_id if mapping else r.id,
                "title": mapping.title if mapping else r.title,
                "category": r.category,
                "severity": r.severity.value,
                "description": r.description,
                "fact_path": r.fact_path,
                "operator": r.operator,
                "expected_value": r.expected_value,
                "explanation": r.explanation,
                "source": mapping.model_dump() if mapping else {},
            }
        )

    return results
