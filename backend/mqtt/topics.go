package mqtt

const (
	TopicSecurityAll       = "security/#"
	TopicAllAlerts         = "security/+/alert"
	TopicAgentStatusPrefix = "security/agent/"

	TopicFirewallStatus = "security/agent/firewall/status"
	TopicIDSStatus      = "security/agent/ids/status"
	TopicHoneypotStatus = "security/agent/honeypot/status"
	TopicHostStatus     = "security/agent/host/status"
	TopicEDRStatus      = "security/agent/edr/status"
	TopicDNSStatus      = "security/agent/dns/status"

	TopicFirewallLogs    = "security/firewall/logs"
	TopicFirewallBlocked = "security/firewall/blocked"

	TopicIDSTraffic = "security/ids/traffic"
	TopicIDSAlert   = "security/ids/alert"

	TopicHoneypotHit     = "security/honeypot/hit"
	TopicHoneypotPayload = "security/honeypot/payload"

	TopicHostAuthPattern    = "security/host/%s/auth"
	TopicHostProcessPattern = "security/host/%s/process"

	TopicEDRAlert = "security/edr/alert"
	TopicDNSQuery = "security/dns/query"

	TopicResponseBlock = "security/response/block"
)

const (
	QoSAtMostOnce  byte = 0
	QoSAtLeastOnce byte = 1
	QoSExactlyOnce byte = 2
)
