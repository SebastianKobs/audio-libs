// The mixer's unit tests (mockup/src/libs/web-audio-mixer/, its test/ folder since X4; mockup/architecture/mixer-and-fx.md), on the engine
// (libs/web-audio-engine/) and its stand-in for Web Audio, whose time is set by each test. What the garden builds with them is held to the
// recordings (mockup/test/unit/instruments.test.js); these are their parts on their own; the routing's on its own in libs/mixer/
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into, outOf } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { FxChain, RING_OUT } from '../../web-audio-fx/index.ts';
import { Mixer } from '../index.ts';
import { Routing } from '../../mixer/index.ts';

let time = 0;
class Context extends StandInContext {
  constructor(opts) {
    super(() => time);
    Context.opts = opts;
  }
}
const engine = (more = {}) => {
  time = 10;
  return new Engine({ AudioContext: Context, ...more });
};
const beat = 60 / 72; // a beat at 72 BPM, for an FX chain's context

test('the mixer: the sum into the master and the master to the output, the master fading in from 0, never at full volume; an insert on the master between them', () => {
  const e = engine();
  const m = new Mixer(e, { volume: 0.6 });
  assert.deepEqual(into(e.audioContext, m.master), [m.sum], 'with none, the sum into the master');
  assert.deepEqual(into(e.audioContext, e.audioContext.destination), [m.master]);
  assert.deepEqual(m.master.gain.events, [
    ['value', 0],
    ['target', 0.6, 10, 0.25],
  ]);
  assert.deepEqual(m.sum.gain.events, [['value', 1]], 'the sum built by the engine from the Gain module, at 1 (F5b)');
  const other = engine();
  const ac = other.audioContext;
  const insert = { input: ac.createGain(), output: ac.createGain() };
  const n = new Mixer(other, { master: insert });
  assert.deepEqual(
    [insert.input, n.master].map((node) => into(ac, node)),
    [[n.sum], [insert.output]],
    'the sum through its insert, a limiter the caller built, into the master',
  );
});

test("the master's insert's readings by name, what its limiter takes away in dB, and its points, read as peaks; with none, or one it doesn't offer, 0 (U2c5c)", () => {
  const e = engine();
  const ac = e.audioContext;
  assert.equal(new Mixer(e).reading('limiter reduction'), 0, 'no insert: nothing taken away');
  const [after, out] = [ac.createGain(), ac.createGain()];
  const insert = {
    input: ac.createGain(),
    output: out,
    points: { 'limiter in': after, 'limiter out': out },
    readings: { 'limiter reduction': () => 4.5 },
  };
  const m = new Mixer(e, { master: insert });
  assert.equal(m.reading('limiter reduction'), 4.5, 'what its limiter takes away');
  assert.equal(m.reading('limiter lookahead'), 0, "one it doesn't offer");
  m.peak('limiter in');
  m.peak('limiter out');
  assert.ok(
    ac.rec.edges.some((x) => x.from === after && x.to.kind === 'splitter'),
    'in: where it says, after its gain',
  );
  assert.ok(
    ac.rec.edges.some((x) => x.from === out && x.to.kind === 'splitter'),
    'out: after it, before the master volume',
  );
});

test("a channel's input, fader, pan and sends, each built by the engine from the Gain or the Pan module (F5c); with no stereo panner, no pan", () => {
  const e = engine();
  const m = new Mixer(e);
  m.fx('reverb', {});
  const c = m.channel('tap', { volume: 0.7, pan: -0.2, sends: [{ to: 'reverb', amount: 0.3 }] });
  assert.deepEqual(
    [c.input.gain.events, c.fader.gain.events, c.pan.pan.events, c.sends.reverb.gain.events],
    [[['value', 1]], [['value', 0.7]], [['value', -0.2]], [['value', 0.3]]],
    "each written by its module's plan, its input's unity too",
  );
  const unpanned = engine();
  unpanned.audioContext.createStereoPanner = undefined;
  const flat = new Mixer(unpanned).channel('tap', { pan: -0.2 });
  assert.equal(flat.pan, null, 'a context with no stereo panner: none, as before');
  flat.panTo(0.5); // nothing to glide
});

test("an FX channel's input, level, pan, output and sends, each built by the engine from the Gain or the Pan module (F5d); its input into nothing till its chain is built", () => {
  const e = engine();
  const ac = e.audioContext;
  const m = new Mixer(e);
  m.fx('reverb', {});
  const d = m.fx('delay 1', { volume: 0.8, pan: -0.45, sends: [{ to: 'reverb', amount: 0.4 }] });
  assert.deepEqual(
    [d.input.gain.events, d.level.gain.events, d.pan.pan.events, d.output.gain.events, d.sends.reverb.gain.events],
    [[['value', 1]], [['value', 0.8]], [['value', -0.45]], [['value', 1]], [['value', 0.4]]],
    "each written by its module's plan, its input's and output's unity too",
  );
  assert.deepEqual(
    ac.rec.edges.filter((x) => x.from === d.input),
    [],
    'where its sends arrive, into nothing yet: its chain is built between it and its level',
  );
  assert.equal(d.chainOut, d.level, 'with no inserts, its chain into its level');
});

test("the desk's channels: a fader into the sum, or a bus, sent after it to an FX channel; a volume glides it", () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb', { volume: 0.4 });
  const sings = m.bus('sings', { volume: 1 });
  const a = m.channel('tap', { volume: 0.7, sends: ['reverb'] });
  const b = m.channel('ambient', { volume: 0.5 });
  const c = m.channel('late', { out: 'sings' });
  assert.ok(
    into(e.audioContext, m.sum).includes(a.fader)
      && into(e.audioContext, m.sum).includes(b.fader)
      && into(e.audioContext, m.sum).includes(sings.fader),
  );
  assert.deepEqual(into(e.audioContext, a.fader), [a.input], 'in through its mute, at 1');
  assert.deepEqual(into(e.audioContext, sings.input), [c.fader], 'out into a bus');
  assert.deepEqual(into(e.audioContext, r.input), [a.fader], "the send goes to the FX channel's input");
  assert.ok(!into(e.audioContext, r.input).includes(sings.fader) && !into(e.audioContext, r.input).includes(b.fader));
  time = 11;
  a.volume(0.2);
  assert.deepEqual(a.fader.gain.events, [
    ['value', 0.7],
    ['target', 0.2, 11, 0.05],
  ]);
  assert.throws(
    () => m.channel('x', { sends: ['echo'] }),
    /not on the desk as a return: echo/,
    "a send only to what's on the desk already, so no loops",
  );
  assert.throws(() => m.channel('y', { out: 'tap' }), /as a bus: tap/);
});

test('an FX channel: its input, then its level, its pan, and after the pan its sends and its output; the chain goes between input and level', () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb', { volume: 0.6 });
  const sings = m.bus('sings');
  const d = m.fx('delay 1', { volume: 0.8, pan: -0.45, sends: [{ to: 'reverb', amount: 0.4 }], out: 'sings' });
  assert.deepEqual(r.level.gain.events, [['value', 0.6]]);
  assert.deepEqual(into(e.audioContext, r.output), [r.level], 'no pan: its mute after its level');
  assert.ok(into(e.audioContext, m.sum).includes(r.output), 'and out to the master');
  assert.equal(r.pan, null);
  assert.deepEqual(d.level.gain.events, [['value', 0.8]]);
  assert.deepEqual(into(e.audioContext, d.pan), [d.level]);
  assert.deepEqual(d.pan.pan.events, [['value', -0.45]]);
  assert.deepEqual(into(e.audioContext, d.output), [d.pan], 'its mute after its pan');
  assert.deepEqual(into(e.audioContext, d.sends.reverb), [d.output], 'its send after both, so it keeps its panning');
  assert.deepEqual(d.sends.reverb.gain.events, [['value', 0.4]]);
  assert.deepEqual(into(e.audioContext, r.input), [d.sends.reverb]);
  assert.equal(
    d.sendStages.reverb.input,
    d.sends.reverb,
    'its sends handed out as stages, as a channel hands out its own (F6b)',
  );
  assert.deepEqual(into(e.audioContext, sings.input), [d.output], 'out into the bus');
  assert.deepEqual(into(e.audioContext, d.input), [], 'its input: nothing sends to it yet');
  assert.deepEqual(m.fx('c', { pan: 0 }).pan.pan.events, [['value', 0]], 'a pan in the middle is a pan too');
  time = 11;
  d.volume(0.5);
  d.panTo(0.2);
  d.sendTo('reverb', 0.1);
  d.sendTo('nowhere', 1);
  assert.deepEqual(d.level.gain.events.slice(1), [['target', 0.5, 11, 0.05]]);
  assert.deepEqual(d.pan.pan.events.slice(1), [['target', 0.2, 11, 0.05]]);
  assert.deepEqual(
    d.sends.reverb.gain.events.slice(1),
    [['target', 0.1, 11, 0.05]],
    'its level, its pan and a send glide',
  );
});

test('a pan on a channel or bus: a stereo panner after its fader, so a mono sound is as loud in the middle; its way out and its sends after it, so they keep its panning', () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb');
  const you = m.bus('you', { pan: 0, sends: [{ to: 'reverb', amount: 1 }] });
  assert.deepEqual(
    [you.pan.channelCountMode, you.pan.channelCount],
    ['explicit', 2],
    "stereo: a mono sound isn't 3 dB down in the middle",
  );
  assert.deepEqual(into(e.audioContext, you.pan), [you.fader]);
  assert.ok(
    into(e.audioContext, m.sum).includes(you.pan) && !into(e.audioContext, m.sum).includes(you.fader),
    'its way out after it',
  );
  assert.deepEqual(into(e.audioContext, you.sends.reverb), [you.pan], 'a send after the fader, after it too');
  assert.deepEqual(into(e.audioContext, r.input), [you.sends.reverb]);
  time = 11;
  you.panTo(-0.3);
  assert.deepEqual(
    you.pan.pan.events,
    [
      ['value', 0],
      ['target', -0.3, 11, 0.05],
    ],
    'it glides',
  );
  assert.equal(m.channel('a').pan, null, 'none asked for, none');
  assert.equal(m.fx('d', { pan: 0.2 }).pan.channelCountMode, 'explicit', "an FX channel's pan stereo too");
});

test("a meter: a strip's peak after its fader and pan, the louder side; the master's after the limiter; nothing listens until it's first read", () => {
  const e = engine();
  const m = new Mixer(e);
  const tap = m.channel('tap', { pan: -0.5 });
  const dry = m.channel('dry');
  const analysers = () => e.audioContext.rec.nodes.filter((n) => n.kind === 'analyser');
  assert.equal(analysers().length, 0, 'unread: no analyser');
  assert.equal(m.peak('tap'), 0, 'silent');
  const split =
    into(e.audioContext, tap.pan).length
    && e.audioContext.rec.edges.find((x) => x.from === tap.pan && x.to.kind === 'splitter')?.to;
  assert.ok(split, 'after the fader and the pan');
  const [left, right] = [0, 1].map(
    (k) => e.audioContext.rec.edges.find((x) => x.from === split && (x.output ?? 0) === k).to,
  );
  left.samples = [0.1, -0.5, 0.2];
  right.samples = [0.3];
  assert.equal(m.peak('tap'), 0.5, 'the loudest sample, either side');
  assert.equal(analysers().length, 2, 'read again: the same two');
  m.peak('dry');
  assert.ok(
    e.audioContext.rec.edges.some((x) => x.from === dry.fader && x.to.kind === 'splitter'),
    'without a pan: after the fader',
  );
  m.peak('master');
  assert.ok(
    e.audioContext.rec.edges.some((x) => x.from === m.master && x.to.kind === 'splitter'),
    'the master: after the limiter and its volume',
  );
  assert.throws(() => m.peak('echo'), /not on the desk: echo/);
});

// an FX channel's inserts, as a channel's, but after its chain: a Utility after the reverb, as an Ableton chain ends
test("an FX channel's inserts: after its chain, before its level, in order; its chain ends into the first", () => {
  const e = engine();
  const m = new Mixer(e);
  const u = e.audioContext.createGain();
  const v = e.audioContext.createGain();
  const r = m.fx('reverb', {
    inserts: [
      { name: 'utility', input: u, output: u },
      { name: 'more', input: v, output: v },
    ],
  });
  assert.equal(r.chainOut, u, 'its chain into its first insert');
  assert.deepEqual(
    [into(e.audioContext, v), into(e.audioContext, r.level)],
    [[u], [v]],
    'each into the next, the last into its level',
  );
  assert.equal(m.fx('d').chainOut, m.strips.d.level, 'none: its chain into its level');
});

test("a strip's own control by its name, as a desk's remote control has them: its fader's volume, its pan, a send by its return's name (U1)", () => {
  const e = engine();
  const m = new Mixer(e);
  m.fx('reverb');
  const c = m.channel('tap', { volume: 0.7, pan: 0, sends: [{ to: 'reverb', amount: 0.3 }] });
  const r = m.fx('delay', { volume: 0.8, pan: 0, sends: [{ to: 'reverb', amount: 0.2 }] });
  time = 11;
  for (const strip of [c, r]) {
    strip.set('volume', 0.5);
    strip.set('pan', -0.4);
    strip.set('reverb', 0.6);
  }
  assert.deepEqual(
    [c.fader.gain.events.at(-1), c.pan.pan.events.at(-1), c.sends.reverb.gain.events.at(-1)],
    [
      ['target', 0.5, 11, 0.05],
      ['target', -0.4, 11, 0.05],
      ['target', 0.6, 11, 0.05],
    ],
  );
  assert.deepEqual(
    [r.level.gain.events.at(-1), r.pan.pan.events.at(-1), r.sends.reverb.gain.events.at(-1)],
    [
      ['target', 0.5, 11, 0.05],
      ['target', -0.4, 11, 0.05],
      ['target', 0.6, 11, 0.05],
    ],
  );
});

// Every strip has a send to every return on the desk, as Ableton's (U1).
// Built as the strip is made: the sends its setup lists.
// Built once first turned up: the others, after its fader and pan, gliding from 0, routed then.
// An FX channel sends only to returns built before it, so there are no loops.
test("every strip a send to every return on the desk, as Ableton's: those its setup lists built as it's made, the others once first turned up, after its fader and pan, gliding from 0, routed then; an FX channel's only to the returns built before it (U1)", () => {
  const e = engine();
  const m = new Mixer(e);
  const reverb = m.fx('reverb');
  const delay = m.fx('delay', { sends: [{ to: 'reverb', amount: 0.2 }] });
  const c = m.channel('tap', { pan: 0, sends: [{ to: 'reverb', amount: 0.3, from: 'pre' }] });
  assert.deepEqual(c.returns, ['reverb', 'delay'], 'every return on the desk');
  assert.deepEqual(Object.keys(c.sends), ['reverb'], 'built as it was made: the one its setup lists');
  c.sendTo('delay', 0);
  assert.deepEqual(Object.keys(c.sends), ['reverb'], 'still down: nothing built');
  time = 11;
  c.sendTo('delay', 0.5);
  assert.deepEqual(into(e.audioContext, c.sends.delay), [c.tail], 'after its fader and pan');
  assert.deepEqual(
    c.sends.delay.gain.events,
    [
      ['value', 0],
      ['target', 0.5, 11, 0.05],
    ],
    'gliding from 0',
  );
  assert.ok(into(e.audioContext, delay.input).includes(c.sends.delay), 'into the return');
  assert.deepEqual(m.routing.sentTo('tap'), ['reverb', 'delay'], 'routed then');
  assert.deepEqual([reverb.returns, delay.returns], [[], ['reverb']], 'an FX channel: the returns built before it');
  m.fx('far');
  delay.sendTo('far', 0.5);
  assert.equal(delay.sends.far, undefined, 'a return built after it: none');
  const listed = m.channel('listed', { sends: ['reverb'] });
  listed.sendTo('reverb', 0.5);
  assert.deepEqual(Object.keys(listed.sends), [], 'one its setup sends by name, at 1: no second send built');
});

test("a bus with sends, a group: what's routed into it summed, through its fader, sent after it, out to the master", () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb');
  const bg = m.bus('background', { volume: 0.35, sends: ['reverb'] });
  const held = m.channel('held', { out: 'background' });
  const bass = m.channel('bass', { out: 'background' });
  assert.deepEqual(into(e.audioContext, bg.input), [held.fader, bass.fader], 'its tracks into it');
  assert.deepEqual(bg.fader.gain.events, [['value', 0.35]]);
  assert.deepEqual(into(e.audioContext, r.input), [bg.fader], 'sent after its fader');
  assert.ok(
    into(e.audioContext, m.sum).includes(bg.fader) && !into(e.audioContext, m.sum).includes(held.fader),
    'it to the master, its tracks only through it',
  );
});

test("route(): a strip's output moved while it plays, to the master or a bus, and never into a loop", () => {
  const e = engine();
  const m = new Mixer(e);
  m.fx('reverb');
  const sings = m.bus('sings', { sends: ['reverb'] });
  const bg = m.bus('background', { sends: ['reverb'] });
  const a = m.channel('a');
  const d = m.fx('delay', { pan: 0.4, out: 'sings' });
  m.route('a', 'background');
  assert.deepEqual(into(e.audioContext, bg.input), [a.fader], 'into the bus');
  assert.ok(!into(e.audioContext, m.sum).includes(a.fader), 'and no longer into the master');
  m.route('a', 'master');
  assert.ok(
    into(e.audioContext, m.sum).includes(a.fader) && !into(e.audioContext, bg.input).includes(a.fader),
    'and back',
  );
  m.route('delay', 'background');
  assert.deepEqual(into(e.audioContext, bg.input), [d.output], 'an FX channel too, from after its pan and its mute');
  assert.ok(!into(e.audioContext, sings.input).includes(d.output));
  assert.throws(() => m.route('a', 'nowhere'), /not on the desk as a bus: nowhere/);
  m.bus('x');
  m.bus('y', { out: 'x' });
  assert.throws(() => m.route('x', 'y'), /a loop: y feeds x/, 'out into what feeds it');
  m.fx('f', { out: 'x' });
  m.route('y', 'master');
  m.channel('z', { sends: ['f'] });
  m.bus('w', { sends: ['f'] });
  assert.throws(() => m.route('x', 'w'), /a loop: w feeds x/, 'through a send too');
});

test("a channel with inserts: its input through each insert in order, then its fader; a send taken before its fader, after the inserts, or after it; none at an insert's way in", () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb');
  const d = m.fx('delay');
  const lp = e.audioContext.createGain();
  const lvl = e.audioContext.createGain();
  const dull = e.audioContext.createGain(); // stand-ins for an insert's nodes: in, its level, out
  lp.connect(lvl);
  const t = m.channel('track', {
    volume: 0.8,
    inserts: [
      { name: 'dull', input: dull, output: dull },
      { name: 'distance', input: lp, output: lvl },
    ],
    sends: [
      { to: 'reverb', amount: 0.5 },
      { to: 'delay', amount: 0.3, from: 'pre' },
    ],
  });
  assert.deepEqual(into(e.audioContext, dull), [t.input], 'its input into the first insert');
  assert.deepEqual(into(e.audioContext, lp), [dull], 'and on into the next');
  assert.deepEqual(into(e.audioContext, t.fader), [lvl], 'the last into its fader');
  assert.deepEqual(
    t.input.gain.events,
    [['value', 1]],
    'its input passes the sound on: at 1, its Gain module writes it',
  );
  assert.deepEqual(t.fader.gain.events, [['value', 0.8]]);
  assert.deepEqual(into(e.audioContext, t.sends.reverb), [t.fader], 'a send after the fader');
  assert.deepEqual(into(e.audioContext, t.sends.delay), [lvl], 'a send before the fader: after the last insert');
  assert.throws(
    () => m.channel('track 2', { sends: [{ to: 'delay', from: 'distance' }] }),
    /a send is taken pre or post, not from distance: track 2/,
    "none at an insert's way in",
  );
  assert.deepEqual([t.sends.reverb.gain.events, t.sends.delay.gain.events], [[['value', 0.5]], [['value', 0.3]]]);
  assert.deepEqual([into(e.audioContext, r.input), into(e.audioContext, d.input)], [[t.sends.reverb], [t.sends.delay]]);
  time = 11;
  t.sendTo('delay', 0.6);
  t.volume(0.4);
  assert.deepEqual(t.sends.delay.gain.events.slice(1), [['target', 0.6, 11, 0.05]], 'a send glides');
  assert.deepEqual(t.fader.gain.events.slice(1), [['target', 0.4, 11, 0.05]], 'and so does the fader');
  assert.equal(t.faderStage.input, t.fader, 'its fader handed out as a stage, the Gain module it is (F6b)');
  assert.equal(t.sendStages.delay.input, t.sends.delay, 'and each send');
  t.faderStage.set('gain.gain', 0.2, { at: 12 });
  t.sendStages.reverb.set('gain.gain', 0.1, { at: 12 });
  assert.deepEqual(
    [t.fader.gain.events.at(-1), t.sends.reverb.gain.events.at(-1)],
    [
      ['set', 0.2, 12],
      ['set', 0.1, 12],
    ],
    "set at a note's time through them",
  );
});

test('a pre-fader send: taken after the inserts, before the fader, so the fader sets only the dry sound', () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb');
  const dull = e.audioContext.createGain();
  const plain = m.channel('plain', { volume: 0.7, sends: [{ to: 'reverb', amount: 0.4, from: 'pre' }] });
  assert.notEqual(plain.input, plain.fader, 'an input of its own, before the fader');
  assert.deepEqual(into(e.audioContext, plain.fader), [plain.input]);
  assert.deepEqual(into(e.audioContext, plain.sends.reverb), [plain.input], 'from its input');
  const tower = m.channel('tower', {
    inserts: [{ name: 'dull', input: dull, output: dull }],
    sends: [{ to: 'reverb', from: 'pre' }],
  });
  assert.deepEqual(into(e.audioContext, tower.sends.reverb), [dull], 'after its inserts');
  assert.ok(
    into(e.audioContext, r.input).includes(plain.sends.reverb)
      && into(e.audioContext, r.input).includes(tower.sends.reverb),
  );
});

test('a strip mutes at its input, so its sends go quiet too; an FX channel at its output, so its own tail does', () => {
  const e = engine();
  const m = new Mixer(e);
  const r = m.fx('reverb', { pan: 0 });
  const c = m.channel('tap', { volume: 0.7, sends: [{ to: 'reverb', amount: 0.5, from: 'pre' }] });
  assert.equal(c.input.kind, 'gain', 'a gain in front of everything');
  assert.deepEqual(c.input.gain.events, [['value', 1]], 'at 1, its Gain module writes it: it passes the sound on');
  assert.deepEqual(into(e.audioContext, c.sends.reverb), [c.input], 'its sends after it');
  time = 11;
  c.muted(true);
  assert.deepEqual(c.input.gain.events.at(-1), ['target', 0, 11, 0.01], 'muted: to 0 at once, with no click');
  c.muted(false);
  assert.deepEqual(c.input.gain.events.at(-1), ['target', 1, 11, 0.01]);
  assert.ok(into(e.audioContext, m.sum).includes(r.output), 'an FX channel: out through its mute');
  r.muted(true);
  assert.deepEqual(r.output.gain.events.at(-1), ['target', 0, 11, 0.01], 'its output to 0, after its unity');
});

test("the mixer fades its master out, and in again: from where the fade got to, or from silence; the audio's power its user's (U1)", () => {
  const e = engine();
  const m = new Mixer(e, { volume: 0.6 });
  const ev = () => m.master.gain.events.slice(2);
  m.fadeOut();
  assert.deepEqual(ev(), [['target', 0, 10, 0.08]]);
  m.fadeIn(); // back before it stopped: from where the fade got to
  assert.deepEqual(ev().slice(1), [['target', 0.6, 10, 0.25]]);
  m.volume(0.3);
  m.fadeOut();
  time = 20;
  m.fadeIn({ fromSilence: true });
  assert.deepEqual(
    ev().slice(-3),
    [
      ['cancel', 20],
      ['set', 0, 20],
      ['target', 0.3, 20, 0.25],
    ],
    'from 0, to the volume set last',
  );
  assert.equal(e.audioContext.state, 'running', 'its power left alone');
});

test('a device on an insert slot: a chain of one FX module between a way in and a way out of its own, unity gains the engine builds, set through its chain (U1)', async () => {
  const { GAIN } = await import('../../web-audio-fx/index.ts');
  const { deviceInsert } = await import('../index.ts');
  const e = engine();
  const { chain, insert } = deviceInsert(e, { name: 'utility', patch: GAIN, params: () => ({ level: 0.5 }), beat });
  assert.equal(insert.name, 'utility');
  assert.deepEqual([insert.input.kind, insert.output.kind], ['gain', 'gain']);
  const [level] = outOf(e.audioContext, insert.input);
  assert.deepEqual(level.gain.events, [['value', 0.5]], 'its module at its params');
  assert.deepEqual(outOf(e.audioContext, level), [insert.output]);
  time = 11;
  chain.set('gain.gain', 0.25);
  assert.deepEqual(level.gain.events.at(-1), ['target', 0.25, 11, 0.05]);
});

test('a chain of a module made of several, a limiter: the channel comes in at its gain, out of what takes its makeup back; rebuilt for a change of structure, the old one let go of', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    time = 10;
    const e = new Engine({ AudioContext: Context });
    const ac = e.audioContext;
    const ch = new Mixer(e).fx('limited', { level: 1 });
    const patch = { effect: true, chain: ['limiter'], limiter: { gain: 6, ceiling: -1, release: 0.2 } };
    const c = new FxChain(e, {
      between: ch,
      modules: [{ name: 'limiter', patch, params: () => ({}) }],
      context: { beat, random: () => 0.5 },
    });
    const [compressor] = ac.rec.nodes.filter((o) => o.kind === 'compressor'); // the chain's: the mixer has none of its own
    const [drive] = into(ac, compressor);
    assert.ok(into(ac, drive).includes(ch.input), "the channel's input into its gain");
    const [back] = outOf(ac, compressor);
    assert.ok(into(ac, ch.level).includes(back), 'out of the gain that takes the makeup back, into the level');
    patch.chain = ['gain', 'limiter'];
    patch.gain = 1;
    c.follow();
    mock.timers.tick(RING_OUT);
    assert.ok(ac.rec.disconnects.includes(back), "the old one's way out let go of");
  } finally {
    mock.timers.reset();
  }
});

test("a mixer handed a routing: a strip already on it built where it says, its way out and what it sends to the routing's, what's asked agreeing; one not on it put on it as asked (Z3)", () => {
  const e = engine();
  const routing = new Routing();
  routing.add('reverb', { kind: 'return' });
  routing.add('you', { kind: 'bus', to: ['reverb'] });
  routing.add('tap', { kind: 'channel', out: 'you', to: ['reverb'] });
  routing.add('hold', { kind: 'channel', out: 'you' });
  const m = new Mixer(e, { routing });
  assert.equal(m.routing, routing, 'the routing it was handed');
  m.fx('reverb');
  const you = m.bus('you', { sends: [{ to: 'reverb', amount: 0.5 }] });
  const tap = m.channel('tap', { sends: [{ to: 'reverb', amount: 0.2 }] }); // its way out not asked: the routing's
  assert.deepEqual(into(e.audioContext, you.input), [tap.fader], 'into its bus, as the routing says');
  assert.ok(!into(e.audioContext, m.sum).includes(tap.fader), 'and not into the master');
  assert.throws(() => m.channel('hold', { out: 'master' }), /built where the routing says: hold/, 'another way out');
  assert.throws(
    () => m.channel('hold', { out: 'you', sends: ['reverb'] }),
    /built where the routing says: hold/,
    'a send it has none of',
  );
  assert.throws(() => m.channel('you'), /built where the routing says: you/, 'a bus as a channel');
  assert.equal(m.strips.hold, undefined, 'none built');
  m.channel('replay tap 1', { out: 'you' });
  assert.equal(routing.outOf('replay tap 1'), 'you', 'one not on it put on it as asked');
});

test("mute and solo kept by the mixer: each strip silenced as its routing says, now, and one made later as it's made; a solo of one not built yet waiting for it (Z4)", () => {
  const e = engine();
  const m = new Mixer(e);
  m.fx('reverb');
  m.bus('you');
  const tap = m.channel('tap', { out: 'you' });
  const hold = m.channel('hold', { out: 'you' });
  time = 11;
  m.mutes(new Set(['tap']), new Set());
  assert.deepEqual([...m.silent].sort(), ['tap'], 'the strip muted');
  assert.deepEqual(tap.input.gain.events.at(-1), ['target', 0, 11, 0.01], 'silenced at its input');
  m.mutes(new Set(), new Set(['hold']));
  assert.deepEqual([...m.silent].sort(), ['tap'], 'a solo silences what it needs not, but never a return');
  assert.deepEqual(tap.input.gain.events.at(-1), ['target', 0, 11, 0.01], 'tap still silent');
  const trace = m.channel('trace', { out: 'you' });
  assert.deepEqual(trace.input.gain.events.at(-1), ['target', 0, 11, 0.01], 'one made later silenced as it is made');
  assert.deepEqual([...m.silent].sort(), ['tap', 'trace']);
  m.mutes(new Set(), new Set(['replay tap 1'])); // soloed before it's built: nothing silenced till it is
  assert.deepEqual([...m.silent], [], 'a solo of one not built yet waits for it');
  assert.deepEqual(tap.input.gain.events.at(-1), ['target', 1, 11, 0.01], 'tap heard again');
  m.channel('replay tap 1', { out: 'you' });
  assert.deepEqual([...m.silent].sort(), ['hold', 'tap', 'trace'], 'built, its solo silences the rest');
  assert.deepEqual(hold.input.gain.events.at(-1), ['target', 0, 11, 0.01], 'hold among them');
});
