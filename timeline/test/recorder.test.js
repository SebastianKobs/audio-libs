// The timeline's event recorder (mockup/src/libs/timeline/; mockup/architecture/tests.md), on events of their own, not notes: a hand's
// presses, as the gesture tracker could keep them, each held open until its release, a stroke's a region by its number, and a pointer's
// pressure as a lane
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventRecorder } from '../index.ts';

// a press: when, by which finger, and how long, none while it's held
function press(t, finger, duration) {
  if (duration === undefined) {
    return { t, finger };
  }
  return { t, finger, duration };
}
const fingered = (finger) => (event) => event.finger === finger;

test("an element's events into its region by its number, from its first event to its last one's end; another number another region; with none, a region of its own each time; in the order they began", () => {
  const recorder = new EventRecorder();
  const hand = { name: 'hand' };
  recorder.record(hand, 1, 'first stroke', [press(1, 0, 0.5)]);
  recorder.record(hand, 1, 'what began it is kept from its first', [press(2, 1, 0.25)]);
  recorder.record(hand, 2, 'second stroke', [press(3, 0, 1)]);
  recorder.record(hand, undefined, 'a tap', [press(5, 0, 0.5)]);
  recorder.record(hand, undefined, 'another tap', [press(6, 0, 0.5)]);
  recorder.record(hand, 3, 'nothing', []);
  const regions = recorder.regions(10);
  assert.deepEqual(
    regions.map(({ header, number, from, to }) => [header, number, from, to]),
    [
      ['first stroke', 1, 1, 2.25],
      ['second stroke', 2, 3, 4],
      ['a tap', undefined, 5, 5.5],
      ['another tap', undefined, 6, 6.5],
    ],
  );
  assert.equal(regions[0].element, hand);
  assert.deepEqual(regions[0].events, [press(1, 0, 0.5), press(2, 1, 0.25)], 'its events as they came');
});

test('an event held open until its end is told, never ending before it starts; an open one runs its region on', () => {
  const recorder = new EventRecorder();
  const hand = {};
  recorder.record(hand, 1, 'held', [press(1, 0)]);
  assert.equal(recorder.regions(2)[0].to, Infinity, 'open: no end yet');
  const held = recorder.openEventOf(hand, fingered(0));
  recorder.endAt(held, 3);
  assert.equal(held.duration, 2);
  assert.equal(recorder.regions(4)[0].to, 3);
  assert.equal(recorder.openEventOf(hand, fingered(0)), undefined, 'none open once ended');
  recorder.record(hand, 1, 'held', [press(5, 1)]);
  const early = recorder.openEventOf(hand, fingered(1));
  recorder.endAt(early, 4);
  assert.equal(early.duration, 0, 'let go before it began: no length, never less');
});

test("an element's latest open event that matches, from its latest region back, the first open there; its latest event, open or not, the last there; never another element's", () => {
  const recorder = new EventRecorder();
  const hand = {};
  const other = {};
  recorder.record(hand, 1, 'one', [press(1, 0, 1)]);
  recorder.record(hand, 2, 'two', [press(3, 0, 1)]);
  recorder.record(other, 1, 'its own', [press(4, 0)]);
  assert.equal(recorder.latestEventOf(hand, fingered(0)).t, 3, 'the latest region first');
  assert.equal(recorder.openEventOf(hand, fingered(0)), undefined, "none open; the other element's isn't the hand's");
  recorder.record(hand, 2, 'two', [press(5, 0), press(6, 0)]);
  assert.equal(recorder.openEventOf(hand, fingered(0)).t, 5, 'the first open in its region');
  assert.equal(recorder.latestEventOf(hand, fingered(0)).t, 6, 'the last in its region');
  assert.equal(recorder.latestEventOf(hand, fingered(9)), undefined);
});

test("an event still open as its element's next numbered region begins ends there and is carried into it, after its own events, as carry() makes it; not into a region with no number", () => {
  const recorder = new EventRecorder({ carry: (event, at) => ({ finger: event.finger, t: at, carried: true }) });
  const hand = {};
  recorder.record(hand, 1, 'one', [press(1, 0), press(1.5, 1, 0.5)]);
  recorder.record(hand, undefined, 'a tap of its own', [press(2, 2, 0.5)]);
  assert.equal(
    recorder.openEventOf(hand, fingered(0)).duration,
    undefined,
    'still open: a region with no number carries nothing',
  );
  recorder.record(hand, 2, 'two', [press(3, 3, 1)]);
  const [one, , two] = recorder.regions(10);
  assert.equal(one.events[0].duration, 2, 'ended where the next began');
  assert.deepEqual(
    two.events,
    [press(3, 3, 1), { finger: 0, t: 3, carried: true }],
    'its own first, then the one carried',
  );
});

test('carried as it is by default: from where the next region begins, open, its own lanes staying with the one ended', () => {
  const recorder = new EventRecorder();
  const hand = {};
  recorder.record(hand, 1, 'one', [press(1, 0)]);
  recorder.placeOnEvent(recorder.latestEventOf(hand, fingered(0)), 'pressure', { t: 1.5, value: 0.4 });
  recorder.record(hand, 2, 'two', [press(3, 1, 1)]);
  const [one, two] = recorder.regions(10);
  assert.deepEqual(one.events, [{ t: 1, finger: 0, duration: 2, lanes: { pressure: [{ t: 1.5, value: 0.4 }] } }]);
  assert.deepEqual(two.events[1], { t: 3, finger: 0 });
});

test('a lane by an id of its own, made the first time a point comes for it, its points in time order, one after those at its time, as Web Audio places an event', () => {
  const recorder = new EventRecorder();
  const pressure = { pointer: 1, what: 'pressure' };
  recorder.placeOnLane(pressure, { t: 2, value: 0.5 });
  recorder.placeOnLane(pressure, { t: 1, value: 0.2 });
  recorder.placeOnLane({ pointer: 1, what: 'pressure' }, { t: 2, value: 0.7, glide: 0.1 });
  recorder.placeOnLane({ pointer: 2, what: 'pressure' }, { t: 1, value: 1 });
  assert.deepEqual(recorder.lanes(1.5), [
    {
      pointer: 1,
      what: 'pressure',
      points: [
        { t: 1, value: 0.2 },
        { t: 2, value: 0.5 },
        { t: 2, value: 0.7, glide: 0.1 },
      ],
    },
    { pointer: 2, what: 'pressure', points: [{ t: 1, value: 1 }] },
  ]);
});

test('a point that changes nothing, a jump to the value it jumped to, a glide to it by the same time constant, left out once it is a second past; one not settled yet kept', () => {
  const recorder = new EventRecorder();
  const lane = { what: 'pressure' };
  for (const point of [
    { t: 1, value: 0.5 },
    { t: 2, value: 0.5 },
    { t: 3, value: 0.5, glide: 0.1 },
    { t: 4, value: 0.5, glide: 0.1 },
    { t: 5, value: 0.5, glide: 0.2 },
    { t: 10, value: 0.5, glide: 0.2 },
  ]) {
    recorder.placeOnLane(lane, point);
  }
  assert.deepEqual(recorder.lanes(10.5)[0].points, [
    { t: 1, value: 0.5 },
    { t: 3, value: 0.5, glide: 0.1 },
    { t: 5, value: 0.5, glide: 0.2 },
    { t: 10, value: 0.5, glide: 0.2 },
  ]);
});

test("an event's own lanes, by name, in time order, thinned against where each starts, as startOf() says", () => {
  const recorder = new EventRecorder({ startOf: (event, lane) => event.start?.[lane] });
  const hand = {};
  recorder.record(hand, 1, 'pressed', [{ t: 1, finger: 0, duration: 5, start: { pressure: 0.3 } }]);
  const pressed = recorder.latestEventOf(hand, fingered(0));
  recorder.placeOnEvent(pressed, 'pressure', { t: 3, value: 0.6 });
  recorder.placeOnEvent(pressed, 'pressure', { t: 2, value: 0.3 });
  recorder.placeOnEvent(pressed, 'pressure', { t: 4, value: 0.6 });
  recorder.placeOnEvent(pressed, 'tilt', { t: 2, value: 0 });
  recorder.regions(10);
  assert.deepEqual(pressed.lanes, { pressure: [{ t: 3, value: 0.6 }], tilt: [{ t: 2, value: 0 }] });
});

test("kept for its window: an event ended before it let go, and a region with none, its number free again; an open one kept; a lane's points before it let go but its last, its value from then", () => {
  const recorder = new EventRecorder({ keep: 10 });
  const hand = {};
  const holding = {};
  recorder.record(hand, 1, 'old', [press(1, 0, 1)]);
  recorder.record(holding, 1, 'held on', [press(2, 0)]);
  for (const [t, value] of [
    [1, 1],
    [3, 2],
    [15, 3],
  ]) {
    recorder.placeOnLane({ what: 'pressure' }, { t, value });
  }
  assert.deepEqual(
    recorder.regions(20).map(({ header }) => header),
    ['held on'],
  );
  assert.deepEqual(recorder.lanes(20)[0].points, [
    { t: 3, value: 2 },
    { t: 15, value: 3 },
  ]);
  recorder.record(hand, 1, 'new', [press(21, 0, 1)]);
  assert.deepEqual(
    recorder.regions(22).map(({ header }) => header),
    ['held on', 'new'],
    'its number a new region',
  );
});

test("what's past the window let go as events come, without asking for the regions", () => {
  const recorder = new EventRecorder({ keep: 10 });
  const hand = {};
  recorder.record(hand, 1, 'old', [press(1, 0, 1)]);
  recorder.record({}, undefined, 'much later', [press(100, 0, 1)]);
  assert.equal(recorder.latestEventOf(hand, fingered(0)), undefined);
});
