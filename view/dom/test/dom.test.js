// The view models drawn (mockup/src/libs/view/dom), as HTML, in node, on the models' small desk (libs/view/models/test/desk.js):
//   - a knob: its label, its bar by its taper, a gain's unity marked, a pan's from its middle, its text; a live one
//     marked with its address; a pan that does nothing;
//   - a fader, its unity marked; a level bar, red at full scale;
//   - a strip: its name, where it goes, its slots, its knobs, its fader, bar and value, its mute and solo; quiet
//     where it's silent; the master's without mute and solo, its pan still;
//   - every value escaped as it's made.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faderHtml, html, knobHtml, meterHtml, stillPanHtml, stripHtml } from '../index.ts';
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
    `<div class="knob" data-set="you/send/reverb" title="drag up or down to set it, with shift for finer steps; double-click: back to where it started"><span>rev</span><i class="" style="--v:${unity};--unity:${unity}"></i><b>0.0</b></div>`,
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
    opens: html` data-open="master:"`,
  }).text;
  assert.match(master, /^<div class="track"><div class="name" data-open="master:">master<\/div>/);
  assert.match(
    master,
    /<div class="slot" data-open="master:" data-mark="0">Limiter<small>gain, ceiling<\/small><\/div>/,
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

test('every value escaped as it is made', () => {
  const views = viewsOn();
  const text = stripHtml(views.strip(['ambient']), { ...LOOK, name: '<b>&"' }).text;
  assert.match(text, /<div class="name">&#60;b&#62;&#38;&#34;<\/div>/);
});
