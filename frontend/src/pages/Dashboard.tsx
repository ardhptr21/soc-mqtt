import { AlertBanner } from '../components/AlertBanner';
import { AgentStatus } from '../components/AgentStatus';
import { BlacklistPanel } from '../components/BlacklistPanel';
import { EventFeed } from '../components/EventFeed';
import { SeverityChart } from '../components/SeverityChart';
import { ThreatCounter } from '../components/ThreatCounter';
import { Button } from '../components/ui/button';
import { useEvents } from '../hooks/useEvents';

export function Dashboard() {
  const {
    events,
    stats,
    agents,
    blacklist,
    filter,
    loading,
    error,
    socketStatus,
    onlineAgents,
    lastCritical,
    setFilter,
    refresh,
    addManualBlock,
    deleteBlock,
  } = useEvents();

  const criticalCount = stats.by_severity.critical ?? 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">SOC Dashboard</h1>
            <p className="text-sm text-muted-foreground">MQTT security simulator monitoring</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              {socketStatus === 'open' ? 'LIVE' : socketStatus}
            </span>
            <Button variant="outline" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <AlertBanner event={lastCritical} socketStatus={socketStatus} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ThreatCounter
            title="Total Events"
            value={loading ? '...' : stats.total_events.toLocaleString()}
            caption="Events kept in backend memory"
          />
          <ThreatCounter
            title="Critical Alerts"
            value={criticalCount}
            caption="Severity marked critical"
          />
          <ThreatCounter
            title="Blocked IPs"
            value={blacklist.length || stats.blocked_ips}
            caption="Manual and incident bot blocks"
          />
          <ThreatCounter
            title="Agents Online"
            value={`${onlineAgents}/${Math.max(agents.length, 4)}`}
            caption="Birth and will status messages"
          />
        </section>

        <AgentStatus agents={agents} />
        <SeverityChart stats={stats} />
        <EventFeed events={events} filter={filter} onFilterChange={setFilter} />
        <BlacklistPanel entries={blacklist} onAdd={addManualBlock} onDelete={deleteBlock} />
      </div>
    </main>
  );
}
