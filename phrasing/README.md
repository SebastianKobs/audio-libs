# phrasing

A phrase played as a player would, on the sequencer's patterns: a rhythm's speed and a line's feel for how fast it's played, what's played kept and a run or slice of it, every pattern in a bank and its cycle, and a phrase reshaped. The garden's phrasing until ZG41 (`mockup/architecture/done.md`), the sequencer's before L1a. It imports the clock, the sequencer, MIDI's sequencer and the shared helpers.

| | |
|---|---|
| `speedFor()`, `speedAt()`, `notesPerBeat()` | a rhythm's speed for how fast you play, with hysteresis |
| `feelFor(speed, current, at, hold)` | a line's feel, half, normal or double, for how fast it's played, with a band so it doesn't flicker |
| `keep(record, ev, cap)` | keeps an event in a record, up to its cap; the event, or null once it's full |
| `unmute(pat, at, rand)` | a replay's run of a pattern's notes from a place, 1 up to all, round the loop |
| `patternsIn(bank)`, `cycleOf(patterns, meter)` (`record.ts`, `bank.ts`'s until SHAPE1e) | every pattern in a bank; its cycle, its longest pattern in whole bars, so what's recorded is as long or longer in whole cycles |
| `slice(n, from, rand)`, `phrases(record, from, rand)` | `[start, length]`: a random length, drawn first, from the start or anywhere; or the same in whole phrases (each event's `ph`) |

**Transforms** (`transforms.ts`), each changing notes (`{ start, deg, sounds, pitchBend, duration, vibrato, phrase, shape, rhythmIndex }`, places in ticks, `sounds` in seconds) in place, as a player would:

| | |
|---|---|
| `answer(start, grid, { every, at })` | the start moved to the next answer in a cycle: the bar after a call, every two bars by default |
| `layBack(notes, by)`, `holdLast(notes, dur)`, `halfTime(notes, ring)` | later by so many ticks; the last note held; twice as slow, ringing longer |
| `breath(notes, rand)` | a note left out of the middle, or two of six or more, half the time |
| `rephrase(notes, set, rand, { dur })` | the last phrase in another rhythm from a set, not the one it came from |
| `slide(notes, rand)` | a slide into a note the line arrives at, from below when it climbs, above when it falls |

Tested in node (`test/phrasing.test.js`); what the garden plays with it is held to the replays' recordings (`shared/test-vectors/replays/`).
