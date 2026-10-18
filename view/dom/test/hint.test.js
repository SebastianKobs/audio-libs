// A control's hint, one wording for every view (mockup/src/libs/view/dom/hint.ts): its own words, how it's set, what moves it as the
// note plays; an instrument's and a strip's insert's alike, each worded by the control alone
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlHint } from '../index.ts';

// a control of the test's own: its words, whether it's live, its role, what moves it
function control({ hint, live = false, role = { by: 'live' }, moves = [] }) {
  return { hint, live, role, moves };
}

test('live: its words, then that a double-click brings it back', () => {
  assert.equal(controlHint(control({ hint: 'How bright.', live: true })), 'How bright. A double-click brings it back.');
  assert.equal(controlHint(control({ live: true })), 'A double-click brings it back.');
});

test("set by a macro: read-only here, by its macro's address", () => {
  const moves = [{ kind: 'macro', by: ['decay'] }];
  assert.equal(
    controlHint(control({ hint: 'Its fall.', role: { by: 'automated', source: 'decay' }, moves })),
    'Its fall. Set by its macro, decay: read-only here.',
  );
});

test("automated and recorded, a desk's: by its notes, by its source, its automation in the arrangement's lanes; fixed, as the desk built it", () => {
  const automated = control({ hint: 'Its cutoff.', role: { by: 'automated', source: 'distance', recorded: true } });
  assert.equal(
    controlHint(automated),
    "Its cutoff. Set by its notes, by distance, and shown as they set it: read-only, its automation in the arrangement's lanes.",
  );
  assert.equal(controlHint(control({ hint: 'Its gain.', role: { by: 'fixed' } })), 'Its gain. As the desk built it.');
});

test("automated, not recorded, an instrument's: set by its source, else by the instrument; its modulators after it", () => {
  assert.equal(
    controlHint(control({ role: { by: 'automated', source: 'the note' } })),
    'Set by the note: read-only here.',
  );
  const moves = [
    { kind: 'modulator', by: ['lfo'] },
    { kind: 'modulator', by: ['env'] },
  ];
  assert.equal(
    controlHint(control({ hint: 'Its pitch.', role: { by: 'automated' }, moves })),
    'Its pitch. Set by the instrument: read-only here. Moved by lfo and env as the note plays: its ring shows how far.',
  );
});
