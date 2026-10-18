// ---------- clock/messages: the tempo told ----------
// tempo: the beat grid's tempo now, in beats a minute, as the settings it reads have it; what
// follows the tempo (the delay lines, the synced rates) follows it as it hears it.
export interface TempoMessage {
  readonly type: 'tempo';
  readonly bpm: number;
}
