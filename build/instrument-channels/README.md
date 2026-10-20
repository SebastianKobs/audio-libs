# build/instrument-channels

A track's sounding end: between the sound module (`libs/build/instrument/`) and the desk (`libs/build/desk/`), so neither knows the other. A track's notes go into its instrument, made at its first note and plugged into the track's channel on the desk; its controllers go onto its strip. It's a sequencer's track by its shape (`libs/midi-sequencer/`'s `Track`, a `Receiver` with a role), so a router can hand it messages as the sequencer does. It imports `libs/build/desk/`, `libs/build/sequenced-desk/`, `libs/midi/` and `libs/util/`.

```ts
import { InstrumentChannelFactory } from './index.ts';
const channels = new InstrumentChannelFactory({
  desk, // its inputOf(), control() and isStripTrack()
  partOf: (key) => (key.startsWith('lead/') ? { role: 'lead', make: (into) => soundModule.part('lead', { into, … }) } : null),
});
channels.of('lead/3').receive(messages); // its instrument made at its first note, its controllers onto its strip
```

| | |
|---|---|
| `InstrumentChannel` | one track's sounding end: `receive(messages)`, its instrument made as its first note comes, hearing every message, its controllers set on the desk on its strip; a strip's own with none; its `role`, the stream's label (`instrument-channel.ts`, handed out by the factory, not exported) |
| `InstrumentChannelFactory`, `Part` | a channel for each track's key, made the first time it's asked for, then kept, its instrument holding its sounding voices; what's on it its owner's (`partOf()`): a part, its role and how its instrument is made into where it's plugged in; none for a strip of the desk's own; any other key refused (`instrument-channel-factory.ts`) |

Tested in node, in its `test/` folder, on a desk of the test's own: a channel made once, what's on it asked once; its role, its instrument made at its first note, plugged into its channel, hearing every message; its controllers its strip's; a strip's own with none; a key with neither refused (`test/instrument-channels.test.js`).
