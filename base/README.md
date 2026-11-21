# base

The libraries every other library may read, at the bottom of the libraries. Part of [the libraries](../README.md).

- [`util/`](util/README.md): small helpers every library shares.
- [`automation/`](automation/README.md): what a param is told as it plays.
- [`params/`](params/README.md): a param as a plugin declares it.
- [`html/`](html/README.md): HTML made safely, a sharp canvas.

Reads: nothing outside the group; `automation/` and `params/` read `util/`.
