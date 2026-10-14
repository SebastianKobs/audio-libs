// The routing's unit tests (mockup/src/libs/mixer, its test/ folder since X3b), on routings written by hand, no signal: where a desk's
// strips go, for signals of any kind; their ways out and sends, checked as they come on the desk, a way out moved and never into a loop,
// and which strips a mute and a solo silence. How the mixer wires what it says is the mixer's (mockup/test/unit/mixer.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Routing } from '../index.ts';

test("a strip's way out only to the master or a bus on the desk, the master if none is given; a send only to a return on it", () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('sings', { kind: 'bus', to: ['reverb'] });
  routing.add('tap', { kind: 'channel', out: 'sings', to: ['reverb'] });
  assert.deepEqual(
    ['reverb', 'sings', 'tap'].map((name) => [routing.outOf(name), routing.sentTo(name)]),
    [
      ['master', []],
      ['master', ['reverb']],
      ['sings', ['reverb']],
    ],
  );
  assert.throws(
    () => routing.add('x', { kind: 'channel', out: 'tap' }),
    /not on the desk as a bus: tap/,
    'out into a channel',
  );
  assert.throws(() => routing.add('x', { kind: 'channel', out: 'nowhere' }), /not on the desk as a bus: nowhere/);
  assert.throws(
    () => routing.add('x', { kind: 'channel', to: ['sings'] }),
    /not on the desk as a return: sings/,
    'a send to a bus',
  );
  assert.throws(() => routing.outOf('x'), /not on the desk: x/, 'none of them put on it');
});

test("route(): a strip's way out moved, to the master or a bus, never into what feeds it, through a way out or a send", () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('background', { kind: 'bus', to: ['reverb'] });
  routing.add('a', { kind: 'channel' });
  routing.route('a', 'background');
  assert.equal(routing.outOf('a'), 'background');
  routing.route('a', 'master');
  assert.equal(routing.outOf('a'), 'master');
  assert.throws(() => routing.route('a', 'nowhere'), /not on the desk as a bus: nowhere/);
  assert.throws(() => routing.route('nobody', 'master'), /not on the desk: nobody/);
  routing.add('x', { kind: 'bus' });
  routing.add('y', { kind: 'bus', out: 'x' });
  assert.throws(() => routing.route('x', 'y'), /a loop: y feeds x/, 'out into what feeds it');
  assert.throws(() => routing.route('x', 'x'), /a loop: x feeds x/, 'out into itself');
  routing.add('f', { kind: 'return', out: 'x' });
  routing.route('y', 'master');
  routing.add('w', { kind: 'bus', to: ['f'] });
  assert.throws(() => routing.route('x', 'w'), /a loop: w feeds x/, 'through a send too');
  assert.equal(routing.outOf('x'), 'master', 'a way out refused stays where it was');
});

test("solo, as Ableton's: what a soloed strip needs to be heard stays, its way out and what feeds a soloed bus; returns are never silenced by it", () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('sings', { kind: 'bus' });
  routing.add('you', { kind: 'bus' });
  routing.add('tap', { kind: 'channel', out: 'you' });
  routing.add('replay tap 1', { kind: 'channel', out: 'sings' });
  routing.add('replay vine 1', { kind: 'channel', out: 'sings' });
  routing.add('ambient', { kind: 'bus' });
  routing.add('background 1', { kind: 'channel', out: 'ambient' });
  const quiet = (muted = [], soloed = []) => [...routing.silenced(new Set(muted), new Set(soloed))].sort();
  assert.deepEqual(quiet(), [], 'nothing muted, nothing soloed');
  assert.deepEqual(quiet(['tap']), ['tap'], 'a mute, alone');
  assert.deepEqual(
    quiet([], ['replay tap 1']),
    ['ambient', 'background 1', 'replay vine 1', 'tap', 'you'],
    "a replay track soloed: its bus stays, so it's heard; the reverb stays",
  );
  assert.deepEqual(
    quiet([], ['sings']),
    ['ambient', 'background 1', 'tap', 'you'],
    'a bus soloed: what feeds it stays',
  );
  assert.deepEqual(quiet([], ['replay tap 1', 'background 1']), ['replay vine 1', 'tap', 'you'], 'two soloed');
  assert.deepEqual(
    quiet(['sings'], ['replay tap 1']),
    ['ambient', 'background 1', 'replay vine 1', 'sings', 'tap', 'you'],
    "a mute wins over a solo's way out",
  );
});

test('has() and kindOf(): whether a strip is on the desk, and what it is; the master is where they end, not one of them (Z3)', () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('sings', { kind: 'bus', to: ['reverb'] });
  assert.deepEqual(
    ['reverb', 'sings', 'tap', 'master'].map((name) => routing.has(name)),
    [true, true, false, false],
  );
  assert.deepEqual(
    ['reverb', 'sings'].map((name) => routing.kindOf(name)),
    ['return', 'bus'],
  );
  assert.throws(() => routing.kindOf('tap'), /not on the desk: tap/);
});

test("reached(): everything the strips named feed, through each one's way out and the sends let through, on to the master, which isn't one of them; a name not on the desk kept, not followed (Z3)", () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('delay', { kind: 'return', to: ['reverb'] });
  routing.add('sings', { kind: 'bus', to: ['reverb'] });
  routing.add('you', { kind: 'bus', to: ['reverb', 'delay'] });
  routing.add('tap', { kind: 'channel', out: 'you', to: ['reverb'] });
  routing.add('vine', { kind: 'channel', out: 'sings' });
  const sorted = (names) => [...names].sort();
  assert.deepEqual(sorted(routing.reached(['tap'])), ['delay', 'reverb', 'tap', 'you'], 'every send, with none to say');
  assert.deepEqual(
    sorted(routing.reached(['tap'], (from, to) => from === 'you' && to === 'delay')),
    ['delay', 'tap', 'you'],
    'only the sends let through: the delay feeds the reverb, but not by a send let through',
  );
  assert.deepEqual(
    sorted(routing.reached(['clips tap', 'vine'], () => false)),
    ['clips tap', 'sings', 'vine'],
    'a name not on the desk kept, not followed',
  );
});

// A send added to a strip once it's on the desk, as a desk's send knob turned up for the first time (U1).
test('send(): a send added later, only to a return on the desk, never into what feeds the strip; listed once; followed as any send', () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('delay', { kind: 'return', to: ['reverb'] });
  routing.add('tap', { kind: 'channel' });
  routing.send('tap', 'delay');
  routing.send('tap', 'delay');
  assert.deepEqual(routing.sentTo('tap'), ['delay'], 'listed once');
  assert.deepEqual([...routing.reached(['tap'])].sort(), ['delay', 'reverb', 'tap'], 'followed');
  assert.throws(() => routing.send('tap', 'nowhere'), /not on the desk as a return: nowhere/);
  assert.throws(() => routing.send('nobody', 'reverb'), /not on the desk: nobody/);
  assert.throws(() => routing.send('reverb', 'delay'), /a loop: delay feeds reverb/, 'a return into one that feeds it');
  assert.deepEqual(routing.sentTo('reverb'), [], 'a send refused is not added');
});

test('returnsFor(): the returns a strip can reach, as its send knobs: those on the desk before it, in their order, none that feeds it (U2b)', () => {
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('far reverb', { kind: 'return', to: ['reverb'] });
  routing.add('sings', { kind: 'bus' });
  routing.add('delay', { kind: 'return', out: 'sings', to: ['reverb'] });
  routing.add('you', { kind: 'bus' });
  assert.deepEqual(
    routing.returnsFor('you'),
    ['reverb', 'far reverb', 'delay'],
    'every return before it, in their order',
  );
  assert.deepEqual(routing.returnsFor('sings'), ['reverb', 'far reverb'], 'the delay after it, and feeding it');
  assert.deepEqual(routing.returnsFor('delay'), ['reverb', 'far reverb'], 'a return: those before it');
  assert.deepEqual(routing.returnsFor('reverb'), [], 'the first return: none');
  routing.route('far reverb', 'sings');
  assert.deepEqual(routing.returnsFor('sings'), ['reverb'], 'one routed into it since: none that feeds it');
  assert.throws(() => routing.returnsFor('nobody'), /not on the desk: nobody/);
});
