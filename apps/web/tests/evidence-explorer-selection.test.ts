import assert from "node:assert/strict";
import { getFindingActiveEvidence } from "../src/lib/evidence-utils";
import type { AnalysisFindingItem } from "../src/lib/api-client";

console.log("Starting Evidence Explorer Selection Sync Regression Tests...");

// Finding A: Real line evidence on line 3 (e.g. CIS-1.1.1 AAA enabled)
const findingA: AnalysisFindingItem = {
  finding_id: "finding-aaa-001",
  control_id: "CIS-1.1.1",
  framework: "CIS",
  title: "Ensure AAA is enabled",
  severity: "CRITICAL",
  status: "PASS",
  expected_value: "True",
  actual_value: "True",
  why_it_failed: "Disabling AAA forces devices to rely on local static passwords.",
  evidence_lines: [
    {
      line: 3,
      raw_text: "aaa new-model",
      property_path: null,
      context: null,
      evidence_status: "configured",
    },
  ],
  remediation_proposal: null,
  remediation_diff: null,
};

// Finding B: Genuinely unconfigured evidence (e.g. CIS-1.1.4 Password Encryption)
const findingB: AnalysisFindingItem = {
  finding_id: "finding-pwd-002",
  control_id: "CIS-1.1.4",
  framework: "CIS",
  title: "Ensure password encryption is enabled",
  severity: "HIGH",
  status: "FAIL",
  expected_value: "service password-encryption",
  actual_value: "None / Unconfigured",
  why_it_failed: "Without service password-encryption, passwords are stored in clear text.",
  evidence_lines: [
    {
      line: null,
      raw_text: "Unconfigured Directive",
      property_path: null,
      context: null,
      evidence_status: "unconfigured",
    },
  ],
  remediation_proposal: "service password-encryption",
  remediation_diff: null,
};

// Step 1: Select finding A with real line evidence -> Evidence Explorer shows Line 3
const evidenceStep1 = getFindingActiveEvidence(findingA);
assert.equal(evidenceStep1.isConfigured, true, "Step 1: finding A must be marked configured");
assert.equal(evidenceStep1.line, 3, "Step 1: finding A must have line 3");
assert.equal(evidenceStep1.citationText, "Line 3", "Step 1: citation text must be 'Line 3'");
assert.equal(evidenceStep1.hasLineCitation, true, "Step 1: hasLineCitation must be true");
assert.equal(evidenceStep1.statusText, "", "Step 1: statusText must be empty for configured finding");
console.log("  Step 1 PASSED: Finding A -> 'Line 3'");

// Step 2: Select finding B with unconfigured evidence -> Explorer shows Unconfigured Directive
const evidenceStep2 = getFindingActiveEvidence(findingB);
assert.equal(evidenceStep2.isConfigured, false, "Step 2: finding B must be marked unconfigured");
assert.equal(evidenceStep2.line, null, "Step 2: finding B must have line null");
assert.equal(evidenceStep2.citationText, "Unconfigured Directive", "Step 2: citation text must be 'Unconfigured Directive'");
assert.equal(evidenceStep2.hasLineCitation, false, "Step 2: hasLineCitation must be false");
assert.equal(evidenceStep2.statusText, "(No Line Citation)", "Step 2: statusText must be '(No Line Citation)'");
console.log("  Step 2 PASSED: Finding B -> 'Unconfigured Directive (No Line Citation)'");

// Step 3: Select finding A again -> Explorer MUST return to Line 3 (never reuse B's unconfigured state)
const evidenceStep3 = getFindingActiveEvidence(findingA);
assert.equal(evidenceStep3.isConfigured, true, "Step 3: finding A must be marked configured again");
assert.equal(evidenceStep3.line, 3, "Step 3: finding A must have line 3 again");
assert.equal(evidenceStep3.citationText, "Line 3", "Step 3: citation text must return to 'Line 3'");
assert.equal(evidenceStep3.hasLineCitation, true, "Step 3: hasLineCitation must return to true");
assert.equal(evidenceStep3.statusText, "", "Step 3: statusText must be empty again");
console.log("  Step 3 PASSED: Finding A -> 'Line 3' (re-selected)");

// Step 4: When changing configuration/audit, selection resets to null -> Explorer shows Pending Analysis
const evidenceStep4 = getFindingActiveEvidence(null);
assert.equal(evidenceStep4.isConfigured, false, "Step 4: null finding must be unconfigured");
assert.equal(evidenceStep4.citationText, "None (Awaiting Evaluation)", "Step 4: citation text must be 'None (Awaiting Evaluation)'");
assert.equal(evidenceStep4.hasLineCitation, false, "Step 4: hasLineCitation must be false");
assert.equal(evidenceStep4.statusText, "(Pending Analysis)", "Step 4: statusText must be '(Pending Analysis)'");
console.log("  Step 4 PASSED: Reset/Null -> 'None (Awaiting Evaluation) (Pending Analysis)'");

console.log("ALL EVIDENCE EXPLORER SELECTION SYNC REGRESSION TESTS PASSED (100%)!");
