# sequencing

Music's time, its events, the MIDI sequencer, and the transport's view. Part of [the libraries](../README.md).

- [`clock/`](clock/README.md): music time, the beat grid, ticks.
- [`timeline/`](timeline/README.md): what happened, laid out in time.
- [`sequencer/`](sequencer/README.md): clips on tracks, pools of tracks.
- [`midi-sequencer/`](midi-sequencer/README.md): the input, the stream, the recorder.
- [`clip-player/`](clip-player/README.md): clips launched into the input.
- [`view/transport/`](view/transport/models/README.md): play, stop, where the music is.

Reads: `libs/base/` (`util`, `params`, `automation`, `html`), `libs/midi/protocol/`, the messages the sequencers carry. `clock/` is the time every other library here stands on.
