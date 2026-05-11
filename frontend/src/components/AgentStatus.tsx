import type { AgentStatus as Agent } from '../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const expectedAgents = ['firewall', 'ids', 'honeypot', 'host'];

interface AgentStatusProps {
  agents: Agent[];
}

export function AgentStatus({ agents }: AgentStatusProps) {
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {normalized.map((agent) => {
            const online = agent.status === 'online';
            return (
              <div
                key={agent.name}
                className="flex min-h-20 items-center gap-3 rounded-md border border-border bg-background/60 px-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">{agent.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-xs text-muted-foreground">
                      {online ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
