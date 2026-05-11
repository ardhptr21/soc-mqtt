package models

import "time"

type Severity string

const (
	Low      Severity = "low"
	Medium   Severity = "medium"
	High     Severity = "high"
	Critical Severity = "critical"
)

type EventType string

const (
	BruteForce EventType = "brute_force"
	PortScan   EventType = "port_scan"
	DDoS       EventType = "ddos"
	Honeypot   EventType = "honeypot_hit"
	Malware    EventType = "malware"
	ARPSpoof   EventType = "arp_spoof"
	Firewall   EventType = "firewall"
	Traffic    EventType = "traffic"
	Response   EventType = "response"
)

type SecurityEvent struct {
	ID          string    `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	Type        EventType `json:"type"`
	Severity    Severity  `json:"severity"`
	SourceIP    string    `json:"source_ip"`
	DestIP      string    `json:"dest_ip"`
	Port        int       `json:"port"`
	Description string    `json:"description"`
	Topic       string    `json:"topic"`
	QoS         byte      `json:"qos"`
	Agent       string    `json:"agent"`
	Raw         string    `json:"raw"`
}

type AgentStatus struct {
	Name     string    `json:"name"`
	Status   string    `json:"status"`
	LastSeen time.Time `json:"last_seen"`
}

type BlacklistEntry struct {
	IP        string    `json:"ip" binding:"required"`
	Reason    string    `json:"reason"`
	BlockedAt time.Time `json:"blocked_at"`
	BlockedBy string    `json:"blocked_by"`
}

type Stats struct {
	TotalEvents  int            `json:"total_events"`
	BySeverity   map[string]int `json:"by_severity"`
	ByType       map[string]int `json:"by_type"`
	BlockedIPs   int            `json:"blocked_ips"`
	EventsPerMin []TimePoint    `json:"events_per_min"`
}

type TimePoint struct {
	Time  time.Time `json:"time"`
	Count int       `json:"count"`
}

type WSMessage struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}
