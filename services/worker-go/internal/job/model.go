package job

// JobRequest represents a versioned job submission.
type JobRequest struct {
	Version string                 `json:"version"`
	JobID   string                 `json:"job_id"`
	JobType string                 `json:"job_type"`
	Payload map[string]interface{} `json:"payload"`
}

// JobResponse represents the deterministic result of a job execution.
type JobResponse struct {
	Version    string                 `json:"version"`
	JobID      string                 `json:"job_id"`
	Status     string                 `json:"status"` // "completed" | "failed"
	Result     map[string]interface{} `json:"result"`
	Error      *string                `json:"error"`
	DurationMs int64                  `json:"duration_ms"`
}
