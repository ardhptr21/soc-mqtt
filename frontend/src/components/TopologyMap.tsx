import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AgentStatus as Agent, SecurityEvent } from '../lib/types';

// ─── Types ───

interface TopoNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'attacker' | 'perimeter' | 'internal' | 'asset';
}

interface TopoEdge {
  from: string;
  to: string;
}

interface Particle {
  id: number;
  edge: TopoEdge;
  progress: number;
  severity: string;
}

// ─── Layout ───

const W = 900;
const H = 600;

const NODES: TopoNode[] = [
  { id: 'attacker',  label: 'ATTACKER',  x: 100, y: H / 2,       kind: 'attacker' },
  { id: 'firewall',  label: 'FIREWALL',  x: 300, y: 140,          kind: 'perimeter' },
  { id: 'ids',       label: 'IDS',       x: 300, y: H / 2,       kind: 'perimeter' },
  { id: 'honeypot',  label: 'HONEYPOT',  x: 300, y: H - 140,     kind: 'perimeter' },
  { id: 'dns',       label: 'DNS',       x: 540, y: 130,          kind: 'internal' },
  { id: 'host',      label: 'HOST',      x: 540, y: H / 2,       kind: 'internal' },
  { id: 'edr',       label: 'EDR',       x: 540, y: H - 130,     kind: 'internal' },
  { id: 'database',  label: 'DATABASE',  x: 760, y: 210,          kind: 'asset' },
  { id: 'secrets',   label: 'SECRETS',   x: 760, y: H - 210,     kind: 'asset' },
];

const EDGES: TopoEdge[] = [
  { from: 'attacker', to: 'firewall' },
  { from: 'attacker', to: 'ids' },
  { from: 'attacker', to: 'honeypot' },
  { from: 'firewall', to: 'dns' },
  { from: 'firewall', to: 'host' },
  { from: 'ids', to: 'host' },
  { from: 'ids', to: 'edr' },
  { from: 'honeypot', to: 'host' },
  { from: 'host', to: 'database' },
  { from: 'host', to: 'secrets' },
  { from: 'dns', to: 'database' },
  { from: 'edr', to: 'secrets' },
];

const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n]));

const SEVERITY_COLOR: Record<string, string> = {
  low: '#84cc16',
  medium: '#a3e635',
  high: '#a78bfa',
  critical: '#7c3aed',
};

// ─── SVG icon paths (12x12 viewBox centered at 0,0) ───

const NODE_ICONS: Record<string, React.ReactNode> = {
  attacker: (
    <path d="M1-5L3.5 0 1 1 3 5-1 2-3.5 5-3 1-5.5 0-3-1-1-5z" fill="currentColor" />
  ),
  firewall: (
    <path d="M0-5.5C2.5-5.5 4.5-3 4.5 0 4.5 3.5 0 6 0 6S-4.5 3.5-4.5 0C-4.5-3-2.5-5.5 0-5.5z" fill="none" stroke="currentColor" strokeWidth="1.2" />
  ),
  ids: (
    <>
      <circle cx="0" cy="0" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="0" cy="0" r="1" fill="currentColor" />
      <path d="M-5.5 0A5.5 5.5 0 0 1 5.5 0" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M-5.5 0A5.5 5.5 0 0 0 5.5 0" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </>
  ),
  honeypot: (
    <path d="M0-5L4.3-2.5V2.5L0 5L-4.3 2.5V-2.5Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
  ),
  dns: (
    <>
      <circle cx="0" cy="0" r="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="0" cy="0" rx="2.2" ry="4.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="currentColor" strokeWidth="0.8" />
    </>
  ),
  host: (
    <>
      <rect x="-4" y="-3.5" width="8" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="-2" y1="2" x2="2" y2="2" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="2" x2="0" y2="3.5" stroke="currentColor" strokeWidth="1" />
      <line x1="-2.5" y1="3.5" x2="2.5" y2="3.5" stroke="currentColor" strokeWidth="1" />
    </>
  ),
  edr: (
    <>
      <circle cx="1" cy="-1" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="-1.5" y1="1.5" x2="-4" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  database: (
    <>
      <ellipse cx="0" cy="-3" rx="4.5" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M-4.5-3V3" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4.5-3V3" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="0" cy="3" rx="4.5" ry="2" fill="none" stroke="currentColor" strokeWidth="1" />
    </>
  ),
  secrets: (
    <>
      <circle cx="0" cy="-2" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="0" y1="0.5" x2="0" y2="5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="0" y1="3" x2="2" y2="2" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="4.5" x2="1.5" y2="3.5" stroke="currentColor" strokeWidth="1" />
    </>
  ),
};

// ─── Helpers ───

function mapEventToEdges(event: SecurityEvent): TopoEdge[] {
  const agent = event.agent?.toLowerCase() ?? '';
  const dest = NODES.find((n) => n.id === agent);
  if (!dest) return [];

  const edges: TopoEdge[] = [];

  // Inbound edge (attacker → agent node)
  const inbound = EDGES.find((e) => e.to === dest.id);
  edges.push(inbound ?? { from: 'attacker', to: dest.id });

  // Propagate: if this node connects to an asset, also light that edge
  // (high/critical severity events propagate deeper into the network)
  if (event.severity === 'high' || event.severity === 'critical') {
    const outbound = EDGES.filter((e) => e.from === dest.id);
    for (const edge of outbound) {
      edges.push(edge);
    }
  }

  return edges;
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

function edgePath(from: TopoNode, to: TopoNode): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offset = len * 0.08;
  const nx = -dy / len;
  const ny = dx / len;
  return `M ${from.x} ${from.y} Q ${mx + nx * offset} ${my + ny * offset} ${to.x} ${to.y}`;
}

function pointOnQuadBezier(from: TopoNode, to: TopoNode, t: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const offset = len * 0.08;
  const nx = -dy / len;
  const ny = dx / len;
  const mx = (from.x + to.x) / 2 + nx * offset;
  const my = (from.y + to.y) / 2 + ny * offset;
  const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mx + t * t * to.x;
  const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * my + t * t * to.y;
  return { x, y };
}

// Node kind → fill/stroke colors (high contrast on dark bg)
const KIND_COLORS: Record<string, { stroke: string; text: string }> = {
  attacker:  { stroke: '#a78bfa', text: '#c4b5fd' },
  perimeter: { stroke: '#84cc16', text: '#a3e635' },
  internal:  { stroke: '#60a5fa', text: '#93c5fd' },
  asset:     { stroke: '#fbbf24', text: '#fcd34d' },
};

// ─── Zones ───

const ZONES = [
  { label: 'EXTERNAL', x: 100 },
  { label: 'PERIMETER', x: 300 },
  { label: 'INTERNAL', x: 540 },
  { label: 'ASSETS', x: 760 },
];

// ─── Component ───

interface TopologyMapProps {
  events: SecurityEvent[];
  agents: Agent[];
}

export function TopologyMap({ events, agents }: TopologyMapProps) {
  const particleIdRef = useRef(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeEdges, setActiveEdges] = useState<Record<string, number>>({}); // edgeKey → expiry timestamp
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animFrameRef = useRef(0);

  const agentStatusMap = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.name, a.status])),
    [agents],
  );

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const key = e.agent?.toLowerCase() ?? '';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const lastSeenIdRef = useRef<string | null>(null);

  // Spawn particles when new events arrive.
  // Track by first event ID — array length stays capped at the store limit,
  // so length-based comparison breaks after the buffer fills.
  useEffect(() => {
    if (events.length === 0) return;
    const newestId = events[0]?.id;
    if (newestId === lastSeenIdRef.current) return;

    // Find how many events are new (scan until we hit the old ID)
    const newEvents: typeof events = [];
    for (const ev of events) {
      if (ev.id === lastSeenIdRef.current) break;
      newEvents.push(ev);
    }
    lastSeenIdRef.current = newestId;

    // On first render, don't spawn particles for the initial batch
    if (newEvents.length > 20) return;

    const spawned: Particle[] = [];
    const now = Date.now();
    const edgeUpdates: Record<string, number> = {};
    for (const event of newEvents.slice(0, 10)) {
      const edges = mapEventToEdges(event);
      for (const edge of edges) {
        spawned.push({ id: ++particleIdRef.current, edge, progress: 0, severity: event.severity });
        edgeUpdates[`${edge.from}->${edge.to}`] = now + 1000;
      }
    }
    if (spawned.length > 0) {
      setParticles((prev) => [...prev, ...spawned].slice(-40));
      setActiveEdges((prev) => ({ ...prev, ...edgeUpdates }));
    }
  }, [events]);

  const animate = useCallback(() => {
    const now = Date.now();
    setParticles((prev) =>
      prev.map((p) => ({ ...p, progress: p.progress + 0.012 })).filter((p) => p.progress <= 1),
    );
    // Clean up expired edge highlights
    setActiveEdges((prev) => {
      const next: Record<string, number> = {};
      for (const [key, expiry] of Object.entries(prev)) {
        if (expiry > now) next[key] = expiry;
      }
      return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
    });
    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [animate]);

  const nodeEvents = selectedNode
    ? events.filter((e) => e.agent?.toLowerCase() === selectedNode).slice(0, 10)
    : [];
  const selectedNodeData = selectedNode ? NODE_MAP[selectedNode] : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row" style={{ height: 'calc(100vh - 130px)', minHeight: 500 }}>
      {/* SVG Map */}
      <div className="relative flex-1 rounded-2xl border border-border/40 bg-card overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Network Topology</h2>
            <p className="text-[11px] text-muted-foreground">Real-time attack visualization</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            {[
              { color: '#84cc16', label: 'Low' },
              { color: '#a3e635', label: 'Med' },
              { color: '#a78bfa', label: 'High' },
              { color: '#7c3aed', label: 'Crit' },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ top: 0, left: 0 }}
        >
          <defs>
            <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dot grid */}
          {Array.from({ length: Math.floor(W / 40) }, (_, i) =>
            Array.from({ length: Math.floor(H / 40) }, (_, j) => (
              <circle
                key={`g-${i}-${j}`}
                cx={i * 40 + 20}
                cy={j * 40 + 20}
                r={0.6}
                fill="rgba(255,255,255,0.06)"
              />
            )),
          )}

          {/* Zone labels */}
          {ZONES.map((zone) => (
            <text
              key={zone.label}
              x={zone.x}
              y={38}
              textAnchor="middle"
              fill="rgba(255,255,255,0.15)"
              fontSize={9}
              fontFamily="Inter, system-ui, sans-serif"
              letterSpacing={3}
              fontWeight={600}
            >
              {zone.label}
            </text>
          ))}

          {/* Zone dividers */}
          {[200, 420, 650].map((x) => (
            <line
              key={x}
              x1={x} y1={52} x2={x} y2={H - 16}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 8"
            />
          ))}

          {/* Edges */}
          {EDGES.map((edge) => {
            const from = NODE_MAP[edge.from];
            const to = NODE_MAP[edge.to];
            const edgeKey = `${edge.from}->${edge.to}`;
            const isActive = edgeKey in activeEdges;
            const d = edgePath(from, to);
            return (
              <g key={`${edge.from}-${edge.to}`}>
                {/* Glow layer for active edges */}
                {isActive && (
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(132,204,22,0.25)"
                    strokeWidth={4}
                    filter="url(#edgeGlow)"
                  />
                )}
                {/* Main edge */}
                <path
                  d={d}
                  fill="none"
                  stroke={isActive ? 'rgba(132,204,22,0.8)' : 'rgba(255, 255, 255, 0.11)'}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  strokeDasharray={isActive ? '4 4' : '3 8'}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
                />
              </g>
            );
          })}

          {/* Particles */}
          {particles.map((p) => {
            const from = NODE_MAP[p.edge.from];
            const to = NODE_MAP[p.edge.to];
            if (!from || !to) return null;
            const pos = pointOnQuadBezier(from, to, p.progress);
            const color = SEVERITY_COLOR[p.severity] ?? '#84cc16';
            const opacity = 1 - p.progress * 0.3;
            return (
              <g key={p.id} filter="url(#particleGlow)">
                <circle cx={pos.x} cy={pos.y} r={10} fill={color} opacity={opacity * 0.1} />
                <circle cx={pos.x} cy={pos.y} r={5} fill={color} opacity={opacity * 0.5} />
                <circle cx={pos.x} cy={pos.y} r={2.5} fill={color} opacity={opacity} />
                <circle cx={pos.x} cy={pos.y} r={1.2} fill="#fff" opacity={opacity * 0.8} />
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isOnline =
              agentStatusMap[node.id] === 'online' ||
              node.kind === 'attacker' ||
              node.kind === 'asset';
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode === node.id;
            const count = eventCounts[node.id] ?? 0;
            const colors = KIND_COLORS[node.kind];
            const dimmed = !isOnline;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                opacity={dimmed ? 0.35 : 1}
                style={{ transition: 'opacity 0.3s' }}
              >
                {/* Selection / hover ring */}
                {(isSelected || isHovered) && (
                  <polygon
                    points={hexPoints(node.x, node.y, 30)}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth={1}
                    opacity={isSelected ? 0.5 : 0.25}
                  />
                )}

                {/* Hex body */}
                <polygon
                  points={hexPoints(node.x, node.y, 24)}
                  fill="rgba(255,255,255,0.03)"
                  stroke={isSelected ? colors.stroke : 'rgba(255,255,255,0.12)'}
                  strokeWidth={isSelected ? 1.5 : 1}
                  style={{ transition: 'stroke 0.2s' }}
                />

                {/* Icon */}
                <g
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ color: colors.text }}
                >
                  {NODE_ICONS[node.id]}
                </g>

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 38}
                  textAnchor="middle"
                  fill={dimmed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)'}
                  fontSize={8}
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight={600}
                  letterSpacing={1.5}
                >
                  {node.label}
                </text>

                {/* Event count badge */}
                {count > 0 && (
                  <g>
                    <rect
                      x={node.x + 14}
                      y={node.y - 30}
                      width={Math.max(20, String(count).length * 7 + 10)}
                      height={16}
                      rx={8}
                      fill="rgba(0,0,0,0.7)"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={0.5}
                    />
                    <text
                      x={node.x + 14 + Math.max(20, String(count).length * 7 + 10) / 2}
                      y={node.y - 30 + 11.5}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.7)"
                      fontSize={8}
                      fontFamily="Inter, system-ui, sans-serif"
                      fontWeight={600}
                    >
                      {count}
                    </text>
                  </g>
                )}

                {/* Online dot */}
                {node.kind !== 'attacker' && node.kind !== 'asset' && (
                  <circle
                    cx={node.x - 18}
                    cy={node.y - 20}
                    r={3}
                    fill={isOnline ? '#84cc16' : '#3f3f46'}
                    stroke="#09090b"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-white/[0.06] bg-black/50 px-5 py-2.5 backdrop-blur-sm">
          <span className="text-[10px] text-muted-foreground">
            {NODES.filter((n) => n.kind !== 'attacker' && n.kind !== 'asset').length} NODES · {EDGES.length} CONNECTIONS
          </span>
          <span className="text-[10px] text-muted-foreground">
            {particles.length} ACTIVE PACKETS
          </span>
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="rounded-2xl border border-border/40 bg-card p-5 h-full">
          {selectedNodeData ? (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg border"
                  style={{
                    borderColor: KIND_COLORS[selectedNodeData.kind].stroke + '40',
                    color: KIND_COLORS[selectedNodeData.kind].text,
                  }}
                >
                  <svg viewBox="-8 -8 16 16" className="h-5 w-5">
                    {NODE_ICONS[selectedNode!]}
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedNodeData.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {agentStatusMap[selectedNode!] === 'online' ? (
                      <span className="text-lime-400">● Online</span>
                    ) : selectedNodeData.kind === 'attacker' ? (
                      <span className="text-purple-400">● External</span>
                    ) : selectedNodeData.kind === 'asset' ? (
                      <span className="text-yellow-400">● Protected</span>
                    ) : (
                      <span className="text-zinc-500">● Offline</span>
                    )}
                    {' · '}{eventCounts[selectedNode!] ?? 0} events
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <div className="flex-1 rounded-lg border border-border/30 bg-white/[0.02] p-2.5 text-center">
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {eventCounts[selectedNode!] ?? 0}
                  </p>
                  <p className="text-[9px] text-muted-foreground">EVENTS</p>
                </div>
                <div className="flex-1 rounded-lg border border-border/30 bg-white/[0.02] p-2.5 text-center">
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {EDGES.filter((e) => e.from === selectedNode || e.to === selectedNode).length}
                  </p>
                  <p className="text-[9px] text-muted-foreground">LINKS</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-medium text-muted-foreground tracking-wider">RECENT EVENTS</p>
                <div className="mt-2 space-y-1.5 max-h-[280px] overflow-y-auto">
                  {nodeEvents.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground/50">No events</p>
                  ) : (
                    nodeEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-border/20 bg-white/[0.015] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: SEVERITY_COLOR[event.severity] ?? '#84cc16' }}
                          />
                          <p className="truncate text-[11px] text-foreground/80">
                            {event.description}
                          </p>
                        </div>
                        <p className="mt-0.5 pl-3.5 font-mono text-[9px] text-muted-foreground/50">
                          {event.source_ip} → {event.dest_ip}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="mt-4 w-full rounded-lg border border-border/25 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear selection
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg viewBox="-8 -8 16 16" className="h-8 w-8 text-zinc-600 mb-3">
                {NODE_ICONS.dns}
              </svg>
              <p className="text-xs text-muted-foreground">
                Select a node to inspect
              </p>
              <p className="mt-1 text-[10px] text-zinc-600">
                Click any hexagon on the map
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
