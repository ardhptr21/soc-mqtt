import type { SocketStatus } from '../hooks/useWebSocket';
import type { SecurityEvent } from '../lib/types';

interface AlertBannerProps {
  event: SecurityEvent | null;
  socketStatus: SocketStatus;
}

export function AlertBanner({ event, socketStatus }: AlertBannerProps) {
  return (
    <div className="flex min-h-14 flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {event ? event.description : 'No critical alert in current session'}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {event ? `${event.source_ip} via ${event.topic}` : 'Waiting for IDS or response events'}
        </p>
      </div>
    </div>
  );
}
