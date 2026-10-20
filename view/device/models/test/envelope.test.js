// An envelope's curve as a view draws it (mockup/src/libs/view/device/models/envelope.ts), from its knobs as they're set, an ARP's:
//   - its stages from its gate opening, released at the note's end; a trigger's running on past it;
//   - sampled over a time, a level each step, a share of its amount; where its delay ends and its note's end, marked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeDrawing, ViewBuilder } from '../index.ts';
import { paramAt, settingAt } from '../../../../plan/format/index.ts';
import { near } from '../../../../util/test/near.js';

// an envelope of the tests' own, its stages by name, its mode a setting
function envelopeOf(values, mode = 'gate') {
  const param = (name, value) => ({ spec: { name, unit: 's', range: [0, 10, 0.001] }, value });
  const plan = {
    version: 1,
    node: {
      name: 'env',
      kind: 'envelope',
      inputs: [],
      outputs: [{ name: 'out', channels: 1 }],
      params: Object.entries({
        delay: 0,
        attack: 0,
        hold: 0,
        decay: 0,
        sustain: 1,
        release: 0.1,
        amount: 1,
        ...values,
      }).map(([name, value]) => param(name, value)),
      settings: [{ spec: { name: 'mode', choices: ['gate', 'trigger'] }, value: mode }],
    },
  };
  const models = new ViewBuilder(
    {
      plan,
      valueOf: () => undefined,
      startOf: (address) => (paramAt(plan, address) ?? settingAt(plan, address))?.value,
      roleOf: () => ({ by: 'live' }),
      peakOf: () => 0,
      readingOf: () => 0,
      copiesOf: () => [],
      slotOf: () => undefined,
    },
    () => {},
  );
  return models.device([]);
}

test("an envelope's curve from its knobs: from its gate opening, after its delay up to its top, settling onto its sustain, released at the note's end; a level each step, a share of its amount", () => {
  const device = envelopeOf({ delay: 0.25, attack: 0.25, decay: 0.5, sustain: 0.5, release: 0.5, amount: 2 });
  const drawn = envelopeDrawing(device, { noteOff: 1.5, length: 3, steps: 300 });
  assert.deepEqual([drawn.delay, drawn.noteOff, drawn.step, drawn.levels.length], [0.25, 1.5, 0.01, 301]);
  const at = (t) => drawn.levels[Math.round(t / drawn.step)];
  assert.equal(at(0.2), 0, 'silent through its delay');
  near(at(0.5), 1, 'at its top as its attack ends', 1e-6);
  near(at(1.4), 0.5, 'settled onto its sustain', 1e-3);
  near(at(2), 0, 'released by its end', 1e-3);
});

test("a trigger's curve runs on past the note's end, no note-off marked; the curve as the instrument plays it, an ARP's, its attack faster at first", () => {
  const drawn = envelopeDrawing(envelopeOf({ attack: 1, decay: 1, sustain: 0.5 }, 'trigger'), {
    noteOff: 0.5,
    length: 3,
    steps: 300,
  });
  assert.equal(drawn.noteOff, null);
  near(drawn.levels[200], 0.5, 'its decay done, not released', 1e-3);
  assert.ok(drawn.levels[50] > 0.5, 'past halfway at half its attack');
});

test("drawn as long as it takes where it's asked no length: held until it has settled onto its sustain, half a second at least, then its release", () => {
  const drawn = envelopeDrawing(envelopeOf({ delay: 0.25, attack: 0.25, decay: 0.5, sustain: 0.5, release: 0.5 }), {
    steps: 100,
  });
  assert.equal(drawn.noteOff, 1, 'its delay, attack, hold and decay');
  near(drawn.step * 100, 1.5, 'then its release');
  const short = envelopeDrawing(envelopeOf({ attack: 0.01, decay: 0.1, release: 0.2 }), { steps: 100 });
  assert.equal(short.noteOff, 0.5, 'half a second at least');
  assert.equal(envelopeDrawing(envelopeOf({ decay: 2 }, 'trigger'), { steps: 100 }).noteOff, null, 'a trigger: no end');
});
