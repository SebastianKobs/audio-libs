// libs/modular-audio/view/tracks/dom/arrangement/pixels.ts: the time in view in pixels, as the arrangement's
// drawer lays it out, read from what ArrangementView drew on a canvas stand-in
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArrangementView } from '../index.ts';
import { arrangementOf, region } from '../../models/test/arrangement.js';
import { standInDocument } from './dom-stand-in.js';

const COLORS = { strip: '', line: '', clip: '', live: '', text: '', soft: '', accent: '', midi: '' };

test("a place's x in view, 8 px a 16th from the place at its left edge; a press in the ruler at an x puts the playhead on the place under it, the other way", () => {
  const { document, made } = standInDocument();
  globalThis.document = document;
  try {
    const flower = region(
      'tap',
      0,
      { name: 'flower' },
      { from: 20, to: 22, notes: [{ t: 20, pitch: 60, duration: 1 }] },
    );
    const { arrangement, clock } = arrangementOf({ regions: [flower] });
    clock.step(100); // the 16th 100: the present a bar from the right edge of a view 50 16ths wide, its left edge at 66
    const view = new ArrangementView({ arrangement, colors: () => COLORS });
    view.show(true);
    const [note] = view.drawn().regions[0].notes;
    assert.equal(note.x, (80 - 66) * 8, 'the note at the 16th 80, 14 16ths in, 8 px each');
    const ruler = made.find(({ className }) => className === 'ruler');
    ruler.listeners.pointerdown({ clientX: 10 * 8, pointerId: 1 });
    assert.deepEqual(
      [view.playhead, view.drawn().playhead],
      [76, { place: 76, x: 10 * 8 }],
      'the place 10 16ths in, and the x it was drawn at',
    );
  } finally {
    delete globalThis.document;
  }
});
