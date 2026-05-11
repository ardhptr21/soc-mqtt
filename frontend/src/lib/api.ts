import axios from 'axios';
import type { AgentStatus, BlacklistEntry, SecurityEvent, Stats } from './types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://192.168.52.128:8080';
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://192.168.52.128:8080/ws';

const client = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

export async function getEvents(severity = '', limit = 150) {
  const { data } = await client.get<SecurityEvent[]>('/api/events', {
    params: { severity: severity || undefined, limit },
  });
  return data;
}

export async function getStats() {
  const { data } = await client.get<Stats>('/api/stats');
  return data;
}

export async function getAgents() {
  const { data } = await client.get<AgentStatus[]>('/api/agents');
  return data;
}

export async function getBlacklist() {
  const { data } = await client.get<BlacklistEntry[]>('/api/blacklist');
  return data;
}

export async function addBlacklist(ip: string, reason: string) {
  const { data } = await client.post<BlacklistEntry>('/api/blacklist', {
    ip,
    reason,
  });
  return data;
}

export async function removeBlacklist(ip: string) {
  await client.delete(`/api/blacklist/${encodeURIComponent(ip)}`);
}

// ─── Kill Chain ───

export async function triggerKillChain() {
  const { data } = await client.post('/api/killchain/trigger');
  return data;
}

// ─── Simulation Settings ───

export interface SimSettings {
  scenario: string;
  rate_multiplier: number;
  burst_chance: number;
}

export async function getSimulationSettings() {
  const { data } = await client.get<SimSettings>('/api/simulation');
  return data;
}

export async function updateSimulationSettings(settings: Partial<SimSettings>) {
  const { data } = await client.put<SimSettings>('/api/simulation', settings);
  return data;
}

// ─── Chaos Engineering ───

export async function chaosToggle(agent: string, online: boolean) {
  const { data } = await client.post('/api/chaos/toggle', { agent, online });
  return data;
}
