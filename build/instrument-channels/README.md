# build/instrument-channels

A track's sounding end, a package of its own since SHAPE1c: between the sound module (`libs/build/voices/`) and the desk (`libs/build/desk/`), so neither knows the other. A track's notes go into its instrument, made at its first note and plugged into the track's channel on the desk; its controllers go onto its strip. It's a sequencer's track by its shape (`libs/midi-sequencer/`'s `Track`, a `Receiver` with a role), so a game's router can hand it messages as the sequencer does.

```ts
import { InstrumentChannelFactory } from './index.ts';
const channels = new InstrumentChannelFactory({
  desk, // its inputOf(), control() and isStripTrack()
  partOf: (key) => (key.startsWith('my tap/') ? { role: 'tap', make: (into) => soundModule.part('glowTap', { into, … }) } : null),
});
channels.of('my tap/3').receive(messages); // its instrument made at its first note, its controllers onto its strip
```

| | |
|---|---|
| `InstrumentChannel` | one track's sounding end: `receive(messages)`, its instrument made as its first note comes, hearing every message, its controllers set on the desk on its strip; a strip's own with none; its `role`, the stream's label (`instrument-channel.ts`, handed out by the factory, not exported; the studio's `Track` until SHAPE1c) |
| `InstrumentChannelFactory`, `Part` | a channel for each track's key, made the first time it's asked for, then kept, its instrument holding its sounding voices; what's on it its owner's (`partOf()`): a part, its role and how its instrument is made into where it's plugged in; none for a strip of the desk's own; any other key refused (`instrument-channel-factory.ts`; the studio's `TrackSheet`'s generic half until SHAPE1c) |

Tested in node, in its `test/` folder, on a desk of the test's own: a channel made once, what's on it asked once; its role, its instrument made at its first note, plugged into its channel, hearing every message; its controllers its strip's; a strip's own with none; a key with neither refused (`test/instrument-channels.test.js`). With the garden's parts, the track sheet (`mockup/test/unit/track-sheet.test.js`).
