# sequencing

Music's time, its events and MIDI, and the transport's view. Part of [the libraries](../README.md).

- [`clock/`](clock/README.md): music time, the beat grid, ticks.
- [`timeline/`](timeline/README.md): what happened, laid out in time, played back.
- [`sequencer/`](sequencer/README.md): patterns of events on the grid, clips on tracks, pools of tracks.
- [`midi/`](midi/README.md): MIDI 2.0's channel voice messages as values.
- [`midi-sequencer/`](midi-sequencer/README.md): the input, the stream, the recorder, the recording played back.
- [`clip-player/`](clip-player/README.md): a session view's clips, launched into the input.
- [`view/transport/`](view/transport/models/README.md): play, stop, where the music is, as `models/` and `dom/`.

Reads: `base/` (`util`, `params`, `automation`, `html`); `clip-player/` also `music/music-theory/`. `clock/` is the time every other library here stands on, `midi/` the messages they carry.
