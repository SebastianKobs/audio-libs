# libs/view/transport/dom

The transport's lane drawn in the DOM, from its model (`libs/view/transport/models/`).

| Part | Holds |
|---|---|
| `transport-lane-view.ts` | `TransportLaneView`: the transport's lane drawn from its model at the top of the element it's handed, ▶ lit while it plays, ■, and where the music is, bar and beat, written only as it changes; ▶ and ■ sent as messages, play and stop; its hints its owner's (`TransportHints`) |
