// The libraries' layers apart (test/module-rules.js's import graph, test/scenarios/): what a user of each
// layer loads, a face loading no YAML, and each scenario, the code a user writes, run with only the packages it needs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRARY_LAYOUT } from '../module-rules.js';
import { NOT_INSTALLED, whenMissing } from '../optional-checks.js';
import { inCodeFolders } from '../libraries.js';
import { StandInContext, into } from '../../modular-audio/build/web-audio/test/audio-stand-in.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const rules = await import('ts-code-checks/tools/module-rules.js').catch(whenMissing);
const check = (name, run) => test(name, { skip: rules === null && NOT_INSTALLED }, run);
const { importsOf, packagesOf, reachedFrom, sourcesIn } = rules ?? {};
const LIBRARIES = rules === null ? null : inCodeFolders(sourcesIn, ROOT);

// the YAML files a package's entry loads, by their paths
function yamlFrom(entry) {
  return [...reachedFrom([entry], LIBRARIES)].filter((path) => path.endsWith('.yaml'));
}
// the packages a scenario reaches, sorted: its imports followed through the graph
function packagesReachedBy(scenario) {
  return packagesOf(reachedFrom(startsOf(scenario), LIBRARIES), LIBRARY_LAYOUT.packages);
}
// what a scenario imports from the libraries, by its path there; a scenario it builds on read in its place
function startsOf(scenario) {
  const path = `test/scenarios/${scenario}`;
  return importsOf(path, readFileSync(`${ROOT}${path}`, 'utf8')).flatMap((target) =>
    target.startsWith('test/scenarios/') ? startsOf(posix.basename(target)) : [target],
  );
}

check("a package's face loads no YAML, its content (content.ts, imported apart) loads its templates' YAML", () => {
  for (const face of [
    'modular-audio/build/instrument/index.ts',
    'modular-audio/plan/desk/index.ts',
    'modular-audio/plan/effects/index.ts',
    'modular-audio/plan/instrument/index.ts',
  ]) {
    assert.deepEqual(yamlFrom(face), [], face);
  }
  for (const content of ['modular-audio/plan/effects/content.ts', 'modular-audio/plan/instrument/content.ts']) {
    assert.notDeepEqual(yamlFrom(content), [], `${content}: it loads YAML`);
  }
});

check(
  'scenario 1, a voice planned in code: an oscillator and an envelope wired into a gain, on the planner and the blocks alone',
  async () => {
    assert.deepEqual(packagesReachedBy('plan-in-code.js'), [
      'base/automation/',
      'base/params/',
      'base/util/',
      'dsp/saturation/',
      'modular-audio/plan/blocks/',
      'modular-audio/plan/format/',
      'modular-audio/plan/planner/',
    ]);
    const { planVoice } = await import('../scenarios/plan-in-code.js');
    assert.deepEqual(
      planVoice().node.children.map(({ name, kind }) => [name, kind]),
      [
        ['oscillator', 'oscillator'],
        ['vca', 'gain'],
        ['envelope', 'envelope'],
      ],
    );
  },
);

check('scenario 2, that voice built for Web Audio into a context handed in: no clock, no engine', async () => {
  assert.deepEqual(packagesReachedBy('build-a-plan.js'), [
    'base/automation/',
    'base/params/',
    'base/util/',
    'dsp/dynamics/',
    'dsp/filters/',
    'dsp/impulse/',
    'dsp/measures/',
    'dsp/oscillators/',
    'dsp/saturation/',
    'dsp/wow/',
    'modular-audio/build/contract/',
    'modular-audio/build/web-audio/',
    'modular-audio/plan/blocks/',
    'modular-audio/plan/format/',
    'modular-audio/plan/planner/',
  ]);
  const { buildVoice } = await import('../scenarios/build-a-plan.js');
  const context = new StandInContext(() => 0);
  const built = buildVoice(context);
  assert.deepEqual(
    context.rec.nodes.map(({ kind }) => kind),
    ['destination', 'oscillator', 'gain', 'constant'],
  );
  assert.deepEqual(built.placeholders, []);
});

check(
  "scenario 3, a plan's device drawn: that voice's envelope through a preset's readout, its view model, its HTML; on the plan's format, the blocks, the params, automation and the helpers alone",
  async () => {
    assert.deepEqual(packagesReachedBy('device-view.js'), [
      'base/automation/',
      'base/html/',
      'base/params/',
      'base/util/',
      'dsp/saturation/',
      'modular-audio/plan/blocks/',
      'modular-audio/plan/format/',
      'modular-audio/plan/planner/',
      'modular-audio/view/device/dom/',
      'modular-audio/view/device/models/',
      'modular-audio/view/device/readout/',
    ]);
    const { drawEnvelope } = await import('../scenarios/device-view.js');
    const { device, sent, html } = drawEnvelope();
    assert.match(html, /^<div class="device flowless" data-device="envelope">/);
    device.controls.find(({ name }) => name === 'attack').turnTo(0.5);
    assert.deepEqual(sent, [{ type: 'param', address: ['envelope', 'attack'], value: 5 }]);
  },
);

check(
  'scenario 4, a desk alone: planned from a desk written short, built for Web Audio, a value set, a strip muted; no clock, no MIDI, no sequencer',
  async () => {
    assert.deepEqual(packagesReachedBy('desk-alone.js'), [
      'base/automation/',
      'base/params/',
      'base/util/',
      'dsp/dynamics/',
      'dsp/filters/',
      'dsp/impulse/',
      'dsp/measures/',
      'dsp/oscillators/',
      'dsp/saturation/',
      'dsp/wow/',
      'modular-audio/build/contract/',
      'modular-audio/build/desk/mixing/',
      'modular-audio/build/web-audio/',
      'modular-audio/plan/blocks/',
      'modular-audio/plan/desk/',
      'modular-audio/plan/effects/',
      'modular-audio/plan/format/',
      'modular-audio/plan/planner/',
    ]);
    const { mixSmallDesk } = await import('../scenarios/desk-alone.js');
    const desk = mixSmallDesk(new StandInContext(() => 0));
    assert.equal(desk.valueOf(['voice', 'volume']), 0.5);
    assert.deepEqual([...desk.mixState().muted], ['drums']);
    assert.equal(desk.valueOf(['drums', 'cut', 'gain']), 0, 'its channel cut');
  },
);

check(
  "scenario 5, an instrument planned from a file of instruments on the synth's modules, built for Web Audio and played by two sources: one into a panner of its own, one summed; no view, no desk, no sequencer, no engine",
  async () => {
    assert.deepEqual(packagesReachedBy('instrument-played.js'), [
      'base/automation/',
      'base/params/',
      'base/util/',
      'dsp/dynamics/',
      'dsp/filters/',
      'dsp/impulse/',
      'dsp/measures/',
      'dsp/oscillators/',
      'dsp/saturation/',
      'dsp/wow/',
      'midi/protocol/',
      'modular-audio/build/contract/',
      'modular-audio/build/instrument/',
      'modular-audio/build/web-audio/',
      'modular-audio/plan/blocks/',
      'modular-audio/plan/format/',
      'modular-audio/plan/instrument/',
      'modular-audio/plan/planner/',
      'music/music-theory/',
      'sequencing/clock/',
    ]);
    const { playTwoSources } = await import('../scenarios/instrument-played.js');
    const context = new StandInContext(() => 0);
    const { instrument, creaturePan } = playTwoSources(context);
    assert.equal(instrument.patch, 'bright');
    assert.ok(
      context.rec.nodes.some(({ kind }) => kind === 'oscillator'),
      'its voices built as their notes came',
    );
    const [creatureVoice] = into(context, creaturePan);
    assert.equal(into(context, creaturePan).length, 1, 'the creature heard into its panner alone');
    assert.ok(!into(context, context.destination).includes(creatureVoice), 'not into the instrument output');
    assert.equal(
      into(context, context.destination).filter((node) => node !== creaturePan).length,
      1,
      'the instrument own voice summed into its output',
    );
  },
);
