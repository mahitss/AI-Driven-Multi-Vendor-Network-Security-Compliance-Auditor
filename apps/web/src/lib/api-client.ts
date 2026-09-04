/**
 * NetVigil Type-Safe API Client
 * SIH26155 — NTRO Network Security Compliance Auditor
 */

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  database: {
    status: string;
    latency_ms: number | null;
    engine: string;
  };
  components: Record<string, string>;
}

export interface ConfigurationItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  hash: string;
  detected_vendor: string;
  detected_platform: string | null;
  detection_confidence: number;
  detection_method: string;
  parser_status: string;
  uploaded_at: string;
}

export interface ConfigurationDetail extends ConfigurationItem {
  raw_content: string;
  detection_details?: {
    patterns: string[];
    matches: Record<string, string>;
  };
}

export interface SecurityFact<T = any> {
  value: T;
  evidence: string[];
  source_lines: number[];
  confidence: number;
  method: string;
  status: "extracted" | "default_inferred" | "unknown";
}

export interface UnknownItem {
  raw_text: string;
  line_number?: number;
  vendor: string;
  category: string;
  confidence: number;
  status: string;
}

export interface NormalizedSecurityProfile {
  schema_version: string;
  vendor: string;
  platform: string | null;
  parser_name: string;
  parser_version: string;
  parser_confidence: number;
  facts_extracted_count: number;
  unknown_items_count: number;
  normalized_at: string;
  identity: {
    hostname: SecurityFact<string>;
    domain_name?: SecurityFact<string>;
    banner_motd_present: SecurityFact<boolean>;
    banner_legal_warning: SecurityFact<boolean>;
    os_family?: SecurityFact<string>;
    os_version?: SecurityFact<string>;
  };
  remote_access: {
    ssh_enabled: SecurityFact<boolean>;
    ssh_version: SecurityFact<number>;
    ssh_ciphers_secure: SecurityFact<boolean>;
    telnet_enabled: SecurityFact<boolean>;
    http_server_enabled: SecurityFact<boolean>;
    https_server_enabled: SecurityFact<boolean>;
    vty_access_class_applied: SecurityFact<boolean>;
    inactivity_timeout_minutes?: SecurityFact<number>;
  };
  authentication: {
    aaa_enabled: SecurityFact<boolean>;
    password_encryption_enabled: SecurityFact<boolean>;
    enable_secret_configured: SecurityFact<boolean>;
    enable_secret_type?: SecurityFact<string>;
    local_users_count: SecurityFact<number>;
    local_users: SecurityFact<string[]>;
    tacacs_servers: SecurityFact<string[]>;
    radius_servers: SecurityFact<string[]>;
    failed_login_lockout_enabled: SecurityFact<boolean>;
  };
  authorization: {
    role_based_access_enabled: SecurityFact<boolean>;
    command_authorization_enabled: SecurityFact<boolean>;
    accounting_commands_enabled: SecurityFact<boolean>;
  };
  logging: {
    logging_enabled: SecurityFact<boolean>;
    remote_logging_enabled: SecurityFact<boolean>;
    remote_syslog_servers: SecurityFact<string[]>;
    log_timestamps_enabled: SecurityFact<boolean>;
    buffered_logging_size_bytes?: SecurityFact<number>;
    logging_level?: SecurityFact<string>;
  };
  time_sync: {
    ntp_enabled: SecurityFact<boolean>;
    ntp_servers: SecurityFact<string[]>;
    ntp_authentication_enabled: SecurityFact<boolean>;
    timezone?: SecurityFact<string>;
  };
  access_control: {
    inbound_acls_count: SecurityFact<number>;
    control_plane_policing_enabled: SecurityFact<boolean>;
    default_drop_inbound: SecurityFact<boolean>;
  };
  services: {
    snmp_enabled: SecurityFact<boolean>;
    snmp_v3_only: SecurityFact<boolean>;
    snmp_default_communities_removed: SecurityFact<boolean>;
    cdp_enabled: SecurityFact<boolean>;
    lldp_enabled: SecurityFact<boolean>;
    finger_disabled: SecurityFact<boolean>;
    proxy_arp_disabled: SecurityFact<boolean>;
    ip_directed_broadcast_disabled: SecurityFact<boolean>;
  };
  management: {
    banner_motd_text?: SecurityFact<string>;
    login_delay_seconds?: SecurityFact<number>;
    session_limit_per_user?: SecurityFact<number>;
  };
  network_security: {
    spanning_tree_bpdu_guard_enabled: SecurityFact<boolean>;
    dhcp_snooping_enabled: SecurityFact<boolean>;
    dynamic_arp_inspection_enabled: SecurityFact<boolean>;
    port_security_enabled: SecurityFact<boolean>;
  };
  unknown_items: UnknownItem[];
}

export interface ConfigurationAnalysisDetail {
  configuration_id: string;
  filename: string;
  vendor: string;
  platform: string | null;
  status: string;
  facts_extracted: number;
  unknown_items_count: number;
  parser_confidence: number;
  parser_name: string;
  parser_version: string;
  processed_at: string;
  normalized_profile: NormalizedSecurityProfile;
  unknown_items: UnknownItem[];
}

// Compliance & Audit Interfaces
export interface FrameworkScore {
  framework: string;
  score: number;
  passed_count: number;
  failed_count: number;
  unknown_count: number;
  not_applicable_count: number;
  total_applicable: number;
  total_evaluated: number;
}

export interface SeverityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface Finding {
  id: string;
  audit_id: string;
  configuration_id?: string;
  device_name?: string;
  vendor?: string;
  framework: string;
  control_id: string;
  category?: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "NOT_APPLICABLE" | "UNKNOWN";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description?: string;
  evidence?: string;
  expected_value?: string;
  actual_value?: string;
  remediation?: string;
  finding_metadata?: {
    rule_id?: string;
    source_lines?: number[];
    evidence_list?: string[];
    source?: {
      control_id?: string;
      title?: string;
      document?: string;
      version?: string;
      reference?: string;
      verified?: boolean;
      source_type?: string;
    };
    confidence?: number;
  };
  created_at: string;
}

export interface AuditItem {
  id: string;
  configuration_id: string;
  device_id?: string;
  status: string;
  score?: number;
  started_at: string;
  completed_at?: string;
  summary_stats?: any;
}

export interface AuditDetail extends AuditItem {
  framework_scores: Record<string, FrameworkScore>;
  severity_breakdown: SeverityStats;
  status_breakdown: Record<string, number>;
  findings: Finding[];
}

export interface AuditSummary {
  audit_id: string;
  configuration_id: string;
  overall_score: number;
  status: string;
  frameworks: Record<string, number>;
  summary: SeverityStats;
  status_counts: Record<string, number>;
  completed_at?: string;
}

export interface FrameworkMetadata {
  framework: string;
  name: string;
  version: string;
  description: string;
  document_reference?: string;
  source_type: string;
  verified: boolean;
  controls_count: number;
}

// AI Intelligence Schemas
export interface FindingExplanation {
  summary: string;
  why_it_matters: string;
  technical_explanation: string;
  risk_context: string;
  recommended_action: string;
  confidence: number;
  evidence_used: string[];
  source_lines: number[];
  disclaimer: string;
}

export interface AuditAssistantResponse {
  query: string;
  audit_id: string;
  answer: string;
  supporting_findings: string[];
  confidence: number;
  sources_count: number;
}

export interface UnknownInterpretation {
  status: "candidate" | "uncertain" | "unsupported";
  normalized_category: string;
  semantic_meaning: string;
  candidate_property?: string;
  candidate_value?: any;
  confidence: number;
  reasoning_summary: string;
  evidence: string[];
  alternative_interpretations: string[];
  confidence_tier: "high" | "review" | "low";
}

// Adaptive Training & Knowledge Schemas
export interface TrainingMapping {
  id: string;
  vendor: string;
  platform?: string | null;
  raw_pattern: string;
  normalized_pattern?: string | null;
  candidate_property: string;
  candidate_value: any;
  semantic_meaning: string;
  category: string;
  confidence: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";
  source: string;
  rejection_reason?: string | null;
  created_by_email?: string | null;
  version: number;
  usage_count: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface TrainingStats {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  disabled_count: number;
  total_mappings: number;
  vendors_learned_count: number;
  vendors_learned: string[];
}

export interface FindingTransition {
  framework: string;
  control_id: string;
  title: string;
  previous_status: string;
  new_status: string;
  severity: string;
  actual_value?: any;
}

export interface TrainingImpact {
  configuration_id: string;
  audit_id: string;
  previous_score: number;
  new_score: number;
  score_delta: number;
  previous_unknown_directives: number;
  new_unknown_directives: number;
  resolved_directives_count: number;
  evaluated_controls_count: number;
  finding_transitions: FindingTransition[];
  mappings_applied_count: number;
  reanalyzed_at: string;
}

export interface AllowlistProperty {
  property: string;
  type: string;
  category: string;
  description: string;
}

export interface OverviewStats {
  total_configurations: number;
  managed_assets?: number;
  total_devices: number;
  total_audits: number;
  total_findings: number;
  open_findings: number;
  lifetime_findings_evaluated: number;
  compliance_score: number;
  risk_score: number;
  score_delta: number | null;
  latest_audit?: {
    id: string;
    configuration_id?: string;
    filename: string;
    score: number;
    status?: string;
    timestamp?: string | null;
  } | null;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  framework_scores: Record<string, number>;
  vendor_breakdown: Record<string, number>;
  supported_vendors: string[];
  supported_frameworks: string[];
}

export function getApiBase(): string {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production";

  // 1. In browser production, default to same-origin (window.location.origin)
  // so requests seamlessly route through Next.js rewrite proxy in next.config.ts
  // (/api/v1/* -> Render), eliminating CORS preflight errors and cross-origin credential blocking.
  if (typeof window !== "undefined" && isProduction) {
    return window.location.origin;
  }

  // 2. Check explicit environment variables (NEXT_PUBLIC_API_URL or NEXT_PUBLIC_API_BASE_URL)
  const custom =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL;
  if (custom && custom.trim()) {
    let trimmed = custom.trim().replace(/\/$/, "");
    if (
      isProduction &&
      trimmed.startsWith("http://") &&
      !trimmed.includes("localhost") &&
      !trimmed.includes("127.0.0.1")
    ) {
      trimmed = trimmed.replace("http://", "https://");
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
  }

  // 3. In server-side production mode (SSR), default to the live Render backend
  if (isProduction) {
    return "https://ai-driven-multi-vendor-network-security.onrender.com";
  }

  // 4. In local development, connect directly to local FastAPI server
  return "http://127.0.0.1:8000";
}

export const API_BASE = getApiBase();

import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return {
        Authorization: `Bearer ${data.session.access_token}`,
      };
    }
  } catch {
    // Session uninitialized or unauthenticated
  }
  return {};
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number[];
  onRetry?: (attempt: number, error: any) => void;
}

export function isTransientServerError(err: any): boolean {
  const status = err?.status;
  if (typeof status === "number") {
    // Retry HTTP 500, 502, 503, 504 ONLY
    if ([500, 502, 503, 504].includes(status)) {
      return true;
    }
    // Do NOT retry 4xx errors such as 400, 401, 403, 404
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  const msg = String(err?.message || "");
  // Explicitly reject 4xx errors
  if (
    msg.includes("HTTP 400") ||
    msg.includes("HTTP 401") ||
    msg.includes("HTTP 403") ||
    msg.includes("HTTP 404") ||
    msg.includes("AUTHENTICATION REQUIRED")
  ) {
    return false;
  }

  // Transient 5xx server errors
  if (
    msg.includes("HTTP 500") ||
    msg.includes("HTTP 502") ||
    msg.includes("HTTP 503") ||
    msg.includes("HTTP 504") ||
    msg.includes("API ERROR: The backend returned HTTP 500") ||
    msg.includes("API ERROR: The backend returned HTTP 502") ||
    msg.includes("API ERROR: The backend returned HTTP 503") ||
    msg.includes("API ERROR: The backend returned HTTP 504")
  ) {
    return true;
  }

  return false;
}

export async function retryTransientHydration<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const backoffMs = options.backoffMs ?? [1000, 2000];

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt < maxRetries && isTransientServerError(err)) {
        const delay = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1] ?? 1000;
        options.onRetry?.(attempt + 1, err);
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

export const DEFAULT_TIMEOUT_MS = 60000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const authHeaders = await getAuthHeaders();
  const headers = new Headers(options.headers || {});
  if (authHeaders.Authorization && !headers.has("Authorization")) {
    headers.set("Authorization", authHeaders.Authorization);
  }

  const method = options.method || "GET";
  const hasAuth = !!headers.get("Authorization");
  const credsMode = options.credentials || "include";

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: options.credentials || "include",
      signal: options.signal || controller.signal,
    });

    if (process.env.NODE_ENV === "development" || typeof window !== "undefined") {
      const wwwAuth = res.headers.get("www-authenticate") || "NONE";
      const hasCookie = typeof document !== "undefined" && !!document.cookie;
      if (res.status === 401 || res.status === 403) {
        console.warn(
          `[NETVIGIL AUTH DEBUG]\nURL: ${url}\nMETHOD: ${method}\nAuthorization present: ${hasAuth ? "YES" : "NO"}\nCookie present: ${hasCookie ? "YES" : "NO"}\nCredentials mode: ${credsMode}\nResponse status: ${res.status}\nResponse WWW-Authenticate header: ${wwwAuth}`
        );
      }
    }

    if (res.status === 401) {
      throw new ApiError(`AUTHENTICATION REQUIRED: The API rejected this request with HTTP 401.`, 401);
    }
    if (res.status === 500) {
      throw new ApiError(`API ERROR: The backend returned HTTP 500.`, 500);
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new ApiError(`API ERROR: The backend returned HTTP ${res.status}.`, res.status);
    }

    return res;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new ApiError(`BACKEND TIMEOUT (${timeoutMs / 1000}s): Unable to reach NetVigil API at ${url}.`, 504);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    if (err?.message?.startsWith("AUTHENTICATION REQUIRED") || err?.message?.startsWith("API ERROR")) {
      throw err;
    }
    throw new ApiError(`BACKEND UNAVAILABLE: Unable to connect to NetVigil API at the configured endpoint.`, 503);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  return fetchWithTimeout(url, init);
}

export async function fetchHealth(): Promise<SystemHealth> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/health`, { cache: "no-store" }, 6000);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Attempt /api/v1/health fallback
  }

  try {
    const res2 = await fetchWithTimeout(`${base}/api/v1/health`, { cache: "no-store" }, 6000);
    if (res2.ok) {
      return await res2.json();
    }
  } catch {
    // Fall through to error
  }

  throw new Error("Health check failed");
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch overview metrics: HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadConfigFile(file: File): Promise<ConfigurationItem> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch(`${API_BASE}/api/v1/configurations`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Upload failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchConfigurations(vendor?: string): Promise<ConfigurationItem[]> {
  const url = new URL(`${API_BASE}/api/v1/configurations`);
  if (vendor && vendor !== "all") {
    url.searchParams.set("vendor", vendor);
  }
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch configurations: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchConfigurationDetail(id: string): Promise<ConfigurationDetail> {
  const res = await apiFetch(`${API_BASE}/api/v1/configurations/${id}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch configuration details: HTTP ${res.status}`);
  }
  return res.json();
}

export async function analyzeConfiguration(id: string): Promise<ConfigurationAnalysisDetail> {
  const res = await apiFetch(`${API_BASE}/api/v1/configurations/${id}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Analysis failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchConfigurationAnalysis(id: string): Promise<ConfigurationAnalysisDetail> {
  const res = await apiFetch(`${API_BASE}/api/v1/configurations/${id}/analysis`, {
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to fetch analysis: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// Audit API Methods
export async function createAudit(payload: {
  configuration_id: string;
  frameworks?: string[];
}): Promise<AuditSummary> {
  const res = await apiFetch(`${API_BASE}/api/v1/audits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Audit execution failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchAudits(configurationId?: string): Promise<AuditItem[]> {
  const url = new URL(`${API_BASE}/api/v1/audits`);
  if (configurationId) {
    url.searchParams.set("configuration_id", configurationId);
  }
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audits: HTTP ${res.status}`);
  }
  return res.json();
}

export interface LatestAuditSummary {
  audit_id: string;
  configuration_id: string;
  filename: string;
  sha256: string;
  vendor: string;
  vendor_confidence: number;
  compliance_score: number;
  risk_score: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  findings_count: number;
  open_findings: number;
  total_configurations: number;
  total_devices: number;
  created_at: string;
  completed_at?: string;
}

export async function fetchLatestAudit(): Promise<LatestAuditSummary | null> {
  const res = await apiFetch(`${API_BASE}/api/v1/audits/latest`, { cache: "no-store" });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch latest audit summary: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditDetail(auditId: string): Promise<AuditDetail> {
  const res = await apiFetch(`${API_BASE}/api/v1/audits/${auditId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit detail: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditFindings(
  auditId: string,
  filters?: { framework?: string; severity?: string; status?: string; category?: string }
): Promise<Finding[]> {
  const url = new URL(`${API_BASE}/api/v1/audits/${auditId}/findings`);
  if (filters?.framework && filters.framework !== "ALL") {
    url.searchParams.set("framework", filters.framework);
  }
  if (filters?.severity && filters.severity !== "ALL") {
    url.searchParams.set("severity", filters.severity);
  }
  if (filters?.status && filters.status !== "ALL") {
    url.searchParams.set("status", filters.status);
  }
  if (filters?.category && filters.category !== "ALL") {
    url.searchParams.set("category", filters.category);
  }

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit findings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFrameworks(): Promise<FrameworkMetadata[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/frameworks`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch frameworks: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFrameworkControls(framework: string): Promise<FrameworkControlItem[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/frameworks/${encodeURIComponent(framework)}/controls`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch controls for framework ${framework}: HTTP ${res.status}`);
  }
  return res.json();
}

// AI Intelligence API Methods
export async function fetchFindingExplanation(findingId: string): Promise<FindingExplanation> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/findings/${findingId}/explanation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Finding explanation failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function queryAuditAssistant(auditId: string, query: string): Promise<AuditAssistantResponse> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/audits/${auditId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audit_id: auditId, query }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Audit assistant query failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export interface RiskExplanation {
  risk_id: string;
  title: string;
  deterministic_risk_score: number;
  priority: string;
  why_this_risk_is_prioritized: string;
  contributing_findings_analysis: string[];
  attack_surface_analysis: string;
  business_operational_impact: string;
  why_remediation_matters: string;
  confidence: number;
  disclaimer: string;
}

export interface RemediationExplanation {
  remediation_id: string;
  control_id: string;
  vendor: string;
  what_changes: string;
  why_change_is_safe: string;
  what_security_property_is_restored: string;
  what_operator_should_verify: string;
  confidence: number;
  disclaimer: string;
}

export async function fetchRiskExplanation(riskId: string): Promise<RiskExplanation> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/ai/risks/${riskId}/explanation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Risk explanation failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchRemediationExplanation(remediationId: string): Promise<RemediationExplanation> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/ai/remediations/${remediationId}/explanation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Remediation explanation failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function interpretSyntax(payload: {
  raw_command: string;
  vendor_hint: string;
  platform_hint?: string;
  nearby_context?: string[];
}): Promise<UnknownInterpretation> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/interpret-syntax`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Syntax interpretation failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function interpretConfigurationUnknowns(configId: string): Promise<UnknownInterpretation[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/configurations/${configId}/interpret-unknown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Batch interpretation failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchAIStatus(): Promise<any> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/status`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`AI status check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAIGatewayHealth(): Promise<any> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`AI Gateway health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAIModels(): Promise<any[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/models`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`AI models check failed: HTTP ${res.status}`);
  }
  return res.json();
}

// Adaptive Training & Knowledge API Methods
export async function fetchTrainingPending(vendor?: string): Promise<TrainingMapping[]> {
  const url = new URL(`${API_BASE}/api/v1/training/pending`);
  if (vendor && vendor !== "all") {
    url.searchParams.set("vendor", vendor);
  }
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch pending training reviews: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchTrainingMappings(filters?: {
  status?: string;
  vendor?: string;
  category?: string;
}): Promise<TrainingMapping[]> {
  const url = new URL(`${API_BASE}/api/v1/training/mappings`);
  if (filters?.status && filters.status !== "ALL") {
    url.searchParams.set("status", filters.status);
  }
  if (filters?.vendor && filters.vendor !== "ALL") {
    url.searchParams.set("vendor", filters.vendor);
  }
  if (filters?.category && filters.category !== "ALL") {
    url.searchParams.set("category", filters.category);
  }

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch knowledge mappings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function createTrainingMapping(payload: {
  vendor: string;
  raw_pattern: string;
  candidate_property: string;
  candidate_value: any;
  semantic_meaning: string;
  category?: string;
  platform?: string;
  normalized_pattern?: string;
  confidence?: number;
  status?: string;
}): Promise<TrainingMapping> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/mappings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to create mapping: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function approveTrainingMapping(mappingId: string): Promise<TrainingMapping> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to approve mapping: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function editTrainingMapping(
  mappingId: string,
  payload: {
    candidate_property: string;
    candidate_value: any;
    semantic_meaning: string;
    category: string;
    normalized_pattern?: string;
    reason?: string;
  }
): Promise<TrainingMapping> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to edit mapping: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function rejectTrainingMapping(mappingId: string, reason?: string): Promise<TrainingMapping> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "Rejected by security administrator" }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to reject mapping: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function disableTrainingMapping(mappingId: string): Promise<TrainingMapping> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to disable mapping: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function reEnableTrainingMapping(mappingId: string): Promise<TrainingMapping> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/re-enable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Failed to re-enable mapping: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function reanalyzeConfiguration(
  configId: string,
  frameworks?: string[]
): Promise<TrainingImpact> {
  const url = new URL(`${API_BASE}/api/v1/training/reanalyze/${configId}`);
  if (frameworks) {
    frameworks.forEach((f) => url.searchParams.append("frameworks", f));
  }

  const res = await apiFetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Reanalysis failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function fetchTrainingStats(): Promise<TrainingStats> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch training stats: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAllowlist(): Promise<AllowlistProperty[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/training/allowlist`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch allowlist: HTTP ${res.status}`);
  }
  return res.json();
}

// -------------------------------------------------------------
// Risk Intelligence Interfaces & Methods
// -------------------------------------------------------------
export interface RiskItem {
  id: string;
  audit_id: string;
  device_id?: string | null;
  title: string;
  description: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  risk_score: number;
  priority: "P0" | "P1" | "P2" | "P3";
  likelihood: string;
  impact: string;
  exposure: string;
  confidence: number;
  finding_ids: string[];
  affected_assets: string[];
  evidence_summary?: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "REMEDIATION_RECOMMENDED" | "REMEDIATED" | "ACCEPTED_RISK" | "FALSE_POSITIVE";
  created_at: string;
  updated_at?: string | null;
}

export interface RiskGraphNode {
  id: string;
  type: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface RiskGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface RiskGraph {
  nodes: RiskGraphNode[];
  edges: RiskGraphEdge[];
  summary: {
    nodes_count: number;
    edges_count: number;
    risks_count: number;
  };
}

export interface RiskStats {
  total_risks: number;
  p0_count: number;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  average_risk_score: number;
}

export async function fetchRisks(filters?: {
  severity?: string;
  priority?: string;
  category?: string;
  status?: string;
}): Promise<RiskItem[]> {
  const url = new URL(`${API_BASE}/api/v1/risks`);
  if (filters?.severity && filters.severity !== "ALL") url.searchParams.set("severity", filters.severity);
  if (filters?.priority && filters.priority !== "ALL") url.searchParams.set("priority", filters.priority);
  if (filters?.category && filters.category !== "ALL") url.searchParams.set("category", filters.category);
  if (filters?.status && filters.status !== "ALL") url.searchParams.set("status", filters.status);

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch risks: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditRisks(
  auditId: string,
  filters?: { severity?: string; priority?: string; category?: string; status?: string }
): Promise<RiskItem[]> {
  const url = new URL(`${API_BASE}/api/v1/audits/${auditId}/risks`);
  if (filters?.severity && filters.severity !== "ALL") url.searchParams.set("severity", filters.severity);
  if (filters?.priority && filters.priority !== "ALL") url.searchParams.set("priority", filters.priority);
  if (filters?.category && filters.category !== "ALL") url.searchParams.set("category", filters.category);
  if (filters?.status && filters.status !== "ALL") url.searchParams.set("status", filters.status);

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit risks: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRiskDetail(riskId: string): Promise<RiskItem> {
  const res = await apiFetch(`${API_BASE}/api/v1/risks/${riskId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch risk details: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditRiskGraph(auditId: string): Promise<RiskGraph> {
  const res = await apiFetch(`${API_BASE}/api/v1/audits/${auditId}/risk-graph`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch risk graph: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRiskStats(): Promise<RiskStats> {
  const res = await apiFetch(`${API_BASE}/api/v1/risks/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch risk stats: HTTP ${res.status}`);
  }
  return res.json();
}

// -------------------------------------------------------------
// Remediation Center Interfaces & Methods
// -------------------------------------------------------------
export interface RemediationProposal {
  id: string;
  audit_id: string;
  finding_id?: string | null;
  risk_id?: string | null;
  vendor: string;
  platform?: string | null;
  normalized_control: string;
  title: string;
  status: "AVAILABLE" | "REVIEW_REQUIRED" | "REVIEWED" | "NOT_AVAILABLE";
  remediation_commands: string;
  rollback_commands?: string | null;
  diff_preview?: {
    diff_lines: Array<{ type: "REMOVE" | "ADD" | "UNCHANGED"; line: string; description?: string }>;
    remove_count: number;
    add_count: number;
    vendor?: string;
    preview_text?: string;
  };
  why_recommended: string;
  potential_impact: string;
  verification_steps: string;
  template_id: string;
  template_version: string;
  confidence: number;
  is_reviewed: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface RemediationStats {
  total_proposals: number;
  available_count: number;
  reviewed_count: number;
  not_available_count: number;
}

export async function fetchRemediations(filters?: { vendor?: string; status?: string }): Promise<RemediationProposal[]> {
  const url = new URL(`${API_BASE}/api/v1/remediations`);
  if (filters?.vendor && filters.vendor !== "ALL") url.searchParams.set("vendor", filters.vendor);
  if (filters?.status && filters.status !== "ALL") url.searchParams.set("status", filters.status);

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch remediations: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditRemediations(
  auditId: string,
  filters?: { vendor?: string; status?: string }
): Promise<RemediationProposal[]> {
  const url = new URL(`${API_BASE}/api/v1/audits/${auditId}/remediations`);
  if (filters?.vendor && filters.vendor !== "ALL") url.searchParams.set("vendor", filters.vendor);
  if (filters?.status && filters.status !== "ALL") url.searchParams.set("status", filters.status);

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit remediations: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFindingRemediation(findingId: string): Promise<RemediationProposal | null> {
  const res = await apiFetch(`${API_BASE}/api/v1/findings/${findingId}/remediation`, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch finding remediation: HTTP ${res.status}`);
  }
  return res.json();
}

export async function reviewRemediation(
  remediationId: string,
  payload?: { reviewer_email?: string; notes?: string }
): Promise<RemediationProposal> {
  const res = await apiFetch(`${API_BASE}/api/v1/remediations/${remediationId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || { reviewer_email: "admin@ntro.gov.in" }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Review failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export async function fetchRemediationStats(): Promise<RemediationStats> {
  const res = await apiFetch(`${API_BASE}/api/v1/remediations/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch remediation stats: HTTP ${res.status}`);
  }
  return res.json();
}

// -------------------------------------------------------------
// Operations, Activity, Search, Devices & Reports
// -------------------------------------------------------------
export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  target_id?: string;
  target_url?: string;
  timestamp: string;
  severity: "INFO" | "HIGH" | "SUCCESS" | "WARNING" | "CRITICAL";
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
  category?: string;
  severity?: string;
  status?: string;
  evidence?: string;
  framework?: string;
  vendor?: string;
  control_id?: string;
  line_number?: number;
}

export interface UnifiedSearchResult {
  query: string;
  total_results: number;
  categories: {
    navigation: SearchResultItem[];
    findings: SearchResultItem[];
    controls: SearchResultItem[];
    configurations: SearchResultItem[];
    audits: SearchResultItem[];
    risks: SearchResultItem[];
    remediations: SearchResultItem[];
    reports: SearchResultItem[];
  };
  configurations: SearchResultItem[];
  audits: SearchResultItem[];
  findings: SearchResultItem[];
  controls: SearchResultItem[];
  risks: SearchResultItem[];
  remediations: SearchResultItem[];
  reports: SearchResultItem[];
  navigation: SearchResultItem[];
}

export interface DeviceItem {
  id: string;
  hostname: string;
  vendor: string;
  platform: string;
  model: string;
  firmware_version: string;
  last_audit_id?: string | null;
  last_audit_score?: number | null;
  risk_score: number;
  status: "HARDENED" | "NEEDS_ATTENTION" | "HIGH_RISK" | "PENDING_AUDIT";
  last_seen: string;
  file_size_bytes?: number;
}

export interface DeviceDetail {
  id: string;
  hostname: string;
  vendor: string;
  platform: string;
  model: string;
  serial_number: string;
  firmware_version: string;
  compliance_score?: number | null;
  risk_score: number;
  latest_audit_id?: string | null;
  latest_audit_at?: string | null;
  open_findings_count: number;
  critical_findings_count: number;
  high_findings_count: number;
  normalized_profile?: any;
  unknown_items?: any[];
  uploaded_at: string;
}

export interface DeviceTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: string;
}

export interface ReportDocument {
  id: string;
  report_type: string;
  title: string;
  target_device: string;
  audit_id: string;
  compliance_score: number;
  status: string;
  created_at: string;
  sections: {
    identity?: any;
    executive_summary?: any;
    findings_summary?: any;
    framework_coverage?: Record<string, any>;
    framework_breakdown?: Record<string, any>;
    top_risks?: any[];
    critical_findings?: any[];
    remediation_action_items?: any[];
    security_evolution?: any;
    evidence_items?: any[];
    remediation_items?: any[];
    [key: string]: any;
  };
  notes?: string;
}

export interface SecurityActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  target_id: string;
  target_url: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | "SUCCESS" | "WARNING";
}

export async function fetchSystemActivity(limit?: number): Promise<SecurityActivityEvent[]> {
  const url = new URL(`${API_BASE}/api/v1/overview/activity`);
  if (limit) url.searchParams.set("limit", String(limit));
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch activity stream: HTTP ${res.status}`);
  }
  return res.json();
}

export async function globalSearch(
  q: string,
  contextAuditId?: string,
  contextConfigId?: string
): Promise<UnifiedSearchResult> {
  const url = new URL(`${API_BASE}/api/v1/overview/search`);
  url.searchParams.set("q", q);
  if (contextAuditId) url.searchParams.set("context_audit_id", contextAuditId);
  if (contextConfigId) url.searchParams.set("context_config_id", contextConfigId);
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Global search failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDevices(vendor?: string): Promise<DeviceItem[]> {
  const url = new URL(`${API_BASE}/api/v1/devices`);
  if (vendor && vendor !== "ALL") url.searchParams.set("vendor", vendor);
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch devices: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDeviceDetail(deviceId: string): Promise<DeviceDetail> {
  const res = await apiFetch(`${API_BASE}/api/v1/devices/${deviceId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch device details: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDeviceTimeline(deviceId: string): Promise<DeviceTimelineEvent[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/devices/${deviceId}/timeline`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch device timeline: HTTP ${res.status}`);
  }
  return res.json();
}

export async function generateReport(payload: {
  report_type: string;
  audit_id?: string;
  title?: string;
  notes?: string;
}): Promise<ReportDocument> {
  const res = await apiFetch(`${API_BASE}/api/v1/reports/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Report generation failed: HTTP ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export async function fetchReports(): Promise<ReportDocument[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/reports`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch reports: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchReportDetail(reportId: string): Promise<ReportDocument> {
  const res = await apiFetch(`${API_BASE}/api/v1/reports/${reportId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch report detail: HTTP ${res.status}`);
  }
  return res.json();
}

export interface AuditComparisonResult {
  baseline_audit_id: string;
  remediated_audit_id: string;
  baseline_compliance_score: number;
  remediated_compliance_score: number;
  compliance_improvement: number;
  baseline_failed_count: number;
  remediated_failed_count: number;
  resolved_count: number;
  resolved_controls: string[];
  new_violations_count: number;
  new_violations: string[];
  unchanged_failures_count: number;
}

export async function compareAudits(payload: {
  baseline_audit_id: string;
  remediated_audit_id: string;
}): Promise<AuditComparisonResult> {
  const res = await apiFetch(`${API_BASE}/api/v1/reports/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Audit comparison failed: HTTP ${res.status}`);
  }
  return res.json();
}

export interface GoldenDemoState {
  status: string;
  demo_mode: boolean;
  device_name: string;
  configuration_id: string;
  audit_id: string;
  vendor: string;
  platform: string;
  compliance_score: number;
  total_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  unknown_controls: number;
  total_risks: number;
  total_remediations: number;
  framework_scores: Record<string, number>;
  pipeline_latency: {
    ingestion_ms: number;
    parsing_and_normalization_ms: number;
    compliance_evaluation_ms: number;
    risk_scoring_ms: number;
    remediation_diff_ms: number;
    total_ms: number;
  };
}

export async function initGoldenDemo(): Promise<GoldenDemoState> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/demo/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to initialize golden demo: HTTP ${res.status}`);
  }
  return res.json();
}

export interface EngineDiagnostics {
  engine_version: string;
  database_response_ms: number;
  benchmarks: Record<string, number>;
  supported_vendors: string[];
  supported_frameworks: string[];
  security_invariants: Record<string, boolean>;
}

export async function fetchEngineDiagnostics(): Promise<EngineDiagnostics> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/diagnostics`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch engine diagnostics: HTTP ${res.status}`);
  }
  return res.json();
}

export interface FrameworkControlItem {
  rule_id: string;
  framework: string;
  control_id: string;
  title: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  description: string;
  fact_path: string;
  operator: string;
  expected_value: any;
  explanation: string;
  source: {
    control_id?: string;
    title?: string;
    document?: string;
    version?: string;
    reference?: string;
    verified?: boolean;
    source_type?: string;
  };
}


export async function fetchFindings(filters?: {
  framework?: string;
  severity?: string;
  status?: string;
  audit_id?: string;
}): Promise<Finding[]> {
  let urlStr = `${API_BASE}/api/v1/audits/findings/all`;
  if (filters?.audit_id && filters.audit_id !== "ALL") {
    urlStr = `${API_BASE}/api/v1/audits/${filters.audit_id}/findings`;
  }
  const url = new URL(urlStr);
  if (filters?.framework && filters.framework !== "ALL") url.searchParams.set("framework", filters.framework);
  if (filters?.severity && filters.severity !== "ALL") url.searchParams.set("severity", filters.severity);
  if (filters?.status && filters.status !== "ALL") url.searchParams.set("status", filters.status);

  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch findings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOverviewActivity(limit = 15): Promise<ActivityEvent[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/activity?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch overview activity: HTTP ${res.status}`);
  }
  return res.json();
}


export interface MultiVendorFact {
  value: any;
  evidence: string[];
  source_lines: number[];
}

export interface MultiVendorDeviceResult {
  vendor_id: string;
  display_name: string;
  device_name: string;
  platform: string;
  parser_name: string;
  parser_version: string;
  configuration_id: string;
  audit_id: string;
  raw_content_preview: string;
  facts_extracted_count: number;
  unknown_items_count: number;
  compliance_score: number;
  framework_scores: Record<string, number>;
  total_findings: number;
  passed_controls?: number;
  total_controls_evaluated?: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  total_risks: number;
  top_risks: Array<{
    id: string;
    title: string;
    risk_score: number;
    priority: string;
    category: string;
  }>;
  total_remediations: number;
  sample_remediations: Array<{
    id: string;
    title: string;
    control: string;
    commands: string;
    rollback: string;
  }>;
  normalized_facts: Record<string, MultiVendorFact>;
  latency: {
    ingest_ms: number;
    parse_ms: number;
    audit_ms: number;
    risk_ms: number;
    rem_ms: number;
    total_ms: number;
  };
}

export interface ComparisonMatrixProperty {
  property_key: string;
  display_name: string;
  target_standard: string;
  cisco: {
    value: any;
    syntax: string;
    line: number | null;
    status: string;
  };
  juniper: {
    value: any;
    syntax: string;
    line: number | null;
    status: string;
  };
  fortinet: {
    value: any;
    syntax: string;
    line: number | null;
    status: string;
  };
  equivalence_verdict: string;
}

export interface MultiVendorProofState {
  status: string;
  demo_mode: string;
  architectural_message: string;
  vendors: Record<string, MultiVendorDeviceResult>;
  comparison_matrix: ComparisonMatrixProperty[];
  unsupported_vendor_example: {
    vendor_name: string;
    native_parser: boolean;
    status: string;
    handling_mechanism: string;
    message: string;
  };
  ai_advisory: {
    summary: string;
    grounding: string;
    read_only: boolean;
  };
}

export async function initMultiVendorDemo(): Promise<MultiVendorProofState> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/overview/demo/multi-vendor/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to initialize multi-vendor demonstration: HTTP ${res.status}`);
  }
  return res.json();
}

// ============================================================================
// DETERMINISTIC END-TO-END SECURITY ANALYSIS PIPELINE
// ============================================================================

export interface AnalysisIngestResponse {
  analysis_id: string;
  vendor: string;
  platform: string | null;
  status: string;
  filename: string;
  file_hash: string;
  lines_count: number;
  facts_extracted_count: number;
  unknown_items_count: number;
}

export interface AnalysisStatus {
  analysis_id: string;
  filename: string;
  vendor: string;
  platform: string | null;
  status: string;
  lines_parsed: number;
  facts_extracted_count: number;
  unknown_items_count: number;
  controls_evaluated_count: number;
  pass_count: number;
  fail_count: number;
  unknown_count: number;
  compliance_score?: number | null;
  risk_score?: number | null;
  risk_level?: string | null;
  total_applicable_controls?: number;
  applicable_count?: number;
  total_applicable?: number;
  not_applicable_count?: number;
  passed_controls?: number;
  failed_controls?: number;
  unknown_controls?: number;
  compliance_percent?: number;
  remediation_status?: string;
  remediation_proposals_count?: number;
  verification_status?: string;
  verification_details?: any;
  created_at: string;
  processed_at: string | null;
}

export interface AnalysisEvidenceItem {
  line?: number | null;
  raw_text: string;
  property_path?: string | null;
  context?: string | null;
  evidence_status?: string | null;
}

export interface AnalysisFindingItem {
  finding_id: string;
  control_id: string;
  framework: string;
  title: string;
  severity: string;
  status: string;
  expected_value?: string | null;
  actual_value?: string | null;
  why_it_failed?: string | null;
  evidence_lines: AnalysisEvidenceItem[];
  remediation_proposal?: string | null;
  remediation_diff?: {
    diff_lines: Array<{ type: string; line: string; description: string }>;
    remove_count: number;
    add_count: number;
    vendor: string;
    preview_text: string;
  } | null;
}

export interface AnalysisRiskReport {
  risk_score?: number | null;
  risk_level?: string | null;
  likelihood?: string | null;
  formula_breakdown: string;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  contributing_findings: Array<{
    finding_id: string;
    control_id: string;
    title: string;
    severity: string;
    evidence: string;
  }>;
}

export interface AnalysisRemediationResult {
  analysis_id: string;
  audit_id: string;
  remediation_status: string;
  proposals_count: number;
  eligible_controls_count: number;
  remediated_content: string;
  remediated_hash: string;
  proposals: any[];
}

export interface AnalysisReanalyzeResult {
  analysis_id: string;
  status: string;
  previous_fail_count: number;
  new_fail_count: number;
  previous_compliance_score: number;
  new_compliance_score: number;
  previous_risk_score: number;
  new_risk_score: number;
  resolved_controls: string[];
  findings_transition: Array<{
    control_id: string;
    framework: string;
    title: string;
    previous_status: string;
    new_status: string;
    resolved: boolean;
  }>;
  verification_status?: string;
  remediated_findings?: Array<{
    control_id: string;
    title: string;
    original_status: string;
    expected_post_remediation_status: string;
    actual_post_remediation_status: string;
    original_evidence: any[];
    remediated_evidence: any[];
    verification_status: string;
  }>;
  original_hash?: string;
  remediated_hash?: string;
}

export interface AnalysisConfigurationContent {
  analysis_id: string;
  filename: string;
  vendor: string;
  hash: string;
  line_count: number;
  lines: Array<{ line: number; text: string }>;
  raw_text: string;
  raw_content?: string;
  remediated_text?: string;
}

export async function ingestAnalysis(
  content: string,
  filename: string = "cisco_edge_router.cfg",
  vendorHint?: string
): Promise<AnalysisIngestResponse> {
  let cleanFilename = filename?.trim() || "network-config.cfg";
  if (!cleanFilename.includes(".")) {
    if (vendorHint === "juniper") cleanFilename += ".set";
    else if (vendorHint === "fortinet") cleanFilename += ".conf";
    else cleanFilename += ".cfg";
  }

  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename: cleanFilename, vendor_hint: vendorHint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    const errorMsg = err?.error?.message || err?.detail || err?.message || `Ingestion failed (HTTP ${res.status})`;
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchAnalysisStatus(
  analysisId: string,
  retryOptions?: RetryOptions
): Promise<AnalysisStatus> {
  return retryTransientHydration(async () => {
    const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}`);
    if (!res.ok) {
      throw new ApiError(`Failed to fetch analysis status: HTTP ${res.status}`, res.status);
    }
    return res.json();
  }, retryOptions);
}

export async function fetchAnalysisFindings(
  analysisId: string,
  statusFilter?: string
): Promise<AnalysisFindingItem[]> {
  const url = new URL(`${API_BASE}/api/v1/analysis/${analysisId}/findings`);
  if (statusFilter) {
    url.searchParams.set("status_filter", statusFilter);
  }
  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch analysis findings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAnalysisEvidence(analysisId: string): Promise<AnalysisEvidenceItem[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/evidence`);
  if (!res.ok) {
    throw new Error(`Failed to fetch analysis evidence: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAnalysisRisk(
  analysisId: string,
  retryOptions?: RetryOptions
): Promise<AnalysisRiskReport> {
  return retryTransientHydration(async () => {
    const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/risk`);
    if (!res.ok) {
      throw new ApiError(`Failed to fetch analysis risk: HTTP ${res.status}`, res.status);
    }
    return res.json();
  }, retryOptions);
}

export async function triggerRemediation(
  analysisId: string
): Promise<AnalysisRemediationResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/remediate`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    const errorMsg = err?.error?.message || err?.detail || err?.message || `Remediation generation failed (HTTP ${res.status})`;
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function reanalyzeAnalysis(
  analysisId: string,
  modifiedContent?: string
): Promise<AnalysisReanalyzeResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/reanalyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modified_content: modifiedContent || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    const errorMsg = err?.error?.message || err?.detail || err?.message || `Re-analysis failed (HTTP ${res.status})`;
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchAnalysisConfiguration(
  analysisId: string
): Promise<AnalysisConfigurationContent> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/configuration`);
  if (!res.ok) {
    // Fallback to configuration detail
    try {
      const cfg = await fetchConfigurationDetail(analysisId);
      return {
        analysis_id: cfg.id,
        filename: cfg.original_filename,
        vendor: cfg.detected_vendor,
        hash: cfg.hash,
        line_count: (cfg.raw_content || "").split("\n").length,
        lines: (cfg.raw_content || "").split("\n").map((text, idx) => ({ line: idx + 1, text })),
        raw_text: cfg.raw_content,
        raw_content: cfg.raw_content,
      };
    } catch {
      throw new Error(`Failed to fetch configuration: HTTP ${res.status}`);
    }
  }
  return res.json();
}

export interface VendorDetectionResult {
  vendor: string;
  confidence: number;
  platform?: string;
  matched_patterns?: string[];
}

export async function detectVendorFromText(
  content: string,
  filename?: string
): Promise<VendorDetectionResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/configurations/detect-vendor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) {
    throw new Error(`Vendor detection failed: HTTP ${res.status}`);
  }
  return res.json();
}

// -------------------------------------------------------------
// Security Time Machine & Audit Delta Comparison Types & Methods
// -------------------------------------------------------------

export interface ControlTransitionItem {
  control_id: string;
  framework: string;
  title: string;
  category?: string | null;
  severity: string;
  before_status: string;
  after_status: string;
  transition_type: "RESOLVED" | "REGRESSED" | "UNCHANGED_FAIL" | "UNCHANGED_PASS" | "NEW_FAIL" | "NEW_PASS";
  before_evidence?: string | null;
  before_line?: number | null;
  after_evidence?: string | null;
  after_line?: number | null;
  remediation_applied?: string | null;
  explanation: string;
}

export interface PriorityDistribution {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

export interface PostureDeltaSummary {
  before_score: number;
  after_score: number;
  score_delta: number;
  before_risk_score: number;
  after_risk_score: number;
  risk_delta: number;
  before_failed_count: number;
  after_failed_count: number;
  failed_delta: number;
  resolved_count: number;
  regressed_count: number;
  unchanged_fail_count: number;
  unchanged_pass_count: number;
  before_priority_counts: PriorityDistribution;
  after_priority_counts: PriorityDistribution;
  posture_improvement_percentage: number;
}

export interface ConfigurationDiffLine {
  line_number_before?: number | null;
  line_number_after?: number | null;
  type: "UNCHANGED" | "MODIFIED" | "ADDED" | "REMOVED";
  content_before?: string | null;
  content_after?: string | null;
  associated_control_ids: string[];
  is_security_sensitive: boolean;
}

export interface SecurityTimelineEvent {
  id: string;
  timestamp: string;
  event_type: "CONFIG_INGESTED" | "BASELINE_AUDIT" | "FINDINGS_IDENTIFIED" | "REMEDIATION_PROPOSED" | "CONFIG_HARDENED" | "REANALYSIS_VERIFIED";
  title: string;
  description: string;
  audit_id?: string | null;
  configuration_id?: string | null;
  configuration_hash?: string | null;
  status: string;
  badge?: string | null;
}

export interface AuditComparisonResponse {
  before_audit_id: string;
  after_audit_id: string;
  configuration_id: string;
  device_name: string;
  vendor: string;
  platform?: string | null;
  evaluated_at: string;
  is_compatible: boolean;
  compatibility_notes?: string | null;
  deltas: PostureDeltaSummary;
  transitions: ControlTransitionItem[];
  diff_lines: ConfigurationDiffLine[];
  timeline: SecurityTimelineEvent[];
  before_config_raw: string;
  after_config_raw: string;
  resolved_controls_summary: string[];
  regressed_controls_summary: string[];
  remaining_open_controls: string[];
}

export interface ComparableAuditPairItem {
  baseline_audit_id: string;
  remediated_audit_id: string;
  configuration_id: string;
  device_name: string;
  vendor: string;
  baseline_timestamp: string;
  remediated_timestamp: string;
  baseline_score: number;
  remediated_score: number;
  score_delta: number;
  resolved_count: number;
}

export async function fetchAuditComparison(
  beforeId: string,
  afterId: string
): Promise<AuditComparisonResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/audits/compare?before_id=${encodeURIComponent(beforeId)}&after_id=${encodeURIComponent(afterId)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err?.detail || err?.message || `Failed to compare audits (HTTP ${res.status})`);
  }
  return res.json();
}

export const compareAuditsDetailed = fetchAuditComparison;

export async function fetchComparableAuditPairs(): Promise<ComparableAuditPairItem[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/audits/comparable-pairs`);
  if (!res.ok) {
    return [];
  }
  return res.json();
}

// -------------------------------------------------------------
// AI Security Briefing & Analyst Copilot Client API
// -------------------------------------------------------------

export interface EvidenceCitation {
  control_id: string;
  framework: string;
  line_number?: number | null;
  evidence_snippet?: string | null;
  status: string;
  severity: string;
  title?: string | null;
  citation_label: string;
}

export interface TopRiskBriefItem {
  control_id: string;
  title: string;
  severity: string;
  priority: string;
  why_it_matters: string;
  evidence_citation?: EvidenceCitation | null;
  recommended_action: string;
  actual_value?: any;
  expected_value?: any;
}

export interface SecurityEvolutionBrief {
  baseline_audit_id: string;
  current_audit_id: string;
  before_score: number;
  after_score: number;
  score_delta: number;
  risk_delta: number;
  resolved_count: number;
  regressed_count: number;
  resolved_controls_summary: string[];
  regressed_controls_summary: string[];
  narrative: string;
}

export interface InvestigationOrderStep {
  step_number: number;
  control_id: string;
  priority: string;
  action_summary: string;
  target_lines: number[];
  reason: string;
}

export interface AISecurityBriefingResponse {
  advisory_only: boolean;
  audit_id: string;
  baseline_audit_id?: string | null;
  device_hostname: string;
  detected_vendor: string;
  compliance_score: number;
  risk_score: number;
  critical_p0_count: number;
  high_p1_count: number;
  posture_trend: string;
  executive_summary: string;
  top_risks: TopRiskBriefItem[];
  security_evolution?: SecurityEvolutionBrief | null;
  recommended_investigation_order: InvestigationOrderStep[];
  suggested_copilot_questions: string[];
  grounded_evidence_citations: EvidenceCitation[];
  model_used: string;
  provider: string;
  limitations: string;
}

export interface CopilotChatRequest {
  query: string;
  audit_id: string;
  baseline_audit_id?: string | null;
  chat_history?: Array<{ role: string; content: string }>;
}

export interface CopilotChatResponse {
  advisory_only: boolean;
  query: string;
  audit_id: string;
  answer: string;
  grounded_evidence: EvidenceCitation[];
  suggested_followups: string[];
  model_used: string;
  disclaimer: string;
}

export async function generateAISecurityBriefing(payload: {
  audit_id: string;
  baseline_audit_id?: string;
  focus_area?: string;
}): Promise<AISecurityBriefingResponse> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/briefing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `AI Briefing failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAISecurityBriefing(
  auditId: string,
  baselineAuditId?: string
): Promise<AISecurityBriefingResponse> {
  const url = new URL(`${API_BASE}/api/v1/ai/briefing/${encodeURIComponent(auditId)}`);
  if (baselineAuditId) {
    url.searchParams.set("baseline_audit_id", baselineAuditId);
  }
  const res = await apiFetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Failed to fetch AI Briefing: HTTP ${res.status}`);
  }
  return res.json();
}

export async function sendCopilotChat(
  payload: CopilotChatRequest
): Promise<CopilotChatResponse> {
  const res = await apiFetch(`${API_BASE}/api/v1/ai/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Copilot query failed: HTTP ${res.status}`);
  }
  return res.json();
}

// ==============================================================================
// AUTONOMOUS NETWORK SECURITY ENGINEER API INTERFACES
// ==============================================================================

export interface AgentConstraint {
  subsystem: string;
  action: string;
  description: string;
}

export interface TimelineEvent {
  step_id: string;
  step_number: number;
  title: string;
  phase: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "WAITING_APPROVAL" | "REJECTED" | "FAILED";
  event_type?: string;
  tool?: string;
  timestamp: string;
  details: Record<string, any>;
  summary: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface ProposedRemediationItem {
  proposal_id: string;
  analysis_id: string;
  device_name: string;
  vendor: string;
  finding_id: string;
  control_id: string;
  framework: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  is_constrained: boolean;
  constraint_reason?: string | null;
  commands: string;
  rollback_commands?: string | null;
  diff_preview: {
    diff_lines?: Array<{ type: string; text: string }>;
    remove_count?: number;
    add_count?: number;
    preview_text?: string;
  };
  potential_impact: string;
  requires_approval: boolean;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED_CONSTRAINED";
}

export interface ApprovalRequest {
  approval_token: string;
  session_id: string;
  proposals: ProposedRemediationItem[];
  constrained_items_count: number;
  impact_summary: string;
  created_at: string;
}

export interface VerificationTransition {
  control_id: string;
  title: string;
  framework: string;
  previous_status: string;
  new_status: string;
  resolved: boolean;
  evidence_verified: string;
}

export interface DeviceAuditSummary {
  analysis_id: string;
  device_name: string;
  vendor: string;
  hash_before: string;
  hash_after?: string | null;
  compliance_score_before: number;
  compliance_score_after?: number | null;
  fail_count_before: number;
  fail_count_after?: number | null;
  risk_score_before: number;
  risk_score_after?: number | null;
  remediations_applied_count: number;
  transitions: VerificationTransition[];
}

export interface FinalExecutiveReport {
  report_id: string;
  session_id: string;
  generated_at: string;
  objective: string;
  baseline_framework: string;
  constraints_honored: string[];
  total_devices_audited: number;
  total_controls_evaluated: number;
  total_violations_before: number;
  total_violations_after: number;
  high_risk_before: number;
  high_risk_after: number;
  remediations_applied: number;
  remediations_rejected: number;
  remediations_constrained: number;
  constraint_verification: {
    ssh_subsystem_unaltered: boolean;
    status: string;
    details: string;
  };
  device_summaries: DeviceAuditSummary[];
  overall_posture_delta: string;
}

export interface AgentSessionState {
  session_id: string;
  objective: string;
  status: "INITIALIZING" | "RUNNING" | "WAITING_APPROVAL" | "COMPLETED" | "REJECTED" | "FAILED" | "INVALID_OBJECTIVE" | "NEEDS_CLARIFICATION";
  intent?: "AUDIT_AND_REMEDIATION" | "AUDIT_ONLY" | "REMEDIATION" | "INFORMATION" | "AMBIGUOUS" | "INVALID" | string | null;
  intent_explanation?: string | null;
  suggested_prompts?: string[];
  created_at: string;
  updated_at: string;
  constraints: AgentConstraint[];
  user_constraints?: AgentConstraint[];
  system_policies?: string[];
  timeline: TimelineEvent[];
  discovered_configs: Array<{
    analysis_id: string;
    filename: string;
    vendor: string;
    platform?: string;
    size_bytes: number;
    raw_text: string;
    hash: string;
  }>;
  proposals: ProposedRemediationItem[];
  active_approval?: ApprovalRequest | null;
  verification_results: Record<string, any>;
  final_report?: FinalExecutiveReport | null;
  error?: string | null;
}

export async function startAgentWorkflow(payload: {
  objective: string;
  target_configurations?: string[];
  baseline_framework?: string;
  risk_threshold?: string;
}): Promise<AgentSessionState> {
  const res = await apiFetch(`${API_BASE}/api/v1/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Agent run failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAgentSession(sessionId: string): Promise<AgentSessionState | null> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/agent/sessions/${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || data?.message || `Failed to fetch session: HTTP ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    if (err?.message?.includes("404") || err?.message?.includes("ResourceNotFoundError")) {
      return null;
    }
    throw err;
  }
}

export async function submitAgentApproval(
  sessionId: string,
  payload: { approved: boolean; approval_token?: string; reviewer_notes?: string }
): Promise<AgentSessionState> {
  const res = await apiFetch(`${API_BASE}/api/v1/agent/sessions/${encodeURIComponent(sessionId)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Approval submission failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAgentReport(sessionId: string): Promise<FinalExecutiveReport> {
  const res = await apiFetch(`${API_BASE}/api/v1/agent/sessions/${encodeURIComponent(sessionId)}/report`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Failed to fetch report: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAgentFleetConfigurations(): Promise<any[]> {
  const res = await apiFetch(`${API_BASE}/api/v1/agent/configurations`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return [];
  }
  return res.json();
}

// -------------------------------------------------------------
// Security Telemetry & Visual Analytics Types & Functions
// -------------------------------------------------------------

export interface AuditTrendPoint {
  audit_id: string;
  configuration_id: string;
  device_name: string;
  vendor: string;
  timestamp: string;
  compliance_score: number;
  risk_score: number;
  total_findings: number;
  open_findings: number;
  critical_findings: number;
  high_findings: number;
  pass_count: number;
  fail_count: number;
  framework_scores: Record<string, number>;
}

export interface SeverityMetric {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FrameworkMetric {
  framework: "CIS" | "NIST" | "STIG" | "ISO";
  failed_count: number;
  passed_count: number;
  total_count: number;
  compliance_score: number;
}

export interface VendorMetric {
  vendor: string;
  display_name: string;
  failed_count: number;
  passed_count: number;
  critical_count: number;
  devices_count: number;
}

export interface AffectedAssetMetric {
  configuration_id: string;
  audit_id: string;
  hostname: string;
  vendor: string;
  platform: string;
  open_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  compliance_score: number;
  risk_score: number;
}

export interface HeatmapAssetRow {
  configuration_id: string;
  audit_id: string;
  hostname: string;
  vendor: string;
  platform: string;
  severities: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  frameworks: Record<string, { failed: number; passed: number; score: number }>;
  total_open: number;
  overall_score: number;
  risk_score: number;
}

export interface TopologyNode {
  id: string;
  hostname: string;
  vendor: string;
  platform: string;
  device_type: string;
  compliance_score: number;
  risk_score: number;
  open_findings: number;
  critical_findings: number;
  status: "HARDENED" | "NEEDS_ATTENTION" | "HIGH_RISK";
  last_seen: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export interface SecurityTelemetryResponse {
  has_sufficient_history: boolean;
  audit_trends: AuditTrendPoint[];
  findings_by_severity: SeverityMetric[];
  findings_by_framework: FrameworkMetric[];
  findings_by_vendor: VendorMetric[];
  top_affected_assets: AffectedAssetMetric[];
  heatmap_matrix: HeatmapAssetRow[];
  topology: {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
    has_topology_data: boolean;
  };
  remediation_distribution: {
    available: number;
    reviewed: number;
    applied: number;
    verified: number;
    total: number;
  };
  summary: {
    total_audits: number;
    total_configurations: number;
    active_open_findings: number;
  };
}

export async function fetchSecurityTelemetry(): Promise<SecurityTelemetryResponse> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/telemetry`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Failed to fetch security telemetry: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchComplianceTrends(): Promise<{
  has_sufficient_history: boolean;
  audit_trends: AuditTrendPoint[];
  total_audits: number;
}> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/compliance-trends`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Failed to fetch trends: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSecurityHeatmap(): Promise<{
  heatmap_matrix: HeatmapAssetRow[];
  total_assets: number;
}> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/heatmap`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Failed to fetch heatmap: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFleetTopology(): Promise<{
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  has_topology_data: boolean;
}> {
  const res = await apiFetch(`${API_BASE}/api/v1/overview/topology`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || data?.message || `Failed to fetch topology: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Initiates an authentic browser file download.
 * Fetches the backend endpoint with auth headers, handles Content-Disposition header,
 * and triggers native browser download toolbar/shelf indicator and saving to Downloads.
 */
export async function downloadFileFromApi(
  endpointPath: string,
  fallbackFilename: string = "download.txt"
): Promise<void> {
  const url = endpointPath.startsWith("http")
    ? endpointPath
    : `${getApiBase()}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
  const authHeaders = await getAuthHeaders();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  }

  // Extract filename from Content-Disposition header if present
  let filename = fallbackFilename;
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, "").trim();
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = blobUrl;
  link.download = filename;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
}

/**
 * Triggers native browser download for in-memory text/blob data.
 */
export function downloadBlobAsFile(
  content: string | Blob,
  filename: string,
  mimeType: string = "text/plain;charset=utf-8"
): void {
  const blob = typeof content === "string" ? new Blob([content], { type: mimeType }) : content;
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.style.display = "none";
  link.href = blobUrl;
  link.download = filename;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export async function resolveUsernameToEmail(identifier: string): Promise<{ email: string | null; username: string | null; found: boolean }> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/auth/resolve-username`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    if (!res.ok) {
      return { email: identifier.includes("@") ? identifier : null, username: null, found: identifier.includes("@") };
    }
    return res.json();
  } catch {
    return { email: identifier.includes("@") ? identifier : null, username: null, found: identifier.includes("@") };
  }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const res = await apiFetch(`${API_BASE}/api/v1/auth/profile`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function logoutBackendSession(): Promise<void> {
  try {
    await apiFetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
    });
  } catch {
    // Best-effort backend token revocation
  }
}

export async function upsertUserProfile(payload: {
  username: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<UserProfile> {
  const res = await apiFetch(`${API_BASE}/api/v1/auth/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Failed to save user profile.");
  }
  return res.json();
}










