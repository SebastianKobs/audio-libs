// The strips and the mixer (mockup/src/libs/view/mixer/models), in node, on a small desk (test/desk.js) and a plan's
// in of the tests' own:
//   - a channel as a strip, by its form: its shown name, where it goes, its inserts as devices, its sends'
//     knobs, its fader, pan, mute and solo, its level; quiet where its cut is at 0; a pool's copy too;
//   - a desk as a mixer: its buses, each with the buses that go into it, its returns, its master, in the
//     plan's order;
//   - a solo click: that strip alone, or added with shift, each change a command on its strip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelGroups, MixerViewBuilder, shortName } from '../index.ts';
import { addressText } from '../../../../util/index.ts';
import { STUDIO } from './desk.js';

// The desk's view models on a plan's readout of the tests' own: values and peaks by address, the copies
// each pool has, every control live; what's sent kept.
function mixerOn({ values = {}, peaks = {}, readings = {}, copies = {} } = {}) {
  const sent = [];
  const planReadout = {
    plan: STUDIO,
    valueOf: (address) => values[addressText(address)],
    startOf: () => undefined,
    roleOf: () => ({ by: 'live' }),
    peakOf: (address, point) => peaks[[addressText(address), point].filter(Boolean).join(' ')] ?? 0,
    readingOf: (address, reading) => readings[`${addressText(address)} ${reading}`] ?? 0,
    copiesOf: (pool) => (copies[addressText(pool)] ?? []).map((number) => [...pool, String(number)]),
    slotOf: () => undefined,
  };
  return { views: new MixerViewBuilder(planReadout, (command) => sent.push(command)), sent };
}

test("a channel as a strip, by its form: its name as shown, its label's, else its own; where it goes; its inserts as devices; its sends' knobs by return; its fader, pan, mute and solo", () => {
  const { views } = mixerOn();
  const tap = views.strip(['tap']);
  assert.deepEqual([tap.name, tap.out, tap.role], ['my tap', 'my playing', 'bus']);
  assert.deepEqual(
    tap.inserts.map(({ name, kind }) => [name, kind]),
    [['utility', 'Utility']],
  );
  assert.deepEqual(
    tap.inserts[0].controls.map(({ address }) => addressText(address)),
    ['tap/utility/level', 'tap/utility/pan', 'tap/utility/pan/law'],
  );
  assert.deepEqual(
    tap.sends.map(({ name, address }) => [name, addressText(address)]),
    [['reverb', 'tap/send/reverb']],
  );
  assert.deepEqual(
    [tap.volume, tap.pan, tap.mute, tap.solo].map(({ address }) => addressText(address)),
    ['tap/volume', 'tap/pan', 'tap/mute', 'tap/solo'],
  );
  assert.deepEqual([views.strip(['reverb']).name, views.strip(['reverb']).out], ['reverb', 'master']);
});

test("a channel's name in little room, as a send's knob shows it: its short label, else its label, else its own", () => {
  assert.deepEqual(
    [['reverb'], ['you'], ['master']].map((address) => shortName(STUDIO, address)),
    ['rev', 'my playing', 'master'],
  );
});

test("the master: its inserts and its volume alone, going nowhere on the desk; no strip where there's no channel", () => {
  const master = mixerOn().views.strip(['master']);
  assert.deepEqual(
    [master.inserts.map(({ name }) => name), master.sends, master.pan, master.mute, master.solo, master.out],
    [['limiter'], [], undefined, undefined, undefined, undefined],
  );
  assert.equal(master.volume.text, '0.0');
  assert.equal(mixerOn().views.strip(['nowhere']), undefined);
});

test("a pool's copy as a strip: its pool's channel, under its address, named by its pool and its number, going where its pool's rule wires it", () => {
  const copy = mixerOn({ values: { 'my tap/2/send/reverb': 0.5 } }).views.strip(['my tap', '2']);
  assert.deepEqual([copy.name, copy.out, copy.role], ['my tap 2', 'my tap', 'channel']);
  assert.deepEqual(
    copy.sends.map(({ address, value }) => [addressText(address), value]),
    [['my tap/2/send/reverb', 0.5]],
  );
});

test("a strip's level, its peak as the planReadout hears it; quiet where its cut is at 0, as a mute or another's solo leaves it", () => {
  const { views } = mixerOn({ peaks: { you: 0.4 }, values: { 'tap/cut/gain': 0 } });
  assert.equal(views.strip(['you']).level, 0.4);
  assert.deepEqual(
    [views.strip(['tap']).quiet, views.strip(['you']).quiet, views.strip(['master']).quiet],
    [true, false, false],
  );
});

test("a desk as a mixer, in the plan's order: its buses, each with the buses that go into it; its returns; its master", () => {
  const mixer = mixerOn().views.mixer();
  assert.deepEqual(
    mixer.buses.map(({ bus, members }) => [bus.name, members.map(({ name }) => name)]),
    [
      ['my playing', ['my tap']],
      ['background', []],
    ],
  );
  assert.deepEqual(
    mixer.returns.map(({ name }) => name),
    ['reverb'],
  );
  assert.equal(mixer.master.name, 'master');
});

test("a desk's channels, as a desk alone shows them: its own of the channel role, then each pool's copies added so far; one group of tracks for a mixer drawn with no session, none with none", () => {
  const mixer = mixerOn({ copies: { 'my tap': [1, 2] } }).views.mixer();
  assert.deepEqual(
    mixer.channels().map(({ name }) => name),
    ['my tap 1', 'my tap 2'],
  );
  const nothing = { text: '—', lit: false, waiting: false };
  assert.deepEqual(channelGroups(mixer, 'replay'), [
    {
      key: 'channels',
      name: 'replay',
      mine: false,
      tracks: [
        { address: ['my tap', '1'], name: 'my tap 1', now: nothing, playing: true },
        { address: ['my tap', '2'], name: 'my tap 2', now: nothing, playing: true },
      ],
    },
  ]);
  assert.deepEqual(channelGroups(mixerOn().views.mixer(), 'replay'), []);
});

test("a solo click: that strip alone, the others let go first; again, none; with shift, added or let go; a pool's copy among them; each change a command on its strip's solo", () => {
  const clicked = (values, address, add) => {
    const { views, sent } = mixerOn({ values, copies: { 'my tap': [1] } });
    views.mixer().soloClick(address, add);
    return sent.map(({ address: at, value }) => `${addressText(at)} ${value}`);
  };
  assert.deepEqual(clicked({ 'you/solo': 1, 'my tap/1/solo': 1 }, ['tap']), [
    'you/solo 0',
    'my tap/1/solo 0',
    'tap/solo 1',
  ]);
  assert.deepEqual(clicked({ 'tap/solo': 1 }, ['tap']), ['tap/solo 0'], 'again: none');
  assert.deepEqual(clicked({ 'tap/solo': 1 }, ['ambient'], true), ['ambient/solo 1'], 'with shift, added');
  assert.deepEqual(clicked({ 'tap/solo': 1, 'you/solo': 1 }, ['tap'], true), ['tap/solo 0'], 'with shift, let go');
  assert.deepEqual(clicked({}, ['my tap', '1']), ['my tap/1/solo 1'], "a pool's copy");
});

test("what strips feed, for a view's lights: each through its way out, and the sends said to be up, a pool's copies added among them; a name not on the desk kept, not followed (Z3, LAY12f)", () => {
  const mixer = mixerOn({ copies: { 'my tap': [1] } }).views.mixer();
  const sorted = (names) => [...names].sort();
  assert.deepEqual(
    sorted(mixer.reached(['tap'], () => false)),
    ['tap', 'you'],
    'into your bus, which goes out to the master',
  );
  assert.deepEqual(
    sorted(mixer.reached(['tap'], (from, to) => from === 'you' && to === 'reverb')),
    ['reverb', 'tap', 'you'],
    "your bus's reverb send up",
  );
  assert.deepEqual(
    sorted(mixer.reached(['my tap/1'], () => false)),
    ['my tap/1', 'tap', 'you'],
    "a pool's copy, by its pool's rule",
  );
  assert.deepEqual(sorted(mixer.reached(['clips tap'], () => true)), ['clips tap'], 'a clip track, not a strip');
});

test("a meter's level and a reading by address, as the implementation hears them: a strip's peak, a block's at a point, what a limiter takes away (LAY12f)", () => {
  const { views } = mixerOn({
    peaks: { you: 0.4, 'master/limiter in': 0.9 },
    readings: { 'master/limiter reduction': 3 },
  });
  assert.deepEqual(
    [
      views.peakOf(['you']),
      views.peakOf(['master', 'limiter'], 'in'),
      views.readingOf(['master', 'limiter'], 'reduction'),
    ],
    [0.4, 0.9, 3],
  );
});
