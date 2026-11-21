# music/phrasing

A phrase played as a player would, on the sequencer's patterns: a rhythm's speed and a line's feel for how fast it's played, and a phrase reshaped.

Depends on: `base/util`, `sequencing/clock`, `sequencing/midi-sequencer`, `sequencing/sequencer`.

A bank's patterns and their cycle, and a replay's run, are the sequencer's (`sequencing/sequencer/`). Keeping and slicing a record's events are `base/util`'s `keep()` and `slice()`, and a record's phrases are the MIDI sequencer's (`sequencing/midi-sequencer/`).

```ts
import { feelFor, halfTime, holdLast, layBack, speedAt, type PhraseNote } from './index.ts';
import { STEP } from '../../sequencing/clock/index.ts';
const notes: PhraseNote[] = [
  { start: 0, deg: 0, sounds: 0.2 },
  { start: 2 * STEP, deg: 2, sounds: 0.2 },
];
speedAt(2, 4, 1, 1.3); // 2: two notes a beat against a hand moving 4 a beat, double time fits
feelFor(1.5, 1, { half: 0.6, double: 1.6 }, 1.2); // 1: the normal feel stays
layBack(notes, STEP); // later by a 16th
holdLast(notes, 1); // the last note sounds a second
halfTime(notes, 1.5); // twice as slow, ringing half as long again
```

A transform changes its notes in place. `start` and `duration` are in ticks, `sounds` in seconds. Each draws from the `rand()` handed in, in a fixed order, so a phrase seeded again is always the same. Which a player picks, and how often, is its owner's.

| Export | What it does |
|---|---|
| `speedFor(pat, rate, current, hold, meter?)`, `speedAt(perBeat, rate, current, hold)` | A rhythm's speed for how fast you play, `rate` in moves a beat: the one of half, normal and double time whose notes a beat come closest. Another than `current` wins only once it's closer by more than a ratio of `hold`, so it doesn't flicker (`speed.ts`). |
| `notesPerBeat(pat, meter?)` | A pattern's notes a beat (`speed.ts`). |
| `feelFor(speed, current, edges, hold)` | A line's feel, half, normal or double, for how fast it's played: `edges` is `{ half, double }`. Leaving a feel takes crossing its edge by a band, so it doesn't flicker (`speed.ts`). |
| `PhraseNote` | A phrase's note as the transforms reshape it: `start`, `deg`, `sounds` and, optional, `pitchBend`, `duration`, `vibrato`, `phrase`, `shape`, `rhythmIndex` (`transforms.ts`). |
| `answer(start, grid)` | The start moved to the next answer in a two-bar cycle: the bar after a call (`transforms.ts`). |
| `layBack(notes, by)`, `holdLast(notes, sounds)`, `halfTime(notes, ring)` | Later by so many ticks; the last note held; twice as slow, ringing `ring` times longer (`transforms.ts`). |
| `breath(notes, rand)` | A note left out of the middle, or two of six or more, half the time (`transforms.ts`). |
| `rephrase(notes, set, rand, { soundsFor })` | The last phrase in another rhythm from a set, not the one it came from. `soundsFor(duration)` is how long a note of so many ticks sounds (`transforms.ts`). |
| `slide(notes, rand)` | A slide into a note the line arrives at, from below when it climbs, above when it falls (`transforms.ts`). |

Tests: `test/phrasing.test.js`.
