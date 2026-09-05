package server

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/mahitss/netvigil-worker-go/internal/config"
)

// Server wraps http.Server with worker routing and lifecycle management.
type Server struct {
	httpServer *http.Server
	cfg        *config.Config
	logger     *slog.Logger
}

// New creates a new configured Server.
func New(cfg *config.Config, logger *slog.Logger) *Server {
	mux := http.NewServeMux()

	s := &Server{
		cfg:    cfg,
		logger: logger,
	}

	// Register routes
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /livez", s.handleHealth)
	mux.HandleFunc("GET /readyz", s.handleReady)
	mux.HandleFunc("POST /api/v1/jobs", s.handleJobs)
	mux.HandleFunc("POST /jobs", s.handleJobs)

	// Wrap mux with standard middleware
	handler := s.recoveryMiddleware(s.loggingMiddleware(s.authMiddleware(mux)))

	s.httpServer = &http.Server{
		Addr:         cfg.Address(),
		Handler:      handler,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	return s
}

// Start begins listening on the configured address.
func (s *Server) Start() error {
	s.logger.Info("starting go worker service",
		"address", s.cfg.Address(),
		"environment", s.cfg.Environment,
	)
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully stops the server within the configured timeout.
func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("shutting down go worker service gracefully")
	return s.httpServer.Shutdown(ctx)
}

// Handler returns the server's root http.Handler (useful for testing).
func (s *Server) Handler() http.Handler {
	return s.httpServer.Handler
}
