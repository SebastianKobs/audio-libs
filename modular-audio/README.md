# modular-audio

A sound as data (`plan/`), built (`build/`) and shown (`view/`), as a modular studio's parts. Part of [the libraries](../README.md).

- [`plan/format`](plan/format/README.md): what a plan is.
- [`plan/blocks`](plan/blocks/README.md): the building blocks.
- [`plan/planner`](plan/planner/README.md): templates made into plans.
- [`plan/effects`](plan/effects/README.md): what an effect is, as templates.
- [`plan/desk`](plan/desk/README.md): a channel, a desk, mute and solo.
- [`plan/instrument`](plan/instrument/README.md): an instrument's forms and templates.
- [`build/contract`](build/contract/README.md): what every builder hands back.
- [`build/web-audio`](build/web-audio/README.md): the Web Audio builder.
- [`build/web-audio-engine`](build/web-audio-engine/README.md): the builder run in a browser on the one clock.
- [`build/instrument`](build/instrument/README.md): MIDI notes played into an instrument.
- [`build/desk/mixing`](build/desk/mixing/README.md): a desk built and mixed.
- [`build/desk/automation`](build/desk/automation/README.md): the desk's automation.
- [`view/device/readout`](view/device/readout/README.md): what a device view reads.
- [`view/device/models`](view/device/models/README.md): a plan's devices as view models.
- [`view/device/dom`](view/device/dom/README.md): a plan's devices in the DOM.
- [`view/desk/readout`](view/desk/readout/README.md): what the desk view reads.
- [`view/desk/models`](view/desk/models/README.md): a desk's view models.
- [`view/desk/dom`](view/desk/dom/README.md): a desk drawn in the DOM.
- [`view/instrument/readout`](view/instrument/readout/README.md): what the instrument view reads.
- [`view/instrument/models`](view/instrument/models/README.md): an instrument's view models.
- [`view/instrument/dom`](view/instrument/dom/README.md): each role's instrument as a device.
- [`view/tracks/readout`](view/tracks/readout/README.md): what the session view and the arrangement read.
- [`view/tracks/models`](view/tracks/models/README.md): their view models.
- [`view/tracks/dom`](view/tracks/dom/README.md): the session view and the arrangement drawn.

`tracks` is here, not in `sequencing/`: it draws the desk's strips and the device view's inserts, and its lanes are named by the desk's addresses.

Reads: `base/` (`util`, `params`, `automation`, `html`); of `dsp/`, `saturation` (`plan/blocks`, `build/web-audio`, `view/device/models`), `filters` and `measures` (`build/web-audio`) and `true-peak` (`build/web-audio`); of `sequencing/` only `clock` (`build/web-audio-engine`, `build/instrument`, `build/desk/automation`, `view/tracks`); `midi/protocol/` (`build/instrument`, `build/desk/automation`); `music/music-theory/` (`build/instrument`). Nothing of `spatial/`.

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
- **Channel and desk:** a channel is a console's: inserts, cut, fader, pan, sends. A desk is channels and exactly one master, a template of the desk's form with the routing in it. An **effect** is a composite from a template, an **insert** one on a channel; a **send** taps a channel, pre or post fader, into a **return**.

## The sound's way through them

A sound is data until it's built, and built only by a builder:

1. **What a sound is** (`plan/format`, `plan/blocks`): a plan, a node, a block or a composite of others, its wires, params, macros and pools. Timeless: what to build, its values as it starts.
2. **Planned** (`plan/planner`): templates, written short or in YAML, made into a plan, checked against their forms; a block alone by its kind.
3. **What's planned** (`plan/effects`, `plan/desk`, `plan/instrument`): the effects, a desk and its channels, a synth's voice cards and instruments, as forms and templates; a preset is values on one, by address.
4. **Built** (`build/contract`, `build/web-audio`): a builder handed a plan hands back what's built (`Built`), set and automated by address, built again, taken apart.
5. **Powered** (`build/web-audio-engine`): the audio context started on a first touch, what's built built into an output that fades in, the clock on the audio's time.
6. **Played by notes** (`build/instrument`): MIDI's notes played into an instrument on what's built, a voice a pool's copy, a sound module an instrument for each patch, any number of tracks playing into it by an input of its own. A patch's value is set on its bank at its time (`InstrumentAutomation`), and moved by hand as a controller on its own track (`InstrumentSurface`).
7. **Mixed** (`build/desk/mixing`, `build/desk/automation`): a desk built, set by address, its mute and solo; a track's channel and its way in. The desk's automation is fitted to it: a strip's controllers set on time (`DeskAutomation`), a move by hand played in as a controller on the strip's track (`DeskSurface`).
8. **Patched** (a project's wiring, in the app): a track's notes into its role's instrument by an input of its own, each voice into the track's channel, its controllers onto its strip.

Beside it, `spatial/hearing` hears a place from where you listen and hands on what it hears as values: a track's controllers, a strip's, a note's own. The notes come through `sequencing/midi-sequencer` (its input plays the instruments and records what's heard), from a control surface, a clip (`sequencing/clip-player`) or a recording played back.

## Why the libraries are pure and apart from the edges

A plan is data, so planning, the formats, the readouts and the view models run in node with no Web Audio and no DOM, the one clock the only time they know. They are tested there and could be ported as they are.

Only two kinds of library touch a platform, each an edge: `build/web-audio` and `build/web-audio-engine` (Web Audio, the browser's audio context and its power), and the `dom` libraries (the DOM). That only the builder makes Web Audio nodes is a rule of `CLAUDE.md`'s, its import test checks it.

## Units at the edges

Inside, a plan's values are in the units their params declare; MIDI's integers belong to the edges. A plan's values are Web Audio's physical units: seconds, hertz, cents, a pan from −1 to 1, a gain as a share, shown in dB by the fader law; the builder turns them into Web Audio's own. At the edges the messages (`midi/protocol`) carry a velocity and a controller's value from 0 to 1 and a note's pitch as its note number: a velocity of 1 to 127 is `v / 127`, a pan (CC 10) is `(max(cc, 1) − 64) / 63`, MIDI's equal-power curve on Web Audio's panner.

## Sends are taken after the pan

A channel's sends come last, after its fader and its pan: [`plan/desk`](plan/desk/README.md).

## An insert is one device on any strip

An insert is an effect, the same device on a channel, a return or the master: [`plan/effects`](plan/effects/README.md).
