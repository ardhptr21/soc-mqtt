import { useState } from 'react';
import { BarChart3, ListChecks, Server, ShieldAlert } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';
import { AgentStatus } from '../components/AgentStatus';
import { BlacklistPanel } from '../components/BlacklistPanel';
import { EventFeed } from '../components/EventFeed';
import { SeverityChart } from '../components/SeverityChart';
import { ThreatCounter } from '../components/ThreatCounter';
import { Button } from '../components/ui/button';
import { useEvents } from '../hooks/useEvents';

type SectionKey = 'overview' | 'agents' | 'events' | 'blacklist';

export function Dashboard() {
  const [section, setSection] = useState<SectionKey>('overview');
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

  const sectionButtons: { key: SectionKey; label: string; icon: typeof ShieldAlert }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'agents', label: 'Agents', icon: Server },
    { key: 'events', label: 'Events', icon: ListChecks },
    { key: 'blacklist', label: 'Blacklist', icon: ShieldAlert },
  ];

  return (
    <main className="h-screen bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">SOC Dashboard</h1>
            <p className="text-sm text-muted-foreground">MQTT security simulator monitoring</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm">
              <span
                className={
                  socketStatus === 'open'
                    ? 'h-2 w-2 rounded-full bg-emerald-500'
                    : 'h-2 w-2 rounded-full bg-slate-400'
                }
              />
              {socketStatus === 'open' ? 'LIVE' : socketStatus}
            </span>
            <Button variant="outline" onClick={() => void refresh()}>
              Refresh
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-start gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            {sectionButtons.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={section === item.key ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setSection(item.key)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </aside>

          <div className="flex min-h-0 flex-col gap-5 overflow-auto">
            {error ? (
              <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
                {error}
              </div>
            ) : null}

            {section === 'overview' ? (
              <>
                <AlertBanner event={lastCritical} socketStatus={socketStatus} />
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <ThreatCounter
                    title="Total Events"
                    value={loading ? '...' : stats.total_events.toLocaleString()}
                  />
                  <ThreatCounter title="Critical Alerts" value={criticalCount} />
                  <ThreatCounter
                    title="Blocked IPs"
                    value={blacklist.length || stats.blocked_ips}
                  />
                  <ThreatCounter
                    title="Agents Online"
                    value={`${onlineAgents}/${Math.max(agents.length, 4)}`}
                  />
                </section>
                <SeverityChart stats={stats} />
              </>
            ) : null}

            {section === 'agents' ? <AgentStatus agents={agents} events={events} /> : null}
            {section === 'events' ? (
              <EventFeed events={events} filter={filter} onFilterChange={setFilter} />
            ) : null}
            {section === 'blacklist' ? (
              <BlacklistPanel entries={blacklist} onAdd={addManualBlock} onDelete={deleteBlock} />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
