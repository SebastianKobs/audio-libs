# modular-audio

A sound as data (`plan/`), built (`build/`) and shown (`view/`), as a modular studio's parts. Part of [the libraries](../README.md).

- `plan/`: [`format`](plan/format/README.md), [`blocks`](plan/blocks/README.md), [`planner`](plan/planner/README.md), [`effects`](plan/effects/README.md), [`desk`](plan/desk/README.md), [`instrument`](plan/instrument/README.md): what a plan is, its blocks, templates made into plans, and the forms and templates of effects, a desk and instruments.
- `build/`: [`contract`](build/contract/README.md), [`web-audio`](build/web-audio/README.md), [`web-audio-engine`](build/web-audio-engine/README.md), [`instrument`](build/instrument/README.md), [`desk/mixing`](build/desk/mixing/README.md), [`desk/automation`](build/desk/automation/README.md): a plan built, powered, played by notes and mixed.
- `view/`: `device`, `desk`, `instrument` and `tracks`, each in `readout/`, `models/` and `dom/`: a plan's devices, a desk's strips, an instrument's patches, the session view and the arrangement. `tracks` is here, not in `sequencing/`: it draws the desk's strips and the device view's inserts, and its lanes are named by the desk's addresses.

Reads: `base/` (`util`, `params`, `automation`, `html`); of `sequencing/` only `clock/`, and `midi/protocol/` (the engine, `build/instrument`, `desk/automation`, `view/tracks`); `music/music-theory/` (`build/instrument`). Nothing of `spatial/`.

## The words

One word for each thing, the same in the plan, the builders and the views.

- **Node:** inputs and outputs, any number, none included; params, edited or automated as it plays; settings, chosen as it's built, a change a rebuild. One kind of node, so a plan is one tree.
- **Block:** a node with nothing inside, small and fixed, what every builder knows: oscillator, gain, filter, pan, delay, reverb, noise, limiter, envelope, select.
- **Composite:** a node with an inside: children wired together, its inputs and outputs wired to theirs, its own params, macros, mapped onto theirs. An effect, a channel, a desk and a synth's module are composites.
- **Module:** a synth's, named as on a synth's panel (`VCO`, `VCF`, `Envelope generator`), never called a block.
- **Template:** a composite described short, its values, settings and children resolved as it's built. A **form** is what a template has to fulfill, a kind's: a channel's, a desk's, a voice card's. The planner declares it and checks a template against it as the template is made.
- **Two layers:** the planner makes plans from templates and forms, with no audio. A builder makes a plan sound and knows no channel or desk. A plan describes itself, so builders and views read only `plan/format/` and `plan/blocks/`, never the planner. Plans are JSON, templates YAML, each checked against its form as it's loaded.
- **Address:** a param's path from the plan's top, by its children's names, with slashes (`desk/channel 3/utility/level`). The one name for editing, automating and modulating; a setting's address edits only. A pool's copy is named by its pool and its number (`my tone/3`).
- **Pool and owner:** children that come and go, an instrument's voices, a drum rack's pads, a desk's pooled channels, are copies of a pool's child. A node and a composite are timeless: the owner of the copies makes them and lets them go, and has no audio of its own.
- **Voice card:** a fixed graph of modules, in the roles source, modulator, stage and one output. The note sets its params as CV does: pitch, velocity, gate. The instrument keeps one ready and copies it for each note.
- **Patch:** a preset on an architecture. The architecture is the voice card's template; the preset holds its params' values and settings.
- **Channel and desk:** a channel is a console's: inserts, cut, fader, pan, sends. A desk is channels and exactly one master, a template of the desk's form with the routing in it. An **effect** (Utility, Filter, Limiter, Delay, Tape delay, Reverb) is a composite from a template, an **insert** one on a channel; a **send** taps a channel, pre or post fader, into a **return**.

## The sound's way through them

A sound is data until it's built, and built only by a builder:

1. **What a sound is** (`plan/format`, `plan/blocks`): a plan, a node, a block or a composite of others, its wires, params, macros and pools. Timeless: what to build, its values as it starts.
2. **Planned** (`plan/planner`): templates, written short or in YAML, made into a plan, checked against their forms; a block alone by its kind.
3. **What's planned** (`plan/effects`, `plan/desk`, `plan/instrument`): the effects, a desk and its channels, a synth's voice cards and instruments, as forms and templates; a preset is values on one, by address.
4. **Built** (`build/contract`, `build/web-audio`): a builder handed a plan hands back what's built (`Built`), set and automated by address, built again, taken apart.
5. **Powered** (`build/web-audio-engine`): the audio context started on a first touch, what's built built into an output that fades in, the clock on the audio's time.
6. **Played by notes** (`build/instrument`): MIDI's notes played into an instrument on what's built, a voice a pool's copy, a sound module an instrument for each patch, any number of tracks playing into it by an input of its own. A patch's value is set on its bank at its time (`InstrumentAutomation`), and moved by hand as a controller on its own track (`InstrumentSurface`).
7. **Mixed** (`build/desk/mixing`, `build/desk/automation`): a desk built, set by address, its mute and solo; a track's channel and its way in. The desk's automation is fitted to it: a strip's controllers set on time (`DeskAutomation`), a move by hand played in as a controller on the strip's track (`DeskSurface`).
8. **Patched** (`app/`'s wiring): a track's notes into its role's instrument by an input of its own, each voice into the track's channel, its controllers onto its strip.

Beside it, `spatial/hearing` hears a place from where you listen and hands on what it hears as values: a track's controllers, a strip's, a note's own. The notes come through `sequencing/midi-sequencer` (its input plays the instruments and records what's heard), from a control surface, a clip (`sequencing/clip-player`) or a recording played back.
