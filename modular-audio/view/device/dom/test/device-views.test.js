// A device's controls drawn (modular-audio/view/device/dom/: knob-view.ts, meter-view.ts, device-view.ts, choice-view.ts),
// as HTML, in node, on the device view models of the desk library's small studio (modular-audio/plan/desk/test/desks.js)
// and a delay's plan of the tests' own:
//   - a knob: its label, its bar by its taper, a gain's unity marked, a pan's from its middle, its text; a live one
//     marked with its address; a pan that does nothing;
//   - a fader, its unity marked; a level bar, red at full scale;
//   - a device: its bar, its status and its reset, its controls, a view of its own first;
//   - a setting with a range shown as a knob only where it's live;
//   - a switch and a choice, and a time by its sync switch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceHtml, faderHtml, knobHtml, meterHtml, stillPanHtml } from '../index.ts';
import { html } from '../../../../../base/html/index.ts';
import { positionOf } from '../../../../../base/params/index.ts';
import { ViewBuilder } from '../../models/index.ts';
import { planned } from '../../../../plan/desk/test/desks.js';
import { planReadoutOf } from '../../readout/test/plan-readout.js';

// the small studio's device view models, its values and roles by address, live unless said
function viewsOn(readout = {}) {
  return new ViewBuilder(planReadoutOf(planned(), readout), () => {});
}

test('a knob drawn: its label, its bar by its taper, a gain its unity marked, its text; live, marked with its address and its hint; a pan from its middle; one that does nothing', () => {
  const views = viewsOn({ values: { 'you/send/reverb': 1, 'you/pan': -0.5 } });
  const send = views.control(['you', 'send', 'reverb']);
  const unity = positionOf(send.spec, 1);
  const drawn = knobHtml('rev', send).text;
  assert.match(
    drawn,
    /^<div class="knob" data-knob="you\/send\/reverb" data-set="you\/send\/reverb" title="drag up or down/,
  );
  assert.match(
    drawn,
    new RegExp(`<span>rev</span><i class="" style="--v:${unity};--unity:${unity}"></i><b>0\\.0</b></div>$`),
    'a gain at unity: its bar up to its mark, its text 0.0 dB',
  );
  assert.match(knobHtml('pan', views.control(['you', 'pan'])).text, /<i class="pan" style="--v:0.25"><\/i><b>L25<\/b>/);
  const automated = viewsOn({ roles: { 'you/pan': { by: 'automated' } } }).control(['you', 'pan']);
  assert.doesNotMatch(knobHtml('pan', automated).text, /data-set/, 'not live: no mark');
  const still = stillPanHtml().text;
  assert.match(still, /<i class="pan" style="--v:0.5"><\/i><b>C<\/b>/, 'at its middle');
  assert.doesNotMatch(still, /data-/, 'marked with no address: nothing to set');
});

test('a fader drawn upright, its unity marked; a level bar by the meter law, red at full scale', () => {
  const volume = viewsOn({ values: { 'you/volume': 0.5 } }).control(['you', 'volume']);
  assert.match(
    faderHtml(volume).text,
    new RegExp(`^<div class="fader" style="--unity:${positionOf(volume.spec, 1)}" data-set="you/volume"`),
  );
  assert.match(faderHtml(volume).text, new RegExp(`<i style="--v:${volume.position}"></i></div>$`));
  assert.match(meterHtml('you', 0.5).text, /class="meter"/);
  assert.match(meterHtml('you', 1).text, /class="meter over"/);
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
    /<div class="controls" data-own="tap\/utility"><canvas class="history"><\/canvas><div class="knob" data-knob="tap\/utility\/level" data-set="tap\/utility\/level" title="level!"><span>level \(dB\)<\/span>/,
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
  const devicesOn = (by) => new ViewBuilder(planReadoutOf(room, { roles: { length: { by } } }), () => {}).device([]);
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
  return new ViewBuilder(planReadoutOf(ECHO, { values }), () => {}).device([]);
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
