package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the Go worker service.
type Config struct {
	Port                string
	Host                string
	Environment         string
	LogLevel            string
	InternalSecret      string
	ReadTimeout         time.Duration
	WriteTimeout        time.Duration
	IdleTimeout         time.Duration
	ShutdownTimeout     time.Duration
	MaxPayloadBytes     int64
}

// Load loads configuration from environment variables with sensible defaults.
func Load() *Config {
	port := getEnv("WORKER_PORT", "")
	if port == "" {
		port = getEnv("PORT", "8081")
	}

	host := getEnv("WORKER_HOST", "0.0.0.0")
	env := getEnv("WORKER_ENV", "production")
	logLevel := getEnv("WORKER_LOG_LEVEL", "INFO")
	internalSecret := getEnv("WORKER_INTERNAL_SECRET", "")

	readTimeout := getDurationEnv("WORKER_READ_TIMEOUT", 15*time.Second)
	writeTimeout := getDurationEnv("WORKER_WRITE_TIMEOUT", 30*time.Second)
	idleTimeout := getDurationEnv("WORKER_IDLE_TIMEOUT", 60*time.Second)
	shutdownTimeout := getDurationEnv("WORKER_SHUTDOWN_TIMEOUT", 10*time.Second)
	maxPayloadBytes := getInt64Env("WORKER_MAX_PAYLOAD_BYTES", 10*1024*1024) // 10 MB default

	return &Config{
		Port:            port,
		Host:            host,
		Environment:     env,
		LogLevel:        logLevel,
		InternalSecret:  internalSecret,
		ReadTimeout:     readTimeout,
		WriteTimeout:    writeTimeout,
		IdleTimeout:     idleTimeout,
		ShutdownTimeout: shutdownTimeout,
		MaxPayloadBytes: maxPayloadBytes,
	}
}

// Address returns the combined host:port address string.
func (c *Config) Address() string {
	return c.Host + ":" + c.Port
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return fallback
}

func getInt64Env(key string, fallback int64) int64 {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		if i, err := strconv.ParseInt(val, 10, 64); err == nil {
			return i
		}
	}
	return fallback
}
