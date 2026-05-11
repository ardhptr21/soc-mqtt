import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import type { Stats } from '../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SeverityChartProps {
  stats: Stats;
}

const severityColors: Record<string, string> = {
  low: '#84cc16',      // lime
  medium: '#a3e635',   // brighter lime
  high: '#a78bfa',     // violet
  critical: '#7c3aed', // deep violet
};

const threatColors = [
  '#8b5cf6',
  '#a78bfa',
  '#7c3aed',
  '#c084fc',
  '#6d28d9',
  '#ddd6fe',
  '#5b21b6',
];

export function SeverityChart({ stats }: SeverityChartProps) {
  const eventsPerMinute = useMemo(
    () =>
      stats.events_per_min.map((point) => ({
        time: new Date(point.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        count: point.count,
      })),
    [stats.events_per_min],
  );

  const threatsByType = useMemo(
    () =>
      Object.entries(stats.by_type)
        .map(([type, count]) => ({ type: type.replaceAll('_', ' '), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7),
    [stats.by_type],
  );

  const severityData = useMemo(
    () =>
      Object.entries(stats.by_severity)
        .filter(([, count]) => count > 0)
        .map(([severity, count]) => ({
          severity,
          count,
          fill: severityColors[severity] ?? '#8b5cf6',
        })),
    [stats.by_severity],
  );

  const tooltipStyle = {
    background: '#141418',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    fontSize: 12,
    padding: '8px 12px',
    color: '#e4e4e7',
  };

  const tooltipLabelStyle = { color: '#a1a1aa', marginBottom: 2 };
  const tooltipItemStyle = { color: '#e4e4e7' };
  const tooltipCursor = { fill: 'rgba(255,255,255,0.03)' };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Events per minute — Area chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Events Per Minute</CardTitle>
            <span className="text-xs tabular-nums text-muted-foreground">
              {eventsPerMinute.length} data points
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={eventsPerMinute}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(240 4% 14%)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                stroke="hsl(240 5% 35%)"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                allowDecimals={false}
                stroke="hsl(240 5% 35%)"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={32}
              />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={tooltipCursor} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#84cc16"
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: '#84cc16',
                  stroke: '#0a0a0f',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Threats by type — Horizontal Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Threats By Type</CardTitle>
            <span className="text-xs tabular-nums text-muted-foreground">
              top {threatsByType.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={threatsByType}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(240 4% 14%)"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="hsl(240 5% 35%)"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="type"
                width={100}
                stroke="hsl(240 5% 35%)"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={tooltipCursor} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                {threatsByType.map((entry, index) => (
                  <Cell
                    key={entry.type}
                    fill={threatColors[index % threatColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Severity breakdown */}
      {severityData.length > 0 && (
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['low', 'medium', 'high', 'critical'].map((sev) => {
                const count = stats.by_severity[sev] ?? 0;
                const total = stats.total_events || 1;
                const pct = Math.round((count / total) * 100);
                const color = severityColors[sev] ?? '#8b5cf6';
                return (
                  <div
                    key={sev}
                    className="rounded-xl border border-border/40 bg-background/50 p-4"
                  >
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {sev}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                      {count}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                      {pct}% of total
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
