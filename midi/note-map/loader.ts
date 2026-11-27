// ---------- midi/note-map/loader: a note map read from data, checked at the edge ----------
// Data read from a file, JSON's, is checked for its shape, every field it doesn't know refused (base/util's fromData()); then for what
// it means: notes and controller values 0 to 127, each fallback naming an entry the map has, no fallbacks in a loop. Every problem
// is said, where it is, under the file's name.
import { chainFrom, fromData, type Shape } from '../../base/util/index.ts';
import type { NoteController, NoteMapData } from './map-data.ts';
import { NoteMap } from './note-map.ts';

const CONTROLLER: Shape = { fields: { number: 'number', value: 'number' }, needs: ['number', 'value'], closed: true };
const VARIANT_NOTE: Shape = { fields: { note: 'number', controller: CONTROLLER }, needs: ['note'], closed: true };
const VARIANTS: Shape = {
  fields: { right: VARIANT_NOTE, left: VARIANT_NOTE, either: VARIANT_NOTE, up: VARIANT_NOTE, down: VARIANT_NOTE },
  closed: true,
};
const ARTICULATION: Shape = { fields: { fallback: 'word', variants: VARIANTS }, closed: true };
const INSTRUMENT: Shape = {
  fields: { fallback: 'word', articulations: { byName: ARTICULATION } },
  needs: ['articulations'],
  closed: true,
};
const NOTE_MAP: Shape = { fields: { instruments: { byName: INSTRUMENT } }, needs: ['instruments'], closed: true };
const LARGEST_MIDI_VALUE = 127;

// a note map from data, its source the file it was read from, as a refusal names it; refused, every problem said, where it's wrong
export function loadNoteMap(data: unknown, source: string): NoteMap {
  const map = fromData<NoteMapData>(data, NOTE_MAP, { source, what: 'a note map' });
  const problems = [...valueProblems(map), ...referenceProblems(map), ...loopProblems(map)];
  if (problems.length > 0) {
    throw new Error([`${source}: not a usable note map:`, ...problems].join('\n  '));
  }
  return new NoteMap(map);
}
// each note and controller value outside 0 to 127, or not whole
function valueProblems(map: NoteMapData): string[] {
  return Object.entries(map.instruments).flatMap(([instrument, { articulations }]) =>
    Object.entries(articulations).flatMap(([articulation, { variants = {} }]) =>
      Object.entries(variants).flatMap(([variant, target]) => {
        const at = `instruments ${instrument} articulations ${articulation} variants ${variant}`;
        return [
          ...midiValueProblems(target.note, `${at}: its note`),
          ...controllerProblems(target.controller, `${at} controller`),
        ];
      }),
    ),
  );
}
function controllerProblems(controller: NoteController | undefined, at: string): string[] {
  if (controller === undefined) {
    return [];
  }
  return [
    ...midiValueProblems(controller.number, `${at}: its number`),
    ...midiValueProblems(controller.value, `${at}: its value`),
  ];
}
function midiValueProblems(value: number, what: string): string[] {
  if (Number.isInteger(value) && value >= 0 && value <= LARGEST_MIDI_VALUE) {
    return [];
  }
  return [`${what} is a whole number from 0 to ${LARGEST_MIDI_VALUE}, not ${value}`];
}
// each fallback naming an instrument the map doesn't have, or an articulation its instrument doesn't
function referenceProblems(map: NoteMapData): string[] {
  return Object.entries(map.instruments).flatMap(([instrument, { fallback, articulations }]) => {
    const problems = Object.entries(articulations)
      .filter(([, entry]) => entry.fallback !== undefined && !Object.hasOwn(articulations, entry.fallback))
      .map(
        ([articulation, entry]) =>
          `instruments ${instrument} articulations ${articulation}: its fallback, ${entry.fallback}, names no articulation of ${instrument}`,
      );
    if (fallback !== undefined && !Object.hasOwn(map.instruments, fallback)) {
      problems.unshift(`instruments ${instrument}: its fallback, ${fallback}, names no instrument of the map`);
    }
    return problems;
  });
}
// each loop of fallbacks once: the instruments', then each instrument's articulations'
function loopProblems(map: NoteMapData): string[] {
  const instruments = loopsIn(map.instruments).map((loop) => `instruments fall back in a loop: ${loop}`);
  const articulations = Object.entries(map.instruments).flatMap(([instrument, entry]) =>
    loopsIn(entry.articulations).map(
      (loop) => `instruments ${instrument}: its articulations fall back in a loop: ${loop}`,
    ),
  );
  return [...instruments, ...articulations];
}
// the loops among entries that each name the one they fall back to, each once, written as it's followed: a → b → a
function loopsIn(entries: Readonly<Record<string, { fallback?: string }>>): string[] {
  const byName = new Map(Object.entries(entries));
  const seen = new Set<string>();
  const loops: string[] = [];
  for (const name of byName.keys()) {
    const { keys, again } = chainFrom(name, byName, (entry) => entry.fallback);
    if (again === undefined) {
      continue;
    }
    const loop = keys.slice(keys.indexOf(again));
    const members = loop.toSorted().join('\n'); // a loop is the same loop wherever it's entered
    if (!seen.has(members)) {
      seen.add(members);
      loops.push([...loop, again].join(' → '));
    }
  }
  return loops;
}
