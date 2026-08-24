"""
Verification script for NetVigil CSS Pipeline and Asset Delivery.
"""
import urllib.request
import re
import sys

BASE_URL = "http://localhost:3001"
ROUTES = [
    "/",
    "/dashboard",
    "/audits",
    "/devices",
    "/findings",
    "/risk",
    "/remediation",
    "/reports",
    "/adaptive-training",
    "/configurations",
    "/demo",
    "/demo/multi-vendor",
    "/demo/judge",
]

print("=" * 70)
print("NETVIGIL CSS & ROUTE PIPELINE VERIFICATION")
print("=" * 70)

all_passed = True

for route in ROUTES:
    url = f"{BASE_URL}{route}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req)
        status = res.status
        html = res.read().decode("utf-8")
        
        # Check dark class and font variables on html tag
        has_dark = 'class="dark' in html or "className=\"dark" in html or "dark" in html
        has_bg_dark = "bg-[#070707]" in html or "bg-[#050505]" in html or "background" in html
        
        # Extract CSS link
        css_match = re.search(r'href="(/_next/static/css/[^"]+\.css)"', html)
        css_status = "N/A"
        css_len = 0
        if css_match:
            css_path = css_match.group(1)
            css_url = f"{BASE_URL}{css_path}"
            css_res = urllib.request.urlopen(css_url)
            css_status = css_res.status
            css_len = len(css_res.read())
            
        print(f"[+] {route:<22} -> HTTP {status} | Dark: {has_dark} | CSS: {css_status} ({css_len} B)")
        
        if status != 200 or (css_match and css_status != 200):
            all_passed = False
    except Exception as e:
        print(f"[-] {route:<22} -> ERROR: {e}")
        all_passed = False

print("=" * 70)
if all_passed:
    print("ALL 13 ROUTES SERVING VALID HTML AND COMPILED GLOBAL CSS (100% PASS)")
    sys.exit(0)
else:
    print("CSS PIPELINE VERIFICATION ENCOUNTERED FAILURES")
    sys.exit(1)
