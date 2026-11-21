// The device view as a model (modular-audio/view/device/models/device-panel.ts): what's open, by a kind and what of it, its title and the
// slot marked; the chain of devices its kind is filled with; opened, opened over and closed, whoever listens told each time
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevicePanel } from '../index.ts';

// the chains of the test's own, by their kinds
const CHAINS = { instruments: 'the instruments', strip: 'the inserts' };

test("opened by a kind and what of it: its title, its kind, what of it, the slot marked, none unless said; its kind's chain", () => {
  const view = new DevicePanel({ chains: CHAINS });
  assert.equal(view.opened, null, 'closed at first');
  assert.equal(view.chain, undefined);
  view.open('tap', 'instruments:tap,hold');
  assert.deepEqual(view.opened, { title: 'tap', kind: 'instruments', which: 'tap,hold', mark: -1 });
  assert.equal(view.chain, 'the instruments');
  view.open('reverb', 'strip:returns:reverb', 2);
  assert.deepEqual(
    view.opened,
    { title: 'reverb', kind: 'strip', which: 'returns:reverb', mark: 2 },
    'what of it: all after the kind',
  );
  assert.equal(view.chain, 'the inserts');
});

test("a kind with no chain opens empty; closed, nothing open; whoever listens told as it's opened and closed; the kinds and their chains", () => {
  const view = new DevicePanel({ chains: CHAINS });
  const told = [];
  view.onChange(() => told.push(view.opened?.title ?? null));
  view.open('nothing', 'clips:x');
  assert.equal(view.chain, undefined, 'no chain: an empty view');
  view.close();
  assert.equal(view.opened, null);
  assert.deepEqual(told, ['nothing', null]);
  assert.deepEqual(view.chains, [
    ['instruments', 'the instruments'],
    ['strip', 'the inserts'],
  ]);
});
