// ---------- view/control-surface/instruments: the instruments, as the device view reads them ----------
// Types only. The patch each role plays, and a role's instrument's cards, one for each patch it
// plays, each a preset's readout and its edits sent as the app's messages.
import type { Command, PlanReadout } from '../device/readout/index.ts';

// a card of an instrument: the patch it edits, by its name; a drum rack's pad's key; its plan's readout;
// what's done on it sent as the app's message (send())
export interface InstrumentCard {
  readonly patch: string;
  readonly key?: number;
  readonly planReadout: PlanReadout;
  readonly send: (command: Command) => void;
}
// The instruments as the device view asks them:
//   - the patch each role plays (instruments);
//   - a role's instrument's cards, one for each patch it plays.
export interface InstrumentsReadout {
  readonly instruments: Readonly<Record<string, string | undefined>>;
  cardsOf(role: string): readonly InstrumentCard[];
}
