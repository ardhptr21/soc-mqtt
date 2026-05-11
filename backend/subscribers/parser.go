package subscribers

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"

	"soc-mqtt-simulator/backend/models"
)

type incomingEvent struct {
	ID          string           `json:"id"`
	Timestamp   time.Time        `json:"timestamp"`
	Type        models.EventType `json:"type"`
	Severity    models.Severity  `json:"severity"`
	SourceIP    string           `json:"source_ip"`
	DestIP      string           `json:"dest_ip"`
	Port        int              `json:"port"`
	Description string           `json:"description"`
	Agent       string           `json:"agent"`
	RawFields   *json.RawMessage `json:"-"`
}

func parseEvent(topic string, qos byte, payload []byte) (models.SecurityEvent, bool) {
	var incoming incomingEvent
	if err := json.Unmarshal(payload, &incoming); err != nil {
		return models.SecurityEvent{}, false
	}

	raw := string(payload)
	if incoming.ID == "" {
		incoming.ID = uuid.NewString()
	}
	if incoming.Timestamp.IsZero() {
		incoming.Timestamp = time.Now().UTC()
	}
	if incoming.Agent == "" {
		incoming.Agent = agentFromTopic(topic)
	}
	if incoming.Severity == "" {
		incoming.Severity = models.Low
	}
	if incoming.Type == "" {
		incoming.Type = typeFromTopic(topic)
	}
	if incoming.Description == "" {
		incoming.Description = "Security event received"
	}

	return models.SecurityEvent{
		ID:          incoming.ID,
		Timestamp:   incoming.Timestamp,
		Type:        incoming.Type,
		Severity:    incoming.Severity,
		SourceIP:    incoming.SourceIP,
		DestIP:      incoming.DestIP,
		Port:        incoming.Port,
		Description: incoming.Description,
		Topic:       topic,
		QoS:         qos,
		Agent:       incoming.Agent,
		Raw:         raw,
	}, true
}

func parseAgentStatus(topic string, payload []byte) (string, string, bool) {
	parts := strings.Split(topic, "/")
	if len(parts) != 4 || parts[0] != "security" || parts[1] != "agent" || parts[3] != "status" {
		return "", "", false
	}
	status := strings.TrimSpace(string(payload))
	if status != "online" && status != "offline" {
		return "", "", false
	}
	return parts[2], status, true
}

func agentFromTopic(topic string) string {
	parts := strings.Split(topic, "/")
	if len(parts) >= 2 {
		return parts[1]
	}
	return "unknown"
}

func typeFromTopic(topic string) models.EventType {
	switch {
	case strings.Contains(topic, "/blocked"):
		return models.PortScan
	case strings.Contains(topic, "/traffic"):
		return models.Traffic
	case strings.Contains(topic, "/alert"):
		return models.DDoS
	case strings.Contains(topic, "/honeypot/"):
		return models.Honeypot
	case strings.Contains(topic, "/edr/"):
		return models.EDRAlert
	case strings.Contains(topic, "/dns/"):
		return models.DNSAnomaly
	case strings.Contains(topic, "/auth"):
		return models.BruteForce
	case strings.Contains(topic, "/process"):
		return models.Malware
	case strings.Contains(topic, "/response/"):
		return models.Response
	default:
		return models.Firewall
	}
}
