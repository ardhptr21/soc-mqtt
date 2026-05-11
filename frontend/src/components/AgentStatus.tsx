import { useState } from 'react';
import type { AgentStatus as Agent, SecurityEvent } from '../lib/types';
import { chaosToggle, triggerKillChain } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const expectedAgents = ['firewall', 'ids', 'honeypot', 'host', 'edr', 'dns'];

interface AgentStatusProps {
  agents: Agent[];
  events: SecurityEvent[];
}

export function AgentStatus({ agents, events }: AgentStatusProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [killChainBusy, setKillChainBusy] = useState(false);

  const counts = events.reduce<Record<string, number>>((acc, event) => {
    const key = event.agent || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const agentMap = Object.fromEntries(agents.map((a) => [a.name, a]));

  const normalized = expectedAgents.map((name) => {
    return (
      agentMap[name] ?? {
        name,
        status: 'offline' as const,
        last_seen: '',
      }
    );
  });

  const onlineCount = normalized.filter((a) => a.status === 'online').length;

  const toggle = async (name: string, current: string) => {
    setBusy(name);
    try {
      await chaosToggle(name, current !== 'online');
    } finally {
      setBusy(null);
    }
  };

  const launchKillChain = async () => {
    setKillChainBusy(true);
    try {
      await triggerKillChain();
    } finally {
      setKillChainBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Agents</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {onlineCount} of {normalized.length} online · Toggle agents to simulate failures
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void launchKillChain()}
          disabled={killChainBusy}
        >
          {killChainBusy ? 'Launching...' : 'Trigger Kill Chain'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {normalized.map((agent) => {
            const online = agent.status === 'online';
            const count = counts[agent.name] ?? 0;
            const isBusy = busy === agent.name;

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

                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold tabular-nums text-foreground/70">{count}</p>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void toggle(agent.name, agent.status)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-all ${
                      online
                        ? 'border border-red-500/20 text-red-400/70 hover:bg-red-500/5'
                        : 'border border-lime-500/20 text-lime-400/70 hover:bg-lime-500/5'
                    } ${isBusy ? 'opacity-50' : ''}`}
                  >
                    {isBusy ? '...' : online ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
