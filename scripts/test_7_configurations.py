import json
import urllib.request
import os

base_url = 'http://127.0.0.1:8000/api/v1'

def post_json(endpoint, data):
    req = urllib.request.Request(
        f"{base_url}{endpoint}",
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def get_json(endpoint):
    req = urllib.request.Request(f"{base_url}{endpoint}")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

configs = [
    ("01_CISCO_CRITICAL.cfg", "data/demo/cisco/insecure-router.cfg", "cisco"),
    ("02_CISCO_HARDENED.cfg", "data/demo/cisco/secure-router.cfg", "cisco"),
    ("03_CISCO_MIXED.cfg", "data/demo/cisco/mixed-router.cfg", "cisco"),
    ("04_JUNIPER_CRITICAL.set", "data/demo/juniper/insecure-srx.conf", "juniper"),
    ("05_JUNIPER_HARDENED.set", "data/demo/juniper/secure-srx.conf", "juniper"),
    ("06_FORTINET_CRITICAL.conf", "data/demo/fortinet/insecure-firewall.conf", "fortinet"),
    ("07_FORTINET_HARDENED.conf", "data/demo/fortinet/secure-firewall.conf", "fortinet"),
]

print("================================================================================")
print("=== NETVIGIL SEVEN CONFIGURATIONS REAL AUDIT PIPELINE VERIFICATION ===")
print("================================================================================")

results = []

for label, file_path, expected_vendor in configs:
    with open(file_path, 'r') as f:
        content = f.read()

    ingest = post_json('/analysis/ingest', {'filename': label, 'content': content})
    a_id = ingest['analysis_id']

    status = get_json(f'/analysis/{a_id}')
    findings = get_json(f'/analysis/{a_id}/findings')
    evidence = get_json(f'/analysis/{a_id}/evidence')
    risk = get_json(f'/analysis/{a_id}/risk')

    vendor = status.get('vendor')
    platform = status.get('platform')
    score = status.get('compliance_score')
    fails = status.get('fail_count')
    passes = status.get('pass_count')
    risk_score = risk.get('risk_score')
    risk_level = risk.get('risk_level')
    facts_count = status.get('facts_extracted_count')

    top_finding = findings[0]['control_id'] if findings else "None"
    top_line = findings[0]['evidence_lines'][0]['line'] if (findings and findings[0].get('evidence_lines')) else "N/A"

    print(f"\n[CONFIG: {label}]")
    print(f"  File Path: {file_path}")
    print(f"  Analysis ID: {a_id}")
    print(f"  Vendor Detected: {vendor} ({platform}) [Expected: {expected_vendor}] -> {'MATCH' if vendor == expected_vendor else 'MISMATCH'}")
    print(f"  Lines Parsed: {status.get('lines_parsed')} | AST Facts Extracted: {facts_count}")
    print(f"  Compliance Score: {score:.1f}% | Controls: {passes} PASS / {fails} FAIL")
    print(f"  Risk Index: {risk_score:.1f}/100 | Priority: {risk_level}")
    print(f"  Sample Finding: {top_finding} on Line {top_line} ({findings[0]['title'] if findings else ''})")

    results.append({
        'label': label,
        'vendor': vendor,
        'score': score,
        'fails': fails,
        'passes': passes,
        'risk_score': risk_score,
        'risk_level': risk_level,
        'facts': facts_count
    })

print("\n================================================================================")
print("=== SUMMARY MATRIX ACROSS ALL 7 PROFILES ===")
print("================================================================================")
print(f"{'Configuration':<28} | {'Vendor':<10} | {'Compliance':<11} | {'Fails':<6} | {'Risk Score':<10} | {'Priority'}")
print("-" * 80)
for r in results:
    print(f"{r['label']:<28} | {r['vendor']:<10} | {r['score']:>8.1f}%   | {r['fails']:>5} | {r['risk_score']:>8.1f}/100 | {r['risk_level']}")
