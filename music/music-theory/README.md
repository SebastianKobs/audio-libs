# music-theory

Notes and keys, as numbers: a note is a MIDI note number, a key its root, a note, and its scale, its steps in semitones from the root in one octave. Music, not sound: a synth, a sequencer or a game uses it alike. And a play style, music theory in the widest sense, as a player has one (Coltrane's, Sanders'): its contours, a line's steps of the scale, and its rhythms, whatever its owner's rhythms are. It imports only the shared helpers (`libs/base/util/`), a style's lists frozen as they're set.

```ts
import { SCALES, chordNote, degreeNote, mtof, type Key } from './index.ts';
const dMajor: Key = { root: 62, scale: SCALES.majorPentatonic };
degreeNote(5, dMajor);              // 62: a degree counts the scale from an octave below the root
chordNote({ semi: -24 }, dMajor);   // 38: a chord's note, semitones from the root, or else a degree
mtof(69);                           // 440
```

| | |
|---|---|
| `mtof(note)` | a note's frequency, equal temperament on A 440 (`pitch.ts`) |
| `chordNote(note, key)`, `ChordNote` | a chord's note in a key: `{ semi }`, semitones from the root, or else `{ degree }`, a degree of its scale (`pitch.ts`) |
| `Key` | a key: its `root`, a MIDI note, and its `scale` (`scales.ts`) |
| `SCALES` | the standard scales as their steps: the seven modes (`major` the Ionian, `minor` the Aeolian), the harmonic and melodic minor, both pentatonics, the blues, the whole tone and the chromatic (`scales.ts`) |
| `degreeNote(degree, key)` | a degree's note: degree 0 is the root an octave down, one scale's length on the root itself, a negative degree on down (`scales.ts`) |
| `PlayStyle<Rhythm>` | a play style: its contours, each a line's steps of the scale, and its rhythms, of the type its owner gives (`style.ts`) |
| `new PlayingStyle({ contours, rhythms })` | the style as it plays: the lists it's made with to begin with; `current()` copies of its lists, `set(lists)` a list at a time, each frozen as it's set, so it plays as it was handed in, `reset()` the lists it began with (`style.ts`) |
| `walkOn(contour, walk, root)`, `Walk` | a contour walked from a root that moves, as a line's from the scale step under a finger: its next step on the same root, from its start on a new one, so a move is heard as itself first (`walk.ts`) |

Tested in node, in its `test/` folder: scales and a degree's note in a key (`test/theory.test.js`); a contour walked (`test/walk.test.js`); the style as it plays, on rhythms of the test's own (`test/style.test.js`).