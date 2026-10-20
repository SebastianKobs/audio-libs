// ---------- plan/synth/test-note: a test note, as a device view sets it and the app's message ----------
// Played on an instrument of its own for each key (libs/build/voices/'s TestNotes).

// A test note as a device view sets it: its pitch, velocity, 0 to 1, and time; its own values
// by the note's sources' names.
export interface TestNote {
  readonly pitch: number;
  readonly velocity: number;
  readonly t: number;
  readonly values: Readonly<Record<string, number>>;
}

// A test note pressed on a key's instrument, or let go, as the app's message.
export type TestNoteMessage<Key = string> =
  | { readonly type: 'test note'; readonly key: Key; readonly note: TestNote }
  | { readonly type: 'test note released'; readonly key: Key; readonly t: number };
