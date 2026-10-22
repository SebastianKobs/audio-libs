// Keys turned from where each starts (mockup/src/libs/modular-audio/view/desk/models/toggles.ts): a section folded, a group unfolded, a track's lanes
// opened; one turned alone, or every one handed in turned as the one clicked goes
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Toggles } from '../index.ts';

test('none turned at first; one turned, and back', () => {
  const toggles = new Toggles();
  assert.equal(toggles.has('bus'), false);
  toggles.turn('bus');
  assert.equal(toggles.has('bus'), true);
  toggles.turn('bus');
  assert.equal(toggles.has('bus'), false);
});

test('every one handed in turned as the one clicked goes: in if it was out, out if it was in; the keys turned', () => {
  const toggles = new Toggles();
  toggles.turn('fx');
  toggles.turn('bus', ['clip', 'bus', 'fx']);
  assert.deepEqual([...toggles.keys].sort(), ['bus', 'clip', 'fx'], 'bus was out: every one in');
  toggles.turn('clip', ['clip', 'bus', 'fx']);
  assert.deepEqual([...toggles.keys], [], 'clip was in: every one out');
});
