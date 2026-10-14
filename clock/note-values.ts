// ---------- clock/note-values: a note value as written, '1/4', dotted '1/8.', a triplet '1/8t', in beats ----------

const NOTE_VALUE = /^(\d+)\/(\d+)(\.|t)?$/;
// a note value's length against its plain one: dotted, a triplet's
const FACTOR: Readonly<Record<string, number>> = { '': 1, '.': 1.5, t: 2 / 3 };

// its length in beats, quarters: '1/4' one; none where it isn't a note value
export function noteValueBeats(written: string): number | undefined {
  const [, count, division, kind = ''] = written.match(NOTE_VALUE) ?? [];
  if (count === undefined || division === undefined) {
    return undefined;
  }
  return ((4 * +count) / +division) * FACTOR[kind]!; // the pattern allows only FACTOR's kinds
}
