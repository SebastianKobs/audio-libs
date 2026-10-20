// ---------- view/device/dom/hint: a control's hint, one wording for every view ----------
// Worded from the control alone, an instrument's and a strip's insert's alike:
//   1. its own words, its template's or its module's;
//   2. how it's set: live, by its macro, by its notes as recorded, fixed, or by its source;
//   3. what moves it as the note plays, its modulators.
import { addressText } from '../../../plan/format/index.ts';
import type { Control } from '../models/index.ts';

// A control's hint, its parts in order (see the top of this file).
export function controlHint(control: Pick<Control, 'hint' | 'live' | 'role' | 'moves'>): string {
  const words = [control.hint ?? '', setByText(control), movedText(control)];
  return words.filter((each) => each !== '').join(' ');
}

// How a control is set:
//   - live: here, a double-click bringing it back;
//   - by its macro, read-only;
//   - by its notes, its automation recorded in the arrangement's lanes, read-only;
//   - fixed, as the desk built it;
//   - else by its source, read-only.
function setByText({ live, role, moves }: Pick<Control, 'live' | 'role' | 'moves'>): string {
  if (live) {
    return 'A double-click brings it back.';
  }
  const macro = moves.find(({ kind }) => kind === 'macro');
  if (macro) {
    return `Set by its macro, ${addressText(macro.by)}: read-only here.`;
  }
  if (role.by === 'fixed') {
    return 'As the desk built it.';
  }
  if (role.recorded) {
    return `Set by its notes, by ${role.source}, and shown as they set it: read-only, its automation in the arrangement's lanes.`;
  }
  return `Set by ${role.source ?? 'the instrument'}: read-only here.`;
}
// what moves a control as the note plays, its modulators: none where nothing does
function movedText({ moves }: Pick<Control, 'moves'>): string {
  const modulators = moves.filter(({ kind }) => kind === 'modulator').map(({ by }) => addressText(by));
  if (!modulators.length) {
    return '';
  }
  return `Moved by ${modulators.join(' and ')} as the note plays: its ring shows how far.`;
}
