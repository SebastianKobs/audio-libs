# modular-audio

A sound as data (`plan/`), built (`build/`) and shown (`view/`), as a modular studio's parts. Part of [the libraries](../README.md).

- `plan/`: [`format`](plan/format/README.md), [`blocks`](plan/blocks/README.md), [`planner`](plan/planner/README.md), [`effects`](plan/effects/README.md), [`desk`](plan/desk/README.md), [`instrument`](plan/instrument/README.md): what a plan is, its blocks, templates made into plans, and the forms and templates of effects, a desk and instruments.
- `build/`: [`contract`](build/contract/README.md), [`web-audio`](build/web-audio/README.md), [`web-audio-engine`](build/web-audio-engine/README.md), [`instrument`](build/instrument/README.md), [`desk/mixing`](build/desk/mixing/README.md), [`desk/automation`](build/desk/automation/README.md): a plan built, powered, played by notes and mixed.
- `view/`: `device`, `desk`, `instrument` and `tracks`, each in `readout/`, `models/` and `dom/`: a plan's devices, a desk's strips, an instrument's patches, the session view and the arrangement. `tracks` is here, not in `sequencing/`: it draws the desk's strips and the device view's inserts, and its lanes are named by the desk's addresses.

Reads: `base/` (`util`, `params`, `automation`, `html`); of `sequencing/` only `clock/`, and `midi/protocol/` (the engine, `build/instrument`, `desk/automation`, `view/tracks`); `music/music-theory/` (`build/instrument`). Nothing of `spatial/`.
