package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/mahitss/netvigil-worker-go/internal/config"
	"github.com/mahitss/netvigil-worker-go/internal/logger"
	"github.com/mahitss/netvigil-worker-go/internal/server"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize structured logger
	log := logger.Init(cfg.LogLevel)

	log.Info("initializing netvigil go worker",
		"port", cfg.Port,
		"environment", cfg.Environment,
		"read_timeout", cfg.ReadTimeout.String(),
		"write_timeout", cfg.WriteTimeout.String(),
	)

	// Build server
	srv := server.New(cfg, log)

	// Channel to capture critical server errors
	serverErrors := make(chan error, 1)

	// Run server in background goroutine
	go func() {
		if err := srv.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	// Listen for shutdown signals
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	select {
	case err := <-serverErrors:
		log.Error("fatal error starting server", "error", err)
		os.Exit(1)
	case sig := <-shutdown:
		log.Info("shutdown signal received", "signal", sig.String())

		// Graceful shutdown context
		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Error("graceful shutdown failed", "error", err)
			_ = srv.Shutdown(context.Background())
			os.Exit(1)
		}

		log.Info("server shutdown completed cleanly")
	}
}
