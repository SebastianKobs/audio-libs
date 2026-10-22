# base

The libraries every other library may read, at the bottom of `libs/`. Part of [the libraries](../README.md).

- [`util/`](util/README.md): small helpers: maths, searches, events, a bus, seeded draws, addresses, data read for its shape.
- [`automation/`](automation/README.md): what a param is told as it plays.
- [`params/`](params/README.md): a param as a plugin declares it.
- [`html/`](html/README.md): HTML made safely, a canvas sharp on any screen.

Reads: nothing outside the group; `automation/` and `params/` read `util/`.
