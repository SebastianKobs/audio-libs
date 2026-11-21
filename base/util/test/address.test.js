// base/util/address.ts: an address, a path of names, as text and back, and one under another
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressOf, addressText, isUnder, under } from '../index.ts';

test("an address as text, its names joined by slashes, and back; a parent's name put in front; a name with a slash refused", () => {
  assert.equal(addressText(['desk', 'channel 3', 'utility', 'level']), 'desk/channel 3/utility/level');
  assert.deepEqual(addressOf('desk/channel 3/utility/level'), ['desk', 'channel 3', 'utility', 'level']);
  assert.deepEqual(under('desk', ['channel 3', 'utility', 'level']), ['desk', 'channel 3', 'utility', 'level']);
  assert.throws(() => addressText(['send/reverb', 'level']), /send\/reverb/);
  assert.throws(() => under('a/b', ['level']), /a\/b/);
});

test('an address under another, as text: a name further down, not the other itself; every one under the top, the empty text', () => {
  assert.ok(isUnder('desk/tap/level', 'desk/tap'));
  assert.ok(!isUnder('desk/tap', 'desk/tap'));
  assert.ok(!isUnder('desk/tapping', 'desk/tap'));
  assert.ok(isUnder('desk', ''));
  assert.ok(!isUnder('', ''));
});
