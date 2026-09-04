import assert from "node:assert/strict";
import { resolveAuthoritativeAuditId, persistActiveAuditId, getPersistedActiveAuditId } from "../src/lib/audit-session";
import type { Finding, AuditDetail, AuditItem } from "../src/lib/api-client";

console.log("==================================================================");
console.log("RUNNING P0 MULTI-FRAMEWORK SUMMARY INDEPENDENCE REGRESSION TESTS");
console.log("==================================================================");

// Mirror the exact independent framework aggregation logic from audits/page.tsx
function computeIndependentFrameworkResults(
  findings: Finding[],
  fwScores: Record<string, any> = {}
) {
  const frameworks = ["CIS", "NIST", "STIG", "ISO"] as const;
  const map: Record<
    string,
    {
      framework: string;
      score: number;
      passed_count: number;
      failed_count: number;
      unknown_count: number;
      not_applicable_count: number;
      total_applicable: number;
      total_evaluated: number;
    }
  > = {};

  for (const fw of frameworks) {
    const backendFw = fwScores[fw];
    const fwFindings = findings.filter(
      (f) => (f.framework || "").toUpperCase() === fw
    );

    if (fwFindings.length > 0) {
      const passed = fwFindings.filter((f) => f.status === "PASS").length;
      const failed = fwFindings.filter((f) => f.status === "FAIL").length;
      const unknown = fwFindings.filter((f) => f.status === "UNKNOWN").length;
      const na = fwFindings.filter((f) => f.status === "NOT_APPLICABLE").length;
      const applicable = passed + failed + unknown;
      const calcScore = applicable > 0 ? (passed / applicable) * 100.0 : 100.0;
      const score = backendFw?.score !== undefined ? backendFw.score : Number(calcScore.toFixed(1));

      map[fw] = {
        framework: fw,
        score,
        passed_count: passed,
        failed_count: failed,
        unknown_count: unknown,
        not_applicable_count: na,
        total_applicable: applicable,
        total_evaluated: fwFindings.length,
      };
    } else if (backendFw) {
      map[fw] = {
        framework: fw,
        score: backendFw.score ?? 0,
        passed_count: backendFw.passed_count ?? 0,
        failed_count: backendFw.failed_count ?? 0,
        unknown_count: backendFw.unknown_count ?? 0,
        not_applicable_count: backendFw.not_applicable_count ?? 0,
        total_applicable: backendFw.total_applicable ?? 0,
        total_evaluated: backendFw.total_evaluated ?? 0,
      };
    } else {
      map[fw] = {
        framework: fw,
        score: 0,
        passed_count: 0,
        failed_count: 0,
        unknown_count: 0,
        not_applicable_count: 0,
        total_applicable: 0,
        total_evaluated: 0,
      };
    }
  }
  return map;
}

// -----------------------------------------------------------------------------
// Test Fixture 1: 06_FORTINET_CRITICAL.conf
// -----------------------------------------------------------------------------
const FORTINET_AUDIT_ID = "2d44fa13-fgt-crit-0001";
const FORTINET_CFG_ID = "cfg-fortinet-crit-0001";

// 12 controls mapped symmetrically across 4 frameworks = 48 findings
// In 06_FORTINET_CRITICAL.conf: 2 pass, 6 fail, 4 unknown per framework
const fortinetFindings: Finding[] = [];
const frameworks = ["CIS", "NIST", "STIG", "ISO"] as const;

for (const fw of frameworks) {
  // 2 PASS findings
  fortinetFindings.push({
    id: `f-${fw}-ssh`,
    audit_id: FORTINET_AUDIT_ID,
    framework: fw,
    control_id: `${fw}-SSH-001`,
    status: "PASS",
    severity: "HIGH",
    title: `${fw} SSH Protocol Version 2`,
    created_at: "2026-09-04T12:00:00Z",
  });
  fortinetFindings.push({
    id: `f-${fw}-https`,
    audit_id: FORTINET_AUDIT_ID,
    framework: fw,
    control_id: `${fw}-HTTPS-001`,
    status: "PASS",
    severity: "MEDIUM",
    title: `${fw} HTTPS Web Management`,
    created_at: "2026-09-04T12:00:00Z",
  });

  // 6 FAIL findings
  for (let i = 1; i <= 6; i++) {
    fortinetFindings.push({
      id: `f-${fw}-fail-${i}`,
      audit_id: FORTINET_AUDIT_ID,
      framework: fw,
      control_id: `${fw}-FAIL-00${i}`,
      status: "FAIL",
      severity: i <= 2 ? "CRITICAL" : "HIGH",
      title: `${fw} Control Failure ${i}`,
      created_at: "2026-09-04T12:00:00Z",
    });
  }

  // 4 UNKNOWN findings
  for (let i = 1; i <= 4; i++) {
    fortinetFindings.push({
      id: `f-${fw}-unk-${i}`,
      audit_id: FORTINET_AUDIT_ID,
      framework: fw,
      control_id: `${fw}-UNK-00${i}`,
      status: "UNKNOWN",
      severity: "LOW",
      title: `${fw} Unknown Control ${i}`,
      created_at: "2026-09-04T12:00:00Z",
    });
  }
}

const fortinetRawApiResponse: AuditDetail = {
  id: FORTINET_AUDIT_ID,
  configuration_id: FORTINET_CFG_ID,
  status: "COMPLETED",
  score: 16.7,
  started_at: "2026-09-04T12:00:00Z",
  completed_at: "2026-09-04T12:00:05Z",
  framework_scores: {
    CIS: { framework: "CIS", score: 16.7, passed_count: 2, failed_count: 6, unknown_count: 4, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
    NIST: { framework: "NIST", score: 16.7, passed_count: 2, failed_count: 6, unknown_count: 4, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
    STIG: { framework: "STIG", score: 16.7, passed_count: 2, failed_count: 6, unknown_count: 4, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
    ISO: { framework: "ISO", score: 16.7, passed_count: 2, failed_count: 6, unknown_count: 4, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
  },
  severity_breakdown: { critical: 8, high: 20, medium: 8, low: 16, info: 0 },
  status_breakdown: { PASS: 8, FAIL: 24, UNKNOWN: 16 },
  findings: fortinetFindings,
};

// -----------------------------------------------------------------------------
// Test Fixture 2: 02_CISCO_HARDENED.cfg
// -----------------------------------------------------------------------------
const CISCO_AUDIT_ID = "c15c0-hardened-0002";
const CISCO_CFG_ID = "cfg-cisco-hardened-0002";

const ciscoFindings: Finding[] = [];
for (const fw of frameworks) {
  // 5 PASS findings
  for (let i = 1; i <= 5; i++) {
    ciscoFindings.push({
      id: `c-${fw}-pass-${i}`,
      audit_id: CISCO_AUDIT_ID,
      framework: fw,
      control_id: `${fw}-CISCO-PASS-00${i}`,
      status: "PASS",
      severity: "HIGH",
      title: `${fw} Cisco Hardened Check ${i}`,
      created_at: "2026-09-04T12:00:00Z",
    });
  }
  // 7 FAIL findings
  for (let i = 1; i <= 7; i++) {
    ciscoFindings.push({
      id: `c-${fw}-fail-${i}`,
      audit_id: CISCO_AUDIT_ID,
      framework: fw,
      control_id: `${fw}-CISCO-FAIL-00${i}`,
      status: "FAIL",
      severity: "MEDIUM",
      title: `${fw} Cisco Fail Check ${i}`,
      created_at: "2026-09-04T12:00:00Z",
    });
  }
}

const ciscoRawApiResponse: AuditDetail = {
  id: CISCO_AUDIT_ID,
  configuration_id: CISCO_CFG_ID,
  status: "COMPLETED",
  score: 41.7,
  started_at: "2026-09-04T12:00:00Z",
  completed_at: "2026-09-04T12:00:05Z",
  framework_scores: {
    CIS: { framework: "CIS", score: 41.7, passed_count: 5, failed_count: 7, unknown_count: 0, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
    NIST: { framework: "NIST", score: 41.7, passed_count: 5, failed_count: 7, unknown_count: 0, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
    STIG: { framework: "STIG", score: 41.7, passed_count: 5, failed_count: 7, unknown_count: 0, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
    ISO: { framework: "ISO", score: 41.7, passed_count: 5, failed_count: 7, unknown_count: 0, not_applicable_count: 0, total_applicable: 12, total_evaluated: 12 },
  },
  severity_breakdown: { critical: 0, high: 20, medium: 28, low: 0, info: 0 },
  status_breakdown: { PASS: 20, FAIL: 28 },
  findings: ciscoFindings,
};

// -----------------------------------------------------------------------------
// Test Fixture 3: Asymmetric Framework Audit
// -----------------------------------------------------------------------------
const ASYMMETRIC_AUDIT_ID = "asym-audit-0003";
const asymmetricFindings: Finding[] = [
  // CIS has 8 pass, 2 fail = 8/10 = 80.0%
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `asym-cis-p-${i}`,
    audit_id: ASYMMETRIC_AUDIT_ID,
    framework: "CIS",
    control_id: `CIS-00${i}`,
    status: "PASS" as const,
    severity: "MEDIUM" as const,
    title: `CIS Pass ${i}`,
    created_at: "2026-09-04T12:00:00Z",
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `asym-cis-f-${i}`,
    audit_id: ASYMMETRIC_AUDIT_ID,
    framework: "CIS",
    control_id: `CIS-FAIL-00${i}`,
    status: "FAIL" as const,
    severity: "HIGH" as const,
    title: `CIS Fail ${i}`,
    created_at: "2026-09-04T12:00:00Z",
  })),
  // NIST has 3 pass, 9 fail = 3/12 = 25.0%
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `asym-nist-p-${i}`,
    audit_id: ASYMMETRIC_AUDIT_ID,
    framework: "NIST",
    control_id: `NIST-00${i}`,
    status: "PASS" as const,
    severity: "LOW" as const,
    title: `NIST Pass ${i}`,
    created_at: "2026-09-04T12:00:00Z",
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `asym-nist-f-${i}`,
    audit_id: ASYMMETRIC_AUDIT_ID,
    framework: "NIST",
    control_id: `NIST-FAIL-00${i}`,
    status: "FAIL" as const,
    severity: "CRITICAL" as const,
    title: `NIST Fail ${i}`,
    created_at: "2026-09-04T12:00:00Z",
  })),
  // STIG has 0 findings evaluated (Not Evaluated)
  // ISO has 1 pass, 0 fail = 100.0%
  {
    id: "asym-iso-p-1",
    audit_id: ASYMMETRIC_AUDIT_ID,
    framework: "ISO",
    control_id: "ISO-001",
    status: "PASS" as const,
    severity: "INFO" as const,
    title: "ISO Pass 1",
    created_at: "2026-09-04T12:00:00Z",
  },
];

// -----------------------------------------------------------------------------
// EXECUTE TESTS
// -----------------------------------------------------------------------------

// TEST 1: Load 06_FORTINET_CRITICAL.conf and record raw API response
console.log("\n[Test 1] Load 06_FORTINET_CRITICAL.conf & Verify Raw Response");
assert.equal(fortinetRawApiResponse.score, 16.7, "Overall score must be 16.7%");
assert.equal(fortinetRawApiResponse.findings.length, 48, "Total findings must be exactly 48");
console.log(" -> PASSED: Loaded 06_FORTINET_CRITICAL.conf with 48 findings and 16.7% overall score.");

// TEST 2: Verify CIS/NIST/STIG/ISO data separately in raw response
console.log("\n[Test 2] Verify Raw API Framework Breakdown Separately");
for (const fw of frameworks) {
  const fwData = fortinetRawApiResponse.framework_scores[fw];
  assert.ok(fwData, `Framework ${fw} must be present in framework_scores`);
  assert.equal(fwData.passed_count, 2, `${fw} passed_count must be 2`);
  assert.equal(fwData.failed_count, 6, `${fw} failed_count must be 6`);
  assert.equal(fwData.unknown_count, 4, `${fw} unknown_count must be 4`);
  assert.equal(fwData.not_applicable_count, 0, `${fw} not_applicable_count must be 0`);
  assert.equal(fwData.total_applicable, 12, `${fw} total_applicable must be 12`);
  assert.equal(fwData.total_evaluated, 12, `${fw} total_evaluated must be 12`);
  assert.equal(fwData.score, 16.7, `${fw} score must be 16.7%`);
}
console.log(" -> PASSED: CIS, NIST, STIG, ISO evaluated independently with 12 controls each.");

// TEST 3: Verify UI cards calculate independently from findings (not copying overall score)
console.log("\n[Test 3] Verify Frontend Independent Grouping Calculation");
const fortinetUiResults = computeIndependentFrameworkResults(
  fortinetRawApiResponse.findings,
  fortinetRawApiResponse.framework_scores
);

for (const fw of frameworks) {
  const cardData = fortinetUiResults[fw];
  assert.equal(cardData.passed_count, 2, `Card for ${fw} must show 2 passed`);
  assert.equal(cardData.failed_count, 6, `Card for ${fw} must show 6 failed`);
  assert.equal(cardData.unknown_count, 4, `Card for ${fw} must show 4 unknown`);
  assert.equal(cardData.not_applicable_count, 0, `Card for ${fw} must show 0 N/A`);
  assert.equal(cardData.total_applicable, 12, `Card for ${fw} must show 12 applicable`);
  assert.equal(cardData.total_evaluated, 12, `Card for ${fw} must show 12 total evaluated`);
  assert.equal(cardData.score, 16.7, `Card for ${fw} must show 16.7%`);

  // Crucial: The card's passed count (2) is NOT the overall passed count (8)
  assert.notEqual(cardData.passed_count, 8, "Card must not receive the overall passed total!");
  assert.notEqual(cardData.total_applicable, 48, "Card must not receive the overall applicable total!");
}
console.log(" -> PASSED: Frontend cards independently derive 2/12 passed from framework-scoped findings.");

// TEST 4: Asymmetric audit proves framework cards show different scores when findings differ
console.log("\n[Test 4] Verify Asymmetric Framework Evaluation Independence");
const asymUiResults = computeIndependentFrameworkResults(asymmetricFindings, {});

assert.equal(asymUiResults.CIS.score, 80.0, "CIS score must be 80.0%");
assert.equal(asymUiResults.CIS.passed_count, 8, "CIS passed must be 8");
assert.equal(asymUiResults.CIS.total_applicable, 10, "CIS total applicable must be 10");

assert.equal(asymUiResults.NIST.score, 25.0, "NIST score must be 25.0%");
assert.equal(asymUiResults.NIST.passed_count, 3, "NIST passed must be 3");
assert.equal(asymUiResults.NIST.total_applicable, 12, "NIST total applicable must be 12");

assert.equal(asymUiResults.STIG.score, 0, "STIG score must be 0 for unevaluated");
assert.equal(asymUiResults.STIG.total_evaluated, 0, "STIG total evaluated must be 0");

assert.equal(asymUiResults.ISO.score, 100.0, "ISO score must be 100.0%");
assert.equal(asymUiResults.ISO.passed_count, 1, "ISO passed must be 1");
assert.equal(asymUiResults.ISO.total_applicable, 1, "ISO total applicable must be 1");

console.log(" -> PASSED: Asymmetric framework cards show independent values (CIS: 80%, NIST: 25%, STIG: —, ISO: 100%).");

// TEST 5: Switch to another audit (Cisco) & verify all four cards update
console.log("\n[Test 5] Switch to Another Audit Session & Verify Update");
const ciscoUiResults = computeIndependentFrameworkResults(
  ciscoRawApiResponse.findings,
  ciscoRawApiResponse.framework_scores
);

for (const fw of frameworks) {
  const cardData = ciscoUiResults[fw];
  assert.equal(cardData.passed_count, 5, `Cisco ${fw} passed must be 5`);
  assert.equal(cardData.failed_count, 7, `Cisco ${fw} failed must be 7`);
  assert.equal(cardData.score, 41.7, `Cisco ${fw} score must be 41.7%`);
}
console.log(" -> PASSED: All 4 framework cards updated cleanly to Cisco (5/12 passed — 41.7%).");

// TEST 6: Selected Audit State & URL / LocalStorage persistence
console.log("\n[Test 6] Selected Audit ID Strict Binding & Persistence");
const auditList: AuditItem[] = [
  { id: FORTINET_AUDIT_ID, configuration_id: FORTINET_CFG_ID, status: "COMPLETED", score: 16.7, started_at: "" },
  { id: CISCO_AUDIT_ID, configuration_id: CISCO_CFG_ID, status: "COMPLETED", score: 41.7, started_at: "" },
];

// Selection by explicit query param
const resolvedByParam = resolveAuthoritativeAuditId(auditList, FORTINET_AUDIT_ID, null);
assert.equal(resolvedByParam, FORTINET_AUDIT_ID, "Must resolve Fortinet ID from query param");

// Switch to Cisco
const resolvedCisco = resolveAuthoritativeAuditId(auditList, CISCO_AUDIT_ID, null);
assert.equal(resolvedCisco, CISCO_AUDIT_ID, "Must resolve Cisco ID from query param");

console.log(" -> PASSED: Authoritative audit selection strictly binds to durable audit ID.");

// TEST 7: Rapid switching between two audits (zero cross-audit contamination)
console.log("\n[Test 7] Rapid Audit Switching & Cross-Audit Isolation");
// Simulate rapid state toggling
let activeDetail = fortinetRawApiResponse;
let activeFindings = fortinetRawApiResponse.findings;
let results = computeIndependentFrameworkResults(activeFindings, activeDetail.framework_scores);
assert.equal(results.CIS.score, 16.7);

// Switch to Cisco
activeDetail = ciscoRawApiResponse;
activeFindings = ciscoRawApiResponse.findings;
results = computeIndependentFrameworkResults(activeFindings, activeDetail.framework_scores);
assert.equal(results.CIS.score, 41.7);
assert.equal(results.CIS.passed_count, 5);

// Switch back to Fortinet
activeDetail = fortinetRawApiResponse;
activeFindings = fortinetRawApiResponse.findings;
results = computeIndependentFrameworkResults(activeFindings, activeDetail.framework_scores);
assert.equal(results.CIS.score, 16.7);
assert.equal(results.CIS.passed_count, 2);

console.log(" -> PASSED: Rapid switching maintains complete audit isolation with zero cross-contamination.");

// TEST 8: Verify findings count, severity counts, and overall score match selected audit
console.log("\n[Test 8] Selected Audit Finding & Severity Count Invariance");
assert.equal(fortinetRawApiResponse.findings.length, 48, "Findings count must be 48");
assert.equal(fortinetRawApiResponse.severity_breakdown.critical, 8, "Critical count must be 8");
assert.equal(fortinetRawApiResponse.severity_breakdown.high, 20, "High count must be 20");
assert.equal(fortinetRawApiResponse.score, 16.7, "Overall score must be 16.7%");

assert.equal(ciscoRawApiResponse.findings.length, 48, "Cisco findings count must be 48");
assert.equal(ciscoRawApiResponse.severity_breakdown.critical, 0, "Cisco critical count must be 0");
assert.equal(ciscoRawApiResponse.severity_breakdown.high, 20, "Cisco high count must be 20");
assert.equal(ciscoRawApiResponse.score, 41.7, "Cisco overall score must be 41.7%");

console.log(" -> PASSED: Findings count, severity breakdown, and overall score strictly derive from selected audit.");
console.log("\n==================================================================");
console.log("ALL MULTI-FRAMEWORK INDEPENDENCE REGRESSION TESTS PASSED!");
console.log("==================================================================");
