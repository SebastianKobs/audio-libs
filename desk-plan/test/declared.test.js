// A param's declaration found in a desk's data, by its key (mockup/src/libs/desk-plan/declared.ts, U2c5c2): a strip's own and a send the
// strip's; a slot's, the device the data puts there, a desk strip's, the master's or a track's template's, its params from a registry; an
// FX channel's chain's module's, its effect's own; none where nothing declares it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEND_PARAM, STRIP_PARAMS, declaredIn } from '../index.ts';

const level = { name: 'gain', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
const cutoff = { name: 'cutoff', unit: 'Hz', range: [20, 24000, 1], taper: 'octaves' };
const gain = { name: 'gain', unit: 'dB', range: [0, 24, 0.1] };
const time = { name: 'time', unit: 'beats', range: [1 / 6, 3, 0.001], taper: 'octaves' };

test("a param's declaration in a desk's data, by its key: the strip's own, a send, a slot's device's from the registry, a desk strip's, the master's or a track's template's; an FX chain's module's its effect's; none where nothing declares it", () => {
  const declared = declaredIn({
    desk: [
      {
        fx: 'delay',
        chain: [{ effect: 'echo', params: { time: '1/8' } }],
        inserts: [{ slot: 'utility', device: 'utility' }],
      },
      { bus: 'sings' },
    ],
    master: { inserts: [{ slot: 'limiter', device: 'limiter' }] },
    templateOf: (strip) => (strip === 'replay 1' ? { inserts: [{ slot: 'air', device: 'filter' }] } : null),
    devices: { utility: { params: { level } }, filter: { params: { cutoff } }, limiter: { params: { gain } } },
    effects: (effect) => (effect === 'echo' ? { time } : undefined),
  });
  assert.equal(declared({ strip: 'sings', param: 'volume' }), STRIP_PARAMS.volume, "a strip's own");
  assert.equal(declared({ strip: 'delay', slot: 'send', param: 'reverb' }), SEND_PARAM, 'a send');
  assert.equal(declared({ strip: 'delay', slot: 'utility', param: 'level' }), level, "a desk strip's slot");
  assert.equal(declared({ strip: 'master', slot: 'limiter', param: 'gain' }), gain, "the master's");
  assert.equal(declared({ strip: 'replay 1', slot: 'air', param: 'cutoff' }), cutoff, "a track's template's");
  assert.equal(
    declared({ strip: 'delay', slot: 'echo', param: 'time' }),
    time,
    "an FX channel's chain's module, its effect's own",
  );
  assert.deepEqual(
    [
      declared({ strip: 'replay 1', slot: 'dull', param: 'cutoff' }),
      declared({ strip: 'nowhere', slot: 'air', param: 'cutoff' }),
      declared({ strip: 'sings', slot: 'utility', param: 'level' }),
    ],
    [undefined, undefined, undefined],
    'a slot its strip lacks, a strip nothing knows',
  );
});
