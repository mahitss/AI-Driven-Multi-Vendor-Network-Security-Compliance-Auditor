package server

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/mahitss/netvigil-worker-go/internal/job"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "ok",
		"service":     "netvigil-worker-go",
		"version":     "v1",
		"timestamp":   time.Now().UTC().Format(time.RFC3339),
		"environment": s.cfg.Environment,
	})
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ready",
		"service":   "netvigil-worker-go",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleJobs(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	w.Header().Set("Content-Type", "application/json")

	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, s.cfg.MaxPayloadBytes)

	var req job.JobRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		durationMs := time.Since(start).Milliseconds()
		errMsg := "invalid request json: " + err.Error()
		s.logger.Warn("job rejected: bad json", "error", err.Error())
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(job.JobResponse{
			Version:    "v1",
			JobID:      "",
			Status:     "failed",
			Result:     nil,
			Error:      &errMsg,
			DurationMs: durationMs,
		})
		return
	}

	// Validate job contract
	if err := job.Validate(&req); err != nil {
		durationMs := time.Since(start).Milliseconds()
		errMsg := err.Error()
		s.logger.Warn("job validation failed",
			"job_id", req.JobID,
			"job_type", req.JobType,
			"error", errMsg,
		)
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(job.JobResponse{
			Version:    req.Version,
			JobID:      req.JobID,
			Status:     "failed",
			Result:     nil,
			Error:      &errMsg,
			DurationMs: durationMs,
		})
		return
	}

	// Execute job deterministically
	result, err := job.Execute(&req)
	durationMs := time.Since(start).Milliseconds()

	if err != nil {
		errMsg := err.Error()
		s.logger.Error("job execution error",
			"job_id", req.JobID,
			"job_type", req.JobType,
			"duration_ms", durationMs,
			"error", errMsg,
		)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(job.JobResponse{
			Version:    req.Version,
			JobID:      req.JobID,
			Status:     "failed",
			Result:     nil,
			Error:      &errMsg,
			DurationMs: durationMs,
		})
		return
	}

	s.logger.Info("job completed successfully",
		"job_id", req.JobID,
		"job_type", req.JobType,
		"duration_ms", durationMs,
	)

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(job.JobResponse{
		Version:    req.Version,
		JobID:      req.JobID,
		Status:     "completed",
		Result:     result,
		Error:      nil,
		DurationMs: durationMs,
	})
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Health and readiness endpoints are unauthenticated for orchestrators / probes
		if r.URL.Path == "/health" || r.URL.Path == "/livez" || r.URL.Path == "/readyz" {
			next.ServeHTTP(w, r)
			return
		}

		// If InternalSecret is configured, require internal secret matching
		if s.cfg.InternalSecret != "" {
			secretHeader := r.Header.Get("X-Internal-Worker-Secret")
			authHeader := r.Header.Get("Authorization")

			var providedSecret string
			if secretHeader != "" {
				providedSecret = secretHeader
			} else if strings.HasPrefix(authHeader, "Bearer ") {
				providedSecret = strings.TrimPrefix(authHeader, "Bearer ")
			}

			if providedSecret != s.cfg.InternalSecret {
				s.logger.Warn("unauthorized worker access attempt",
					"path", r.URL.Path,
					"remote_addr", r.RemoteAddr,
				)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				errMsg := "unauthorized: invalid internal worker secret"
				_ = json.NewEncoder(w).Encode(job.JobResponse{
					Version: "v1",
					Status:  "failed",
					Error:   &errMsg,
				})
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		s.logger.Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rw.statusCode,
			"duration_ms", time.Since(start).Milliseconds(),
			"remote_addr", r.RemoteAddr,
		)
	})
}

func (s *Server) recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				s.logger.Error("panic recovered in http handler",
					"panic", rec,
					"path", r.URL.Path,
				)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				errMsg := "internal server error: unexpected failure"
				_ = json.NewEncoder(w).Encode(job.JobResponse{
					Version: "v1",
					Status:  "failed",
					Error:   &errMsg,
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}
