// A knob's rings drawn (libs/modular-audio/view/device/dom/knob-view.ts), as HTML, in node, on the view models' voice card
// of the tests' own (libs/modular-audio/view/device/models/test/card.js): under its bar, a ring for each source that moves it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knobHtml } from '../index.ts';
import { near } from '../../../../../base/util/test/near.js';
import { builderOn, CARD } from '../../models/test/card.js';

// the rings of a drawn knob, in its bar: where each starts, how far it reaches, whose it is
function ringsDrawn(text) {
  const bar = /<i [^>]*>((?:<u class="ring"[^>]*><\/u>)*)<\/i>/.exec(text);
  assert.ok(bar, 'a bar');
  return [
    ...bar[1].matchAll(/<u class="ring" style="--from:([^;]+);--span:([^"]+)" title="moved by ([^"]+)"><\/u>/g),
  ].map(([, from, span, by]) => ({ from: Number(from), span: Number(span), by }));
}

test("a knob's rings: a ring in its bar for each source that moves it, from where the source takes it to where, named; none where nothing moves it", () => {
  const models = builderOn(CARD);
  const decay = models.control(['env', 'decay']);
  const drawn = ringsDrawn(knobHtml('decay', decay).text);
  assert.deepEqual(
    drawn.map(({ by }) => by),
    ['decay'],
    'the macro that moves it',
  );
  assert.equal(drawn.length, decay.rings.length);
  decay.rings.forEach(({ by, from, to }, index) => {
    assert.equal(drawn[index].by, by);
    near(drawn[index].from, Math.min(from, to), 'it starts at the lower end');
    near(drawn[index].span, Math.abs(to - from), 'it reaches the other');
  });
  assert.deepEqual(ringsDrawn(knobHtml('frequency', models.control(['osc', 'frequency'])).text), []);
});
