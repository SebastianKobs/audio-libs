// What's chosen in the composites a view shows (mockup/src/libs/view/models/chosen.ts): each rack's pad, by the rack's key; each group's
// tab, by its composite's key and the group's title; none until chosen; the device view's own, for the composites it shows
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chosen, DevicePanel } from '../index.ts';

test("a rack's pad and a group's tab, none until chosen, each kept apart by its keys", () => {
  const chosen = new Chosen();
  assert.equal(chosen.padOf('tap'), undefined);
  assert.equal(chosen.tabOf('pluck', 'sources'), undefined);
  chosen.choosePad('tap', 'pluck b');
  chosen.chooseTab('pluck b', 'sources', 'osc 2');
  chosen.chooseTab('pluck a', 'sources', 'noise');
  assert.equal(chosen.padOf('tap'), 'pluck b');
  assert.equal(chosen.padOf('hold'), undefined, 'another rack');
  assert.equal(chosen.tabOf('pluck b', 'sources'), 'osc 2');
  assert.equal(chosen.tabOf('pluck a', 'sources'), 'noise', "another composite's");
  assert.equal(chosen.tabOf('pluck b', 'stages'), undefined, 'another group');
});

test("the device view's own, for the composites it shows, kept as it's opened and closed", () => {
  const view = new DevicePanel({ chains: {} });
  view.chosen.choosePad('tap', 'pluck b');
  view.open('tap', 'instruments:tap');
  view.close();
  assert.equal(view.chosen.padOf('tap'), 'pluck b');
});
