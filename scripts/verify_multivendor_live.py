import json
import urllib.request

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

# Test 1: Ingest Cisco Insecure
with open('data/demo/cisco/insecure-router.cfg', 'r') as f:
    cisco_cfg = f.read()

res_cisco = post_json('/analysis/ingest', {'filename': 'cisco-core-router.cfg', 'content': cisco_cfg})
cisco_id = res_cisco['analysis_id']

# Test 2: Ingest Juniper Insecure
with open('data/demo/juniper/insecure-srx.conf', 'r') as f:
    juniper_cfg = f.read()

res_juniper = post_json('/analysis/ingest', {'filename': 'juniper-srx-edge.conf', 'content': juniper_cfg})
juniper_id = res_juniper['analysis_id']

# Test 3: Ingest Fortinet Insecure
with open('data/demo/fortinet/insecure-firewall.conf', 'r') as f:
    fortinet_cfg = f.read()

res_fortinet = post_json('/analysis/ingest', {'filename': 'fortinet-fgt-gateway.conf', 'content': fortinet_cfg})
fortinet_id = res_fortinet['analysis_id']

# Check findings and re-analysis for each
for name, a_id, hard_file in [
    ('Cisco IOS', cisco_id, 'data/demo/cisco/secure-router.cfg'),
    ('Juniper JunOS', juniper_id, 'data/demo/juniper/secure-srx.conf'),
    ('Fortinet FortiOS', fortinet_id, 'data/demo/fortinet/secure-firewall.conf')
]:
    findings = get_json(f'/analysis/{a_id}/findings')
    status = get_json(f'/analysis/{a_id}')
    risk = get_json(f'/analysis/{a_id}/risk')
    
    print(f'\n============================================================')
    print(f'=== {name} Real Golden Audit Results ===')
    print(f'============================================================')
    print(f'Analysis ID: {a_id}')
    print(f'Vendor / Platform: {status["vendor"]} / {status.get("platform")}')
    print(f'Lines Parsed: {status["lines_parsed"]} | Facts Extracted: {status["facts_extracted_count"]}')
    print(f'Compliance Score: {status["compliance_score"]}% | Controls Evaluated: {status["controls_evaluated_count"]}')
    print(f'Pass Count: {status["pass_count"]} | Fail Count: {status["fail_count"]}')
    print(f'Risk Score: {risk["risk_score"]}/100 | Priority: {risk["risk_level"]} ({risk.get("likelihood")} Likelihood)')
    
    if findings:
        f0 = findings[0]
        ev_line = f0["evidence_lines"][0]["line"] if f0.get("evidence_lines") else "N/A"
        print(f'Sample Top Finding: {f0["control_id"]} - {f0["title"]}')
        print(f'Status: {f0["status"]} ({f0["severity"]}) | Evidence Line: {ev_line}')
        print(f'Remediation Diff Lines: {len(f0.get("remediation_diff", {}).get("diff_lines", []))} lines')
    
    # Re-analysis test
    with open(hard_file, 'r') as hf:
        hard_cfg = hf.read()
    re_res = post_json(f'/analysis/{a_id}/reanalyze', {'modified_content': hard_cfg})
    print(f'-- Re-Analysis Verification --')
    print(f'Previous Compliance: {re_res["previous_compliance_score"]}% -> New Compliance: {re_res["new_compliance_score"]}%')
    print(f'Previous Fail Count: {re_res["previous_fail_count"]} -> New Fail Count: {re_res["new_fail_count"]}')
    print(f'Resolved Controls Count: {len(re_res["resolved_controls"])}')
    print(f'Resolved Sample: {re_res["resolved_controls"][:5]}')
