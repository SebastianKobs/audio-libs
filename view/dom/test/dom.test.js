// The view models drawn (mockup/src/libs/view/dom), as HTML, in node, on the models' small desk (libs/view/models/test/desk.js):
//   - a knob: its label, its bar by its taper, a gain's unity marked, a pan's from its middle, its text; a live one
//     marked with its address; a pan that does nothing;
//   - a fader, its unity marked; a level bar, red at full scale;
//   - a strip: its name, where it goes, its slots, its knobs, its fader, bar and value, its mute and solo; quiet
//     where it's silent; the master's without mute and solo, its pan still;
//   - every value escaped as it's made.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceHtml, faderHtml, html, knobHtml, meterHtml, stillPanHtml, stripHtml } from '../index.ts';
import { ViewBuilder } from '../../models/index.ts';
import { addressText } from '../../../plan/format/index.ts';
import { positionOf } from '../../../params/index.ts';
import { STUDIO } from '../../models/test/desk.js';

const LOOK = { route: 'to master', sendLabel: (to) => `${to}!`, level: 0.5 };

// the small desk's view models, its values and roles by address, live unless said; the slots' words by address
function viewsOn({ values = {}, roles = {}, slots = {} } = {}) {
  return new ViewBuilder({
    plan: STUDIO,
    valueOf: (address) => values[addressText(address)],
    startOf: () => undefined,
    roleOf: (address) => roles[addressText(address)] ?? { by: 'live' },
    peakOf: () => 0,
    readingOf: () => 0,
    copiesOf: () => [],
    slotOf: (address) => slots[addressText(address)],
    send: () => {},
  });
}

test('a knob drawn: its label, its bar by its taper, a gain its unity marked, its text; live, marked with its address and its hint; a pan from its middle; one that does nothing', () => {
  const views = viewsOn({ values: { 'you/send/reverb': 1, 'you/pan': -0.5 } });
  const send = views.control(['you', 'send', 'reverb']);
  const unity = positionOf(send.spec, 1);
  assert.equal(
    knobHtml('rev', send).text,
    `<div class="knob" data-knob="you/send/reverb" data-set="you/send/reverb" title="drag up or down to set it, with shift for finer steps; double-click: back to where it started"><span>rev</span><i class="" style="--v:${unity};--unity:${unity}"></i><b>0.0</b></div>`,
  );
  assert.match(knobHtml('pan', views.control(['you', 'pan'])).text, /<i class="pan" style="--v:0.25"><\/i><b>L25<\/b>/);
  const automated = viewsOn({ roles: { 'you/pan': { by: 'automated' } } }).control(['you', 'pan']);
  assert.doesNotMatch(knobHtml('pan', automated).text, /data-set/, 'not live: no mark');
  assert.equal(
    stillPanHtml().text,
    '<div class="knob"><span>pan</span><i class="pan" style="--v:0.5"></i><b>C</b></div>',
  );
});

test('a fader drawn upright, its unity marked; a level bar by the meter law, red at full scale', () => {
  const volume = viewsOn({ values: { 'you/volume': 0.5 } }).control(['you', 'volume']);
  assert.match(
    faderHtml(volume).text,
    new RegExp(`^<div class="fader" style="--unity:${positionOf(volume.spec, 1)}" data-set="you/volume"`),
  );
  assert.match(faderHtml(volume).text, new RegExp(`<i style="--v:${volume.position}"></i></div>$`));
  assert.equal(meterHtml('you', 0.5).text.includes('class="meter"'), true);
  assert.equal(meterHtml('you', 1).text.includes('class="meter over"'), true);
});

test('a strip drawn: its name and where it goes, its slots, its sends by their labels, its pan, its fader, bar and value, its mute and solo by its key', () => {
  const views = viewsOn({ values: { 'tap/mute': 1 }, slots: { 'tap/utility': { job: 'its level' } } });
  const text = stripHtml(views.strip(['tap']), { ...LOOK, name: 'my tap', route: 'to my playing' }).text;
  assert.match(
    text,
    /^<div class="track" data-sounds="tap"><div class="name">my tap<\/div><div class="route">to my playing<\/div>/,
  );
  assert.match(
    text,
    /<div class="inserts"><div class="slot">Utility<small>gain -3\.1 dB<\/small><\/div><\/div>/,
    "a live Utility's gain",
  );
  assert.match(text, /<span>reverb!<\/span>/);
  assert.match(text, /<b class="val">0\.0 dB<\/b>/);
  assert.match(
    text,
    /<b data-mute="tap" class="on" title="mute">M<\/b><b data-solo="tap" class="" title="solo; shift adds or removes it">S<\/b>/,
  );
});

test('a slot as the tool says what sets it; a strip quiet where its cut is at 0; the master: no mute and solo, nothing it sounds by, its pan still; opened by a click, each slot marked by its place', () => {
  const views = viewsOn({
    values: { 'you/cut/gain': 0 },
    slots: { 'master/limiter': { job: 'on the master', setBy: 'gain, ceiling' } },
  });
  assert.match(stripHtml(views.strip(['you']), { ...LOOK, name: 'my playing' }).text, /^<div class="track quiet"/);
  const master = stripHtml(views.strip(['master']), {
    ...LOOK,
    name: 'master',
    opens: html` data-open="strip:master"`,
  }).text;
  assert.match(master, /^<div class="track"><div class="name" data-open="strip:master">master<\/div>/);
  assert.match(
    master,
    /<div class="slot" data-open="strip:master" data-mark="0">Limiter<small>gain, ceiling<\/small><\/div>/,
  );
  assert.doesNotMatch(master, /data-mute|data-solo/);
  assert.match(master, /<i class="pan" style="--v:0.5"><\/i><b>C<\/b>/);
});

test('a strip whose track plays nothing drawn empty: its sends and fader at the bottom, a dash for each value; its mute and solo still there', () => {
  const views = viewsOn({ values: { 'my tap/1/send/reverb': 0.5, 'my tap/1/volume': 0.8 } });
  const text = stripHtml(views.strip(['my tap', '1']), { ...LOOK, name: 'my tap 1', empty: true }).text;
  assert.match(text, /<span>reverb!<\/span><i class="" style="--v:0;--unity:[\d.]+"><\/i><b>—<\/b>/);
  assert.match(
    text,
    /<div class="fader" style="--unity:[\d.]+" data-set="my tap\/1\/volume"[^>]*><i style="--v:0"><\/i><\/div>/,
  );
  assert.match(text, /<b class="val">—<\/b>/);
  assert.match(text, /data-mute="my tap\/1"/);
});

test("a device drawn: its bar, its status and its reset; its knobs by their names and units, each marked with its address, read-only ones marked by how they're set; a view of its own first; settings not live left out", () => {
  const views = viewsOn({
    values: { 'tap/utility/level': 0.5 },
    roles: { 'tap/utility/pan': { by: 'automated', source: 'distance' }, 'tap/utility/pan/law': { by: 'fixed' } },
  });
  const device = views.device(['tap', 'utility']);
  const text = deviceHtml(device, {
    status: 'Utility: its level',
    reset: 'reset this Utility',
    own: html`<canvas class="history"></canvas>`,
    hintOf: (control) => `${control.name}!`,
  }).text;
  assert.match(
    text,
    /^<div class="device flowless" data-device="tap\/utility"><div class="bar"><div class="status" title="Utility: its level">Utility: its level<\/div><button class="reset" data-reset="tap\/utility">reset this Utility<\/button><\/div>/,
  );
  assert.match(
    text,
    /<div class="controls"><canvas class="history"><\/canvas><div class="knob" data-knob="tap\/utility\/level" data-set="tap\/utility\/level" title="level!"><span>level \(dB\)<\/span>/,
  );
  assert.match(text, /<div class="knob automated" data-knob="tap\/utility\/pan" title="pan!"><span>pan<\/span>/);
  assert.doesNotMatch(text, /law/, "its pan's law, fixed, left out");
  const plain = deviceHtml(views.device(['reverb', 'utility']), { status: 'x', hintOf: () => '' }).text;
  assert.doesNotMatch(plain, /data-reset/, 'no reset where it says none');
});

test("a setting with a range shown as a knob only where it's live: a room's length a live one's, a delay's longest time a fixed one's left out", () => {
  const room = {
    version: 1,
    node: {
      name: 'room',
      kind: 'reverb',
      inputs: [],
      outputs: [],
      params: [],
      settings: [{ spec: { name: 'length', unit: 's', range: [0.2, 8, 0.1] }, value: 3.5 }],
    },
  };
  const devicesOn = (by) =>
    new ViewBuilder({
      plan: room,
      valueOf: () => undefined,
      startOf: () => undefined,
      roleOf: () => ({ by }),
      peakOf: () => 0,
      copiesOf: () => [],
      slotOf: () => undefined,
      send: () => {},
    }).device([]);
  const look = { status: 'room', hintOf: () => '' };
  assert.match(deviceHtml(devicesOn('live'), look).text, /<span>length \(s\)<\/span>/);
  assert.doesNotMatch(deviceHtml(devicesOn('fixed'), look).text, /length/);
});

// a delay's own, as the Delay's macros: its sync switch, its note, its ms, its feedback
const ECHO = {
  version: 1,
  node: {
    name: 'delay',
    kind: 'Delay',
    inputs: [],
    outputs: [],
    params: [],
    settings: [],
    children: [],
    wires: [],
    macros: [
      { spec: { name: 'sync', range: [0, 1, 1] }, value: 1, maps: [] },
      { spec: { name: 'note', choices: ['1/8', '1/4'] }, value: '1/8', maps: [] },
      { spec: { name: 'ms', unit: 'ms', range: [1, 2000, 1], taper: 'octaves' }, value: 250, maps: [] },
      { spec: { name: 'feedback', range: [0, 0.95, 0.01] }, value: 0.45, maps: [] },
    ],
    pools: [],
  },
};
// the delay's device, its values by address
function echoOn(values = {}) {
  return new ViewBuilder({
    plan: ECHO,
    valueOf: (address) => values[addressText(address)],
    startOf: () => undefined,
    roleOf: () => ({ by: 'live' }),
    peakOf: () => 0,
    readingOf: () => 0,
    copiesOf: () => [],
    slotOf: () => undefined,
    send: () => {},
  }).device([]);
}

test("a device's switch drawn on or off, marked for a click; a choice as a list of its options, the one it is chosen; its time by its sync, the note while synced, the ms while free", () => {
  const look = { status: 'Delay', hintOf: (control) => `${control.name}!` };
  const synced = deviceHtml(echoOn(), look).text;
  assert.match(
    synced,
    /<div class="switch on" data-knob="sync" data-toggle="sync" title="sync!"><span>sync<\/span><b>on<\/b><\/div>/,
  );
  assert.match(
    synced,
    /<label class="choice" title="note!"><span>note<\/span><select data-choose="note"><option selected>1\/8<\/option><option>1\/4<\/option><\/select><\/label>/,
  );
  assert.doesNotMatch(synced, /<span>ms/, 'synced: no ms');
  assert.match(synced, /<span>feedback<\/span>/);
  const free = deviceHtml(echoOn({ sync: 0, note: '1/4' }), look).text;
  assert.match(
    free,
    /<div class="switch" data-knob="sync" data-toggle="sync" title="sync!"><span>sync<\/span><b>off<\/b><\/div>/,
  );
  assert.match(free, /<span>ms \(ms\)<\/span>/, 'free: its ms');
  assert.doesNotMatch(free, /data-choose="note"/, 'free: no note');
});

test('every value escaped as it is made', () => {
  const views = viewsOn();
  const text = stripHtml(views.strip(['ambient']), { ...LOOK, name: '<b>&"' }).text;
  assert.match(text, /<div class="name">&#60;b&#62;&#38;&#34;<\/div>/);
});
