// The mixer view's parts that need no page (mockup/src/libs/view/dom/mixer-view.ts), in node, on the models' small
// desk (libs/view/models/test/desk.js):
//   - the desk's own channels drawn: its buses, a bus with those that go into it in a group's box; its returns;
//     its master; each strip opening its devices by its address, its sends labelled by their returns' short labels;
//   - a track's strip drawn: the name it's handed, what plays on it, empty while it plays nothing;
//   - what the strips heard feed: their ways out, and the sends turned up;
//   - each strip's level, falling as a peak meter's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskHtml, fedBy, trackHtml } from '../index.ts';
import { MixerViewBuilder } from '../../models/index.ts';
import { addressText } from '../../../plan/format/index.ts';
import { STUDIO } from '../../models/test/desk.js';

// the small desk's view models, its values and roles by address, live unless said
function viewsOn({ values = {}, roles = {}, copies = {} } = {}) {
  return new MixerViewBuilder(
    {
      plan: STUDIO,
      valueOf: (address) => values[addressText(address)],
      startOf: () => undefined,
      roleOf: (address) => roles[addressText(address)] ?? { by: 'live' },
      peakOf: () => 0,
      readingOf: () => 0,
      copiesOf: (pool) => (copies[addressText(pool)] ?? []).map((number) => [...pool, String(number)]),
      slotOf: () => undefined,
    },
    () => {},
  );
}
const NO_LEVEL = () => 0;

test("the desk's own channels drawn: its buses, a bus with those that go into it in a group's box, one alone as it is; its returns; its master; each opening its devices by its address", () => {
  const { buses, returns, master } = deskHtml(viewsOn(), NO_LEVEL);
  assert.match(
    buses.text,
    /^<div class="kind you"><div class="track"[^>]*><div class="name" data-open="you" data-title="my playing">my playing<\/div>/,
  );
  assert.match(buses.text, /data-open="tap" data-title="my tap">my tap<\/div><div class="route">to my playing<\/div>/);
  assert.match(
    buses.text,
    /<\/div><div class="track"[^>]*><div class="name" data-open="ambient" data-title="background">/,
    'background alone, no box',
  );
  assert.match(
    returns.text,
    /^<div class="track"[^>]*><div class="name" data-open="reverb" data-title="reverb">reverb<\/div><div class="route">to master<\/div>/,
  );
  assert.match(master.text, /data-open="master" data-title="master">master<\/div><div class="route">out<\/div>/);
});

test("a send's knob labelled by its return's short label; each strip's level bar at its level", () => {
  const { buses } = deskHtml(viewsOn(), (key) => (key === 'you' ? 1 : 0));
  assert.match(buses.text, /data-knob="you\/send\/reverb"[^>]*><span>rev<\/span>/);
  assert.match(buses.text, /<i class="meter over" data-meter="you"/, 'at full scale');
  assert.match(buses.text, /<i class="meter" data-meter="tap"/);
});

test("a track's strip drawn: the name it's handed, what plays on it, its cell lit while it sounds, dimmed while it waits; empty while it plays nothing, but where it's set live", () => {
  const roles = { 'my tap/1/volume': { by: 'automated', source: 'notes' } };
  const views = viewsOn({ roles, copies: { 'my tap': [1] } });
  const track = { address: ['my tap', '1'], name: 'flowers 1', now: { text: 'flower 3', lit: true, waiting: false } };
  const playing = trackHtml(views, { ...track, playing: true }, NO_LEVEL).text;
  assert.match(
    playing,
    /data-open="my tap\/1" data-title="flowers 1">flowers 1<\/div><div class="route">to my tap<\/div><div class="cell lit">flower 3<\/div>/,
  );
  assert.doesNotMatch(playing, /—/, 'its values shown');
  const waiting = { ...track, now: { text: 'flower 3', lit: false, waiting: true }, playing: true };
  assert.match(trackHtml(views, waiting, NO_LEVEL).text, /<div class="cell waiting">flower 3<\/div>/);
  assert.match(trackHtml(views, { ...track, playing: false }, NO_LEVEL).text, /<b class="val">—<\/b>/, 'empty');
  const live = viewsOn({ copies: { 'my tap': [1] } });
  assert.doesNotMatch(
    trackHtml(live, { ...track, playing: false }, NO_LEVEL).text,
    /<b class="val">—<\/b>/,
    'set live: never empty',
  );
});

test('what the strips heard feed, for the lights: each through its way out, and through a send only while it is turned up; the master left out', () => {
  const up = viewsOn({ values: { 'you/send/reverb': 0.5 } });
  assert.deepEqual([...fedBy(up, new Set(['tap']))].sort(), ['reverb', 'tap', 'you']);
  assert.deepEqual([...fedBy(viewsOn(), new Set(['tap']))].sort(), ['tap', 'you'], 'its send down');
  assert.deepEqual([...fedBy(viewsOn(), new Set(['clips tap']))], ['clips tap'], 'a name not on the desk kept');
});
