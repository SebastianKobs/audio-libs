# sequencing

Music's time, its events, the MIDI sequencer, and the transport's view. Part of [the libraries](../README.md).

- [`clock/`](clock/README.md): music time, the beat grid, ticks.
- [`timeline/`](timeline/README.md): what happened, laid out in time, played back.
- [`sequencer/`](sequencer/README.md): patterns of events on the grid, clips on tracks, pools of tracks.
- [`midi-sequencer/`](midi-sequencer/README.md): the input, the stream, the recorder, the recording played back.
- [`clip-player/`](clip-player/README.md): a session view's clips, launched into the input.
- [`view/transport/`](view/transport/models/README.md): play, stop, where the music is, as models and dom.

Reads: `libs/base/` (`util`, `params`, `automation`, `html`), `libs/midi/protocol/`, the messages the sequencers carry. `clock/` is the time every other library here stands on.
