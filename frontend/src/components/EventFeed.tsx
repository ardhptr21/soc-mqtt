import type { SecurityEvent, Severity } from '../lib/types';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select } from './ui/select';

interface EventFeedProps {
  events: SecurityEvent[];
  filter: Severity | 'all';
  onFilterChange: (filter: Severity | 'all') => void;
}

export function EventFeed({ events, filter, onFilterChange }: EventFeedProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CardTitle className="text-base">Events</CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">{events.length}</span>
        </div>
        <Select
          value={filter}
          onChange={(event) => onFilterChange(event.target.value as Severity | 'all')}
          aria-label="Filter severity"
        >
          <option value="all">All severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="max-h-[36rem] overflow-auto rounded-xl border border-border/30">
          {sortedEvents.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No events received yet
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.015] md:grid-cols-[6.5rem_1fr_7.5rem] md:items-center"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={event.severity}>{event.severity}</Badge>
                    <span className="text-[10px] tabular-nums text-muted-foreground/60">
                      Q{event.qos}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground/90">
                      {event.description}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {event.source_ip || '—'} → {event.dest_ip || '—'}:{event.port || '—'}
                      <span className="mx-1.5 text-border">·</span>
                      {event.topic}
                    </p>
                  </div>
                  <div className="text-left text-[11px] text-muted-foreground md:text-right">
                    <p className="capitalize text-foreground/50">{event.agent}</p>
                    <p className="tabular-nums">{new Date(event.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
