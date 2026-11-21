// base/util/live-copies.ts: values kept live by name, as a device's, copies of their start
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveCopies } from '../index.ts';

test("values kept live by name, as a device's: copies of their start, set in place so what holds one hears the change, read as copies, reset to their start; each set told", () => {
  const copies = new LiveCopies({ reverb: { mix: 0.3, tail: { length: 2 } } });
  const live = copies.of('reverb');
  const tail = live.tail;
  const told = [];
  copies.onSet((name, value) => told.push([name, value.mix]));
  copies.set('reverb', { mix: 0.5, tail: { length: 3 } });
  assert.deepEqual([live.mix, tail.length, copies.of('reverb') === live], [0.5, 3, true], 'in place, all the way down');
  const copy = copies.current('reverb');
  copy.mix = 9;
  assert.equal(copies.of('reverb').mix, 0.5, 'a copy, its own');
  copies.reset('reverb');
  assert.deepEqual([live.mix, copies.start('reverb').mix], [0.3, 0.3], 'its start');
  copies.add('delay', { time: 0.25 });
  assert.deepEqual(
    [copies.has('delay'), copies.current('delay'), copies.of('nothing')],
    [true, { time: 0.25 }, undefined],
  );
  assert.deepEqual(told, [
    ['reverb', 0.5],
    ['reverb', 0.3],
  ]);
});
