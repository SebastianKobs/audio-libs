# build/voices

MIDI's notes played into an instrument: its voices juggled on what's built, a package of its own since LAY14a2. Handed the instrument's plan, what's built of it (the ports' `Built`, `libs/build/ports/`) and the time now, it's what the notes are played into, a `Receiver` (`libs/midi/`). It makes no sound and plans nothing: what's built makes the sound, the plan says what each note sets. It reads the plan's format, the synth's note (`libs/plan/synth/`'s `NOTE_SETTINGS`, the sources' names its pools' note keys), a note's frequency (`libs/music-theory/`) and the floor of silence (`libs/params/`).

```ts
import { Voices } from './index.ts';
const voices = new Voices(built, plan, () => context.currentTime);
voices.receive(noteMessages({ pitch: 69, velocity: 0.8, t: 2, duration: 0.5 }, index)); // a voice added at 2 s, its gate opened, closed at 2.5 s
voices.rebuild(changed); // a change of structure while notes sound
```

How it plays a note:
1. a note on: a copy of its pool's voice card added at its time (`Built.add(copy, at)`), a drum rack's pad's by its key, none where no pool plays it; its note's sources set by the pool's addresses, its frequency, its velocity and the per-note controllers sent with it, its gate opened last; its glides glided by its voice card's `glide`, a jump with none; with no end yet, closed at its `longest`, 10 s unless its voice card says;
2. a note off: its gate closed at its time, no sooner than its `shortest`; a per-note controller sent later a change at its time, gliding as it says, its pitch glided;
3. a voice let go once it has rung out, as the next messages come; at once where its sender detaches its note.

When a voice has rung out, worked out from its voice card's plan, as a synth stops a note's sources (`silence.ts`):
1. a gain resting at nothing, opened only by envelopes, closes once they have all faded, what's built saying when each has (`Built.faded()`); one another source opens too, an LFO, never;
2. a block is silent from where a gain it is closes, or as late as the latest of where its sound goes, followed across its composites and through their macros; the voice's own output never;
3. a source nothing closes is silent as its note's last release fades, every envelope its gate releases;
4. the voice has rung out once every source is: an oscillator, a noise, an envelope; an LFO or FM with the sound it moves.

| | |
|---|---|
| `Voices` | MIDI's notes played into an instrument's plan on what's built: `receive(messages)`, `rebuild(plan)`, each sounding note's gate told again at its own time (`voices.ts`) |
| `Silence` | when a voice of a voice card has rung out, by its envelopes' faded times and its note's end (`silence.ts`, not exported) |

Tested in node, in its `test/` folder, on a stand-in for what's built (`test/built.js`) and the format's synth: a note on, its voice added, its sources set, its gate last; a note off, its shortest, its longest; per-note controllers, set as it starts, changed later, its pitch glided; a drum rack's pads; a voice let go once it has rung out, a gain resting at nothing an envelope closes, held and decayed to nothing before its note ends, a source nothing closes as its last release fades, an LFO with the sound it moves, a note detached; a gain an LFO opens too never closed; a change of structure (`test/voices.test.js`). On the builder, a planned pluck played and let go (`mockup/test/unit/voices-built.test.js`).
