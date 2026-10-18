// Drawn elements bound to their models (mockup/src/libs/view/dom/bound.ts): each element marked with an address, bound as it's
// drawn to the model there, by whoever drew it from its models; found again by the element alone
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bound, CONTROL_MARKS } from '../bound.ts';

// an element of the test's own, its data- marks
const element = (dataset) => ({ dataset });
// what the elements are drawn within, found by any of the marks asked
function within(...elements) {
  return {
    querySelectorAll: (selector) => {
      const marks = [...selector.matchAll(/\[data-(\w+)\]/g)].map(([, mark]) => mark);
      return elements.filter(({ dataset }) => marks.some((mark) => dataset[mark] !== undefined));
    },
  };
}

test('each element marked with an address bound to the model there, by any of the marks; found again by the element; one whose address has no model, or with no mark, bound to none', () => {
  const knob = element({ knob: 'Filter/cutoff', set: 'Filter/cutoff' });
  const toggle = element({ knob: 'Delay/sync', toggle: 'Delay/sync' });
  const list = element({ choose: 'Delay/note' });
  const gone = element({ knob: 'Gone/level' });
  const plain = element({});
  const models = { 'Filter/cutoff': 'cutoff', 'Delay/sync': 'sync', 'Delay/note': 'note' };
  const bound = new Bound(CONTROL_MARKS);
  bound.bind(within(knob, toggle, list, gone, plain), (address) => models[address.join('/')]);
  assert.deepEqual(
    [knob, toggle, list, gone, plain].map((each) => bound.at(each)),
    ['cutoff', 'sync', 'note', undefined, undefined],
  );
});

test('bound again: drawn again from other models, each element the model it was drawn from last', () => {
  const knob = element({ knob: 'level' });
  const bound = new Bound(['knob']);
  bound.bind(within(knob), () => 'first card');
  bound.bind(within(knob), () => 'second card');
  assert.equal(bound.at(knob), 'second card');
});
