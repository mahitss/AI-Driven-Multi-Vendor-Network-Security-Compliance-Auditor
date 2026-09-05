package logger

import (
	"log/slog"
	"os"
	"strings"
)

// Init initializes and returns a structured slog.Logger for the worker.
func Init(levelStr string) *slog.Logger {
	var level slog.Level
	switch strings.ToUpper(strings.TrimSpace(levelStr)) {
	case "DEBUG":
		level = slog.LevelDebug
	case "WARN":
		level = slog.LevelWarn
	case "ERROR":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level: level,
	}

	handler := slog.NewJSONHandler(os.Stdout, opts)
	logger := slog.New(handler).With("service", "netvigil-worker-go")
	slog.SetDefault(logger)

	return logger
}
