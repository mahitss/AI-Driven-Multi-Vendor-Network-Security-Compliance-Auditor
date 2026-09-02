import urllib.request
import json
import re
import time

def check_render():
    url = "https://ai-driven-multi-vendor-network-security.onrender.com/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "NetVigil-Diagnostic/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[Render Health] Status: {resp.status}")
            print(f"  Service: {data.get('service')}")
            print(f"  Environment: {data.get('environment')}")
            print(f"  Timestamp: {data.get('timestamp')}")
            print(f"  Database: {data.get('database')}")
            return data
    except Exception as e:
        print(f"[Render Health] Error: {e}")
        return None

def check_vercel():
    url = "https://ai-driven-multi-vendor-network-secu.vercel.app/configurations"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8")
            print(f"[Vercel Configurations] Status: {resp.status}")
            print(f"  Age: {resp.headers.get('age')}")
            print(f"  Vercel ID: {resp.headers.get('x-vercel-id')}")
            print(f"  Date: {resp.headers.get('date')}")
            
            # Check if any old heuristic 'end\\n' exists in the served HTML
            has_old_heuristic = "end\\n" in html
            print(f"  Has old end\\n in HTML? {has_old_heuristic}")
            return resp.status
    except Exception as e:
        print(f"[Vercel] Error: {e}")
        return None

if __name__ == "__main__":
    print("Checking Render and Vercel...")
    check_render()
    check_vercel()
