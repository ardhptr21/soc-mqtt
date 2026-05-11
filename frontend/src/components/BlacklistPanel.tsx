import { useState } from 'react';
import type { FormEvent } from 'react';
import type { BlacklistEntry } from '../lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

interface BlacklistPanelProps {
  entries: BlacklistEntry[];
  onAdd: (ip: string, reason: string) => Promise<void>;
  onDelete: (ip: string) => Promise<void>;
}

export function BlacklistPanel({ entries, onAdd, onDelete }: BlacklistPanelProps) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ip.trim()) return;
    setBusy(true);
    try {
      await onAdd(ip.trim(), reason.trim() || 'Manual SOC block');
      setIp('');
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>IP Blacklist</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-2 md:grid-cols-[12rem_1fr_auto]">
          <Input
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="192.168.1.100"
          />
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason"
          />
          <Button type="submit" disabled={busy} className="w-full md:w-auto">
            Add
          </Button>
        </form>

        <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border">
          {entries.length === 0 ? (
            <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
              No blocked IPs
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div
                  key={entry.ip}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[11rem_1fr_9rem_2.5rem] md:items-center"
                >
                  <p className="font-mono text-sm text-foreground">{entry.ip}</p>
                  <p className="min-w-0 truncate text-sm text-muted-foreground">{entry.reason}</p>
                  <div className="text-xs text-muted-foreground">
                    <p>{entry.blocked_by}</p>
                    <p>{new Date(entry.blocked_at).toLocaleTimeString()}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${entry.ip}`}
                    onClick={() => void onDelete(entry.ip)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
