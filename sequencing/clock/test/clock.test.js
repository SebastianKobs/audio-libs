// The clock (sequencing/clock/), on a clock and settings of its own, in fake mode: time moves
// only when a test says, so every result is exact. Audio contexts are stand-ins that say what time they think it is (fake-audio.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { barTicks, beatTicks, Clock, GRIDS, HISTORY, LOOKAHEAD, PPQ, startsBar, STEP } from '../index.ts';
import { fakeAudioOn } from './fake-audio.js';
import { near } from '../../../base/util/test/near.js';

// the tests' settings, read live by their clock as a tool's are: as the tool starts them
const SETTINGS = { bpm: 72, swing: 0, swingOn: '16ths', quantize: '1/16' };

// a clock of the test's own, in fake mode at 100 s, its settings and its stand-in audio contexts
function clockOf() {
  const settings = { ...SETTINGS };
  const clock = new Clock({ settings });
  clock.useFake(100);
  return { clock, settings, fakeAudio: fakeAudioOn(clock) };
}
// the steps the clock sends while fn runs
function stepsDuring(clock, fn) {
  const got = [];
  const off = clock.onStep((i, t) => got.push({ i, t }));
  fn();
  off();
  return got;
}

test('the grid matches the shared test vectors', () => {
  const { clock, settings } = clockOf();
  const { cases } = JSON.parse(readFileSync(new URL('../../../test-vectors/clock/grid.json', import.meta.url), 'utf8'));
  assert.ok(cases.length > 0);
  for (const c of cases) {
    Object.assign(settings, { bpm: c.bpm, swing: c.swing, swingOn: c.swingOn });
    c.steps.forEach((s, k) =>
      near(
        clock.grid.timeAt(s) - clock.grid.timeAt(0),
        c.times[k],
        `${c.bpm} bpm, swing ${c.swing} on ${c.swingOn}, step ${s}:`,
        1e-9,
      ),
    );
  }
});

test('taps land as the shared test vectors say, on every tap grid, next and nearest, straight and swung', () => {
  const { clock, settings, fakeAudio } = clockOf();
  const { cases } = JSON.parse(readFileSync(new URL('../../../test-vectors/clock/taps.json', import.meta.url), 'utf8'));
  assert.ok(cases.length > 0);
  clock.useAudio(fakeAudio());
  clock.advance(1); // a stand-in audio that can start at once, as the vectors have it, and taps from a bar, where every grid meets
  for (const c of cases) {
    Object.assign(settings, { bpm: c.bpm, swing: c.swing, swingOn: c.swingOn, quantize: c.quantize });
    const bar = clock.grid.timeAt(Math.ceil(clock.grid.straightAt(clock.now() + 1) / 16) * 16);
    const opts = { straight: c.tapGrid === 'straight', nearest: c.tapSnap === 'nearest' };
    c.taps.forEach((t, k) => {
      clock.useFake(bar + t);
      const { at, on } = clock.snap(clock.now(), { ...opts, late: c.late });
      const what = `${c.quantize}, ${c.tapGrid}, ${c.tapSnap}, swing ${c.swing}, tap at ${t}:`;
      near(at - bar, c.at[k], `${what} at`, 1e-9);
      near(on - bar, c.on[k], `${what} on`, 1e-9);
    });
  }
});

test('stepAt and timeAt undo each other, swung on 16ths and on 8ths', () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio()); // a started grid: before that it stands at its first 16th
  clock.advance(1);
  for (const swingOn of ['16ths', '8ths']) {
    for (const swing of [0, 0.5, 1, 1.14, 2]) {
      Object.assign(settings, { swing, swingOn });
      for (let s = -8; s <= 40; s += 0.25) {
        near(clock.grid.stepAt(clock.grid.timeAt(s)), s, `swing ${swing} on ${swingOn}:`, 1e-9);
      }
    }
  }
});

test('straightTime and straightAt undo each other: a place sounds unswung, on the beats where the swing plays it too', () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio()); // a started grid: before that it stands at its first 16th
  clock.advance(1);
  for (const swingOn of ['16ths', '8ths']) {
    for (const swing of [0, 1.14, 2]) {
      Object.assign(settings, { swing, swingOn });
      for (let s = -8; s <= 40; s += 0.25) {
        near(clock.grid.straightAt(clock.grid.straightTime(s)), s, `swing ${swing} on ${swingOn}:`, 1e-9);
      }
      for (const s of [0, 4, 8, 36]) {
        near(clock.grid.straightTime(s), clock.grid.timeAt(s), `swing ${swing} on ${swingOn}, the beat at ${s}:`, 1e-9);
      }
    }
  }
  Object.assign(settings, { swing: 1, swingOn: '16ths' });
  assert.ok(clock.grid.timeAt(1) > clock.grid.straightTime(1) + 0.01, 'the second 16th: late swung, on time unswung');
});

test('swing on 16ths moves only the second 16th of each 8th; on 8ths, the second 8th of each beat', () => {
  const { clock, settings } = clockOf();
  Object.assign(settings, { swing: 1, swingOn: '16ths' });
  const sd = clock.grid.stepDuration();
  const at = (s) => (clock.grid.timeAt(s) - clock.grid.timeAt(0)) / sd;
  near(at(1), 4 / 3);
  near(at(2), 2);
  near(at(3), 2 + 4 / 3);
  settings.swingOn = '8ths';
  near(at(2), 8 / 3, 'the "and":', 1e-9);
  near(at(4), 4, 'the next beat:', 1e-9);
  near(at(1), 4 / 3);
});

test("quantize off: a tap plays at once, with the audio's next chunk plus 5 ms, never earlier, even for a time already past", () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  settings.quantize = 'off';
  near(clock.quantize(clock.now()), clock.audio.soonest() + 0.005, '', 1e-12);
  near(clock.quantize(5), clock.audio.soonest() + 0.005, '', 1e-12);
});

test("with swing, a tap lands on the first swung 16th it can, never skipping one that hasn't sounded yet", () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  for (const swingOn of ['16ths', '8ths']) {
    for (const swing of [0.5, 1, 1.14, 2]) {
      for (const q of ['1/16', '1/8']) {
        Object.assign(settings, { swing, swingOn, quantize: q });
        for (let k = 0; k < 120; k++) {
          const t = clock.now() + k * 0.0131;
          const from = Math.max(t, clock.audio.soonest()) + 0.004;
          const at = clock.quantize(t);
          const s = Math.round(clock.grid.stepAt(at));
          near(clock.grid.timeAt(s), at, `${q} with swing ${swing} on ${swingOn}: on the swung grid:`, 1e-9);
          assert.ok(at >= from - 1e-9, `${q} with swing ${swing} on ${swingOn}: ${at} comes before ${from}`);
          const g = q === '1/8' ? 2 : 1;
          const earlier = s - g; // the one before it on the grid must already be too soon
          assert.ok(
            clock.grid.timeAt(earlier) < from - 1e-9,
            `${q} with swing ${swing} on ${swingOn}: skipped step ${earlier} at ${clock.grid.timeAt(earlier)}, still at or after ${from}`,
          );
        }
      }
    }
  }
});

test('every tap grid, straight, whatever the swing: on its grid as if nothing swung, quarters on the beats, triplets three to two beats, a beat or an 8th, and always the next step', () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const sd = clock.grid.stepDuration();
  for (const [q, { g, triplet }] of Object.entries(GRIDS).filter(([, v]) => v)) {
    for (const swingOn of ['16ths', '8ths']) {
      for (const swing of [0, 1, 1.14, 2]) {
        Object.assign(settings, { swing, swingOn, quantize: q });
        const what = `${q} with swing ${swing} on ${swingOn}`;
        for (let k = 0; k < 60; k++) {
          const t = clock.now() + k * 0.0173;
          const from = Math.max(t, clock.audio.soonest()) + 0.004;
          const at = clock.quantize(t, { straight: true });
          const s = clock.grid.straightAt(at);
          near(s / g, Math.round(s / g), `${what}: on its grid:`, 1e-9);
          if (!triplet) {
            near(s, Math.round(s), `${what}: on a straight 16th:`, 1e-9);
          }
          assert.ok(at >= from - 1e-9, `${what}: ${at} comes before ${from}`);
          assert.ok(at - g * sd < from - 1e-9, `${what}: the next step, not a later one`);
          if (!swing) {
            near(at, clock.quantize(t), `${what}: with no swing, straight and swung are the same:`, 1e-9);
          }
        }
      }
    }
  }
  for (const q of ['1/4t', '1/8t', '1/16t']) {
    // and they meet the straight grid again: on every half note, beat and 8th
    const g = GRIDS[q].g;
    const every = { '1/4t': 8, '1/8t': 4, '1/16t': 2 }[q];
    near(3 * g, every, `${q}: three steps:`, 1e-12);
  }
});

test("triplets don't swing: with swing, a triplet tap lands on the straight triplet grid either way", () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  for (const swingOn of ['16ths', '8ths']) {
    for (const swing of [1, 1.14, 2]) {
      for (const q of ['1/4t', '1/8t', '1/16t']) {
        Object.assign(settings, { swing, swingOn, quantize: q });
        for (let k = 0; k < 40; k++) {
          const t = clock.now() + k * 0.0191;
          near(clock.quantize(t), clock.quantize(t, { straight: true }), `${q}, swing ${swing} on ${swingOn}:`, 1e-12);
        }
      }
    }
  }
});

test('nearest: a tap nearer the step just gone sounds at once and belongs to it; nearer the next, or halfway, it waits for that one', () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  for (const q of ['1/4', '1/8t', '1/16']) {
    Object.assign(settings, { quantize: q, swing: 0 });
    const g = GRIDS[q].g;
    const step = g * clock.grid.stepDuration();
    const s0 = clock.grid.timeAt((Math.ceil(clock.grid.straightAt(clock.audio.soonest() + 0.1) / g) + 1) * g); // a step well ahead
    for (const [f, back] of [
      [0, true],
      [0.3, true],
      [0.49, true],
      [0.5, false],
      [0.7, false],
    ]) {
      const t = s0 + f * step;
      clock.advance(t - clock.now(), { ticks: false }); // the press, now
      const { at, on } = clock.snap(clock.now(), { straight: true, nearest: true });
      if (back) {
        near(on, s0, `${q} at ${f} of a step: belongs to the step just gone:`, 1e-9);
        near(at, clock.audio.soonest() + 0.005, `${q} at ${f}: at once:`, 1e-9);
      } else {
        near(on, s0 + step, `${q} at ${f} of a step: the next step:`, 1e-9);
        near(at, on, '', 1e-12);
      }
      assert.ok(at - clock.now() <= step / 2 + 0.006, `${q} at ${f}: never waits more than half a step`);
    }
    near(
      clock.snap(s0 + 0.3 * step, { straight: true }).on,
      s0 + step,
      `${q}: next, the default, always takes the next step:`,
      1e-9,
    );
    // just before a step, too close for the audio to make it: nearest sounds at once and still belongs to it; next waits a whole step
    const s1 = s0 + 2 * step;
    clock.advance(s1 - 0.002 - clock.now(), { ticks: false });
    const near1 = clock.snap(clock.now(), { straight: true, nearest: true });
    const next1 = clock.snap(clock.now(), { straight: true });
    near(near1.on, s1, `${q}, 2 ms before a step: belongs to it:`, 1e-9);
    near(near1.at, clock.audio.soonest() + 0.005, `${q}, 2 ms before: at once:`, 1e-9);
    near(next1.at, s1 + step, `${q}, 2 ms before, next: the step after:`, 1e-9);
  }
});

test('the catch: with nearest, the step just gone counts only for a tap at most `late` after it; a later one waits for the next', () => {
  const { clock, settings, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  Object.assign(settings, { quantize: '1/4', swing: 0 });
  const step = 4 * clock.grid.stepDuration();
  const s0 = clock.grid.timeAt((Math.ceil(clock.grid.straightAt(clock.audio.soonest() + 0.1) / 4) + 1) * 4);
  for (const [dt, back] of [
    [0.03, true],
    [0.05, true],
    [0.06, false],
    [0.3, false],
  ]) {
    clock.advance(s0 + dt - clock.now(), { ticks: false });
    const { at, on } = clock.snap(clock.now(), { straight: true, nearest: true, late: 0.05 });
    if (back) {
      near(on, s0, `${dt} s late: the step just gone:`, 1e-9);
      near(at, clock.audio.soonest() + 0.005, `${dt} s late: at once:`, 1e-9);
    } else {
      near(on, s0 + step, `${dt} s late: the next step:`, 1e-9);
      near(at, on, '', 1e-12);
    }
  }
});

test('steps come in order, each once, a little ahead, while the audio runs', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  const got = stepsDuring(clock, () => clock.advance(2));
  assert.ok(got.length >= Math.floor(2 / clock.grid.stepDuration()), `${got.length} steps in 2 s`);
  got.forEach((s, k) => {
    if (k) {
      assert.equal(s.i, got[k - 1].i + 1);
      assert.ok(s.t > got[k - 1].t);
    }
  });
  assert.ok(
    got[got.length - 1].t <= clock.now() + LOOKAHEAD + clock.grid.stepDuration(),
    'no further ahead than the lookahead',
  );
});

test('nothing is scheduled while the audio is suspended', () => {
  const { clock, fakeAudio } = clockOf();
  const a = fakeAudio();
  clock.useAudio(a);
  clock.advance(0.5);
  a.suspend();
  assert.equal(stepsDuring(clock, () => clock.advance(1)).length, 0);
  a.resume();
  assert.ok(stepsDuring(clock, () => clock.advance(0.5)).length > 0);
});

test('when the ticks lag, the steps missed are skipped silently and the grid keeps its place', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const grid0 = clock.grid.nextStepTime - clock.grid.nextStepNumber * clock.grid.stepDuration(); // where step 0 lies
  const before = clock.grid.nextStepNumber;
  clock.advance(1.5, { ticks: false });
  const got = stepsDuring(clock, () => clock.advance(0.03));
  assert.ok(got.length > 0 && got.length <= 3, `${got.length} steps right after the lag, not a pile`);
  assert.ok(got[0].i > before + 3, 'the missed ones are skipped');
  near(clock.grid.nextStepTime - clock.grid.nextStepNumber * clock.grid.stepDuration(), grid0, 'same grid:', 1e-9);
});

test('toContext and fromContext map between the clock and the audio context', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio({ behind: 3 }));
  clock.advance(1);
  near(clock.audio.toContext(clock.now()), clock.now() - 3);
  near(clock.audio.fromContext(clock.audio.toContext(123.456)), 123.456, '', 1e-12);
});

test("the audio context's time jumps a chunk at a time: the clock maps to where the audio is, and a tap starts with its next chunk", () => {
  const { clock, fakeAudio } = clockOf();
  const block = 0.032;
  const a = fakeAudio({ behind: 3, block });
  clock.useAudio(a);
  clock.advance(2);
  for (let k = 0; k < 20; k++) {
    clock.advance(0.007 + k * 0.0011);
    const seen = a.currentTime;
    const c = clock.audio.toContext(clock.now());
    assert.ok(c <= seen + 1e-9, `never ahead of where the audio is: ${c} > ${seen}`);
    assert.ok(c >= seen - block - 0.002, `nor more than a chunk behind: ${c} vs ${seen}`);
    near(clock.audio.soonest(), seen + (clock.now() - c), 'soonest is the next chunk, on the clock:', 1e-9);
    const tap = clock.audio.toContext(clock.quantize(clock.now()));
    assert.ok(tap >= seen + 0.004 - 1e-9, `a tap starts with the audio's next chunk at the soonest: ${tap} < ${seen}`);
    assert.ok(
      tap < seen + 0.004 + clock.grid.stepDuration() + 1e-9,
      'and on the next 16th from there, not a later one',
    );
  }
});

test('the first press, while the audio is still starting, sounds as it starts, however long the page was open', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useFake(600); // the page has been open for 10 minutes
  // a new audio context: suspended at time 0, running 80 ms later, its time starting from 0 then
  const a = fakeAudio({ suspended: true });
  clock.useAudio(a);
  const tap = clock.audio.toContext(clock.quantize(clock.now())); // the press that started the audio plays its note now
  assert.ok(
    tap >= 0 && tap < 0.004 + clock.grid.stepDuration() + 0.05 + 1e-9,
    `scheduled at ${tap} s of the audio's time, not near its start`,
  );
  clock.advance(0.08, { ticks: false });
  a.start();
  clock.advance(0.3);
  near(clock.audio.toContext(clock.now()), a.currentTime, 'and once it runs, the offset is found:', 0.026);
});

// Stop suspends the audio while the clock's time runs on: a note sent then, or let go then, as Play's playback sends its first beat, sounds
// as the audio resumes, not as late as it was suspended (KNOWN_BUGS.md, 2026-10-12)
test('while the audio is suspended, a clock time maps to where its time stands, and from its resume to where it runs, before a tick finds the offset again; a tick after, the offset is found', () => {
  const { clock, fakeAudio } = clockOf();
  const a = fakeAudio({ behind: 3 });
  clock.useAudio(a);
  clock.advance(1);
  a.suspend();
  const standing = a.currentTime;
  clock.advance(5);
  near(clock.audio.toContext(clock.now()), standing, 'suspended, now is where its time stands:', 1e-6);
  near(clock.audio.toContext(clock.now() + 0.05), standing + 0.05, 'a moment on, a moment after it resumes:', 1e-6);
  near(clock.audio.fromContext(standing), clock.now(), 'and back:', 1e-6);
  a.resume();
  near(clock.audio.toContext(clock.now()), a.currentTime, 'resumed, before a tick:', 1e-6);
  clock.advance(0.2);
  near(clock.audio.toContext(clock.now()), a.currentTime, 'a tick after the resume:', 1e-6);
});

test("a clock of its own reads the settings it's given, live: its own tempo, swing and grid, apart from another's", () => {
  const { clock, settings, fakeAudio } = clockOf();
  const mine = { bpm: 120, swing: 0, swingOn: '16ths', quantize: '1/8' };
  const own = new Clock({ settings: mine });
  own.useFake(0);
  assert.equal(own.grid.stepDuration(), 0.125, 'a 16th at 120 BPM');
  assert.equal(clock.grid.stepDuration(), 60 / settings.bpm / 4, "the tests' clock keeps its own tempo");
  own.useAudio(fakeAudio({ of: own }));
  own.advance(1);
  const t = own.grid.timeAt(Math.ceil(own.grid.stepAt(own.now())) + 8);
  const { at } = own.snap(t + 0.01);
  near(
    at,
    own.grid.timeAt((Math.floor(Math.round(own.grid.stepAt(t)) / 2) + 1) * 2),
    'it snaps to the next 8th, the grid it was given',
    1e-9,
  );
  near(
    own.snap(t + 0.01, { grid: '1/16' }).at,
    own.grid.timeAt(Math.round(own.grid.stepAt(t)) + 1),
    "or the grid it's told",
    1e-9,
  );
  mine.bpm = 60;
  assert.equal(own.grid.stepDuration(), 0.25, 'read live');
});

test("the offset is settled after the audio's first second, and again a second after a resume", () => {
  const { clock, fakeAudio } = clockOf();
  const a = fakeAudio();
  clock.useAudio(a);
  clock.advance(0.5);
  assert.equal(clock.audio.settled(), false, 'half a second in');
  clock.advance(0.6);
  assert.equal(clock.audio.settled(), true, 'after a second');
  a.suspend();
  assert.equal(clock.audio.settled(), false, 'suspended');
  a.resume();
  clock.advance(0.5);
  assert.equal(clock.audio.settled(), false, 'half a second after the resume');
  clock.advance(0.6);
  assert.equal(clock.audio.settled(), true);
});

test('as the clocks drift apart, the offset follows, slowly', () => {
  const { clock, fakeAudio } = clockOf();
  const a = fakeAudio({ behind: 3, rate: 1.0002 }); // the audio clock 200 ppm fast
  clock.useAudio(a);
  clock.advance(1.2);
  let worst = 0;
  for (let k = 0; k < 30; k++) {
    clock.advance(1);
    worst = Math.max(worst, Math.abs(clock.audio.toContext(clock.now()) - a.currentTime));
  }
  assert.ok(worst < 0.002, `${worst} s behind at worst`);
});

test("a pointer event's timestamp is on the same timeline", () => {
  const { clock } = clockOf();
  near(clock.fromEvent(1500), 1.5, '', 1e-12);
});

// before the audio starts: the music hasn't, so the song position stands where it will start, as the transport's lane shows it, not
// counting from the page's load and jumping back on the first click (2026-10-12)
test("a grid not started stands at its first 16th, whatever the clock's time, as one held does; started with the audio, it goes on from there", () => {
  const { fakeAudio } = clockOf();
  const own = new Clock({ settings: { ...SETTINGS } });
  own.useFake(100);
  assert.equal(own.grid.running, false);
  assert.equal(own.grid.straightAt(own.now()), 0, 'made at 100 s: at its first 16th');
  own.advance(5);
  assert.equal(own.grid.straightAt(own.now()), 0, 'five seconds on: still there');
  assert.equal(own.grid.stepAt(own.now()), 0, 'swung too');
  own.useAudio(fakeAudio({ of: own }));
  const start = own.grid.nextStepTime;
  near(own.grid.straightAt(start + 4 * own.grid.stepDuration()), 4, 'started: going on from its first 16th:', 1e-9);
});

// the transport's stop: the clock's time running on, the grid's place, the song position, held
test("held, the grid hands out no 16th, its place held at the first 16th not handed out, those before it played, while the clock's time runs on; a time before the hold where it was; released, it goes on from that place, its next 16th at once, none skipped", () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const t0 = clock.now();
  const next = clock.grid.nextStepNumber;
  const earlier = clock.grid.straightAt(t0 - 1);
  clock.grid.hold(t0);
  assert.equal(clock.grid.held, true);
  assert.equal(clock.grid.heldAt, t0);
  assert.equal(stepsDuring(clock, () => clock.advance(2)).length, 0, 'no 16th while held');
  near(clock.now(), t0 + 2, "the clock's time running on:", 1e-9);
  assert.equal(clock.grid.straightAt(clock.now()), next, 'its place held: the first 16th not handed out');
  assert.equal(clock.grid.straightAt(t0 - 1), earlier, 'a time before the hold where it was: only the present held');
  const t1 = clock.now();
  clock.grid.release(t1);
  assert.equal(clock.grid.held, false);
  assert.equal(clock.grid.heldAt, null);
  near(clock.grid.straightAt(t1), next, 'going on from the place held:', 1e-9);
  near(clock.grid.nextStepTime, t1, 'its next 16th at once:', 1e-9);
  assert.equal(stepsDuring(clock, () => clock.advance(0.5))[0].i, next, 'none skipped');
});

test('held from a time on, the beat playback starts on: the 16ths before it handed out, none from it, its place held there; released, going on from it', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const place = clock.grid.nextStepNumber + 3;
  clock.grid.holdFrom(clock.grid.straightTime(place));
  assert.equal(clock.grid.held, false, 'not yet');
  const got = stepsDuring(clock, () => clock.advance(2));
  assert.equal(got.at(-1).i, place - 1, 'the 16ths before it handed out, none from it');
  assert.equal(clock.grid.held, true);
  assert.equal(clock.grid.straightAt(clock.now()), place, 'its place held there');
  clock.grid.release(clock.now());
  assert.equal(stepsDuring(clock, () => clock.advance(0.5))[0].i, place, 'going on from it');
});

// song time: the time the music played, the grid's holds taken out, a stop's or a playback's, as the arrangement shows it
test("a clock time's song time, the grid's holds taken out: before a hold as it is, within one where it stood, after one less its length, held now all from it; and back", () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const held = clock.now();
  const stands = clock.grid.nextStepTime; // the 16th it's held at, the first not handed out: where the music stands
  clock.grid.hold(held);
  clock.advance(3);
  clock.grid.release(clock.now()); // released 3 s on
  clock.advance(1);
  const grid = clock.grid;
  assert.equal(grid.songTime(held - 0.5) - grid.songTime(held - 1), 0.5, 'before it as it is');
  assert.equal(grid.songTime(held + 2), grid.songTime(stands), 'within it where it stood');
  near(grid.songTime(held + 4) - grid.songTime(stands), 1, 'after it, less its length', 1e-9);
  near(grid.timeOfSong(grid.songTime(stands) + 0.5), held + 3.5, 'and back, past it', 1e-9);
  const standsNow = grid.nextStepTime;
  grid.hold(clock.now());
  clock.advance(2);
  assert.equal(grid.songTime(clock.now()), grid.songTime(standsNow), 'held now: all from it at it');
  grid.release(clock.now());
});

// the song time now, what the recorder lets go by and the arrangement draws its present at
test("the song time now: the clock's now in song time, running with it, standing while the grid is held", () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  assert.equal(clock.songNow(), clock.grid.songTime(clock.now()));
  clock.grid.hold(clock.now());
  clock.advance(0.5);
  const stood = clock.songNow();
  clock.advance(2);
  assert.equal(clock.songNow(), stood, 'held: standing as the clock runs on');
  clock.grid.release(clock.now());
  clock.advance(1);
  near(clock.songNow() - stood, 1, 'released: going on from it', 1e-9);
});

// stopped between two 16ths, the song stood from the moment Stop was pressed, though the 16ths handed out ahead of it played on: a playback
// across it jumped, and its playhead with it
test('stopped between two 16ths, the song stands from the 16th it is held at, those handed out before it played on: a time between as it is', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1.01);
  const grid = clock.grid;
  const stopped = clock.now();
  const stands = grid.nextStepTime;
  assert.ok(stands > stopped, 'a 16th handed out ahead');
  grid.hold(stopped);
  clock.advance(2);
  const released = clock.now();
  grid.release(released);
  const between = (stopped + stands) / 2;
  near(grid.songTime(between), between, 'between the stop and its 16th: playing on', 1e-9);
  near(grid.songTime(stands + 1), stands, 'from its 16th: standing', 1e-9);
  near(grid.songTime(released + 0.5), stands + 0.5, 'released: going on from there', 1e-9);
});

// the song position set to a song time, its place on the arrangement's timeline: a locate. What it keeps of history: a clock time before it
// has the song time it had, so what was recorded stays where it was heard
test('located while running: the song time at that moment the one set, going on from it; a time before it as it was; and back, the latest clock time a song time is at', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(10);
  const grid = clock.grid;
  const at = clock.now();
  const before = grid.songTime(at - 1);
  grid.locate(5, at);
  assert.equal(grid.songTime(at), 5, 'the song time set, at that moment');
  near(grid.songTime(at + 2), 7, 'going on from it', 1e-9);
  assert.equal(grid.songTime(at - 1), before, 'a time before it as it was');
  near(grid.timeOfSong(7), at + 2, 'and back', 1e-9);
  near(
    grid.timeOfSong(before + 1),
    at + before + 1 - 5,
    'a song time heard before, reached again ahead: the latest',
    1e-9,
  );
  assert.equal(grid.timeOfSong(3), 3, 'one before the located line began: the time it was heard at');
  assert.equal(grid.song.toTimeline(at + 2), grid.songTime(at + 2), 'the time map the same');
  assert.equal(grid.song.fromTimeline(7), grid.timeOfSong(7));
  assert.equal(grid.songTime(Infinity), Infinity, 'a time never reached, never');
});

test('located ahead, past what was heard: the song time skipped never heard, its time the moment it was located at; located again, from there', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(10);
  const grid = clock.grid;
  const at = clock.now();
  const heard = grid.songTime(at);
  grid.locate(heard + 100, at);
  near(grid.songTime(at + 1), heard + 101, 'going on from where it was set', 1e-9);
  near(grid.timeOfSong(heard + 50), at, 'a song time in the skipped stretch: where it was located', 1e-9);
  clock.advance(5);
  grid.locate(0, clock.now());
  assert.equal(grid.songTime(clock.now()), 0, 'located again');
  near(grid.songTime(clock.now() + 1), 1, 'going on from it', 1e-9);
  near(grid.songTime(at + 1), heard + 101, 'what the first locate set, as it was');
});

test('located while held: the position stands at the song time set, released it goes on from there; a stop between two 16ths located from the 16th it stands at', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1.01);
  const grid = clock.grid;
  const stopped = clock.now();
  const stands = grid.nextStepTime;
  assert.ok(stands > stopped, 'a 16th handed out ahead');
  grid.hold(stopped);
  grid.locate(20, stopped);
  clock.advance(2);
  near(grid.songTime(clock.now()), 20, 'standing at the song time set', 1e-9);
  near(grid.songTime(stands + 0.5), 20, 'from the 16th it stands at', 1e-9);
  near(grid.songTime(stopped), stopped, 'before it, playing on as it was', 1e-9);
  grid.locate(30, clock.now());
  near(grid.songTime(clock.now()), 30, 'located again while held', 1e-9);
  const released = clock.now();
  grid.release(released);
  near(grid.songTime(released + 1), 31, 'released: going on from it', 1e-9);
  near(grid.timeOfSong(31), released + 1, 'and back', 1e-9);
  near(grid.timeOfSong(40), released + 10, 'a time to come', 1e-9);
});

test('located after a hold: the hold taken out as before, the located line going on past a later hold too', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const grid = clock.grid;
  grid.hold(clock.now());
  clock.advance(3);
  grid.release(clock.now());
  clock.advance(1);
  const at = clock.now();
  grid.locate(10, at);
  clock.advance(1);
  const held = clock.now();
  const stands = grid.nextStepTime;
  grid.hold(held);
  clock.advance(2);
  grid.release(clock.now());
  clock.advance(1);
  near(grid.songTime(clock.now()), 10 + (stands - at) + 1, 'a later hold taken out of the located line', 1e-9);
  near(grid.timeOfSong(10 + (stands - at) + 1), clock.now(), 'and back', 1e-9);
});

test('a hold and a locate let go with the history leave every recent time its song time', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const grid = clock.grid;
  grid.hold(clock.now());
  clock.advance(2);
  grid.release(clock.now());
  const locatedAt = clock.now();
  grid.locate(500, locatedAt);
  clock.advance(HISTORY + 120);
  const now = clock.now();
  grid.hold(now);
  clock.advance(1);
  grid.release(clock.now()); // the first hold and the locate are let go as this one is kept
  const recent = now - 1;
  near(grid.songTime(recent), 500 + (recent - locatedAt), 'a recent time as it was', 1e-6);
  near(grid.timeOfSong(500 + (recent - locatedAt)), recent, 'and back', 1e-6);
});

test("a beat by the meter's unit: 16ths to a beat and its length, and to a bar; a quarter in 4/4, an 8th in 6/8", () => {
  const { clock, settings } = clockOf();
  const grid = clock.grid;
  assert.deepEqual(
    [grid.stepsPerBeat(), grid.beatDuration(), grid.stepsPerBar()],
    [4, 60 / 72, 16],
    'common time, at 72',
  );
  settings.meter = [6, 8];
  assert.deepEqual([grid.stepsPerBeat(), grid.beatDuration(), grid.stepsPerBar()], [2, 30 / 72, 12], 'six eights');
  delete settings.meter; // back to none, as the next test finds it
});

test("a bar in ticks, in its time signature, or the master's; a beat, the meter's unit", () => {
  assert.equal(barTicks(), 384, 'a bar of 4/4');
  assert.deepEqual([barTicks([3, 4]), barTicks([2, 4]), barTicks([9, 16]), barTicks([6, 8])], [288, 192, 216, 288]);
  assert.deepEqual([beatTicks(), beatTicks([6, 8])], [96, 48]);
});

test("a 16th that starts a bar, in its time signature: every 16th one in 4/4, the master's when none is given, every 12th in 3/4", () => {
  assert.deepEqual(
    [0, 1, 15, 16, 32].map((i) => startsBar(i)),
    [true, false, false, true, true],
  );
  assert.deepEqual(
    [0, 12, 16, 24].map((i) => startsBar(i, [3, 4])),
    [true, true, false, true],
  );
});

test('ticks to seconds at the tempo, and back; a time as ticks on the grid, swung or straight, and back', () => {
  const { clock, settings, fakeAudio } = clockOf();
  const grid = clock.grid;
  assert.equal(grid.secondsOf(STEP), grid.stepDuration(), 'a 16th');
  near(grid.ticksIn(grid.beatDuration()), PPQ, 'a beat');
  clock.useAudio(fakeAudio());
  settings.swing = 1;
  const offBeat = grid.timeAt(1); // the second 16th, late by the swing
  assert.equal(grid.ticksAt(offBeat), STEP, 'swung: where it sounds');
  assert.notEqual(grid.ticksAt(offBeat, { straight: true }), STEP, 'straight: where it would without the swing');
  assert.equal(grid.timeOfTicks(STEP), offBeat, 'and back, swung');
  assert.equal(grid.timeOfTicks(STEP, { straight: true }), grid.straightTime(1), 'and straight');
});

test('the next line of so many 16ths at or after a time: the next beat, the next bar', () => {
  const { clock, fakeAudio } = clockOf();
  const grid = clock.grid;
  clock.useAudio(fakeAudio());
  clock.advance(1);
  const t = clock.now();
  const beat = grid.nextLine(t, grid.stepsPerBeat());
  const onLine = (place, steps) => near(place, Math.round(place / steps) * steps, `on a line of ${steps}`);
  onLine(grid.stepAt(beat), 4);
  assert.ok(beat >= t && beat - t < grid.beatDuration(), 'the next one');
  assert.equal(grid.nextLine(beat, 4), beat, 'one on it: itself');
  onLine(grid.stepAt(grid.nextLine(t, 16)), 16);
});

test("song time as a time map: the grid's song time and back; a time never reached, never, held or not", () => {
  const { clock, fakeAudio } = clockOf();
  const grid = clock.grid;
  clock.useAudio(fakeAudio());
  clock.advance(1);
  assert.equal(grid.song.toTimeline(5), grid.songTime(5));
  assert.equal(grid.song.fromTimeline(5), grid.timeOfSong(5));
  assert.equal(grid.songTime(Infinity), Infinity, 'running');
  grid.hold(clock.now());
  assert.equal(grid.songTime(Infinity), Infinity, 'held');
  grid.release(clock.now());
});

test("its tempo told as a tick finds the beat's length changed: none at the first tick, then each change, none for a tick that finds it the same", () => {
  const tempoSettings = { ...SETTINGS };
  const own = new Clock({ settings: tempoSettings }); // its own, so its first tick is its first
  own.useFake(0);
  const told = [];
  own.onTempo((beat) => told.push(beat));
  own.advance(0.05); // two ticks: the first only records the beat as it is, telling nothing
  tempoSettings.bpm = 120;
  own.advance(0.05); // the change is told once, on the next tick
  own.advance(0.05); // the same again: none
  assert.equal(told.length, 1, 'the change only');
  near(told[0], 0.5, 'the change');
});

test('the time played, a locate not counted: a locate shifts song time, and the time played goes on as it was', () => {
  const { clock, fakeAudio } = clockOf();
  clock.useAudio(fakeAudio());
  clock.advance(10);
  const grid = clock.grid;
  const at = clock.now();
  const before = grid.playedTime(at);
  grid.locate(before + 100, at);
  assert.equal(grid.playedTime(at), before, 'the locate not in it');
  near(grid.playedTime(at + 2), before + 2, 'going on', 1e-9);
  near(grid.songTime(at + 2) - grid.playedTime(at + 2), 100, 'song time the locate further', 1e-9);
});
