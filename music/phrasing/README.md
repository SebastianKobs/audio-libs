# phrasing

A phrase played as a player would, on the sequencer's patterns: a rhythm's speed and a line's feel for how fast it's played, and a phrase reshaped. It imports the clock, the sequencer, MIDI's sequencer and the shared helpers. What's kept and sliced, a bank's patterns and their cycle, and a replay's run are the sequencer's (`libs/sequencing/sequencer/`), and a record's phrases MIDI's (`libs/sequencing/midi-sequencer/`).

| | |
|---|---|
| `speedFor()`, `speedAt()`, `notesPerBeat()` | a rhythm's speed for how fast you play, with hysteresis |
| `feelFor(speed, current, at, hold)` | a line's feel, half, normal or double, for how fast it's played, with a band so it doesn't flicker |

**Transforms** (`transforms.ts`), each changing notes (`{ start, deg, sounds, pitchBend, duration, vibrato, phrase, shape, rhythmIndex }`, places in ticks, `sounds` in seconds) in place, as a player would:

| | |
|---|---|
| `answer(start, grid)` | the start moved to the next answer in a two-bar cycle: the bar after a call |
| `layBack(notes, by)`, `holdLast(notes, dur)`, `halfTime(notes, ring)`, `PhraseNote` | later by so many ticks; the last note held; twice as slow, ringing longer; a phrase's note, as the transforms reshape it |
| `breath(notes, rand)` | a note left out of the middle, or two of six or more, half the time |
| `rephrase(notes, set, rand, { dur })` | the last phrase in another rhythm from a set, not the one it came from |
| `slide(notes, rand)` | a slide into a note the line arrives at, from below when it climbs, above when it falls |

Tested in node (`test/phrasing.test.js`).
