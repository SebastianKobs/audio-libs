# modular-audio/plan/desk

The desk's forms, a desk written short, its mute and solo. A desk is a template, planned as any; this library says what a valid one is, makes one from a desk written short, and says which channels a mute or a solo silences.

Depends on: `base/params`, `base/util`, `modular-audio/plan/effects`, `modular-audio/plan/format`, `modular-audio/plan/planner`.

```ts
import { DESK_FORMS, deskTemplates, silenced, type Desk } from './index.ts';
import { EFFECT_FORM } from '../effects/index.ts';
import { EFFECT_TEMPLATES } from '../effects/content.ts';
import { isComposite } from '../format/index.ts';
import { Planner } from '../planner/index.ts';

const desk: Desk = {
  kind: 'Studio',
  channels: [
    { name: 'reverb', role: 'return', inserts: [{ name: 'reverb', kind: 'Reverb' }] },
    { name: 'tap', role: 'channel', inserts: [{ name: 'utility', kind: 'Utility', values: { level: 0.7 } }] },
    { name: 'master', role: 'master', inserts: [{ name: 'limiter', kind: 'Limiter' }] },
  ],
};
const { node } = new Planner([...EFFECT_TEMPLATES, ...deskTemplates(desk)], [EFFECT_FORM, ...DESK_FORMS]).plan('Studio');
if (isComposite(node)) {
  silenced(node, { muted: new Set(['tap']), soloed: new Set() }); // Set { 'tap' }
}
```

A channel is a console's, its parts in one order:

1. Its inserts, effects, any number.
2. Its mute (`cut`), a gain after the inserts, as a console's cut.
3. Its fader.
4. Its pan, where it has one.
5. Its sends, one child (`send`).

Its own params are a strip's (`STRIP_PARAMS` in `base/params/`): `volume`, `pan`, `mute` and `solo`. Mute and solo are switches wired to nothing; what they silence is the desk's rule (`silenced()`), set on each channel's `cut` by its address.

A send goes to a return:

- A channel has one for each return before it on the desk, none that feeds it, as a desk's knobs. A return has one for every other, as Ableton's; a pool's channel has one for every return.
- A return's send into one after it can close a loop, the desk's only loops. It has a delay of 3 ms after its amount, a block's length (128 samples at 44.1 kHz), since Web Audio mutes a loop without a delay in it. Sends into returns before it never close one.
- Each send is a select between its two taps, then a gain, its amount a param by the return's name (`you/send/reverb`). Its tap is a setting of its select (`you/send/reverb tap/input`): post (`a`), after the fader and the pan, to start, so what it sends keeps the source's panning and follows its fader, or pre (`b`), after the mute and before the fader, as a console's PRE button.

The master is the last bus: its inserts and its fader alone, its volume at `master/volume`; no pan, mute, solo or sends.

A desk written short, as YAML writes it:

- its channels in order, each by its name and role (a channel, fed from outside; a bus; a return; the master), with its label where it's shown by another name and its short label for little room;
- a send's knob to a return, written on the channel or on a channel written apart (`channel`), its own parts over that one's;
- each one's way out (`out`), a bus, the master where it names none; a send's tap by its return (`taps`), where it isn't its channel's own;
- its pools, channels that come and go, each copy wired as its pool's channel.

A channel written apart has its inserts, a pan or none (`pan: false`), its fader's start (`volume`), its sends' tap (`tap`), and the channel it's built on (`extends`), whose inserts come first.

| Export | What it does |
|---|---|
| `DESK_FORMS`, `CHANNEL_FORM`, `DeskRole` | What every channel and every desk is, as forms: a channel's roles in order and their wires; a desk's channels by role, exactly one master, a way out into a bus or the master, sends into returns and no loops (`channel-form.ts`, `desk-form.ts`). |
| `deskTemplates(desk, channels?)`, `Desk`, `DeskChannel`, `DeskPool` | A desk written short made into templates: the desk's, of the desk's form, and each channel's and its sends', a pool's among them. It's refused where it's written wrong, every failure said (`desk-templates.ts`). |
| `channelTemplates(parts, onDesk)`, `layered()`, `Channel`, `ChannelParts`, `Insert`, `Tap`, `Parts`, `OnDesk`, `Send` | A channel written short, apart or on a desk, made into a template of the channel's form, its stages and sends filled in and wired. `layered()` layers a channel's parts, the base first (`channel.ts`). |
| `SEND`, `controlAddress()` | The sends' child's name. `controlAddress(strip, controller)` is a controller on a strip as its param's address on the desk, a pool's copy by its pool's name and number (`lead/3/send/reverb`) (`channel.ts`). |
| `deskOf()`, `channelOf()` | A desk or a channel read from data such as YAML, its shape checked before `deskTemplates()`'s. Every failure is said, naming its file (`desk.ts`, `channel.ts`). |
| `silenced()`, `Muting`, `MUTE_GLIDE` | Which channels a mute or a solo silences over a desk plan's wires, as Ableton's: those muted and what feeds them, and with any soloed, every one but what a soloed one needs to be heard. A return is never silenced by a solo, the master never; `MUTE_GLIDE` is a cut's time constant, 10 ms (`mute-solo.ts`). |
| `DeskMessage` | A desk's edit by address, as a message on a bus: a param's value or a setting (`messages.ts`). |

Tests: `test/desk.test.js`, on small desks in `test/desks.js`.
