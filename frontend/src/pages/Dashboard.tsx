import { useState } from 'react';
import { BarChart3, ListChecks, Server, ShieldAlert, RefreshCw } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';
import { AgentStatus } from '../components/AgentStatus';
import { BlacklistPanel } from '../components/BlacklistPanel';
import { EventFeed } from '../components/EventFeed';
import { SeverityChart } from '../components/SeverityChart';
import { ThreatCounter } from '../components/ThreatCounter';
import { useEvents } from '../hooks/useEvents';

type SectionKey = 'overview' | 'agents' | 'events' | 'blacklist';

const sections: { key: SectionKey; label: string; icon: typeof ShieldAlert }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'agents', label: 'Agents', icon: Server },
  { key: 'events', label: 'Events', icon: ListChecks },
  { key: 'blacklist', label: 'Blacklist', icon: ShieldAlert },
];

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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-5 py-5 sm:px-8">
        {/* ─── Header ─── */}
        <header className="relative flex items-center border-b border-border/30 pb-5">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            SOC CONSOLE
          </h1>

          {/* Pill nav — centered */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/30 p-1 sm:flex">
            {sections.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-all duration-150 ${
                  section === item.key
                    ? 'bg-white/[0.07] font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  socketStatus === 'open'
                    ? 'bg-emerald-400'
                    : socketStatus === 'connecting'
                    ? 'bg-amber-400'
                    : 'bg-white/20'
                }`}
              />
              {socketStatus === 'open' ? 'Live' : socketStatus}
            </span>

            <div className="h-4 w-px bg-border/30" />

            <button
              type="button"
              onClick={() => void refresh()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto border-b border-border/20 py-2 sm:hidden">
          {sections.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                section === item.key
                  ? 'bg-white/[0.07] font-medium text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* ─── Content ─── */}
        <div className="flex flex-col gap-5 pt-6 pb-10">
          {error && (
            <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3 text-sm text-red-400/90">
              {error}
            </div>
          )}

          {section === 'overview' && (
            <>
              <AlertBanner event={lastCritical} socketStatus={socketStatus} />

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ThreatCounter
                  title="Total Events"
                  value={loading ? '—' : stats.total_events.toLocaleString()}
                  accent="a"
                />
                <ThreatCounter
                  title="Critical"
                  value={criticalCount}
                  accent="b"
                />
                <ThreatCounter
                  title="Blocked IPs"
                  value={blacklist.length || stats.blocked_ips}
                  accent="c"
                />
                <ThreatCounter
                  title="Agents Online"
                  value={`${onlineAgents} / ${Math.max(agents.length, 4)}`}
                  accent="d"
                />
              </section>

              <SeverityChart stats={stats} />
            </>
          )}

          {section === 'agents' && (
            <AgentStatus agents={agents} events={events} />
          )}

          {section === 'events' && (
            <EventFeed events={events} filter={filter} onFilterChange={setFilter} />
          )}

          {section === 'blacklist' && (
            <BlacklistPanel entries={blacklist} onAdd={addManualBlock} onDelete={deleteBlock} />
          )}
        </div>
      </div>
    </main>
  );
}
