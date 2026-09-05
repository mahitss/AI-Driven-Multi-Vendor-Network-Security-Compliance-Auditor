package config

import (
	"os"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	// Clear any overrides
	os.Unsetenv("WORKER_PORT")
	os.Unsetenv("PORT")
	os.Unsetenv("WORKER_HOST")
	os.Unsetenv("WORKER_ENV")
	os.Unsetenv("WORKER_LOG_LEVEL")
	os.Unsetenv("WORKER_INTERNAL_SECRET")

	cfg := Load()

	if cfg.Port != "8081" {
		t.Errorf("expected default Port 8081, got %s", cfg.Port)
	}
	if cfg.Host != "0.0.0.0" {
		t.Errorf("expected default Host 0.0.0.0, got %s", cfg.Host)
	}
	if cfg.Address() != "0.0.0.0:8081" {
		t.Errorf("expected Address 0.0.0.0:8081, got %s", cfg.Address())
	}
	if cfg.ReadTimeout != 15*time.Second {
		t.Errorf("expected ReadTimeout 15s, got %v", cfg.ReadTimeout)
	}
	if cfg.MaxPayloadBytes != 10*1024*1024 {
		t.Errorf("expected MaxPayloadBytes 10MB, got %d", cfg.MaxPayloadBytes)
	}
}

func TestLoadCustomEnvironment(t *testing.T) {
	os.Setenv("WORKER_PORT", "9090")
	os.Setenv("WORKER_HOST", "127.0.0.1")
	os.Setenv("WORKER_ENV", "development")
	os.Setenv("WORKER_LOG_LEVEL", "DEBUG")
	os.Setenv("WORKER_INTERNAL_SECRET", "test-secret-123")
	os.Setenv("WORKER_READ_TIMEOUT", "5s")
	os.Setenv("WORKER_MAX_PAYLOAD_BYTES", "2048")
	defer func() {
		os.Unsetenv("WORKER_PORT")
		os.Unsetenv("WORKER_HOST")
		os.Unsetenv("WORKER_ENV")
		os.Unsetenv("WORKER_LOG_LEVEL")
		os.Unsetenv("WORKER_INTERNAL_SECRET")
		os.Unsetenv("WORKER_READ_TIMEOUT")
		os.Unsetenv("WORKER_MAX_PAYLOAD_BYTES")
	}()

	cfg := Load()

	if cfg.Port != "9090" {
		t.Errorf("expected Port 9090, got %s", cfg.Port)
	}
	if cfg.Host != "127.0.0.1" {
		t.Errorf("expected Host 127.0.0.1, got %s", cfg.Host)
	}
	if cfg.Address() != "127.0.0.1:9090" {
		t.Errorf("expected Address 127.0.0.1:9090, got %s", cfg.Address())
	}
	if cfg.Environment != "development" {
		t.Errorf("expected Environment development, got %s", cfg.Environment)
	}
	if cfg.InternalSecret != "test-secret-123" {
		t.Errorf("expected InternalSecret test-secret-123, got %s", cfg.InternalSecret)
	}
	if cfg.ReadTimeout != 5*time.Second {
		t.Errorf("expected ReadTimeout 5s, got %v", cfg.ReadTimeout)
	}
	if cfg.MaxPayloadBytes != 2048 {
		t.Errorf("expected MaxPayloadBytes 2048, got %d", cfg.MaxPayloadBytes)
	}
}
