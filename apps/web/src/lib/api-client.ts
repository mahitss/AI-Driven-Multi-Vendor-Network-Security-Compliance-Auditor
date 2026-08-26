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
  total_devices: number;
  total_audits: number;
  total_findings: number;
  open_findings?: number;
  compliance_score?: number;
  risk_score?: number;
  score_delta?: number | null;
  severity_breakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  framework_scores?: Record<string, number>;
  vendor_breakdown: Record<string, number>;
  supported_vendors: string[];
  supported_frameworks: string[];
}

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    // In browser, using window.location.origin routes requests through Next.js proxy rewrites
    // This prevents ERR_CONNECTION_REFUSED on direct port 8000 and eliminates CORS issues
    const custom = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (custom && !custom.includes("127.0.0.1:8000") && !custom.includes("localhost:8000")) {
      return custom.replace(/\/$/, "");
    }
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000")
    .replace("localhost", "127.0.0.1")
    .replace(/\/$/, "");
}

export const API_BASE = getApiBase();

const DEFAULT_TIMEOUT_MS = 12000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const method = options.method || "GET";
  const hasAuth = !!(
    (options.headers as Record<string, string>)?.["Authorization"] ||
    (options.headers as Record<string, string>)?.["authorization"]
  );
  const credsMode = options.credentials || "include";

  try {
    const res = await fetch(url, {
      ...options,
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
      throw new Error(`AUTHENTICATION REQUIRED: The API rejected this request with HTTP 401.`);
    }
    if (res.status === 500) {
      throw new Error(`API ERROR: The backend returned HTTP 500.`);
    }

    return res;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`BACKEND TIMEOUT (${timeoutMs / 1000}s): Unable to reach NetVigil API at ${url}.`);
    }
    if (err?.message?.startsWith("AUTHENTICATION REQUIRED") || err?.message?.startsWith("API ERROR")) {
      throw err;
    }
    throw new Error(`BACKEND UNAVAILABLE: Unable to connect to NetVigil API at the configured endpoint.`);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetchWithTimeout(`${API_BASE}/health`, { cache: "no-store" }, 5000);
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const res = await fetch(`${API_BASE}/api/v1/overview/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch overview metrics: HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadConfigFile(file: File): Promise<ConfigurationItem> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/configurations`, {
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
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch configurations: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchConfigurationDetail(id: string): Promise<ConfigurationDetail> {
  const res = await fetch(`${API_BASE}/api/v1/configurations/${id}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch configuration details: HTTP ${res.status}`);
  }
  return res.json();
}

export async function analyzeConfiguration(id: string): Promise<ConfigurationAnalysisDetail> {
  const res = await fetch(`${API_BASE}/api/v1/configurations/${id}/analyze`, {
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
  const res = await fetch(`${API_BASE}/api/v1/configurations/${id}/analysis`, {
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
  const res = await fetch(`${API_BASE}/api/v1/audits`, {
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
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audits: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditDetail(auditId: string): Promise<AuditDetail> {
  const res = await fetch(`${API_BASE}/api/v1/audits/${auditId}`, { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit findings: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFrameworks(): Promise<FrameworkMetadata[]> {
  const res = await fetch(`${API_BASE}/api/v1/frameworks`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch frameworks: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFrameworkControls(framework: string): Promise<FrameworkControlItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/frameworks/${encodeURIComponent(framework)}/controls`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch controls for framework ${framework}: HTTP ${res.status}`);
  }
  return res.json();
}

// AI Intelligence API Methods
export async function fetchFindingExplanation(findingId: string): Promise<FindingExplanation> {
  const res = await fetch(`${API_BASE}/api/v1/ai/findings/${findingId}/explanation`, {
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
  const res = await fetch(`${API_BASE}/api/v1/ai/audits/${auditId}/chat`, {
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
  const res = await fetch(`${API_BASE}/api/v1/ai/interpret-syntax`, {
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
  const res = await fetch(`${API_BASE}/api/v1/ai/configurations/${configId}/interpret-unknown`, {
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
  const res = await fetch(`${API_BASE}/api/v1/ai/status`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`AI status check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAIGatewayHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/ai/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`AI Gateway health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAIModels(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/v1/ai/models`, { cache: "no-store" });
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
  const res = await fetch(url.toString(), { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
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
  const res = await fetch(`${API_BASE}/api/v1/training/mappings`, {
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
  const res = await fetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/approve`, {
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
  const res = await fetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/edit`, {
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
  const res = await fetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/reject`, {
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
  const res = await fetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/disable`, {
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
  const res = await fetch(`${API_BASE}/api/v1/training/mappings/${mappingId}/re-enable`, {
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

  const res = await fetch(url.toString(), {
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
  const res = await fetch(`${API_BASE}/api/v1/training/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch training stats: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAllowlist(): Promise<AllowlistProperty[]> {
  const res = await fetch(`${API_BASE}/api/v1/training/allowlist`, { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit risks: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRiskDetail(riskId: string): Promise<RiskItem> {
  const res = await fetch(`${API_BASE}/api/v1/risks/${riskId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch risk details: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditRiskGraph(auditId: string): Promise<RiskGraph> {
  const res = await fetch(`${API_BASE}/api/v1/audits/${auditId}/risk-graph`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch risk graph: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRiskStats(): Promise<RiskStats> {
  const res = await fetch(`${API_BASE}/api/v1/risks/stats`, { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch audit remediations: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFindingRemediation(findingId: string): Promise<RemediationProposal | null> {
  const res = await fetch(`${API_BASE}/api/v1/findings/${findingId}/remediation`, { cache: "no-store" });
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
  const res = await fetch(`${API_BASE}/api/v1/remediations/${remediationId}/review`, {
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
  const res = await fetch(`${API_BASE}/api/v1/remediations/stats`, { cache: "no-store" });
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
  type: "AUDIT_COMPLETED" | "CONFIG_INGESTED" | "TRAINING_ACTION" | "REMEDIATION_REVIEWED";
  title: string;
  description: string;
  target_id: string;
  target_url: string;
  timestamp: string;
  severity: "INFO" | "HIGH" | "SUCCESS" | "WARNING";
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
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
    executive_summary?: any;
    framework_breakdown?: Record<string, any>;
    top_risks?: any[];
    critical_findings?: any[];
    remediation_action_items?: any[];
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
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch activity stream: HTTP ${res.status}`);
  }
  return res.json();
}

export async function globalSearch(q: string): Promise<Record<string, SearchResultItem[]>> {
  const url = new URL(`${API_BASE}/api/v1/overview/search`);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Global search failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDevices(vendor?: string): Promise<DeviceItem[]> {
  const url = new URL(`${API_BASE}/api/v1/devices`);
  if (vendor && vendor !== "ALL") url.searchParams.set("vendor", vendor);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch devices: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDeviceDetail(deviceId: string): Promise<DeviceDetail> {
  const res = await fetch(`${API_BASE}/api/v1/devices/${deviceId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch device details: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDeviceTimeline(deviceId: string): Promise<DeviceTimelineEvent[]> {
  const res = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/timeline`, { cache: "no-store" });
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
  const res = await fetch(`${API_BASE}/api/v1/reports/generate`, {
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
  const res = await fetch(`${API_BASE}/api/v1/reports`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch reports: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchReportDetail(reportId: string): Promise<ReportDocument> {
  const res = await fetch(`${API_BASE}/api/v1/reports/${reportId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch report detail: HTTP ${res.status}`);
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
  const res = await fetch(`${API_BASE}/api/v1/overview/demo/init`, {
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
  const res = await fetch(`${API_BASE}/api/v1/overview/diagnostics`, { cache: "no-store" });
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

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch findings: HTTP ${res.status}`);
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
  compliance_score: number;
  risk_score: number;
  risk_level: string;
  created_at: string;
  processed_at: string | null;
}

export interface AnalysisEvidenceItem {
  line: number;
  raw_text: string;
  property_path?: string | null;
  context?: string | null;
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
  risk_score: number;
  risk_level: string;
  likelihood: string;
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
}

export interface AnalysisConfigurationContent {
  analysis_id: string;
  filename: string;
  vendor: string;
  hash: string;
  line_count: number;
  lines: Array<{ line: number; text: string }>;
  raw_text: string;
}

export async function ingestAnalysis(
  content: string,
  filename: string = "cisco_edge_router.cfg",
  vendorHint?: string
): Promise<AnalysisIngestResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, filename, vendor_hint: vendorHint }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || err.message || `Ingestion failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchAnalysisStatus(analysisId: string): Promise<AnalysisStatus> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch analysis status: HTTP ${res.status}`);
  }
  return res.json();
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

export async function fetchAnalysisRisk(analysisId: string): Promise<AnalysisRiskReport> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/risk`);
  if (!res.ok) {
    throw new Error(`Failed to fetch analysis risk: HTTP ${res.status}`);
  }
  return res.json();
}

export async function reanalyzeAnalysis(
  analysisId: string,
  modifiedContent: string
): Promise<AnalysisReanalyzeResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/reanalyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modified_content: modifiedContent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || err.message || `Re-analysis failed (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchAnalysisConfiguration(
  analysisId: string
): Promise<AnalysisConfigurationContent> {
  const res = await fetchWithTimeout(`${API_BASE}/api/v1/analysis/${analysisId}/configuration`);
  if (!res.ok) {
    throw new Error(`Failed to fetch configuration: HTTP ${res.status}`);
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




