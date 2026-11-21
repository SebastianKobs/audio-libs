// Building in the engine's context (modular-audio/build/web-audio-engine/engine-building.ts), on the stand-in for Web Audio, as
// an instrument is made at its first note:
//   - the Web Audio builder in the engine's context once the audio runs, into where it's told, the time now the
//     context's, a clock's time on it;
//   - the noise's buffers made once, shared by every builder in that context;
//   - the processors loaded into the context made into nodes, a lookahead limiter a worklet where its module loaded, the library's
//     limiter where it hasn't;
//   - the shapers' lags the engine measured, a shaper lag's delay held back by them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClockedContext, EngineBuilding, buildingIn } from '../index.ts';
import { Buffers } from '../../web-audio/index.ts';
import { StandInContext } from '../../web-audio/test/audio-stand-in.js';
import { oneBlockPlan } from '../../web-audio/test/blocks.js';
import { FIREFOX_LAGS, offlineShaperWith } from '../../web-audio/test/offline-shaper.js';
import { installWorkletNodes } from '../../web-audio/test/worklet-nodes.js';

// an engine on a stand-in context at 4 s, a clock's time 1 s behind it; none until the audio starts
function buildingOn() {
  const AudioContext = class extends StandInContext {
    constructor() {
      super(() => 4);
    }
  };
  const engine = new ClockedContext({ AudioContext, toContext: (t) => t + 1 });
  return { engine, building: new EngineBuilding({ engine: () => engine, beat: () => 0.5 }) };
}

test("the Web Audio builder in the engine's context, into where it's told; the time now the context's, a clock's time on it", () => {
  const { engine, building } = buildingOn();
  const context = engine.audioContext;
  const made = building.into(context.destination);
  assert.equal(made.into, context.destination);
  assert.deepEqual([made.now(), made.at(5)], [4, 6], "a clock's time on the context's");
  made.builder.build(oneBlockPlan('gain'), { into: made.into });
  assert.ok(
    context.rec.nodes.some((node) => node.kind === 'gain'),
    'built in the context',
  );
});

test("the noise's buffers made once, shared by every builder in the engine's context", () => {
  const { engine, building } = buildingOn();
  const context = engine.audioContext;
  for (const made of [building.into(context.destination), building.into(context.destination)]) {
    made.builder.build(oneBlockPlan('noise'), { into: made.into });
  }
  const [one, other] = context.rec.nodes.filter((node) => node.kind === 'buffer');
  assert.equal(one.buffer, other.buffer, 'one buffer');
});

test("building in a context of its own: the time now its context's, the clock's time handed in", () => {
  const context = new StandInContext(() => 2);
  const buffers = new Buffers(context, () => 0.5);
  const made = buildingIn({ context, into: context.destination, at: (t) => t + 3, beat: () => 0.5, buffers });
  assert.deepEqual([made.now(), made.at(1)], [2, 4]);
});

test("a lookahead limiter built through into(): a worklet node where the engine's processors have loaded, the library's limiter where they haven't", async () => {
  const uninstall = installWorkletNodes();
  try {
    const { engine, building } = buildingOn();
    const kindsBuilt = () => {
      const made = building.into(engine.audioContext.destination);
      made.builder.build(oneBlockPlan('lookahead limiter'), { into: made.into });
      return engine.audioContext.rec.nodes
        .map((node) => node.kind)
        .filter((kind) => kind === 'worklet' || kind === 'compressor');
    };
    assert.deepEqual(kindsBuilt(), ['compressor'], 'before the processors loaded');
    await engine.loadProcessors({ 'lookahead limiter': 'limiter.js' });
    assert.deepEqual(kindsBuilt(), ['compressor', 'worklet'], 'once they have');
  } finally {
    uninstall();
  }
});

test("a shaper lag built through into(): held back by the lags the engine has measured, Chromium's before", async () => {
  const AudioContext = class extends StandInContext {
    constructor() {
      super(() => 4);
    }
  };
  const engine = new ClockedContext({ AudioContext, OfflineAudioContext: offlineShaperWith(FIREFOX_LAGS) });
  const building = new EngineBuilding({ engine: () => engine, beat: () => 0.5 });
  const delays = () => {
    const made = building.into(engine.audioContext.destination);
    made.builder.build(oneBlockPlan('shaper lag'), { into: made.into });
    return engine.audioContext.rec.nodes.filter((node) => node.kind === 'delay').map((node) => node.delayTime.value);
  };
  assert.deepEqual(delays(), [192 / 48000], "before it's measured");
  await engine.measureShaperLags();
  assert.deepEqual(delays(), [192 / 48000, 8 / 48000], 'once it has');
});

test("building in a context of its own: the lags it's handed hold a shaper lag back, Chromium's where none", () => {
  const delayOf = (shaperLags) => {
    const context = new StandInContext(() => 2);
    const buffers = new Buffers(context, () => 0.5);
    const made = buildingIn({
      context,
      into: context.destination,
      at: (t) => t,
      beat: () => 0.5,
      buffers,
      ...(shaperLags && { shaperLags }),
    });
    made.builder.build(oneBlockPlan('shaper lag'), { into: made.into });
    return context.rec.nodes.find((node) => node.kind === 'delay').delayTime.value;
  };
  assert.equal(delayOf(undefined), 192 / 48000);
  assert.equal(delayOf(FIREFOX_LAGS), 8 / 48000);
});
