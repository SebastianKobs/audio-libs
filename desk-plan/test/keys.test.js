// A parameter's key (mockup/src/libs/desk-plan/keys.ts, U2c4b1a): where on a desk a parameter is, as data and as text, a strip's own,
// a send by its return's name or a slot's param; and its spec, as its strip or its slot's device declares it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEND, SEND_PARAM, STRIP_PARAMS, keyOf, keyText, specOf } from '../index.ts';

test("a parameter's key: a strip's own, a send by its return's name, a slot's param; as text its parts joined by slashes, and back", () => {
  const keys = [
    { strip: 'my tap 1', param: 'volume' },
    { strip: 'you', slot: SEND, param: 'far reverb' },
    { strip: 'tap', slot: 'utility', param: 'level' },
  ];
  assert.deepEqual(keys.map(keyText), ['my tap 1/volume', 'you/send/far reverb', 'tap/utility/level']);
  assert.deepEqual(keys.map(keyText).map(keyOf), keys);
});

test("a key's spec, as declared: a strip's own and a send's the strip's, a slot's its device's; none where nothing declares it", () => {
  const level = { name: 'gain', range: [-60, 6, 0.1], dB: true, taper: 'fader' };
  const slots = (strip, slot) => (strip === 'tap' && slot === 'utility' ? { level } : undefined);
  assert.equal(specOf({ strip: 'tap', param: 'pan' }, slots), STRIP_PARAMS.pan, "a strip's own");
  assert.equal(specOf({ strip: 'tap', slot: SEND, param: 'reverb' }, slots), SEND_PARAM, 'a send');
  assert.equal(specOf({ strip: 'tap', slot: 'utility', param: 'level' }, slots), level, "a slot's, its device's");
  assert.equal(specOf({ strip: 'tap', slot: 'air', param: 'cutoff' }, slots), undefined, 'a slot it has no device for');
  assert.equal(specOf({ strip: 'tap', param: 'nothing' }, slots), undefined, 'a param no strip has');
});
