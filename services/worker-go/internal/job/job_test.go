package job

import (
	"strings"
	"testing"
)

func TestValidate_ValidJobs(t *testing.T) {
	tests := []struct {
		name string
		req  *JobRequest
	}{
		{
			name: "valid ping",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-001",
				JobType: "ping",
				Payload: map[string]interface{}{},
			},
		},
		{
			name: "valid config_preflight",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-002",
				JobType: "config_preflight",
				Payload: map[string]interface{}{
					"raw_config": "hostname CORE-RTR-01\ninterface GigabitEthernet0/0\n",
				},
			},
		},
		{
			name: "valid sanitize_text",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-003",
				JobType: "sanitize_text",
				Payload: map[string]interface{}{
					"text": "password 7 0822455D0A16\n",
				},
			},
		},
		{
			name: "valid chunk_payload",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-004",
				JobType: "chunk_payload",
				Payload: map[string]interface{}{
					"text":       "line1\nline2\nline3\n",
					"chunk_size": 2,
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := Validate(tt.req); err != nil {
				t.Fatalf("unexpected error for valid job: %v", err)
			}
		})
	}
}

func TestValidate_InvalidJobs(t *testing.T) {
	tests := []struct {
		name        string
		req         *JobRequest
		expectedErr string
	}{
		{
			name:        "nil request",
			req:         nil,
			expectedErr: "empty request body",
		},
		{
			name: "invalid version",
			req: &JobRequest{
				Version: "v2",
				JobID:   "job-01",
				JobType: "ping",
				Payload: map[string]interface{}{},
			},
			expectedErr: "unsupported version",
		},
		{
			name: "missing job_id",
			req: &JobRequest{
				Version: "v1",
				JobID:   "   ",
				JobType: "ping",
				Payload: map[string]interface{}{},
			},
			expectedErr: "job_id is required",
		},
		{
			name: "unsupported job_type",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-01",
				JobType: "arbitrary_evaluator",
				Payload: map[string]interface{}{},
			},
			expectedErr: "unsupported job_type",
		},
		{
			name: "missing payload for config_preflight",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-01",
				JobType: "config_preflight",
				Payload: map[string]interface{}{},
			},
			expectedErr: "payload requires 'raw_config' field",
		},
		{
			name: "wrong type for raw_config",
			req: &JobRequest{
				Version: "v1",
				JobID:   "job-01",
				JobType: "config_preflight",
				Payload: map[string]interface{}{
					"raw_config": 12345,
				},
			},
			expectedErr: "'raw_config' must be a string",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.req)
			if err == nil {
				t.Fatalf("expected error containing '%s', got nil", tt.expectedErr)
			}
			if !strings.Contains(err.Error(), tt.expectedErr) {
				t.Fatalf("expected error containing '%s', got '%s'", tt.expectedErr, err.Error())
			}
		})
	}
}

func TestExecute_Ping(t *testing.T) {
	req := &JobRequest{
		Version: "v1",
		JobID:   "ping-1",
		JobType: "ping",
		Payload: map[string]interface{}{},
	}

	res, err := Execute(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res["pong"] != true {
		t.Errorf("expected pong: true, got %v", res["pong"])
	}
	if res["service"] != "netvigil-worker-go" {
		t.Errorf("expected service name netvigil-worker-go, got %v", res["service"])
	}
}

func TestExecute_ConfigPreflight(t *testing.T) {
	raw := "hostname CORE-RTR-01\n!\ninterface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0\n"
	req := &JobRequest{
		Version: "v1",
		JobID:   "pref-1",
		JobType: "config_preflight",
		Payload: map[string]interface{}{
			"raw_config": raw,
		},
	}

	res, err := Execute(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	sha, ok := res["sha256"].(string)
	if !ok || len(sha) != 64 {
		t.Errorf("invalid sha256: %v", sha)
	}

	lineCount, _ := res["line_count"].(int)
	if lineCount < 4 {
		t.Errorf("expected at least 4 lines, got %d", lineCount)
	}

	isUTF8, _ := res["is_utf8"].(bool)
	if !isUTF8 {
		t.Errorf("expected is_utf8 to be true")
	}

	hasNullBytes, _ := res["has_null_bytes"].(bool)
	if hasNullBytes {
		t.Errorf("expected has_null_bytes to be false")
	}
}

func TestExecute_SanitizeText(t *testing.T) {
	input := "enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0\nusername admin password 7 0822455D0A16"
	req := &JobRequest{
		Version: "v1",
		JobID:   "san-1",
		JobType: "sanitize_text",
		Payload: map[string]interface{}{
			"text": input,
		},
	}

	res, err := Execute(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	sanitized, ok := res["sanitized_text"].(string)
	if !ok {
		t.Fatalf("missing sanitized_text in result")
	}

	if strings.Contains(sanitized, "0822455D0A16") {
		t.Errorf("sensitive password was not redacted")
	}
	if !strings.Contains(sanitized, "[REDACTED_BY_WORKER]") {
		t.Errorf("expected [REDACTED_BY_WORKER] token in sanitized output")
	}

	redactionCount, _ := res["redaction_count"].(int)
	if redactionCount < 1 {
		t.Errorf("expected redaction_count >= 1, got %d", redactionCount)
	}
}

func TestExecute_ChunkPayload(t *testing.T) {
	input := "line1\nline2\nline3\nline4\nline5"
	req := &JobRequest{
		Version: "v1",
		JobID:   "chunk-1",
		JobType: "chunk_payload",
		Payload: map[string]interface{}{
			"text":       input,
			"chunk_size": 2,
		},
	}

	res, err := Execute(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	chunks, ok := res["chunks"].([]string)
	if !ok || len(chunks) != 3 {
		t.Errorf("expected 3 chunks, got %d", len(chunks))
	}
}
