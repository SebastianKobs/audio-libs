// The session view and the arrangement as a model (mockup/src/libs/view/tracks/models/views.ts): one open at a time, or none, a tab each
// opening and closing it; another's closing as this one opens leaves it shown; whoever listens told as it changes
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Views } from '../index.ts';

test("none open at first; a tab opened shows its view, the other's closing after leaves it, its own closing shows none", () => {
  const views = new Views();
  const told = [];
  views.onShow((view) => told.push(view));
  assert.equal(views.shown, null);
  views.tab('session', true);
  views.tab('arrangement', true);
  views.tab('session', false);
  assert.equal(views.shown, 'arrangement', "the session's closing as the arrangement opened");
  views.tab('arrangement', false);
  assert.equal(views.shown, null);
  assert.deepEqual(told, ['session', 'arrangement', null], 'told as it changes, not on a closing that changes nothing');
});
