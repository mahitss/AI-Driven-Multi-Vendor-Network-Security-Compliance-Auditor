-- ==============================================================================
-- NetVigil Supabase Multi-User Schema & Row Level Security (RLS) Definitions
-- Problem Statement: SIH26155 (NTRO)
-- ==============================================================================
-- This script provides production-grade database definitions and strict RLS
-- policies ensuring authenticated Supabase identity boundaries across all user data.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS ix_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS ix_profiles_email ON public.profiles(email);

-- 3. Managed Network Devices
CREATE TABLE IF NOT EXISTS public.devices (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL,
    vendor TEXT NOT NULL,
    platform TEXT,
    model TEXT,
    serial_number TEXT,
    firmware_version TEXT,
    device_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Devices Indexes
CREATE INDEX IF NOT EXISTS ix_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS ix_devices_hostname ON public.devices(hostname);
CREATE INDEX IF NOT EXISTS ix_devices_vendor ON public.devices(vendor);

-- 4. Network Configurations
CREATE TABLE IF NOT EXISTS public.configurations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES public.devices(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    hash TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    detected_vendor TEXT NOT NULL DEFAULT 'unknown',
    detected_platform TEXT,
    detection_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    detection_method TEXT NOT NULL DEFAULT 'signature',
    detection_details JSONB DEFAULT '{}'::jsonb,
    parser_status TEXT NOT NULL DEFAULT 'pending',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    parser_name TEXT,
    parser_version TEXT,
    facts_extracted_count INTEGER NOT NULL DEFAULT 0,
    unknown_items_count INTEGER NOT NULL DEFAULT 0,
    normalized_profile JSONB,
    unknown_items JSONB DEFAULT '[]'::jsonb,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurations Indexes
CREATE INDEX IF NOT EXISTS ix_configurations_user_id ON public.configurations(user_id);
CREATE INDEX IF NOT EXISTS ix_configurations_hash ON public.configurations(hash);
CREATE INDEX IF NOT EXISTS ix_configurations_detected_vendor ON public.configurations(detected_vendor);
CREATE INDEX IF NOT EXISTS ix_configurations_parser_status ON public.configurations(parser_status);

-- 5. Compliance Audits
CREATE TABLE IF NOT EXISTS public.audits (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT REFERENCES public.devices(id) ON DELETE SET NULL,
    configuration_id TEXT NOT NULL REFERENCES public.configurations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    score DOUBLE PRECISION,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    summary_stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audits Indexes
CREATE INDEX IF NOT EXISTS ix_audits_user_id ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS ix_audits_configuration_id ON public.audits(configuration_id);
CREATE INDEX IF NOT EXISTS ix_audits_status ON public.audits(status);
CREATE INDEX IF NOT EXISTS ix_audits_created_at ON public.audits(created_at);

-- 6. Compliance Findings
CREATE TABLE IF NOT EXISTS public.findings (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audit_id TEXT NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    framework TEXT NOT NULL DEFAULT 'CIS',
    control_id TEXT NOT NULL,
    category TEXT,
    status TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    evidence TEXT,
    expected_value TEXT,
    actual_value TEXT,
    remediation TEXT,
    finding_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Findings Indexes
CREATE INDEX IF NOT EXISTS ix_findings_user_id ON public.findings(user_id);
CREATE INDEX IF NOT EXISTS ix_findings_audit_id ON public.findings(audit_id);
CREATE INDEX IF NOT EXISTS ix_findings_control_id ON public.findings(control_id);
CREATE INDEX IF NOT EXISTS ix_findings_framework ON public.findings(framework);
CREATE INDEX IF NOT EXISTS ix_findings_severity ON public.findings(severity);
CREATE INDEX IF NOT EXISTS ix_findings_status ON public.findings(status);

-- 7. Correlated Risk Items
CREATE TABLE IF NOT EXISTS public.risk_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audit_id TEXT NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    device_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Remote Administration',
    severity TEXT NOT NULL DEFAULT 'HIGH',
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    priority TEXT NOT NULL DEFAULT 'P1',
    likelihood TEXT NOT NULL DEFAULT 'HIGH',
    impact TEXT NOT NULL DEFAULT 'HIGH',
    exposure TEXT NOT NULL DEFAULT 'MANAGEMENT_PLANE',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    finding_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_summary TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk Items Indexes
CREATE INDEX IF NOT EXISTS ix_risk_items_user_id ON public.risk_items(user_id);
CREATE INDEX IF NOT EXISTS ix_risk_items_audit_id ON public.risk_items(audit_id);
CREATE INDEX IF NOT EXISTS ix_risk_items_risk_score ON public.risk_items(risk_score);
CREATE INDEX IF NOT EXISTS ix_risk_items_priority ON public.risk_items(priority);

-- 8. Remediation Proposals
CREATE TABLE IF NOT EXISTS public.remediation_proposals (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audit_id TEXT NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
    finding_id TEXT REFERENCES public.findings(id) ON DELETE SET NULL,
    risk_id TEXT REFERENCES public.risk_items(id) ON DELETE SET NULL,
    vendor TEXT NOT NULL,
    platform TEXT,
    normalized_control TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    remediation_commands TEXT NOT NULL,
    rollback_commands TEXT,
    diff_preview JSONB DEFAULT '{}'::jsonb,
    why_recommended TEXT NOT NULL,
    potential_impact TEXT NOT NULL,
    verification_steps TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_version TEXT NOT NULL DEFAULT '1.0.0',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    is_reviewed BOOLEAN NOT NULL DEFAULT false,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Remediation Proposals Indexes
CREATE INDEX IF NOT EXISTS ix_remediation_proposals_user_id ON public.remediation_proposals(user_id);
CREATE INDEX IF NOT EXISTS ix_remediation_proposals_audit_id ON public.remediation_proposals(audit_id);
CREATE INDEX IF NOT EXISTS ix_remediation_proposals_vendor ON public.remediation_proposals(vendor);
CREATE INDEX IF NOT EXISTS ix_remediation_proposals_status ON public.remediation_proposals(status);

-- 9. Adaptive Training Knowledge Mappings
CREATE TABLE IF NOT EXISTS public.training_mappings (
    id TEXT PRIMARY KEY,
    vendor TEXT NOT NULL,
    platform TEXT,
    raw_pattern TEXT NOT NULL,
    normalized_pattern TEXT,
    normalized_control TEXT NOT NULL,
    candidate_property TEXT NOT NULL,
    candidate_value TEXT NOT NULL,
    semantic_meaning TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    status TEXT NOT NULL DEFAULT 'PENDING',
    source TEXT NOT NULL DEFAULT 'ai_suggested',
    rejection_reason TEXT,
    created_by_email TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all user data tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remediation_proposals ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Devices Policies
CREATE POLICY "Users can view their own devices"
    ON public.devices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices"
    ON public.devices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices"
    ON public.devices FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
    ON public.devices FOR DELETE
    USING (auth.uid() = user_id);

-- Configurations Policies
CREATE POLICY "Users can view their own configurations"
    ON public.configurations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own configurations"
    ON public.configurations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configurations"
    ON public.configurations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own configurations"
    ON public.configurations FOR DELETE
    USING (auth.uid() = user_id);

-- Audits Policies
CREATE POLICY "Users can view their own audits"
    ON public.audits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audits"
    ON public.audits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audits"
    ON public.audits FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audits"
    ON public.audits FOR DELETE
    USING (auth.uid() = user_id);

-- Findings Policies
CREATE POLICY "Users can view their own findings"
    ON public.findings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own findings"
    ON public.findings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own findings"
    ON public.findings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own findings"
    ON public.findings FOR DELETE
    USING (auth.uid() = user_id);

-- Risk Items Policies
CREATE POLICY "Users can view their own risk items"
    ON public.risk_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk items"
    ON public.risk_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk items"
    ON public.risk_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk items"
    ON public.risk_items FOR DELETE
    USING (auth.uid() = user_id);

-- Remediation Proposals Policies
CREATE POLICY "Users can view their own remediation proposals"
    ON public.remediation_proposals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own remediation proposals"
    ON public.remediation_proposals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own remediation proposals"
    ON public.remediation_proposals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own remediation proposals"
    ON public.remediation_proposals FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, full_name, created_at, updated_at)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if existing, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- STORAGE BUCKET & ACCESS POLICIES
-- ==============================================================================
-- Ensure 'configurations' bucket exists as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('configurations', 'configurations', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage object policies for user isolation
CREATE POLICY "Users can only read their own configuration files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'configurations'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can only upload to their own configuration folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'configurations'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can only update their own configuration files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'configurations'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can only delete their own configuration files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'configurations'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
