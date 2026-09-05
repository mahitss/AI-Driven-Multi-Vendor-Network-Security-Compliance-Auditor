package job

import (
	"errors"
	"fmt"
	"strings"
)

var (
	ErrUnsupportedVersion = errors.New("unsupported version: must be 'v1'")
	ErrMissingJobID        = errors.New("job_id is required")
	ErrJobIDTooLong       = errors.New("job_id exceeds maximum length of 128 characters")
	ErrMissingJobType     = errors.New("job_type is required")
	ErrUnsupportedJobType = errors.New("unsupported job_type")
	ErrMissingPayload     = errors.New("payload is required and must be an object")
)

// SupportedJobTypes lists all valid job types handled by this worker.
var SupportedJobTypes = map[string]bool{
	"ping":             true,
	"config_preflight": true,
	"sanitize_text":    true,
	"chunk_payload":    true,
}

// Validate checks that the JobRequest conforms to the strict v1 contract.
func Validate(req *JobRequest) error {
	if req == nil {
		return errors.New("empty request body")
	}

	if strings.TrimSpace(req.Version) != "v1" {
		return ErrUnsupportedVersion
	}

	trimmedID := strings.TrimSpace(req.JobID)
	if trimmedID == "" {
		return ErrMissingJobID
	}
	if len(trimmedID) > 128 {
		return ErrJobIDTooLong
	}

	trimmedType := strings.TrimSpace(req.JobType)
	if trimmedType == "" {
		return ErrMissingJobType
	}
	if !SupportedJobTypes[trimmedType] {
		return fmt.Errorf("%w: '%s'", ErrUnsupportedJobType, req.JobType)
	}

	if req.Payload == nil {
		return ErrMissingPayload
	}

	// Payload-specific validation
	switch trimmedType {
	case "config_preflight":
		rawConfig, ok := req.Payload["raw_config"]
		if !ok {
			return errors.New("payload requires 'raw_config' field")
		}
		if _, ok := rawConfig.(string); !ok {
			return errors.New("'raw_config' must be a string")
		}
	case "sanitize_text":
		text, ok := req.Payload["text"]
		if !ok {
			return errors.New("payload requires 'text' field")
		}
		if _, ok := text.(string); !ok {
			return errors.New("'text' must be a string")
		}
	case "chunk_payload":
		text, ok := req.Payload["text"]
		if !ok {
			return errors.New("payload requires 'text' field")
		}
		if _, ok := text.(string); !ok {
			return errors.New("'text' must be a string")
		}
	case "ping":
		// ping requires no mandatory payload fields
	}

	return nil
}
