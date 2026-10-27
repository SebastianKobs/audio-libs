# modular-audio/view/tracks/readout

What the session view's, the clips' and the arrangement's models read, in the views' own words, so a model, its drawer and what answers it share one jack. Each is a readout, labeled by its kind, read when the model wants (the arrangement's clock, which tells each 16th too, is the one exception). What's done goes out on a bus. Whatever answers a readout fits it by its shape. They read clip slots and tracks, the recording, the playhead and what the desk declares.

Depends on: `base/automation`, `base/params`, `base/util`, `sequencing/clock`.

```ts
import type { TracksReadout } from './index.ts';

const tracks: TracksReadout = {
  groups: [{ group: 'taps', name: 'Taps', kind: 'tap', live: true }], // in the order shown
  groupOf: (kind, live) => (kind === 'tap' && live ? 'taps' : null), // the group a kind's tracks are in
  clipName: (clip, group) => `${group} ${String(clip)}`,
  hasClip: () => true,
};
```

| Export | What it does |
|---|---|
| `ClipTrack` | A clip track as a view shows it: its `key`, its `name`, the `roles` whose instruments play its clips, whether it's `played` (its clips launched and deleted from the view), and where its clips are `held`, in the order shown (`clips.ts`). |
| `ClipsReadout` | The control surface the clips were played on: its `clipTracks` in the order shown, `clipName()` and `notesIn()` for a clip on its clip track. A clip player answers it for its slots, a control surface for the clips it holds on no player (`clips.ts`). |
| `RecordedNote`, `RecordedRegion`, `RecordedLane` | What the recording holds, as recorded: a note's time, length, pitch, bend and glides; a region's clip, kind, track, times and notes, an open one ending never; a lane's kind, track, strip, controller and points (`arrangement.ts`). |
| `RecordingReadout` | The recording at a time, as a MIDI sequencer's recorder answers it: the `regions()` and `lanes()` of the last 30 minutes, each in the order they began (`arrangement.ts`). |
| `TrackGroup`, `TracksReadout` | The tracks in groups, as the control surface that played them names them: a group's key, header name, kind and whether it's played live. `TracksReadout` has the `groups`, `groupOf()`, `clipName()` and `hasClip()`; the session's tracks read it too (`arrangement.ts`). |
| `PlayheadReadout` | The transport, as the playhead reads it: `playingBack` and `playhead()`, where the playhead is while the recording plays back (`arrangement.ts`). |
| `DeclaredReadout` | What the desk declares, by a strip's name: `specOf()` a controller's range and taper, `isMidiDevice()` and `controllersOf()`, the strip's controllers in the order the sound goes through it (`arrangement.ts`). |
| `ArrangementClock` | The clock as the arrangement reads it: `now`, each 16th as it's scheduled (`onStep`) and the grid as it was heard, song time among it (`arrangement.ts`). |

Tests: none, as types only: what answers them is tested in `libs/modular-audio/view/tracks/models/test/`.
