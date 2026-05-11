import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Stats } from '../lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SeverityChartProps {
  stats: Stats;
}

const threatColors = ['#7c3aed', '#0ea5e9', '#f97316', '#22c55e', '#eab308', '#ef4444'];

export function SeverityChart({ stats }: SeverityChartProps) {
  const eventsPerMinute = stats.events_per_min.map((point) => ({
    time: new Date(point.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    count: point.count,
  }));

  const threatsByType = Object.entries(stats.by_type)
    .map(([type, count]) => ({ type: type.replaceAll('_', ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Events Per Minute</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eventsPerMinute}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" tickLine={false} />
              <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Threats By Type</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={threatsByType} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                type="category"
                dataKey="type"
                width={104}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {threatsByType.map((entry, index) => (
                  <Cell key={entry.type} fill={threatColors[index % threatColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
