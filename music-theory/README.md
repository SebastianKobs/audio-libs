# music-theory

Notes and keys, as numbers: a note is a MIDI note number, a key its root, a note, and its scale, its steps in semitones from the root in one octave. A package of its own since W1b, moved out of `sound/`: music, not sound, so the synth, the garden and the tool use it alike. And a play style, music theory in the widest sense, as a player has one (Coltrane's, Sanders'): its contours, a line's steps of the scale, and its rhythms, whatever its owner's rhythms are, the garden's a sequencer's patterns of notes; the garden's phrasing's until SHAPE1e. It imports only the shared helpers (`libs/util/`), a style's lists frozen as they're set.

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
| `SCALES` | scales as their steps: major and minor pentatonic, Lydian, and a harmonic pentatonic, partials 8, 9, 10, 12 and 14 in pure intervals, after Stockhausen's "Stimmung" (`scales.ts`) |
| `degreeNote(degree, key)` | a degree's note: degree 0 is the root an octave down, one scale's length on the root itself, a negative degree on down (`scales.ts`) |
| `PlayStyle<Rhythm>` | a play style: its contours, each a line's steps of the scale, and its rhythms, of the type its owner gives (`style.ts`) |
| `new PlayingStyle({ contours, rhythms })` | the style as it plays: the lists it's made with to begin with; `current()` copies of its lists, `set(lists)` a list at a time, each frozen as it's set, so it plays as it was handed in, `reset()` the lists it began with; the garden's `Bank` until SHAPE1e (`style.ts`) |
| `walkOn(contour, walk, root)`, `Walk` | a contour walked from a root that moves, as a vine's from the scale step under your finger: its next step on the same root, from its start on a new one, so a move is heard as itself first (`walk.ts`) |

Tested in node, in its `test/` folder: scales and a degree's note in a key (`test/theory.test.js`); a contour walked (`test/walk.test.js`); the style as it plays, on rhythms of the test's own (`test/style.test.js`). The garden's own use of it, a degree's note held under its highest and a height's degree, is the garden's (`garden/model/music.ts`); the moods, each a key, are the tool's (`app/config/moods.ts`).
