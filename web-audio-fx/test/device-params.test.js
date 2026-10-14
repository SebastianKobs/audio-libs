// A device's params as they play (mockup/src/libs/web-audio-fx/device-params.ts, U2c4b1b), as FxModules has the modules: each device by
// its name, a live copy of its start, handed out as copies; a param set on the chain that plays it, at the port its module declares,
// gliding, or the chain rebuilt where it has none; a param in beats played as the note length it matches. On the engine's stand-in
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { DeviceParams, FILTER, FxChain, INSERTS, MOVE_GLIDE, TEMPO_TIME, UTILITY } from '../index.ts';

let time = 0;
class Context extends StandInContext {
  constructor() {
    super(() => time);
  }
}
const beat = 0.5;

test("a device's params as they play: a copy of its start, handed out as copies, set by param; its start kept, for a reset", () => {
  const devices = new DeviceParams({ beat: () => beat });
  devices.add('tap/utility', { start: { level: 0.5, pan: 0 }, ports: INSERTS.utility.ports });
  assert.deepEqual([devices.has('tap/utility'), devices.has('you/utility')], [true, false], 'a device added, one not');
  assert.deepEqual(devices.current('tap/utility'), { level: 0.5, pan: 0 }, 'at its start');
  devices.set('tap/utility', 'level', 0.25);
  assert.deepEqual(devices.current('tap/utility'), { level: 0.25, pan: 0 }, 'set, with no chain playing it yet');
  devices.current('tap/utility').level = 2;
  assert.equal(devices.current('tap/utility').level, 0.25, 'handed out as a copy');
  assert.deepEqual(devices.start('tap/utility'), { level: 0.5, pan: 0 }, 'its start kept');
});

test('a param set on the chain that plays it: at the port its module declares, gliding; the chain rebuilt where it has none, playing the change', () => {
  mock.timers.enable({ apis: ['setTimeout'] }); // an old chain rings out before it's let go
  try {
    time = 10;
    const engine = new Engine({ AudioContext: Context });
    const biquads = () => engine.audioContext.rec.nodes.filter((node) => node.kind === 'biquad');
    const devices = new DeviceParams({ beat: () => beat });
    devices.add('tap/utility', { start: { level: 0.5, pan: 0 }, ports: INSERTS.utility.ports });
    devices.add('tap/air', { start: { q: 0.707, cutoff: 2000 }, ports: INSERTS.filter.ports });
    const utility = chainOf(engine, devices, 'tap/utility', UTILITY);
    const air = chainOf(engine, devices, 'tap/air', FILTER);
    assert.equal(utility.paramOf('gain.gain').value, 0.5, 'built at its params as they play');
    devices.set('tap/utility', 'level', 0.25);
    assert.deepEqual(
      utility.paramOf('gain.gain').events.at(-1),
      ['target', 0.25, 10, MOVE_GLIDE],
      'at its port, gliding',
    );
    const built = biquads().length;
    devices.set('tap/air', 'q', 2);
    assert.equal(biquads().length, built + 1, 'a resonance has no port: its chain rebuilt');
    assert.deepEqual(
      [biquads().at(-1).Q.value, air.paramOf('filter.frequency').value],
      [2, 2000],
      'playing the change, the rest as it was',
    );
  } finally {
    mock.timers.reset();
  }
});

test('a param declared in beats, tempo-synced: played as the note length it matches, or seconds at the beat where none does', () => {
  const devices = new DeviceParams({ beat: () => beat });
  devices.add('delay 1/delay', { start: { time: '1/8' }, specs: { time: TEMPO_TIME } });
  devices.set('delay 1/delay', 'time', 0.75);
  assert.equal(devices.current('delay 1/delay').time, '1/8.', 'three quarters of a beat: a dotted 8th');
  devices.set('delay 1/delay', 'time', 0.3);
  assert.equal(devices.current('delay 1/delay').time, 0.15, 'no note length: seconds at the beat');
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
