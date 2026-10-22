# spatial

Places, hearing by distance and the pointer's gestures. Part of [the libraries](../README.md).

- [`places/`](places/README.md): places perceived from where you are, a world that wraps round (`spatial` until GROUPS1).
- [`hearing/`](hearing/README.md): hearing by distance, as values, no Web Audio (`spatial-audio` until GROUPS1).
- [`gestures/`](gestures/README.md): pointer input in, gestures out, no DOM.

Reads: `base/` (`util`, `automation`); `gestures/` also `sequencing/clock/`; `hearing/` and `gestures/` read `places/`.
