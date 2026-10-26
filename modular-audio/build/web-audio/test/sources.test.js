// Sources in Web Audio, started and stopped at their times (mockup/src/libs/modular-audio/build/web-audio), on the stand-in:
//   - a plan's sources started as it's built; a pool's copy's at the time it's added, a free
//     oscillator's as it's built, running free;
//   - a source's stop, its stop after it starts, 0 none; changed once started, moved;
//   - a copy stopped by a time, as it's gone silent: each of its sources then, none later than its own stop;
//   - a noise looped where it says, its buffer by its color, started drawn into it up to its offset;
//   - an oscillator's rate synced: its note at the beat, in Hz, a new tempo followed; free, its
//     frequency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into } from './audio-stand-in.js';
import { Buffers, WebAudioBuilder } from '../index.ts';
import { blockNode, builtOn, instrumentOf, oneBlockPlan } from './blocks.js';

test("a plan's sources started as it's built; a pool's copy's at the time it's added, a free oscillator's as it's built", () => {
  const tone = builtOn(oneBlockPlan('oscillator'));
  assert.deepEqual(tone.made('oscillator')[0].starts, [[]], 'now: told no time');
  const { what, made } = builtOn(
    instrumentOf(blockNode('tone', 'oscillator'), blockNode('lfo', 'oscillator', {}, { phase: 'free' })),
  );
  what.add(['voice', '1'], 6);
  what.add(['voice', '2']);
  assert.deepEqual(
    made('oscillator').map((oscillator) => oscillator.starts),
    [[[6]], [[]], [[]], [[]]],
    "the tone at its voice's time, now where none; the LFO as it's built",
  );
});

test("a source's stop: stopped its stop after it starts, 0 none; changed once started, moved", () => {
  const { what, made } = builtOn(instrumentOf(blockNode('tone', 'oscillator', { stop: 0.5 })));
  what.add(['voice', '1'], 6);
  what.add(['voice', '2'], 6);
  what.set(['voice', '2', 'tone', 'stop'], 0, { at: 6 });
  const [first, second] = made('oscillator');
  assert.deepEqual([first.stops, second.stops], [[[6.5]], [[6.5]]], 'a stop of 0 takes none back');
  what.set(['voice', '1', 'tone', 'stop'], 1, { at: 6.25 });
  assert.deepEqual(first.stops.at(-1), [7], 'moved');
  const held = builtOn(instrumentOf(blockNode('tone', 'oscillator')));
  held.what.add(['voice', '1'], 6);
  assert.deepEqual(held.made('oscillator')[0].stops, [], 'none: playing until its voice is let go');
});

test("a copy stopped by a time, as it's gone silent: each of its sources then, none later than its own stop; its own stop moved, still no later", () => {
  const { what, made } = builtOn(
    instrumentOf(
      blockNode('tone', 'oscillator'),
      blockNode('click', 'oscillator', { stop: 0.25 }),
      blockNode('env', 'envelope'),
    ),
  );
  what.add(['voice', '1'], 6);
  what.add(['voice', '2'], 6);
  what.stopBy(['voice', '1'], 7);
  const [tone, click, , otherClick] = made('oscillator');
  const [env] = made('constant');
  assert.deepEqual([tone.stops.at(-1), env.stops.at(-1)], [[7], [7]], 'each source then');
  assert.deepEqual(click.stops.at(-1), [6.25], 'its own stop sooner, kept');
  assert.deepEqual(otherClick.stops, [[6.25]], 'the other copy left alone');
  what.set(['voice', '1', 'click', 'stop'], 2, { at: 6 });
  assert.deepEqual(click.stops.at(-1), [7], 'its own stop moved past it: still stopped by then');
  assert.throws(() => what.stopBy(['voice', '3'], 7), /voice\/3: not added/);
});

test('a noise looped where it says, its buffer by its color; started drawn into its buffer up to its offset', () => {
  const { context: heard, made } = builtOn(oneBlockPlan('noise', { offset: 1.5 }, { loop: 'on', color: 'breath' }));
  const [hiss] = made('buffer');
  assert.deepEqual([hiss.loop, hiss.buffer.duration, hiss.starts], [true, 0.2, [[4, 0.75]]]);
  assert.deepEqual(into(heard, heard.destination), [hiss], 'a source with nothing wired into it');
  const context = new StandInContext(() => 4);
  const draws = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, draws: () => 0.25 });
  draws.build(oneBlockPlan('noise', { offset: 1.5 }), { into: context.destination });
  const [drawn] = context.rec.nodes.filter((node) => node.kind === 'buffer');
  assert.deepEqual(drawn.starts, [[4, 0.375]], 'its draws from a generator of their own, given');
  const once = builtOn(oneBlockPlan('noise'));
  assert.deepEqual([once.made('buffer')[0].loop, once.made('buffer')[0].starts], [false, [[]]]);
});

test("a noise's buffer shared by builders in one context, each its own draws: made once, by the buffers they're handed", () => {
  const context = new StandInContext(() => 4);
  const buffers = new Buffers(context, () => 0.5);
  const builder = (draws) => new WebAudioBuilder({ context, beat: () => 0.5, buffers, draws });
  builder(() => 0.25).build(oneBlockPlan('noise', { offset: 1.5 }), { into: context.destination });
  builder(() => 0.5).build(oneBlockPlan('noise', { offset: 1.5 }), { into: context.destination });
  const [one, other] = context.rec.nodes.filter((node) => node.kind === 'buffer');
  assert.equal(one.buffer, other.buffer, 'one buffer');
  assert.deepEqual([one.starts, other.starts], [[[4, 0.375]], [[4, 0.75]]], 'each its own draws');
});

test("an oscillator's rate synced: its note at the beat, in Hz, a new tempo followed; free, its frequency", () => {
  const synced = builtOn(oneBlockPlan('oscillator', { sync: 1, note: '1/4' }));
  const [lfo] = synced.made('oscillator');
  assert.equal(lfo.frequency.value, 2, 'a beat of 0.5 s: twice a second');
  synced.what.tempo(0.25, { at: 5 });
  assert.deepEqual(lfo.frequency.events.at(-1), ['set', 4, 5]);
  const free = builtOn(oneBlockPlan('oscillator', { frequency: 220 }));
  const [tone] = free.made('oscillator');
  assert.equal(tone.frequency.value, 220);
  free.what.set(['frequency'], 330, { glide: 0.1 });
  assert.deepEqual(tone.frequency.events.at(-1), ['target', 330, 4, 0.1]);
  free.what.tempo(0.25, { at: 5 });
  assert.deepEqual(tone.frequency.events.at(-1), ['target', 330, 4, 0.1], 'free: a new tempo leaves it');
});
