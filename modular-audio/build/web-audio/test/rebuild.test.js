// What's built built again (mockup/src/libs/modular-audio/build/web-audio), on the stand-in for Web Audio:
//   - the new beside the old, the inputs moved over to it, the old let go once it has rung out;
//   - the old faded where it makes sound of its own, the new faded in; one only processing left to ring out;
//   - the values told and the copies added kept; a preset changing a setting, built again with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into, outOf } from './audio-stand-in.js';
import { CROSSFADE, RING_OUT, WebAudioBuilder } from '../index.ts';
import { blockNode, builtOn, composite } from './blocks.js';
import { SYNTH, UTILITY } from '../../../plan/format/test/plans.ts';

// a sound of its own: an oscillator into a gain, out
const TONE = {
  version: 1,
  node: composite('tone', [blockNode('osc', 'oscillator'), blockNode('level', 'gain')], {
    kind: 'Tone',
    outputs: [{ name: 'out', channels: 1 }],
    wires: [
      { from: { node: 'osc', output: 'out' }, to: { node: 'level', input: 'in' } },
      { from: { node: 'level', output: 'out' }, to: { output: 'out' } },
    ],
  }),
};

test('what only processes sound built again: its input moved over to the new, the old left to ring out, unfaded, let go once it has', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { context, source, what, made } = builtOn(UTILITY, { from: 'in' });
  const [oldGain] = made('gain');
  const [oldPan] = made('panner');
  what.rebuild(UTILITY);
  const [, newGain] = made('gain');
  const [, newPan] = made('panner');
  assert.deepEqual(outOf(context, source), [newGain], 'its input moved over');
  assert.deepEqual(into(context, context.destination), [oldPan, newPan], 'both heard while the old rings out, unfaded');
  t.mock.timers.tick(RING_OUT - 1);
  assert.ok(!context.rec.disconnects.includes(oldGain), 'still ringing');
  t.mock.timers.tick(1);
  assert.ok(
    [oldGain, oldPan].every((node) => context.rec.disconnects.includes(node)),
    'let go once it has rung out',
  );
  assert.ok(!context.rec.disconnects.includes(newPan), 'the new kept');
});

test('what makes sound of its own built again: the old faded out, the new faded in, over the crossfade; its oscillator stopped once faded, let go once it has rung out', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { context, what, made } = builtOn(TONE, { from: 'in' });
  const [oldOsc] = made('oscillator');
  const [oldLevel] = made('gain');
  what.rebuild(TONE);
  const [fadeOut] = outOf(context, oldLevel);
  assert.deepEqual(
    fadeOut.gain.events,
    [
      ['set', 1, 4],
      ['linear', 0, 4 + CROSSFADE],
    ],
    'the old faded out',
  );
  const [, newLevel] = made('gain').filter((node) => node !== fadeOut);
  const [fadeIn] = outOf(context, newLevel);
  assert.deepEqual(
    fadeIn.gain.events,
    [
      ['set', 0, 4],
      ['linear', 1, 4 + CROSSFADE],
    ],
    'the new faded in',
  );
  assert.deepEqual(into(context, context.destination), [fadeOut, fadeIn]);
  assert.deepEqual(oldOsc.stops, [[4 + CROSSFADE]], 'stopped once faded');
  t.mock.timers.tick(RING_OUT);
  assert.ok(
    oldOsc.stops.every(([at = 4]) => at <= 4 + CROSSFADE),
    'taken apart: never stopped later than its fade',
  );
  assert.ok(context.rec.disconnects.includes(fadeOut), 'its fade let go with it');
  assert.ok(!context.rec.disconnects.includes(fadeIn), 'the new kept');
});

test('built again twice: the second fades out what the first faded in through the fade it came in by, the generation and its copies alike', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let now = 4;
  const context = new StandInContext(() => now);
  const what = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(TONE, {
    into: context.destination,
  });
  what.rebuild(TONE);
  const [, fadeIn] = into(context, context.destination);
  now = 5;
  what.rebuild(TONE);
  assert.deepEqual(
    fadeIn.gain.events,
    [
      ['set', 0, 4],
      ['linear', 1, 4 + CROSSFADE],
      ['set', 1, 5],
      ['linear', 0, 5 + CROSSFADE],
    ],
    'faded out by the fade it came in by',
  );
  const copied = builtOn(SYNTH, { from: 'in' });
  const destination = copied.context.createGain();
  copied.what.add(['voice', '1'], 3.5, destination);
  copied.what.rebuild(SYNTH);
  const [, copyIn] = into(copied.context, destination);
  copied.what.rebuild(SYNTH);
  assert.deepEqual(copyIn.gain.events.at(-1), ['linear', 0, 4 + CROSSFADE], "a copy's too");
  assert.equal(into(copied.context, destination).length, 3, 'each generation by its own fade');
});

test('what was told kept as it was built again: the values set, a macro by its own address, the copies added', () => {
  const effect = builtOn(UTILITY, { from: 'in' });
  effect.what.set(['level'], 0.3);
  effect.what.rebuild(UTILITY);
  assert.deepEqual(effect.made('gain').at(-1).gain.events.at(-1), ['set', 0.3, 4], "the level's, onto the new gain");
  const instrument = builtOn(SYNTH, { from: 'in' });
  instrument.what.add(['voice', '2']);
  instrument.what.set(['voice', '2', 'oscillator', 'frequency'], 330);
  instrument.what.rebuild(SYNTH);
  const [, newOsc] = instrument.made('oscillator');
  assert.deepEqual(newOsc.frequency.events.at(-1), ['set', 330, 4], 'voice 2 added again, its frequency as told');
  instrument.what.letGo(['voice', '2']);
  instrument.what.rebuild(SYNTH);
  assert.equal(instrument.made('oscillator').length, 2, 'a voice let go not added again, what it was told forgotten');
});

test('a copy added at its time, built again: added again at that time, its sources started then, as its note did', () => {
  const instrument = builtOn(SYNTH, { from: 'in' });
  instrument.what.add(['voice', '1'], 3.5);
  instrument.what.add(['voice', '2']);
  instrument.what.rebuild(SYNTH);
  const [, , again, againNow] = instrument.made('oscillator');
  assert.deepEqual([again.starts, againNow.starts], [[[3.5]], [[]]], 'at its time; one added now, now');
});

test('a copy with a destination of its own, built again: added again into it, the old faded out and the new in there', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { context, what, made } = builtOn(SYNTH, { from: 'in' });
  const destination = context.createGain();
  what.add(['voice', '1'], 3.5, destination);
  const [oldVca] = outOf(context, made('oscillator')[0]);
  what.rebuild(SYNTH);
  const [fadeOut, fadeIn] = into(context, destination);
  assert.deepEqual(
    fadeOut.gain.events,
    [
      ['set', 1, 4],
      ['linear', 0, 4 + CROSSFADE],
    ],
    'the old faded out where it sounds',
  );
  assert.deepEqual(
    fadeIn.gain.events,
    [
      ['set', 0, 4],
      ['linear', 1, 4 + CROSSFADE],
    ],
    'the new faded in',
  );
  assert.deepEqual(outOf(context, oldVca), [fadeOut], 'the old copy into its fade');
  const [newVca] = outOf(context, made('oscillator')[1]);
  assert.deepEqual(outOf(context, newVca), [fadeIn], 'the new copy into its fade');
  assert.deepEqual(made('oscillator')[1].starts, [[3.5]], 'added again at its time');
  t.mock.timers.tick(RING_OUT);
  assert.ok(context.rec.disconnects.includes(fadeOut), 'the old fade let go with it');
  assert.ok(!context.rec.disconnects.includes(fadeIn), 'the new kept');
});

test('a preset that changes a setting: built again with it, its values set on the new; one that keeps it, passed over', () => {
  const { what, made } = builtOn(UTILITY, { from: 'in' });
  what.preset({ 'pan/pan': 0.5 }, { 'pan/law': 'pan pot' });
  const [, newPan] = made('panner');
  assert.ok(newPan, 'built again');
  assert.equal(newPan.channelCountMode === 'explicit', false, 'a pan pot');
  assert.deepEqual(newPan.pan.events.at(-1), ['set', 0.5, 4]);
  what.preset({}, { 'pan/law': 'pan pot' });
  assert.equal(made('panner').length, 2, 'kept: not built again');
});

test('a meter on what was built before a rebuild made again on the new as it is read, the old one forgotten', () => {
  const { context, what } = builtOn(UTILITY, { from: 'in' });
  const splitters = () => context.rec.nodes.filter((node) => node.kind === 'splitter');
  what.peak([]);
  what.rebuild(UTILITY);
  what.peak([]);
  assert.equal(splitters().length, 2, 'a meter on the new');
  const [, onTheNew] = splitters();
  assert.notDeepEqual(into(context, onTheNew), into(context, splitters()[0]), 'on the new output, not the old');
});

test("what's fed into what's built, and its ways in, fed into what's built anew: the old let go of, the new fed", () => {
  const { context, what, made } = builtOn(UTILITY, { from: 'in' });
  const fed = context.createGain();
  what.feed([], fed);
  const way = what.wayInto([]);
  const [gainBefore] = made('gain').filter((node) => node !== fed && node !== way);
  assert.deepEqual(outOf(context, fed), [gainBefore], 'fed into the Utility');
  what.rebuild(UTILITY);
  const gainAfter = made('gain').filter((node) => node !== fed && node !== way && node !== gainBefore)[0];
  assert.deepEqual(outOf(context, fed), [gainAfter], 'into the new, not the old');
  assert.deepEqual(outOf(context, way), [gainAfter], 'its way in too');
});
