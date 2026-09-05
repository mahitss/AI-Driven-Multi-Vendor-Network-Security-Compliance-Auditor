package job

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	// Regex patterns for redacting standard credential directives in network configs
	secretPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(password\s+(?:7\s+|5\s+|0\s+)?)(?:[^\s\r\n]+)`),
		regexp.MustCompile(`(?i)(secret\s+(?:5\s+|8\s+|9\s+)?)(?:[^\s\r\n]+)`),
		regexp.MustCompile(`(?i)(pre-shared-key\s+(?:hex\s+)?)(?:[^\s\r\n]+)`),
		regexp.MustCompile(`(?i)(encrypted-password\s+)(?:[^\s\r\n;]+)`),
		regexp.MustCompile(`(?i)(private-key\s+)(?:[^\s\r\n;]+)`),
	}
)

// Execute runs the job deterministically and returns the result map or an error.
func Execute(req *JobRequest) (map[string]interface{}, error) {
	switch req.JobType {
	case "ping":
		return executePing(req)
	case "config_preflight":
		return executeConfigPreflight(req)
	case "sanitize_text":
		return executeSanitizeText(req)
	case "chunk_payload":
		return executeChunkPayload(req)
	default:
		return nil, fmt.Errorf("unhandled job type: %s", req.JobType)
	}
}

func executePing(req *JobRequest) (map[string]interface{}, error) {
	return map[string]interface{}{
		"pong":      true,
		"service":   "netvigil-worker-go",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func executeConfigPreflight(req *JobRequest) (map[string]interface{}, error) {
	rawConfig, _ := req.Payload["raw_config"].(string)

	// Compute SHA-256
	hasher := sha256.New()
	hasher.Write([]byte(rawConfig))
	sha256Hex := hex.EncodeToString(hasher.Sum(nil))

	// Line statistics
	lines := strings.Split(rawConfig, "\n")
	lineCount := len(lines)
	nonEmptyLines := 0
	for _, l := range lines {
		if strings.TrimSpace(l) != "" {
			nonEmptyLines++
		}
	}

	byteSize := len([]byte(rawConfig))
	isUTF8 := utf8.ValidString(rawConfig)
	hasNullBytes := strings.ContainsRune(rawConfig, '\x00')
	estimatedTokens := byteSize / 4
	if estimatedTokens < 1 && byteSize > 0 {
		estimatedTokens = 1
	}

	return map[string]interface{}{
		"sha256":           sha256Hex,
		"byte_size":        byteSize,
		"line_count":       lineCount,
		"non_empty_lines":  nonEmptyLines,
		"is_utf8":          isUTF8,
		"has_null_bytes":   hasNullBytes,
		"estimated_tokens": estimatedTokens,
	}, nil
}

func executeSanitizeText(req *JobRequest) (map[string]interface{}, error) {
	text, _ := req.Payload["text"].(string)
	redactionCount := 0

	sanitized := text
	for _, pattern := range secretPatterns {
		matches := pattern.FindAllString(sanitized, -1)
		if len(matches) > 0 {
			redactionCount += len(matches)
			sanitized = pattern.ReplaceAllString(sanitized, "${1}[REDACTED_BY_WORKER]")
		}
	}

	return map[string]interface{}{
		"original_bytes":  len([]byte(text)),
		"sanitized_bytes": len([]byte(sanitized)),
		"redaction_count": redactionCount,
		"sanitized_text":  sanitized,
	}, nil
}

func executeChunkPayload(req *JobRequest) (map[string]interface{}, error) {
	text, _ := req.Payload["text"].(string)
	chunkSize := 100 // default 100 lines per chunk
	if rawSize, ok := req.Payload["chunk_size"]; ok {
		if fSize, ok := rawSize.(float64); ok && fSize > 0 {
			chunkSize = int(fSize)
		} else if iSize, ok := rawSize.(int); ok && iSize > 0 {
			chunkSize = iSize
		}
	}

	lines := strings.Split(text, "\n")
	var chunks []string
	for i := 0; i < len(lines); i += chunkSize {
		end := i + chunkSize
		if end > len(lines) {
			end = len(lines)
		}
		chunks = append(chunks, strings.Join(lines[i:end], "\n"))
	}

	return map[string]interface{}{
		"total_lines": len(lines),
		"chunk_size":  chunkSize,
		"chunk_count": len(chunks),
		"chunks":      chunks,
	}, nil
}
