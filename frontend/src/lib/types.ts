export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type EventType =
  | 'brute_force'
  | 'port_scan'
  | 'ddos'
  | 'honeypot_hit'
  | 'malware'
  | 'arp_spoof'
  | 'firewall'
  | 'traffic'
  | 'response'
  | 'edr_alert'
  | 'dns_anomaly';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: EventType;
  severity: Severity;
  source_ip: string;
  dest_ip: string;
  port: number;
  description: string;
  topic: string;
  qos: number;
  agent: string;
  raw: string;
}

export interface AgentStatus {
  name: string;
  status: 'online' | 'offline';
  last_seen: string;
}

export interface BlacklistEntry {
  ip: string;
  reason: string;
  blocked_at: string;
  blocked_by: 'manual' | 'incident_bot' | string;
}

export interface TimePoint {
  time: string;
  count: number;
}

export interface Stats {
  total_events: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  blocked_ips: number;
  events_per_min: TimePoint[];
}

export type WSMessage =
  | { type: 'new_event'; payload: SecurityEvent }
  | { type: 'agent_status'; payload: AgentStatus }
  | { type: 'ip_blocked'; payload: BlacklistEntry };
