import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
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
        <div className="flex items-center gap-2.5">
          <CardTitle className="text-base">Blocked IPs</CardTitle>
          {entries.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {entries.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-2.5 md:flex-row">
          <Input
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="IP address"
            className="md:w-44"
          />
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason"
            className="flex-1"
          />
          <Button type="submit" disabled={busy} size="sm" className="shrink-0 h-10 px-5">
            Block
          </Button>
        </form>

        <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-border/30">
          {entries.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No blocked IPs
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {entries.map((entry) => (
                <div
                  key={entry.ip}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.015]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-foreground/90">{entry.ip}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.reason}</p>
                  </div>

                  <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                    <p>{entry.blocked_by}</p>
                    <p className="tabular-nums">{new Date(entry.blocked_at).toLocaleTimeString()}</p>
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${entry.ip}`}
                    onClick={() => void onDelete(entry.ip)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
