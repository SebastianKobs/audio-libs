// The voices (modular-audio/build/instrument/) on the real Web Audio builder, on its stand-in, an instrument planned from
// the tests' voice card: a note's voice added at its time, its pitch and envelope set; its sources stopped once it has rung out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Voices } from '../../modular-audio/build/instrument/index.ts';
import { WebAudioBuilder } from '../../modular-audio/build/web-audio/index.ts';
import { StandInContext } from '../../modular-audio/build/web-audio/test/audio-stand-in.js';
import { Planner } from '../../modular-audio/plan/planner/index.ts';
import { instrumentOf, SYNTH_FORMS } from '../../modular-audio/plan/instrument/index.ts';
import { MODULE_TEMPLATES } from '../../modular-audio/plan/instrument/content.ts';
import { PLUCK } from '../../modular-audio/plan/instrument/test/pluck.js';
import { noteMessages } from '../../midi/protocol/index.ts';

test("a pluck's note played on what's built from its plan: its voice added at its time, its oscillator started then at its pitch, its envelope opened; its sources stopped by when it has faded, let go once it has rung out", () => {
  const clock = { now: 0 };
  const context = new StandInContext(() => clock.now);
  const instrument = instrumentOf('Pluck instrument', [{ patch: { kind: 'Pluck' } }], [PLUCK]);
  const plan = new Planner([...MODULE_TEMPLATES, PLUCK, instrument], SYNTH_FORMS).plan('Pluck instrument');
  const built = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, {
    into: context.destination,
  });
  const voices = new Voices(built, plan, () => clock.now);
  voices.receive(noteMessages({ pitch: 69, velocity: 1, t: 1, duration: 0.5 }, 1));
  const [oscillator] = context.rec.nodes.filter((node) => node.kind === 'oscillator');
  const [envelope] = context.rec.nodes.filter((node) => node.kind === 'constant');
  assert.deepEqual(
    [oscillator.starts, oscillator.frequency.events.at(-1)],
    [[[1]], ['set', 440, 0]],
    'started at its time, its pitch set as it was added',
  );
  assert.ok(
    envelope.offset.events.some(([kind, value, at]) => kind === 'target' && value === 1.3 && at === 1),
    'its attack drawn from its gate, charging past its peak',
  );
  assert.deepEqual(
    [oscillator.stops, envelope.stops],
    [[[1.5]], [[1.5]]],
    'stopped by when it has faded, told as its gate closed: at its note off, its decay to nothing done by then',
  );
  const told = oscillator.stops.length;
  clock.now = 1.45;
  voices.receive([]);
  assert.equal(oscillator.stops.length, told, 'before its note off: kept');
  clock.now = 2;
  voices.receive([]);
  assert.deepEqual([oscillator.stops.length, envelope.stops.length], [told + 1, told + 1], 'let go, taken apart');
});
