// When the session view is drawn (mockup/src/libs/view/tracks/dom/session-drawing.ts), in node, on a clock, views and drawers of
// the test's own:
//   - on every beat while it's shown, the clip tracks told the beat; none while it's hidden;
//   - as it's shown, with what sounded in the last beat; the device view closed as both views hide;
//   - playing back, the grid held, a beat after the last drawing, on a frame;
//   - held while a pointer is pressed on it, a beat's drawing skipped, not the clip tracks' beat;
//   - on every frame while it's shown, the level bars and the device view's knobs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionDrawing } from '../index.ts';
import { Views } from '../../models/index.ts';

// a clock of the test's own: its time, a beat a second, its 16ths handed out by step()
function testClock(stepsPerBeat = 4) {
  const listeners = [];
  return {
    t: 0,
    now() {
      return this.t;
    },
    grid: { beatDuration: () => 1, stepsPerBeat: () => stepsPerBeat },
    onStep: (listener) => listeners.push(listener),
    step(i) {
      listeners.forEach((listener) => listener(i, this.t));
    },
  };
}
// The session view's drawing, its drawers recording what they're asked.
// The session tells the window of time it's asked for, as what it saw.
function drawing({ playingBack = false, stepsPerBeat = 4 } = {}) {
  const clock = testClock(stepsPerBeat);
  const views = new Views();
  const asked = { looks: [], beats: [], levels: [], refreshed: 0, closed: 0, lit: [] };
  const flow = new EventTarget();
  const page = new EventTarget();
  const transport = { playingBack };
  const session = {
    at: (t, since) => {
      asked.looks.push([t, since]);
      return {};
    },
  };
  const drawer = new SessionDrawing({
    clock,
    frameStep: () => 0.016,
    views,
    transport,
    session,
    tracks: { groups: () => [], sounded: () => new Set(['heard']) },
    clipTracks: {
      setBeat: (beat) => asked.beats.push(beat),
      draw: () => {},
      section: { light: (heard) => asked.lit.push([...heard]) },
    },
    deskView: { draw: () => {}, drawLevels: (dt) => asked.levels.push(dt), light: () => {} },
    devicePanel: { close: () => asked.closed++ },
    devicePanelView: { refresh: () => asked.refreshed++ },
    flow,
    page,
  });
  return { drawer, clock, views, asked, flow, page, transport };
}

test("on every beat while it's shown, the clip tracks told the beat, with what sounded since the last look; none while hidden", () => {
  const { clock, views, asked } = drawing();
  clock.step(4);
  assert.deepEqual(asked.looks, [], 'hidden');
  views.tab('session', true);
  clock.t = 5;
  clock.step(5);
  clock.step(8);
  assert.deepEqual(asked.beats, [2], 'only on a beat');
  assert.deepEqual(asked.looks.at(-1), [5, 0], 'since it was shown, a beat back');
  assert.deepEqual(asked.lit.at(-1), ['heard'], 'the clip tracks lit by what sounded');
});

test("in 6/8 a beat every two 16ths: the clip tracks told each beat, by the meter's unit", () => {
  const { clock, views, asked } = drawing({ stepsPerBeat: 2 });
  views.tab('session', true);
  clock.step(5);
  clock.step(6);
  assert.deepEqual(asked.beats, [3]);
});

test('as it shows, drawn with what sounded in the last beat; the device view closed as both views hide', () => {
  const { clock, views, asked } = drawing();
  clock.t = 10;
  views.tab('session', true);
  assert.deepEqual(asked.looks, [[10, 9]]);
  views.tab('arrangement', true);
  assert.equal(asked.looks.length, 1, 'the arrangement shown: not drawn');
  assert.equal(asked.closed, 0);
  views.tab('arrangement', false);
  assert.equal(asked.closed, 1);
});

test('playing back, the grid held: drawn on a frame a beat after the last drawing', () => {
  const { drawer, clock, views, asked, transport } = drawing({ playingBack: true });
  views.tab('session', true);
  const live = asked.looks.length;
  clock.t = 0.5;
  drawer.drawLive();
  assert.equal(asked.looks.length, live, 'half a beat on');
  clock.t = 1;
  drawer.drawLive();
  assert.deepEqual(asked.looks.at(-1), [1, 0]);
  transport.playingBack = false;
  clock.t = 3;
  drawer.drawLive();
  assert.equal(asked.looks.length, live + 1, 'live: drawn on the beats');
});

test("held while a pointer is pressed on it: a beat's drawing skipped, not the clip tracks' beat; let go anywhere on the page", () => {
  const { clock, views, asked, flow, page } = drawing();
  views.tab('session', true);
  const shown = asked.looks.length;
  flow.dispatchEvent(new Event('pointerdown'));
  clock.step(4);
  assert.equal(asked.looks.length, shown);
  assert.deepEqual(asked.beats, [1]);
  page.dispatchEvent(new Event('pointerup'));
  clock.step(8);
  assert.equal(asked.looks.length, shown + 1);
});

test("on every frame while it's shown, the level bars by the frame's step and the device view's knobs", () => {
  const { drawer, views, asked } = drawing();
  drawer.drawLive();
  assert.deepEqual(asked.levels, [], 'hidden');
  views.tab('session', true);
  drawer.drawLive();
  assert.deepEqual(asked.levels, [0.016]);
  assert.equal(asked.refreshed, 1);
});
