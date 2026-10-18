// A stand-in for Web Audio that records what's built with it: every node, its props, its connections, its starts and stops, and every
// value and automation call on its params. The builder (mockup/src/libs/build/web-audio/) runs on it in node as it does on a browser's
// audio context: a browser makes the same calls, so it builds the same graph. Used to record the graph each voice builds
// (record-instruments.js), so a change to the builder can be held to building exactly the same (mockup/architecture/instruments.md).
// canonical(rec) turns a recording into a tree from where the sound goes out back to its sources, the same however the graph was built:
// inputs sorted, numbers to 10 significant digits, times from `t0`, and how often a node was disconnected. A named node met on the way is
// a ref to its name, written once under it, as itself, so a desk with every strip named is written strip by strip, not once for every path

const NOISE = 1e-9; // s: a time this near the start written as the start, a float's noise, as a time added up step by step has (P3c1)
const PARAMS = {
  gain: { gain: 1 },
  oscillator: { frequency: 440, detune: 0 },
  biquad: { frequency: 350, Q: 1, gain: 0, detune: 0 },
  panner: { pan: 0 },
  buffer: { playbackRate: 1, detune: 0 },
  constant: { offset: 1 },
  delay: { delayTime: 0 },
  compressor: { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 },
  convolver: {},
  destination: {},
  analyser: {},
  splitter: {},
};
const PROPS = {
  oscillator: { type: 'sine' },
  biquad: { type: 'lowpass' },
  buffer: { buffer: null, loop: false },
  convolver: { buffer: null, normalize: true },
};

// The links back, a param's node and a node's context, are private, read by a getter.
// A buffer's samples too, read by getChannelData().
// A failing assertion prints its values in full, but not those, so it prints a param or a node alone:
// with them, it printed the whole graph, every way through it, and ran out of memory (2026-10-13);
// a buffer printed every sample, and the assertion's diff ran out of memory on them (2026-10-16).
class StandInParam {
  #node;
  constructor(node, name, value) {
    this.#node = node;
    this.name = name;
    this.v = value;
    this.events = [];
  }
  get node() {
    return this.#node;
  }
  get value() {
    return this.v;
  }
  set value(v) {
    this.v = v;
    this.events.push(['value', v]);
  }
  setValueAtTime(v, t) {
    this.events.push(['set', v, t]);
    return this;
  }
  linearRampToValueAtTime(v, t) {
    this.events.push(['linear', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v, t) {
    this.events.push(['exp', v, t]);
    return this;
  }
  setTargetAtTime(v, t, c) {
    this.events.push(['target', v, t, c]);
    return this;
  }
  cancelScheduledValues(t) {
    this.events.push(['cancel', t]);
    return this;
  }
}
class StandInBuffer {
  #samples;
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.#samples = Array.from({ length: channels }, () => new Float32Array(length));
  }
  get duration() {
    return this.length / this.sampleRate;
  }
  getChannelData(c) {
    return this.#samples[c];
  }
}
class StandInNode {
  #ctx;
  constructor(ctx, type, extra = {}) {
    this.#ctx = ctx;
    this.kind = type;
    this.id = ctx.rec.nodes.length;
    this.starts = [];
    this.stops = [];
    this.extra = extra;
    ctx.rec.nodes.push(this);
    this.props = { ...PROPS[type] };
    for (const [name, v] of Object.entries(PARAMS[type])) {
      this[name] = new StandInParam(this, name, v);
    }
    for (const name of Object.keys(this.props)) {
      Object.defineProperty(this, name, {
        get: () => this.props[name],
        set: (v) => {
          this.props[name] = v;
        },
      });
    }
  }
  get ctx() {
    return this.#ctx;
  }
  // how it mixes its inputs' channels: recorded once set, so a node left as Web Audio makes it records nothing
  get channelCountMode() {
    return this.props.channelCountMode ?? 'max';
  }
  set channelCountMode(v) {
    this.props.channelCountMode = v;
  }
  get channelCount() {
    return this.props.channelCount ?? 2;
  }
  set channelCount(v) {
    this.props.channelCount = v;
  }
  connect(target, output = 0) {
    this.ctx.rec.edges.push({ from: this, to: target, ...(output ? { output } : {}) });
    return target;
  } // output: a splitter's side
  disconnect(target) {
    // from one target: that edge goes, as Web Audio's does
    this.ctx.rec.disconnects.push(this);
    if (!target) {
      return;
    }
    const edges = this.ctx.rec.edges;
    const k = edges.findIndex((e) => e.from === this && e.to === target);
    if (k >= 0) {
      edges.splice(k, 1);
    }
  }
  start(...args) {
    this.starts.push(args);
  }
  stop(...args) {
    this.stops.push(args);
  }
}
// an audio context whose time is now(), on the clock's timeline, so the clock's offset to it is 0 and a clock time is its own time
export class StandInContext {
  constructor(now) {
    this.now = now;
    this.sampleRate = 48000;
    this.state = 'running';
    this.baseLatency = 0;
    this.outputLatency = 0;
    this.rec = { nodes: [], edges: [], disconnects: [] };
    this.destination = new StandInNode(this, 'destination');
  }
  get currentTime() {
    return this.now();
  }
  addEventListener() {}
  resume() {
    this.state = 'running';
  }
  suspend() {
    this.state = 'suspended';
  }
  createGain() {
    return new StandInNode(this, 'gain');
  }
  createOscillator() {
    return new StandInNode(this, 'oscillator');
  }
  createBiquadFilter() {
    return new StandInNode(this, 'biquad');
  }
  createStereoPanner() {
    return new StandInNode(this, 'panner');
  }
  createBufferSource() {
    return new StandInNode(this, 'buffer');
  }
  createConstantSource() {
    return new StandInNode(this, 'constant');
  }
  createConvolver() {
    return new StandInNode(this, 'convolver');
  }
  createDynamicsCompressor() {
    const c = new StandInNode(this, 'compressor');
    c.reduction = 0;
    return c;
  } // reduction: what it takes away now, in dB, as a test sets it
  createDelay(max = 1) {
    return new StandInNode(this, 'delay', { max });
  }
  createBuffer(channels, length, sampleRate) {
    return new StandInBuffer(channels, length, sampleRate);
  }
  createChannelSplitter(outputs = 6) {
    return new StandInNode(this, 'splitter', { outputs });
  }
  // an analyser hears what a test gives it: samples, the latest last, the rest of its window silent
  createAnalyser() {
    const a = new StandInNode(this, 'analyser');
    Object.assign(a, {
      fftSize: 2048,
      samples: [],
      getFloatTimeDomainData: (buf) => {
        buf.fill(0);
        buf.set(a.samples.slice(-buf.length), Math.max(0, buf.length - a.samples.length));
      },
    });
    return a;
  }
}
// what feeds a node, and where a node goes, as a context recorded its edges
export function into(ctx, node) {
  return ctx.rec.edges.filter((edge) => edge.to === node).map((edge) => edge.from);
}
export function outOf(ctx, node) {
  return ctx.rec.edges.filter((edge) => edge.from === node).map((edge) => edge.to);
}
// puts the stand-in where the studio looks for a browser's audio. node's own navigator does: it has no audio session and doesn't vibrate
export function install(now) {
  globalThis.window = {
    AudioContext: class extends StandInContext {
      constructor() {
        super(now);
        install.last = this;
      }
    },
  };
  globalThis.document = { hidden: false };
}

// what was built from node index `from` on, up to `to`: the nodes, and the edges and disconnects from them. Nodes made before are
// outside it, and named in `names` (a Map from node to name) where they're endpoints
export function take(ctx, from = 0, to) {
  const nodes = ctx.rec.nodes.slice(from, to);
  const mine = new Set(nodes);
  const cuts = new Map();
  for (const n of ctx.rec.disconnects) {
    if (mine.has(n)) {
      cuts.set(n, (cuts.get(n) ?? 0) + 1);
    }
  }
  return { nodes, edges: ctx.rec.edges.filter((e) => mine.has(e.from)), mine, cuts };
}
// a value as recorded: a number to 10 significant digits, Infinity and NaN as text, anything else as it is
function num(value) {
  if (typeof value !== 'number') {
    return value;
  }
  if (Number.isFinite(value)) {
    return +value.toPrecision(10);
  }
  return String(value);
}
function bufferInfo(b) {
  if (!b) {
    return null;
  }
  let sum = 0;
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      sum += Math.abs(d[i]);
    }
  }
  return { channels: b.numberOfChannels, length: b.length, sampleRate: b.sampleRate, sum: num(sum) };
}
// the tree: from each endpoint (named in `names`), back through every node that feeds it, by sound or into a param, up to a named one,
// which is only a ref to its name: written under its name as itself if it's in the recording, as what feeds it if it's an endpoint
// outside it. A node fed back into itself, as a delay line's loop, is marked where it comes round again, so the tree ends
export function canonical(rec, names, t0 = 0) {
  const T = (v) => num(Math.abs(v - t0) < NOISE ? 0 : v - t0);
  const inputs = new Map(); // node -> [{ from, into }], into: a param's name, or 'in'
  for (const e of rec.edges) {
    const to = e.to.node ? e.to.node : e.to;
    const into = e.to.node ? e.to.name : 'in';
    if (!inputs.has(to)) {
      inputs.set(to, []);
    }
    inputs.get(to).push({ from: e.from, into });
  }
  const seen = new Set();
  const fed = (i, path) => ({
    into: i.into,
    ...(names.has(i.from) ? { ref: names.get(i.from) } : describe(i.from, path)),
  });
  function describe(n, path) {
    if (path.includes(n)) {
      return { loop: path.length - path.indexOf(n) };
    }
    seen.add(n);
    const d = { node: n.kind };
    if (n.extra.max !== undefined) {
      d.max = num(n.extra.max);
    }
    for (const [k, v] of Object.entries(n.props)) {
      d[k] = k === 'buffer' ? bufferInfo(v) : num(v);
    }
    const params = {};
    for (const name of Object.keys(PARAMS[n.kind])) {
      const p = n[name];
      const ev = p.events.map(([kind, ...a]) => [
        kind,
        ...a.map((x, i) =>
          kind === 'value' || (kind !== 'cancel' && i === 0) || (kind === 'target' && i === 2) ? num(x) : T(x),
        ),
      ]);
      if (ev.length) {
        params[name] = ev;
      }
    }
    if (Object.keys(params).length) {
      d.params = params;
    }
    if (n.starts.length) {
      d.starts = n.starts.map((a) => a.map((x, i) => (i === 0 ? T(x) : num(x))));
    }
    if (n.stops.length) {
      d.stops = n.stops.map((a) => a.map(T));
    }
    if (rec.cuts?.get(n)) {
      d.disconnects = rec.cuts.get(n); // let go of: how often it was disconnected from everything it feeds
    }
    const ins = (inputs.get(n) || []).filter((i) => rec.mine.has(i.from)).map((i) => fed(i, [...path, n]));
    if (ins.length) {
      d.inputs = ins.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
    }
    return d;
  }
  const out = {};
  for (const [node, name] of names) {
    if (rec.mine.has(node)) {
      out[name] = describe(node, []);
      continue;
    } // in the recording: itself, its params kept, with what feeds it
    if (!inputs.has(node)) {
      continue;
    }
    const ins = inputs
      .get(node)
      .filter((i) => rec.mine.has(i.from))
      .map((i) => fed(i, [node]));
    if (ins.length) {
      // endpoints of one name, together
      out[name] = [...(out[name] ?? []), ...ins].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
    }
  }
  const unreached = rec.nodes.filter((n) => !seen.has(n) && !names.has(n)).map((n) => n.kind); // built, but leading nowhere that sounds
  const elsewhere = rec.edges
    .map((e) => e.to.node || e.to)
    .filter((n) => !rec.mine.has(n) && !names.has(n))
    .map((n) => n.kind); // into a node it wasn't told of
  return { ...out, ...(unreached.length ? { unreached } : {}), ...(elsewhere.length ? { elsewhere } : {}) };
}
