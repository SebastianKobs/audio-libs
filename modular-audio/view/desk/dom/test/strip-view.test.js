// The view models drawn (libs/modular-audio/view/desk/dom), as HTML, in node, on the models' small desk (libs/modular-audio/view/desk/models/test/desk.js):
//   - a strip: its name, where it goes, its slots, its knobs, its fader, bar and value, its mute and solo; quiet
//     where it's silent; the master's without mute and solo, its pan still.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripHtml } from '../index.ts';
import { html } from '../../../../../base/html/index.ts';
import { DeskViewBuilder } from '../../models/index.ts';
import { studioReadout } from '../../models/test/desk.js';

const LOOK = { route: 'to master', sendLabel: (to) => `${to}!`, level: 0.5 };

// the small desk's view models, its values and roles by address, live unless said; the slots' words by address
function viewsOn(readout = {}) {
  return new DeskViewBuilder(studioReadout(readout), () => {});
}

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
