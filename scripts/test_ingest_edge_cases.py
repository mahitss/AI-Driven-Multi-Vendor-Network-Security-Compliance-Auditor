import urllib.request
import json

url = 'http://127.0.0.1:8000/api/v1/analysis/ingest'
test_names = ['custom_router', 'switch', 'insecure.cfg', '', 'my-config.custom']

for name in test_names:
    payload = json.dumps({
        'content': 'hostname RTR-TEST\nip ssh version 1\nend\n',
        'filename': name
    }).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read().decode('utf-8'))
            print(f"[OK {r.status}] Ingest with filename '{name}' -> id: {data['analysis_id'][:8]}..., filename: {data['filename']}")
    except urllib.error.HTTPError as e:
        print(f"[FAIL {e.code}] Ingest with filename '{name}' -> {e.read().decode('utf-8')}")
