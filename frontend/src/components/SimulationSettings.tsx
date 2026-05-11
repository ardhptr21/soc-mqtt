import { useEffect, useState } from 'react';
import { getSimulationSettings, updateSimulationSettings, type SimSettings } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Save } from 'lucide-react';

export function SimulationSettings() {
  const [settings, setSettings] = useState<SimSettings | null>(null);
  const [draft, setDraft] = useState<Partial<SimSettings>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSimulationSettings()
      .then((data) => setSettings(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return null; // Don't show if backend publishers are disabled
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const current = { ...settings, ...draft };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSimulationSettings(draft);
      setSettings(updated);
      setDraft({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(draft).length > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4 space-y-0">
        <CardTitle className="text-base">Simulation Settings</CardTitle>
        {hasChanges && (
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 px-3 py-1 text-xs font-medium transition-colors"
          >
            <Save className="h-3 w-3" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Rate Multiplier */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
              <span>Event Velocity</span>
              <span className="text-foreground/70">{current.rate_multiplier}x</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={current.rate_multiplier}
              onChange={(e) => setDraft({ ...draft, rate_multiplier: parseFloat(e.target.value) })}
              className="w-full accent-lime-500"
            />
          </div>

          {/* Burst Chance */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
              <span>Burst Probability</span>
              <span className="text-foreground/70">{Math.round(current.burst_chance * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={current.burst_chance}
              onChange={(e) => setDraft({ ...draft, burst_chance: parseFloat(e.target.value) })}
              className="w-full accent-lime-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
