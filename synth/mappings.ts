// ---------- libs/synth/mappings: a term as a mapping, as a rack's macro is mapped to a knob ----------
// I1i (mockup/architecture/done.md): a time or a value written as a term ('0.35 decay', 'decay + 0.05', '1.5 rise in 0.15..', 'vibrato')
// is one source by name, a macro or a note's value, times its factor, held within its range, plus its offset, as values.ts reads it; as
// Ableton's macro mapping list gives a mapping its range. Read from a term (mappingOf()) and written back as one (termOf())
import { clamp } from '../util/index.ts';

// a source by name, times its factor, held at least its low and at most its high where it has them, plus its offset
export interface Mapping {
  source: string;
  factor: number;
  offset: number;
  low?: number;
  high?: number;
}

// a named term: its factor, its source's name, the range it's held in ('1.5 rise in 0.15..', 'duration in 0.1..0.5')
const NAMED = /^(-?[\d.]+)?\s*([A-Za-z]+)(?: in ([\d.]+)\.\.([\d.]*))?$/;
const SECONDS = /^-?[\d.]+$/;

// a term as its mapping; none where it isn't one source: a note value ('1/8'), two sources, seconds only
export function mappingOf(written: string): Mapping | null {
  let mapping: Mapping | null = null;
  let offset = 0;
  for (const term of written.split('+').map((part) => part.trim())) {
    if (SECONDS.test(term)) {
      offset += +term;
      continue;
    }
    const named = term.match(NAMED);
    if (!named || mapping) {
      return null;
    }
    mapping = namedOf(named);
  }
  return mapping && { ...mapping, offset };
}
// a mapping as a term: its factor where it isn't 1, its range and its offset where it has them
export function termOf({ source, factor, offset, low, high }: Mapping): string {
  const named = factor === 1 ? source : `${numeral(factor)} ${source}`;
  const held =
    low === undefined && high === undefined ?
      named
    : `${named} in ${numeral(low ?? 0)}..${high === undefined ? '' : numeral(high)}`;
  return offset === 0 ? held : `${held} + ${numeral(offset)}`;
}

// a mapping's value, its source's as the note's values give it times its factor, held within its range, plus its offset; none where its
// source isn't a number there (a word: a wave, a filter's type)
export function mappedValue(
  { source, factor, offset, low = -Infinity, high = Infinity }: Mapping,
  values: Readonly<Record<string, unknown>>,
): number | undefined {
  const value = values[source];
  if (typeof value !== 'number') {
    return undefined;
  }
  return clamp(factor * value, low, high) + offset;
}

// a named term's source, factor and range, its offset added by its caller
function namedOf([, factor, source = '', low, high]: RegExpMatchArray): Mapping {
  const mapping: Mapping = { source, factor: factor === undefined ? 1 : +factor, offset: 0 };
  if (low !== undefined) {
    mapping.low = +low;
  }
  if (high) {
    mapping.high = +high;
  }
  return mapping;
}
// a number as a term writes it, a slider's float tail (0.30000000000000004) left off
function numeral(value: number): string {
  return String(+value.toFixed(6));
}
