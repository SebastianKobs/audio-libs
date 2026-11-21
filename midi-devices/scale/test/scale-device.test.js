// The Scale device's unit tests (midi-devices/scale/): a MIDI insert mapping each note from the key it arrives in into the
// key chosen, its glides with it, every other message passed on unchanged
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScaleDevice } from '../index.ts';
import { SCALES, degreeNote } from '../../../music/music-theory/index.ts';
import { choiceIndex } from '../../../base/params/index.ts';
import { near } from '../../../base/util/test/near.js';

// the moods' keys, as data: a library can't import an app's config
const KEYS = {
  Dreamy: { root: 62, scale: SCALES.majorPentatonic },
  Warm: { root: 55, scale: SCALES.minorPentatonic },
  Bright: { root: 67, scale: SCALES.lydian },
  Supreme: { root: 65, scale: SCALES.minorPentatonic },
  Stimmung: { root: 58, scale: [8, 9, 10, 12, 14].map((h) => 12 * Math.log2(h / 8)) },
};

// a device whose notes arrive in the key from, starting in the key named start; what it plays into, collected
function deviceFrom(from, start) {
  const played = [];
  const device = new ScaleDevice({
    keys: KEYS,
    start,
    from,
    into: { receive: (messages) => played.push(...messages) },
  });
  return { device, played };
}
function noteOn(index, pitch, t = 0) {
  return { type: 'note on', index, pitch, velocity: 1, t };
}
function noteOff(index, t = 1) {
  return { type: 'note off', index, t };
}
function pitchOf(index, value, t = 0) {
  return { type: 'per-note controller', index, controller: 'pitch', value, t };
}
function controller(name, value, t = 0) {
  return { type: 'controller', controller: name, value, t };
}

test('a note pitched as a step of its key comes out as that step of the key chosen, for every pair of the moods, two octaves either side', () => {
  for (const [fromName, from] of Object.entries(KEYS)) {
    for (const [toName] of Object.entries(KEYS)) {
      for (let step = -2 * from.scale.length; step <= 2 * from.scale.length; step++) {
        const { device, played } = deviceFrom(from, toName);
        device.receive([noteOn(0, degreeNote(step, from))]);
        near(played[0].pitch, degreeNote(step, KEYS[toName]), `${fromName} step ${step} into ${toName}`);
      }
    }
  }
});

test('a pitch outside its key moves as the step below it does', () => {
  const { device, played } = deviceFrom(KEYS.Dreamy, 'Bright');
  device.receive([noteOn(0, degreeNote(1, KEYS.Dreamy) + 1)]);
  near(played[0].pitch, degreeNote(1, KEYS.Bright) + 1, 'a quarter tone above step 1');
});

test('a key controller changes the key from the next note on: notes before it in its batch keep the old key', () => {
  const { device, played } = deviceFrom(KEYS.Dreamy, 'Dreamy');
  const step = degreeNote(2, KEYS.Dreamy);
  device.receive([noteOn(0, step), controller('key', choiceIndex(device.spec, 'Bright')), noteOn(1, step)]);
  near(played[0].pitch, step, 'before: the old key');
  near(played[1].pitch, degreeNote(2, KEYS.Bright), 'after: the new key');
  assert.equal(played.length, 2, 'the key controller is not passed on');
  device.receive([noteOn(2, step)]);
  near(played[2].pitch, degreeNote(2, KEYS.Bright), 'the next batch keeps the new key');
});

test("the key is a param declared as a plugin's: a choice among the keys handed in, by name, starting in the one given", () => {
  const { device } = deviceFrom(KEYS.Dreamy, 'Warm');
  assert.equal(device.spec.name, 'key');
  assert.deepEqual(device.spec.choices, Object.keys(KEYS));
  assert.equal(device.spec.default, 'Warm');
});

test("a note's pitch controller, its glide, moves by that note's own shift, found by its index", () => {
  const { device, played } = deviceFrom(KEYS.Dreamy, 'Bright');
  device.receive([noteOn(0, degreeNote(1, KEYS.Dreamy)), noteOn(1, degreeNote(4, KEYS.Dreamy))]);
  device.receive([pitchOf(0, degreeNote(3, KEYS.Dreamy), 0.5)]);
  const glide = played[2];
  assert.equal(glide.index, 0);
  assert.equal(glide.controller, 'pitch');
  const shiftOfStep1 = degreeNote(1, KEYS.Bright) - degreeNote(1, KEYS.Dreamy);
  near(glide.value, degreeNote(3, KEYS.Dreamy) + shiftOfStep1, "moved by step 1's shift, not step 4's");
  assert.equal(glide.t, 0.5);
});

test('the shift of a note stays after its note off, as its voice still rings out, and goes at its detach', () => {
  const { device, played } = deviceFrom(KEYS.Dreamy, 'Bright');
  device.receive([noteOn(0, degreeNote(1, KEYS.Dreamy))]);
  device.receive([noteOff(0), pitchOf(0, 60)]);
  near(
    played[2].value,
    60 + (degreeNote(1, KEYS.Bright) - degreeNote(1, KEYS.Dreamy)),
    'after its note off: still moved',
  );
  device.receive([{ type: 'per-note management', index: 0, detach: true, t: 2 }, pitchOf(0, 60, 2)]);
  assert.equal(played.at(-1).value, 60, 'detached: the index forgotten, its glide passed unchanged');
});

test('every other message passes on unchanged, in its order', () => {
  const { device, played } = deviceFrom(KEYS.Dreamy, 'Bright');
  const messages = [
    noteOff(3),
    { type: 'per-note controller', index: 3, controller: 'volume', value: 0.5, t: 0 },
    controller('cutoff', 0.3),
    { type: 'per-note management', index: 3, detach: true, t: 2 },
  ];
  device.receive(messages);
  assert.deepEqual(played, messages);
});
