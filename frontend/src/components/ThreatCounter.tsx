import { Card, CardContent } from './ui/card';

interface ThreatCounterProps {
  title: string;
  value: string | number;
  caption?: string;
  accent?: 'purple' | 'lime';
}

const dotColor = {
  purple: 'bg-purple-400',
  lime: 'bg-lime-400',
};

export function ThreatCounter({ title, value, caption, accent = 'purple' }: ThreatCounterProps) {
  return (
    <Card className="transition-colors duration-200 hover:bg-white/[0.02]">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor[accent]}`} />
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {caption && (
          <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>
        )}
      </CardContent>
    </Card>
  );
}
