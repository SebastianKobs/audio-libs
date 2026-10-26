// The holding (mockup/src/libs/sequencing/sequencer/holding.ts): how long the plays on one track hold it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Holding } from '../index.ts';

test('a track held until the latest end of its plays, never while one is held open; held open, until it is ended', () => {
  const holding = new Holding();
  assert.equal(holding.until, -Infinity, 'nothing on it: free');
  holding.add(4);
  holding.add(3);
  assert.equal(holding.until, 4, 'the later end');
  holding.add(Infinity);
  assert.equal(holding.until, Infinity, 'one held open');
  holding.end(3.5);
  assert.equal(holding.until, 4, 'ended before another rang out: that one');
  holding.add(Infinity);
  holding.end(6);
  assert.equal(holding.until, 6, 'ended after: its end');
});
