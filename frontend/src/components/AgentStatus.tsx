import type { AgentStatus as Agent, SecurityEvent } from '../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const expectedAgents = ['firewall', 'ids', 'honeypot', 'host', 'edr', 'dns'];

interface AgentStatusProps {
  agents: Agent[];
  events: SecurityEvent[];
}

export function AgentStatus({ agents, events }: AgentStatusProps) {
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    const key = event.agent || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const normalized = expectedAgents.map((name) => {
    return (
      agents.find((agent) => agent.name === name) ?? {
        name,
        status: 'offline' as const,
        last_seen: '',
      }
    );
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Agent Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {normalized.map((agent) => {
            const online = agent.status === 'online';
            const count = counts[agent.name] ?? 0;
            return (
              <div
                key={agent.name}
                className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-border bg-background/10 px-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">{agent.name}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>{online ? 'online' : 'offline'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">events</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
