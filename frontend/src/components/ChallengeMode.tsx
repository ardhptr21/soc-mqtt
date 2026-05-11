import { useState, useEffect, useRef } from 'react';
import { startChallenge, scoreChallenge } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface ChallengeResult {
  elapsed_seconds: number;
  target_ips: string[];
  correct_blocks: number;
  false_positives: number;
  time_score: number;
  accuracy_score: number;
  penalty: number;
  final_score: number;
}

export function ChallengeMode() {
  const [state, setState] = useState<'idle' | 'active' | 'scored'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStart = async () => {
    setBusy(true);
    try {
      await startChallenge();
      setState('active');
      setElapsed(0);
      setResult(null);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleScore = async () => {
    setBusy(true);
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      const data = await scoreChallenge() as ChallengeResult;
      setResult(data);
      setState('scored');
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setState('idle');
    setElapsed(0);
    setResult(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Incident Response Challenge</CardTitle>
      </CardHeader>
      <CardContent>
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="text-center">
              <p className="text-sm text-foreground/80">
                A kill chain attack will be launched. Identify the attacker IPs and block them
                as fast as you can.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                You'll be scored on speed, accuracy, and false positives.
              </p>
            </div>
            <Button onClick={() => void handleStart()} disabled={busy}>
              {busy ? 'Starting...' : 'Start Challenge'}
            </Button>
          </div>
        )}

        {state === 'active' && (
          <div className="flex flex-col items-center gap-6 py-8">
            {/* Timer */}
            <div className="text-center">
              <p className="font-mono text-5xl font-bold tabular-nums text-lime-400">
                {formatTime(elapsed)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Attack in progress — check Events and block suspicious IPs in Blacklist
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              <span className="text-sm font-medium text-red-400">ACTIVE THREAT</span>
            </div>

            <Button onClick={() => void handleScore()} disabled={busy} variant="outline">
              {busy ? 'Scoring...' : 'Submit Response'}
            </Button>
          </div>
        )}

        {state === 'scored' && result && (
          <div className="flex flex-col gap-5 py-4">
            {/* Score */}
            <div className="text-center">
              <p className="text-6xl font-bold tabular-nums text-foreground">
                {result.final_score}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Final Score</p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Time', value: `${result.elapsed_seconds}s`, sub: `Score: ${result.time_score}` },
                { label: 'Correct Blocks', value: result.correct_blocks, sub: `of ${result.target_ips.length}` },
                { label: 'False Positives', value: result.false_positives, sub: `−${result.penalty} penalty` },
                { label: 'Accuracy', value: `${result.accuracy_score}%`, sub: 'detection rate' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border/30 bg-background/50 p-3 text-center">
                  <p className="text-lg font-semibold tabular-nums text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Target IPs */}
            <div className="rounded-xl border border-border/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">Target IPs (should have been blocked)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.target_ips.map((ip) => (
                  <span key={ip} className="rounded-full border border-purple-500/20 bg-purple-500/5 px-3 py-1 font-mono text-xs text-purple-300">
                    {ip}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center">
              <Button onClick={handleReset} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
