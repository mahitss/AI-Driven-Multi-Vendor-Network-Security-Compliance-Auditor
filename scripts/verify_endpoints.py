import urllib.request
import json

base_url = 'http://127.0.0.1:8000'

endpoints_to_test = [
    ('GET', '/health'),
    ('GET', '/api/v1/health'),
    ('GET', '/api/v1/overview/stats'),
    ('GET', '/api/v1/overview/activity'),
    ('GET', '/api/v1/configurations'),
    ('GET', '/api/v1/devices'),
    ('GET', '/api/v1/frameworks'),
    ('GET', '/api/v1/risks'),
    ('GET', '/api/v1/risks/stats'),
    ('GET', '/api/v1/remediations'),
    ('GET', '/api/v1/remediations/stats'),
    ('GET', '/api/v1/audits'),
]

print("=== Testing FastAPI Endpoint Routing ===")
all_ok = True
for method, path in endpoints_to_test:
    url = f"{base_url}{path}"
    req = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            content = json.loads(response.read().decode('utf-8'))
            sample = str(content)[:60]
            print(f"[OK {status}] {method} {path} -> {sample}...")
    except urllib.error.HTTPError as e:
        print(f"[FAIL {e.code}] {method} {path} -> HTTPError: {e.reason}")
        all_ok = False
    except Exception as e:
        print(f"[ERR] {method} {path} -> {e}")
        all_ok = False

if all_ok:
    print("\nAll tested endpoints returned 200 OK successfully!")
else:
    print("\nSome endpoints encountered errors.")
