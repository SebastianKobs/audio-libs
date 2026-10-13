# web-audio-synth

The synth played in Web Audio: a note played on a patch (`libs/synth/`), built by the engine (`libs/web-audio-engine/`) into where it goes, its controls taking clock times; and patches as they play, by name, each edit reaching every note of one that sounds. A package of its own since Z7, moved out of the tool (`tool/audio/voices/`), on the synth, the audio plan, the engine and the helpers (`libs/synth/`, `libs/audio-plan/`, `libs/web-audio-engine/`, `libs/util/`), as `libs/web-audio-fx/` is for the effects. It knows no roles, no theme and no settings: the tool's voices pick a role's patch, its params from the tweak panel and where a note is heard from (`tool/audio/voices/voices.ts`).

A note's times are clock times, the engine's edge turning them into the context's, never in its past. It's planned from its patch with its context (a beat's length, a source of random draws) and its params, built from its time, and kept as it sounds by the patches it plays on, until its sources' last stop, so an edit to its patch reaches it (`sounding.ts`, G0.2b): planned again from the edited patch, with its note, its context, its random draws kept as they were drawn and its params, and moved there from now (`followEdit()`, `libs/audio-plan/`), a value glided there by 50 ms, an envelope taken on from where it is; a change of structure rebuilds it, a new voice planned as if it had started with the note, fading in over 0.1 s as the old one fades out. What a note was told since, its release, a control's set, a glide, is told a rebuilt voice too.

```ts
import { Patches, playNote } from './index.ts';
const patches = new Patches({ patches: { pluck: pluckPatch }, now: () => engine.now() });
const controls = playNote(engine, patches, {
  patch: patches.of('pluck'),
  note: { pitch: 60, t: clock.now() + 0.05, velocity: 0.8 },   // held until it's let go: no duration
  context: { beat: 60 / bpm, random: Math.random },
  params: {},
  into: channel.input,
});
patches.set('pluck', { ...patches.current('pluck'), filter: { type: 'lowpass', freq: 1200 } });   // the note sounding glides there
controls.release(clock.now() + 1);                                                               // its note-off, a clock time
```

| | |
|---|---|
| `playNote(engine, patches, { patch, note, context, params, into })` | a note played on a patch as it plays (`play.ts`): `note`, its pitch, its time `t`, and where its patch reads them, its velocity (full unless given), its `duration` (with none held open until it's let go), a bend, a vibrato (held while it has one), its glides (`[[time, pitch]]`, clock times), a rise; returns its controls (`NoteControls`), taking clock times: `set(port, value, at, timeConstant)`, `release(at)`, and a held note's `glide(pitch, at)` where its patch has it |
| `new Patches({ patches, now })` | patches as they play, by name (`patches.ts`): copies of those it starts from; `now()`, the context's time, where an edit takes over |
| `of(name)` | a patch as it plays, the owner's own, not a copy, for a note to be played on; none for a name it hasn't |
| `current(name)`, `set(name, patch)`, `reset(name)` | a patch as a copy; set, it plays from its next note, and on every note of it that sounds, from now; reset, the one it started from |
| `Sounding`, `builtNote()` | each patch's notes that sound, until they've stopped, and a note built to be kept as it sounds (`sounding.ts`): what the patches and `playNote()` are made of |

Tested in node on the engine's stand-in for Web Audio, on a voice of its own (`test/web-audio-synth.test.js`); the themes' instruments, played through the tool, in `mockup/test/unit/` (`follow-edits.test.js`, `sound-owner.test.js`) and held to their recordings (`instruments.test.js`).
