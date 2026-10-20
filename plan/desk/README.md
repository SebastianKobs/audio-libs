# plan/desk

The desk's forms, a desk written short, its mute and solo. A desk is a template, planned as any (`libs/plan/planner/`); this library says what a valid one is, makes one from a desk written short, and says which channels a mute or a solo silences. It imports `libs/plan/format/`, `libs/plan/planner/`, `libs/plan/effects/`, `libs/params/` and `libs/util/`.

```ts
import { DESK_FORMS, deskTemplates } from './index.ts';
import { EFFECT_FORM } from '../effects/index.ts';
import { EFFECT_TEMPLATES } from '../effects/content.ts';
import { Planner } from '../planner/index.ts';
const templates = [...EFFECT_TEMPLATES, ...deskTemplates(desk, channels)];
const plan = new Planner(templates, [EFFECT_FORM, ...DESK_FORMS], presets).plan(desk.kind);
```

**A channel** is a console's, its parts in one order: its inserts, effects, any number; its mute (`cut`), a gain, after the inserts, as a console's cut; its fader; its pan, where it has one; its sends, one child (`send`). Its own params are a strip's, `libs/params/`'s `STRIP_PARAMS`: `volume`, `pan`, `mute` and `solo`; mute and solo are switches wired to nothing, what they silence the desk's rule's (`silenced()`), set on each channel's `cut` by its address.

**A send** goes to a return: one on each channel for each return before it on the desk, none that feeds it, as a desk's knobs; a return has one for every other, as Ableton's; a pool's channel has one for every return. A return's send into one after it can close a loop, the desk's only loops: a delay of 3 ms after its amount, a block's length (128 samples at 44.1 kHz), since Web Audio mutes a loop without a delay in it. Its sends into returns before it never close one, so they stay as they are. Each is a select between its two taps, then a gain, its amount a param by the return's name (`you/send/reverb`). Its tap is a setting of its select (`you/send/reverb tap/input`): post (`a`), after the fader and the pan, to start, or pre (`b`), after the mute, before the fader, as a console's PRE button.

**The master** is the last bus: its inserts and its fader alone, its volume at `master/volume`; no pan, mute, solo or sends.

**A desk written short**, as YAML writes it: its channels in order, each by its name and role (a channel, fed from outside; a bus; a return; the master), its label where it's shown by another name, its short label for little room, a send's knob to it, written there or on a channel written apart (`channel`), its own parts over that one's; each one's way out (`out`), a bus, the master where it names none; a send's tap by its return (`taps`), where it isn't its channel's own; its pools, channels that come and go, each copy wired as its pool's channel. A channel written apart has its inserts, a pan or none (`pan: false`), its fader's start (`volume`), its sends' tap (`tap`), and the channel it's built on (`extends`), whose inserts come first.

| | |
|---|---|
| `DESK_FORMS`, `DeskRole` | what every channel and every desk is, as forms: a channel's roles in order, the wires between them; a desk's channels by role, at least one channel, a pool of them one, exactly one master, a way out into a bus or the master, a send into a return, no loops, every way out ending in the master (`channel-form.ts`, `desk-form.ts`) |
| `deskTemplates(desk, channels)`, `Desk`, `DeskChannel`, `DeskPool` | a desk written short made into templates: the desk's, of the desk's form, its own inputs into its channels and buses, and each channel's and its sends', a pool's among them; refused where it's written wrong, every failure said: a channel not handed in, or built in a loop; a way out into no bus; a tap for a return it has no send to (`desk-templates.ts`) |
| `Channel`, `ChannelParts`, `Insert`, `Tap`, `SEND`, `Parts`, `OnDesk`, `Send`, `layered()`, `channelTemplates(parts, onDesk)`, `CHANNEL_FORM` | a channel written short, apart or on a desk; made into a template of the channel's form, its stages and sends filled in and wired (`channel.ts`); the sends' child's name, a send's address on a channel under it (`send/reverb`); a lone channel, its parts layered, the base first, made into templates of its form, apart from any desk (`CHANNEL_FORM` in `channel-form.ts`) |
| `controlAddress(strip, controller)` | a controller on a strip as its param's address on the desk: the strip's address in front, a pool's copy's its pool's name and number (`lead/3/send/reverb`) (`channel.ts`) |
| `deskOf(data, source)`, `channelOf(data, source)` | a desk or a channel read from data, YAML's, its shape checked before `deskTemplates()`'s: its kind a word, its channels a list, each its name and its role, its inserts each its name and its kind or a preset, its pan, volume and taps; every failure said, naming its file; their shapes written as data beside their types, checked by `libs/util/`'s `fromData()` (`desk.ts`, `channel.ts`; `shape.ts`'s own checks); the roles and taps they hold to the desk's own lists (`DESK_ROLES`, `TAPS`) |
| `silenced(desk, { muted, soloed })`, `Muting`, `MUTE_GLIDE` | which channels a mute or a solo silences, as Ableton's, over a desk plan's wires: those muted, and what feeds them, a bus muted silencing what goes into it, its sends among them; with any soloed, every one but what a soloed one needs to be heard, its way out to the master and what feeds it; a return never by a solo, the master never; a pool's copies where the caller adds them; `MUTE_GLIDE`, a cut's time constant, 10 ms, at once with no click (`mute-solo.ts`) |
| `DeskMessage` | a desk's edit by address, as a message on a bus: a param's value or a setting (`messages.ts`) |

Tested in node, in its `test/` folder, on small desks (`test/desks.js`): a channel of the channel's form, its own params; its wires, its sends taken pre and post; the master's; a send for each return before a channel, none that feeds it, a return's to every other, those into one after it delayed, a pool's for every one, each tap post unless said; the desk's own inputs, ways out, sends and pools; a channel built on another; a desk written wrong refused; mute and solo on the routing, a pool's copy among them; a desk and a channel read from data (`test/desk.test.js`).
