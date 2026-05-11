import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ThreatCounterProps {
  title: string;
  value: string | number;
  caption?: string;
  icon?: never;
}

export function ThreatCounter({ title, value, caption }: ThreatCounterProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}
