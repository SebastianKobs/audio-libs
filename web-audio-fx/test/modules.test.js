// FX modules as they play (mockup/src/libs/web-audio-fx/modules.ts, U2c3), as the tool's bank has the instruments' patches:
// copies of the modules handed in, by name; an edit followed on every chain that plays it, glided there, rebuilt only for a change of
// structure, a chain playing another left be; a reset bringing back the one it started from. On the engine's stand-in for Web Audio
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { engineOn } from '../../web-audio-engine/test/audio-stand-in.js';
import { FILTER, FxChain, FxModules, GAIN } from '../index.ts';
import { SMOOTHING } from '../../automation/index.ts';

test('FX modules as they play: copies of those handed in, by name; an edit plays on every chain that plays it, glided there, rebuilt only for a change of structure, a chain playing another left be; a reset brings back the one it started from', () => {
  mock.timers.enable({ apis: ['setTimeout'] }); // an old chain rings out before it's let go
  try {
    const modules = new FxModules({ modules: { dull: FILTER, level: GAIN } });
    assert.notEqual(modules.of('dull'), FILTER, 'a copy');
    assert.deepEqual(modules.of('dull'), FILTER, 'of the one handed in');
    const engine = engineOn(() => 10);
    const nodes = (kind) => engine.audioContext.rec.nodes.filter((node) => node.kind === kind).length;
    const dull = chainOf(engine, modules, 'dull');
    const level = chainOf(engine, modules, 'level');
    const [filters, gains] = [nodes('biquad'), nodes('gain')];
    modules.set('dull', { ...FILTER, params: { q: 2, cutoff: 500 } });
    assert.deepEqual([nodes('biquad'), nodes('gain')], [filters, gains], 'no node made');
    assert.deepEqual(dull.paramOf('filter.frequency').events.at(-1), ['target', 500, 10, SMOOTHING], 'glided there');
    assert.equal(level.paramOf('gain.gain').events.length, 1, 'a chain playing another left be');
    assert.deepEqual(modules.current('dull').params, { q: 2, cutoff: 500 }, 'as it plays, handed out as a copy');
    modules.set('dull', { ...FILTER, filter: { ...FILTER.filter, type: 'highpass' } });
    assert.equal(nodes('biquad'), filters + 1, 'a change of structure: the chain that plays it rebuilt');
    modules.reset('dull');
    assert.deepEqual(modules.current('dull'), FILTER, 'back to the one it started from');
  } finally {
    mock.timers.reset();
  }
});

// a chain of one module, playing it as the modules have it now
function chainOf(engine, modules, name) {
  const ac = engine.audioContext;
  const chain = new FxChain(engine, {
    between: { input: ac.createGain(), chainOut: ac.createGain() },
    modules: [{ name, patch: modules.of(name), params: () => ({}) }],
    context: { beat: 60 / 72, random: () => 0.5 },
  });
  modules.playedBy(chain, [name]);
  return chain;
}
