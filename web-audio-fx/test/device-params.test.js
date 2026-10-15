// A device's params as they play (mockup/src/libs/web-audio-fx/device-params.ts, U2c4b1b), as FxModules has the modules: each device by
// its name, a live copy of its start, handed out as copies; a param set on the chain that plays it, at the port its module declares,
// gliding, or the chain planned again where it has none, followed from now; a param with choices played as its choice by its index. On
// the engine's stand-in
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { engineOn } from '../../web-audio-engine/test/audio-stand-in.js';
import { DEVICES, DeviceParams, FILTER, FxChain, UTILITY } from '../index.ts';
import { timeSpecs } from '../../params/index.ts';
import { SMOOTHING } from '../../audio-plan/index.ts';

let time = 0;
const beat = 0.5;

test("a device's params as they play: a copy of its start, handed out as copies, set by param; its start kept, for a reset", () => {
  const devices = new DeviceParams();
  devices.add('tap/utility', { start: { level: 0.5, pan: 0 }, ports: DEVICES.utility.ports });
  assert.deepEqual([devices.has('tap/utility'), devices.has('you/utility')], [true, false], 'a device added, one not');
  assert.deepEqual(devices.current('tap/utility'), { level: 0.5, pan: 0 }, 'at its start');
  devices.set('tap/utility', 'level', 0.25);
  assert.deepEqual(devices.current('tap/utility'), { level: 0.25, pan: 0 }, 'set, with no chain playing it yet');
  devices.current('tap/utility').level = 2;
  assert.equal(devices.current('tap/utility').level, 0.25, 'handed out as a copy');
  assert.deepEqual(devices.start('tap/utility'), { level: 0.5, pan: 0 }, 'its start kept');
});

test('a param set on the chain that plays it: at the port its module declares, gliding; the chain planned again where it has none, glided to the change from now', () => {
  mock.timers.enable({ apis: ['setTimeout'] }); // an old chain would ring out before it's let go
  try {
    time = 10;
    const engine = engineOn(() => time);
    const biquads = () => engine.audioContext.rec.nodes.filter((node) => node.kind === 'biquad');
    const devices = new DeviceParams();
    devices.add('tap/utility', { start: { level: 0.5, pan: 0 }, ports: DEVICES.utility.ports });
    devices.add('tap/air', { start: { q: 0.707, cutoff: 2000 }, ports: DEVICES.filter.ports });
    const utility = chainOf(engine, devices, 'tap/utility', UTILITY);
    const air = chainOf(engine, devices, 'tap/air', FILTER);
    assert.equal(utility.paramOf('gain.gain').value, 0.5, 'built at its params as they play');
    devices.set('tap/utility', 'level', 0.25);
    assert.deepEqual(
      utility.paramOf('gain.gain').events.at(-1),
      ['target', 0.25, 10, SMOOTHING],
      'at its port, gliding',
    );
    devices.set('tap/utility', 'level', 0.3, { at: 13 });
    assert.deepEqual(utility.paramOf('gain.gain').events.at(-1), ['set', 0.3, 13], 'by a timing: at its time');
    assert.deepEqual(
      [devices.replans('tap/air', 'q'), devices.replans('tap/air', 'cutoff'), devices.replans('tap/utility', 'level')],
      [true, false, false],
      'a param with no port plans its chain again',
    );
    const built = biquads().length;
    devices.set('tap/air', 'q', 2);
    assert.equal(biquads().length, built, 'a resonance has no port: no node made');
    assert.deepEqual(
      [biquads().at(-1).Q.events.at(-1), air.paramOf('filter.frequency').events],
      [['target', 2, 10, SMOOTHING], [['value', 2000]]],
      'glided to the change from now, the rest as it was',
    );
  } finally {
    mock.timers.reset();
  }
});

test('a param with choices, as a controller carries it: played as its choice by its index; any other as it comes', () => {
  const devices = new DeviceParams();
  const specs = timeSpecs({ unit: 'ms', range: [1, 4000, 1], start: { sync: true, note: '1/8', free: 417 } });
  devices.add('delay 1/delay', { start: { sync: 1, note: '1/8', ms: 417 }, specs });
  devices.set('delay 1/delay', 'note', 7);
  assert.equal(devices.current('delay 1/delay').note, specs.note.choices[7], 'its eighth note value');
  devices.set('delay 1/delay', 'ms', 300);
  devices.set('delay 1/delay', 'sync', 0);
  assert.deepEqual(devices.current('delay 1/delay'), { sync: 0, note: '1/4', ms: 300 });
});

// a chain of one device's module, playing its params as they play
function chainOf(engine, devices, device, patch) {
  const ac = engine.audioContext;
  const chain = new FxChain(engine, {
    between: { input: ac.createGain(), chainOut: ac.createGain() },
    modules: [{ name: device, patch, params: devices.paramsOf(device) }],
    context: { beat, random: () => 0.5 },
  });
  devices.playedBy(device, chain);
  return chain;
}
