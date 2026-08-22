"""
Risk Relationship Graph Generator
Problem Statement: SIH26155 (NTRO)

Builds deterministic relationship graphs connecting Devices, Exposures, Risks, and Findings.
"""
from typing import Any, Dict, List
from app.models.finding import Finding
from app.models.risk import RiskItem


def build_risk_graph(
    risks: List[RiskItem],
    findings: List[Finding],
    device_label: str = "Network Gateway Node",
) -> Dict[str, Any]:
    """
    Constructs a deterministic risk relationship graph for interactive visualization.
    """
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    added_node_ids = set()

    # 1. Root Device Node
    device_node_id = "node-device-root"
    nodes.append({
        "id": device_node_id,
        "type": "DEVICE",
        "data": {
            "label": device_label,
            "subtitle": "Target Evaluated Asset",
            "category": "device",
        },
        "position": {"x": 50, "y": 200},
    })
    added_node_ids.add(device_node_id)

    # 2. Exposure Domain Nodes
    exposures_seen = set()
    y_exp_offset = 50
    for r in risks:
        exp = r.exposure or "MANAGEMENT_PLANE"
        if exp not in exposures_seen:
            exposures_seen.add(exp)
            exp_node_id = f"node-exp-{exp.lower()}"
            nodes.append({
                "id": exp_node_id,
                "type": "EXPOSURE",
                "data": {
                    "label": exp.replace("_", " ").title(),
                    "subtitle": "Attack Surface Layer",
                    "exposure": exp,
                },
                "position": {"x": 280, "y": y_exp_offset},
            })
            y_exp_offset += 120
            added_node_ids.add(exp_node_id)

            # Edge Device -> Exposure
            edges.append({
                "id": f"edge-dev-{exp.lower()}",
                "source": device_node_id,
                "target": exp_node_id,
                "label": "EXPOSES",
                "type": "smoothstep",
            })

    # Finding lookup by ID
    finding_map = {f.id: f for f in findings}

    # 3. Risk Nodes & Finding Nodes
    y_risk_offset = 30
    for idx, r in enumerate(risks[:6]):  # Limit initial graph to top 6 risks for clean layout
        risk_node_id = f"node-risk-{r.id[:8]}"
        nodes.append({
            "id": risk_node_id,
            "type": "RISK",
            "data": {
                "label": r.title,
                "severity": r.severity,
                "priority": r.priority,
                "risk_score": r.risk_score,
                "category": r.category,
            },
            "position": {"x": 560, "y": y_risk_offset},
        })
        added_node_ids.add(risk_node_id)

        # Edge Exposure -> Risk
        exp_node_id = f"node-exp-{(r.exposure or 'MANAGEMENT_PLANE').lower()}"
        if exp_node_id in added_node_ids:
            edges.append({
                "id": f"edge-{exp_node_id}-{risk_node_id}",
                "source": exp_node_id,
                "target": risk_node_id,
                "label": "INCREASES",
                "type": "smoothstep",
            })

        # Connect contributing findings (up to 2 per risk for clean visualization)
        f_ids = r.finding_ids if isinstance(r.finding_ids, list) else []
        y_finding_offset = y_risk_offset - 20
        for f_id in f_ids[:2]:
            f_obj = finding_map.get(f_id)
            if f_obj:
                f_node_id = f"node-finding-{f_obj.id[:8]}"
                if f_node_id not in added_node_ids:
                    nodes.append({
                        "id": f_node_id,
                        "type": "FINDING",
                        "data": {
                            "label": f"{f_obj.framework} • {f_obj.control_id}",
                            "subtitle": f_obj.title,
                            "severity": f_obj.severity,
                            "status": f_obj.status,
                        },
                        "position": {"x": 860, "y": y_finding_offset},
                    })
                    added_node_ids.add(f_node_id)
                    y_finding_offset += 60

                edges.append({
                    "id": f"edge-{risk_node_id}-{f_node_id}",
                    "source": risk_node_id,
                    "target": f_node_id,
                    "label": "CAUSES",
                    "type": "smoothstep",
                })

        y_risk_offset += 130

    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "nodes_count": len(nodes),
            "edges_count": len(edges),
            "risks_count": len(risks),
        },
    }
