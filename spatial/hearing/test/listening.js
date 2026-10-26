// A listener of the test's own, and what the hearing's tests read of it, for every package's tests:
//   - setup(): a space with a plain distance, no wrap, and 10 units to either side as full;
//   - heardAs(): a case of the test vectors held against a model;
//   - onFloor(): a place on the floor, y up; nothing: the hears of an emitter whose values aren't looked at.
import assert from 'node:assert/strict';
import { Space } from '../index.ts';

export const r10 = (value) => +value.toPrecision(10);
export const onFloor = (x, z) => ({ x, y: 0, z });
export const nothing = () => {};

export function heardAs(vectorCase, model) {
  vectorCase.d.forEach((distance, i) => {
    const heard = model(distance);
    assert.deepEqual(
      [r10(heard.level), r10(heard.cutoff), r10(heard.room)],
      [vectorCase.level[i], vectorCase.cutoff[i], vectorCase.room[i]],
      `${JSON.stringify(vectorCase.settings)}, at ${distance}`,
    );
  });
}

export function setup(more = {}) {
  const at = { x: 0, z: 0 };
  const hearingSettings = { range: 8, hearing: 40, falloff: 1, dull: 1, room: 1, width: 0.6, ...more };
  const space = new Space({
    settings: hearingSettings,
    listener: {
      distance: ({ x, z }) => Math.hypot(x - at.x, z - at.z),
      side: ({ x }) => Math.max(-1, Math.min(1, (x - at.x) / 10)),
    },
  });
  return { at, hearingSettings, space };
}
