// Building in the engine's context (mockup/src/libs/modular-audio/build/web-audio-engine/engine-building.ts), on the stand-in for Web Audio, as
// an instrument is made at its first note:
//   - the Web Audio builder in the engine's context once the audio runs, into where it's told, the time now the
//     context's, a clock's time on it;
//   - the noise's buffers made once, shared by every builder in that context; one in a context of its own its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClockedContext, EngineBuilding, buildingIn } from '../index.ts';
import { Buffers, WebAudioBuilder } from '../../web-audio/index.ts';
import { StandInContext } from '../../web-audio/test/audio-stand-in.js';
import { oneBlockPlan } from '../../web-audio/test/blocks.js';

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
  assert.deepEqual(
    [made.now(), made.at(5), made.at(2)],
    [4, 6, 4],
    "a clock's time on the context's, never in its past",
  );
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

test("building in a context of its own: the buffers it's handed, the clock's time handed in", () => {
  const context = new StandInContext(() => 2);
  const buffers = new Buffers(context, () => 0.5);
  const made = buildingIn({ context, into: context.destination, at: (t) => t + 3, beat: () => 0.5, buffers });
  assert.deepEqual([made.now(), made.at(1)], [2, 4]);
  const other = new WebAudioBuilder({ context, beat: () => 0.5, buffers });
  for (const builder of [made.builder, other]) {
    builder.build(oneBlockPlan('noise'), { into: made.into });
  }
  const [one, two] = context.rec.nodes.filter((node) => node.kind === 'buffer');
  assert.equal(one.buffer, two.buffer, "the buffers it's handed");
});
