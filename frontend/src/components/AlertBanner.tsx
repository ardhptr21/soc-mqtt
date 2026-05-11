import type { SocketStatus } from '../hooks/useWebSocket';
import type { SecurityEvent } from '../lib/types';

interface AlertBannerProps {
  event: SecurityEvent | null;
  socketStatus: SocketStatus;
}

export function AlertBanner({ event }: AlertBannerProps) {
  return (
    <div className="rounded-2xl border border-border/40 px-5 py-4">
      <p className="text-sm text-foreground/90">
        {event ? event.description : 'No critical alerts in current session'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {event
          ? `${event.source_ip} → ${event.dest_ip || '—'} · ${event.topic}`
          : 'Monitoring all security channels'}
      </p>
    </div>
  );
}
