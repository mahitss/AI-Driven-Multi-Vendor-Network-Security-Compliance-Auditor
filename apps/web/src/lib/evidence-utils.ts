import type { AnalysisFindingItem, AnalysisEvidenceItem } from "./api-client";

export interface ActiveEvidenceCitation {
  isConfigured: boolean;
  line: number | null;
  raw_text: string | null;
  citationText: string;
  hasLineCitation: boolean;
  statusText: string;
}

/**
 * Authoritative, deterministic derivation of evidence citation from a selected finding.
 * 
 * Rules:
 * 1. Derives strictly from the provided finding object (never leaks from prior state).
 * 2. If finding has line > 0, evidence_status = "configured", and raw_text present:
 *    Returns "Line N".
 * 3. If finding is genuinely unconfigured (line is null/0 or status is unconfigured):
 *    Returns "Unconfigured Directive" with sub-label "(No Line Citation)".
 * 4. If finding is null (e.g. audit reset or pending analysis):
 *    Returns "None (Awaiting Evaluation)" with sub-label "(Pending Analysis)".
 */
export function getFindingActiveEvidence(
  finding: AnalysisFindingItem | null | undefined
): ActiveEvidenceCitation {
  if (!finding) {
    return {
      isConfigured: false,
      line: null,
      raw_text: null,
      citationText: "None (Awaiting Evaluation)",
      hasLineCitation: false,
      statusText: "(Pending Analysis)",
    };
  }

  const lines = finding.evidence_lines || [];

  // 1. Primary match: Valid integer line > 0 with configured status and non-empty raw_text
  const primaryConfigured = lines.find(
    (e: AnalysisEvidenceItem) =>
      typeof e.line === "number" &&
      e.line > 0 &&
      e.evidence_status === "configured" &&
      Boolean(e.raw_text && e.raw_text.trim())
  );

  if (primaryConfigured && typeof primaryConfigured.line === "number" && primaryConfigured.line > 0) {
    return {
      isConfigured: true,
      line: primaryConfigured.line,
      raw_text: primaryConfigured.raw_text,
      citationText: `Line ${primaryConfigured.line}`,
      hasLineCitation: true,
      statusText: "",
    };
  }

  // 2. Secondary match: Any valid integer line > 0 with non-empty raw_text
  const secondaryConfigured = lines.find(
    (e: AnalysisEvidenceItem) =>
      typeof e.line === "number" &&
      e.line > 0 &&
      Boolean(e.raw_text && e.raw_text.trim())
  );

  if (secondaryConfigured && typeof secondaryConfigured.line === "number" && secondaryConfigured.line > 0) {
    return {
      isConfigured: true,
      line: secondaryConfigured.line,
      raw_text: secondaryConfigured.raw_text,
      citationText: `Line ${secondaryConfigured.line}`,
      hasLineCitation: true,
      statusText: "",
    };
  }

  // 3. Fallback: Any valid integer line > 0
  const anyValidLine = lines.find(
    (e: AnalysisEvidenceItem) => typeof e.line === "number" && e.line > 0
  );

  if (anyValidLine && typeof anyValidLine.line === "number" && anyValidLine.line > 0) {
    return {
      isConfigured: true,
      line: anyValidLine.line,
      raw_text: anyValidLine.raw_text || "",
      citationText: `Line ${anyValidLine.line}`,
      hasLineCitation: true,
      statusText: "",
    };
  }

  // 4. Genuinely unconfigured directive
  return {
    isConfigured: false,
    line: null,
    raw_text: null,
    citationText: "Unconfigured Directive",
    hasLineCitation: false,
    statusText: "(No Line Citation)",
  };
}
