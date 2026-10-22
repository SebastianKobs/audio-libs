# libs/sequencing/view/transport/models

The transport as its lane shows it, bar and beat, on the clock alone. It imports `libs/sequencing/clock/`.

| Part | Holds |
|---|---|
| `transport-lane.ts` | `TransportLane`: the transport as its lane shows it, whether the music plays, and where it is, bar and beat, counted from bar 1 in the clock's meter, or the playhead's place while it's set back; read live, the transport in its own words |

Tested in node, in its `test/` folder (`transport-lane.test.js`): the bar and beat from bar 1, the playhead's place while it's set back, whether the transport plays.
