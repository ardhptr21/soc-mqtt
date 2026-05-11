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
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Agents</CardTitle>
        <span className="text-xs tabular-nums text-muted-foreground">
          {normalized.filter((a) => a.status === 'online').length} of {normalized.length} online
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {normalized.map((agent) => {
            const online = agent.status === 'online';
            const count = counts[agent.name] ?? 0;
            return (
              <div
                key={agent.name}
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors duration-200 ${
                  online
                    ? 'border-border/50 bg-white/[0.02] hover:bg-white/[0.035]'
                    : 'border-border/20 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      online ? 'bg-lime-400' : 'bg-white/10'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize text-foreground/90">
                      {agent.name}
                    </p>
                    {agent.last_seen && (
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {new Date(agent.last_seen).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-lg font-semibold tabular-nums text-foreground/70">{count}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
