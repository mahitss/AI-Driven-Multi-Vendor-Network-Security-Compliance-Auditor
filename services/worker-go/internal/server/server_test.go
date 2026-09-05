package server

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mahitss/netvigil-worker-go/internal/config"
	"github.com/mahitss/netvigil-worker-go/internal/job"
)

func newTestServer(internalSecret string) *Server {
	cfg := &config.Config{
		Port:            "8081",
		Host:            "127.0.0.1",
		Environment:     "test",
		LogLevel:        "ERROR",
		InternalSecret:  internalSecret,
		MaxPayloadBytes: 1024 * 1024,
	}
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	return New(cfg, logger)
}

func TestHealthEndpoint(t *testing.T) {
	srv := newTestServer("")
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got '%v'", body["status"])
	}
	if body["service"] != "netvigil-worker-go" {
		t.Errorf("expected service 'netvigil-worker-go', got '%v'", body["service"])
	}
}

func TestReadyEndpoint(t *testing.T) {
	srv := newTestServer("")
	req := httptest.NewRequest("GET", "/readyz", nil)
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestJobEndpoint_Valid(t *testing.T) {
	srv := newTestServer("")

	jobReq := job.JobRequest{
		Version: "v1",
		JobID:   "test-job-001",
		JobType: "ping",
		Payload: map[string]interface{}{},
	}
	reqBytes, _ := json.Marshal(jobReq)

	req := httptest.NewRequest("POST", "/api/v1/jobs", bytes.NewReader(reqBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var jobResp job.JobResponse
	if err := json.NewDecoder(resp.Body).Decode(&jobResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if jobResp.Status != "completed" {
		t.Errorf("expected status 'completed', got '%s'", jobResp.Status)
	}
	if jobResp.JobID != "test-job-001" {
		t.Errorf("expected job_id 'test-job-001', got '%s'", jobResp.JobID)
	}
	if jobResp.Error != nil {
		t.Errorf("expected error to be nil, got '%s'", *jobResp.Error)
	}
}

func TestJobEndpoint_InvalidJSON(t *testing.T) {
	srv := newTestServer("")

	req := httptest.NewRequest("POST", "/api/v1/jobs", bytes.NewReader([]byte("{bad-json}")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", resp.StatusCode)
	}

	var jobResp job.JobResponse
	if err := json.NewDecoder(resp.Body).Decode(&jobResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if jobResp.Status != "failed" {
		t.Errorf("expected status 'failed', got '%s'", jobResp.Status)
	}
	if jobResp.Error == nil {
		t.Errorf("expected error message, got nil")
	}
}

func TestJobEndpoint_ValidationFailure(t *testing.T) {
	srv := newTestServer("")

	jobReq := job.JobRequest{
		Version: "v1",
		JobID:   "", // missing
		JobType: "ping",
		Payload: map[string]interface{}{},
	}
	reqBytes, _ := json.Marshal(jobReq)

	req := httptest.NewRequest("POST", "/api/v1/jobs", bytes.NewReader(reqBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", resp.StatusCode)
	}

	var jobResp job.JobResponse
	_ = json.NewDecoder(resp.Body).Decode(&jobResp)
	if jobResp.Status != "failed" {
		t.Errorf("expected status 'failed', got '%s'", jobResp.Status)
	}
}

func TestJobEndpoint_AuthSecret(t *testing.T) {
	srv := newTestServer("my-secret-token")

	jobReq := job.JobRequest{
		Version: "v1",
		JobID:   "auth-test-1",
		JobType: "ping",
		Payload: map[string]interface{}{},
	}
	reqBytes, _ := json.Marshal(jobReq)

	// 1. Without secret -> 401
	req1 := httptest.NewRequest("POST", "/api/v1/jobs", bytes.NewReader(reqBytes))
	w1 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w1, req1)
	if w1.Result().StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 without secret, got %d", w1.Result().StatusCode)
	}

	// 2. With wrong secret -> 401
	req2 := httptest.NewRequest("POST", "/api/v1/jobs", bytes.NewReader(reqBytes))
	req2.Header.Set("X-Internal-Worker-Secret", "wrong-secret")
	w2 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w2, req2)
	if w2.Result().StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 with wrong secret, got %d", w2.Result().StatusCode)
	}

	// 3. With valid secret via header -> 200
	req3 := httptest.NewRequest("POST", "/api/v1/jobs", bytes.NewReader(reqBytes))
	req3.Header.Set("X-Internal-Worker-Secret", "my-secret-token")
	w3 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w3, req3)
	if w3.Result().StatusCode != http.StatusOK {
		t.Errorf("expected 200 with valid secret, got %d", w3.Result().StatusCode)
	}

	// 4. Health endpoint remains accessible without secret -> 200
	req4 := httptest.NewRequest("GET", "/health", nil)
	w4 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w4, req4)
	if w4.Result().StatusCode != http.StatusOK {
		t.Errorf("expected health 200 without secret, got %d", w4.Result().StatusCode)
	}
}
