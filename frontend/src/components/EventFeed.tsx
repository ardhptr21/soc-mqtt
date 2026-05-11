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
        <CardTitle>Live Event Feed</CardTitle>
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
        <div className="max-h-[34rem] overflow-auto rounded-md border border-border">
          {sortedEvents.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No events received yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[8rem_1fr_8rem] md:items-center"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={event.severity}>{event.severity}</Badge>
                    <span className="text-xs text-muted-foreground">QoS {event.qos}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.description}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {event.source_ip || 'unknown'} {'->'} {event.dest_ip || 'n/a'}:
                      {event.port || '-'} · {event.topic}
                    </p>
                  </div>
                  <div className="text-left text-xs text-muted-foreground md:text-right">
                    <p>{event.agent}</p>
                    <p>{new Date(event.timestamp).toLocaleTimeString()}</p>
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
