// The clip tracks as a model (modular-audio/view/tracks/models/clip-tracks.ts), in node:
//   - each clip track's clips, read from what holds them, a clip player's slots and the
//     surface's own, in the order held, each once, its name, its notes and whether it plays;
//   - a clip's ▶, and its ×, asking first, a second click after a moment deleting it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClipTracks } from '../index.ts';

// slots of the test's own, by track, those playing among them
function heldBy(slotsByTrack, playing = new Set()) {
  return { slotsOn: (track) => slotsByTrack[track] ?? [], playing: (slot) => playing.has(slot) };
}
// a clock the test sets
function clockAt(t = 0) {
  const clock = { t, now: () => clock.t };
  return clock;
}
const flower = { name: 'flower 1', notes: 3 };
const fresh = { name: 'flower 2', notes: 0 };

function setup() {
  const player = heldBy({ tap: [flower] }, new Set([flower])); // a clip player's slots
  const own = heldBy({ tap: [fresh, flower], motifs: ['ask'] });
  const surface = {
    clipTracks: [
      {
        key: 'flowers',
        name: 'flowers',
        roles: ['tap'],
        played: true,
        held: [
          { slots: player, track: 'tap' },
          { slots: own, track: 'tap' },
        ],
      },
      { key: 'visitors', name: 'visitors', roles: [], played: false, held: [{ slots: own, track: 'motifs' }] },
    ],
    clipName: (slot) => (typeof slot === 'string' ? slot : slot.name),
    notesIn: (slot) => (typeof slot === 'string' ? undefined : slot.notes),
  };
  const asked = [];
  const clock = clockAt();
  const tracks = new ClipTracks({
    surface,
    clock,
    launch: (slot) => asked.push(['launched', slot.name]),
    remove: (slot) => asked.push(['deleted', slot.name]),
  });
  return { tracks, asked, clock, surface };
}

test("a clip track's clips: every holder's, in the order held, each once, with its name, its notes and whether it plays", () => {
  const { tracks, surface } = setup();
  const [flowers, visitors] = tracks.tracks;
  assert.equal(flowers, surface.clipTracks[0]);
  assert.deepEqual(
    tracks.clipsOn(flowers),
    [
      { slot: flower, name: 'flower 1', notes: 3, playing: true },
      { slot: fresh, name: 'flower 2', notes: 0, playing: false },
    ],
    "the clip player's first, playing as it says; the surface's own after, each once",
  );
  assert.deepEqual(tracks.clipsOn(visitors), [{ slot: 'ask', name: 'ask', notes: undefined, playing: false }]);
});

test("a clip's ▶ launches it; its × asks first, a second click after a moment and within 3 s deletes it", () => {
  const { tracks, asked, clock } = setup();
  tracks.launch(flower);
  assert.deepEqual(asked, [['launched', 'flower 1']]);
  tracks.drop(flower);
  assert.equal(tracks.asking, flower, 'one click: it asks');
  clock.t = 0.2;
  tracks.drop(flower);
  assert.equal(asked.length, 1, 'as fast as a double-click: nothing');
  clock.t = 0.6;
  tracks.drop(flower);
  assert.deepEqual(asked.at(-1), ['deleted', 'flower 1'], 'a second click: deleted');
  assert.equal(tracks.asking, null);
});

test("a × stops asking: unanswered for 3 s, another clip's ×, or anything else", () => {
  const { tracks, asked, clock } = setup();
  tracks.drop(flower);
  clock.t = 2.9;
  tracks.expire();
  assert.equal(tracks.asking, flower, 'still within 3 s');
  clock.t = 3.1;
  tracks.expire();
  assert.equal(tracks.asking, null, 'unanswered for 3 s');
  tracks.drop(flower);
  tracks.drop(fresh);
  assert.equal(tracks.asking, fresh, "another clip's ×: that one asks");
  tracks.stopAsking();
  assert.equal(tracks.asking, null, 'anything else');
  assert.deepEqual(asked, [], 'nothing deleted');
});
