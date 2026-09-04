/**
 * NetVigil Active Audit Session Persistence Helper
 * Ensures the user's selected audit session survives:
 * - Page refreshes (F5)
 * - Navigation across routes (/audits -> /findings -> /dashboard -> /audits)
 * - Deep links with ?audit_id= or ?configuration_id=
 *
 * Invariant: Stores ONLY non-sensitive UUID strings, never config bodies, secrets, or findings.
 */

export const ACTIVE_AUDIT_STORAGE_KEY = "netvigil_active_audit_id";

export function getPersistedActiveAuditId(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const val = window.localStorage.getItem(ACTIVE_AUDIT_STORAGE_KEY);
    return val && typeof val === "string" && val.trim().length > 0 ? val.trim() : null;
  } catch {
    return null;
  }
}

export function persistActiveAuditId(auditId: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    if (auditId && typeof auditId === "string" && auditId.trim().length > 0) {
      window.localStorage.setItem(ACTIVE_AUDIT_STORAGE_KEY, auditId.trim());
    }
  } catch {
    // Gracefully handle storage quota or disabled storage
  }
}

export function clearPersistedActiveAuditId(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(ACTIVE_AUDIT_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Resolves authoritative selected audit ID following the strict priority chain:
 * 1. Explicit audit ID from URL (?audit_id=...)
 * 2. Configuration ID from URL (?configuration_id=...)
 * 3. Persisted active audit ID from localStorage (if still present in audits list)
 * 4. Graceful fallback: Newest valid audit (audits[0])
 */
export function resolveAuthoritativeAuditId(
  audits: Array<{ id: string; configuration_id?: string }>,
  queryAuditId?: string | null,
  queryConfigId?: string | null
): string | null {
  if (!audits || audits.length === 0) return null;

  // 1. Explicit query audit ID
  if (queryAuditId) {
    const match = audits.find((a) => a.id === queryAuditId);
    if (match) {
      persistActiveAuditId(match.id);
      return match.id;
    }
  }

  // 2. Explicit query configuration ID
  if (queryConfigId) {
    const match = audits.find((a) => a.configuration_id === queryConfigId);
    if (match) {
      persistActiveAuditId(match.id);
      return match.id;
    }
  }

  // 3. Persisted active audit session from localStorage
  const persistedId = getPersistedActiveAuditId();
  if (persistedId) {
    const match = audits.find((a) => a.id === persistedId);
    if (match) {
      return match.id;
    }
  }

  // 4. Graceful fallback to newest valid audit
  const fallbackId = audits[0].id;
  persistActiveAuditId(fallbackId);
  return fallbackId;
}
