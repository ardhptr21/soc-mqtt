import { useState } from 'react';
import type { AgentStatus } from '../lib/types';
import { chaosToggle, triggerKillChain } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const expectedAgents = ['firewall', 'ids', 'honeypot', 'host', 'edr', 'dns'];

interface ChaosPanelProps {
  agents: AgentStatus[];
}

export function ChaosPanel({ agents }: ChaosPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [killChainBusy, setKillChainBusy] = useState(false);

  const agentMap = Object.fromEntries(agents.map((a) => [a.name, a]));

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
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Chaos Engineering</CardTitle>
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
        <p className="mb-4 text-xs text-muted-foreground">
          Toggle agents on/off to simulate failures. Trigger a kill chain to see what gets missed.
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {expectedAgents.map((name) => {
            const agent = agentMap[name];
            const isOnline = agent?.status === 'online';
            const isBusy = busy === name;

            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${
                      isOnline ? 'bg-lime-400' : 'bg-white/10'
                    }`}
                  />
                  <span className="text-sm font-medium capitalize text-foreground/90">{name}</span>
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void toggle(name, agent?.status ?? 'offline')}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    isOnline
                      ? 'border border-red-500/20 text-red-400/80 hover:bg-red-500/5'
                      : 'border border-lime-500/20 text-lime-400/80 hover:bg-lime-500/5'
                  } ${isBusy ? 'opacity-50' : ''}`}
                >
                  {isBusy ? '...' : isOnline ? 'Disable' : 'Enable'}
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
