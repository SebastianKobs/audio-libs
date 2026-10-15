// ---------- plan/planner/shape: a template or presets read from data, their shape checked ----------
// Data read from a file, YAML's, is unknown until it's checked. A light check, before the planner's:
//   - its kind a word; its form and the template it extends words, where it names them;
//   - each list it writes a list, each item an object with what that item needs:
//     a jack its name, a child its name and kind, a wire its two ends, a macro its targets,
//     a pool its child and its wires.
// Presets by name, as a theme writes them: each an object, a template's kind, its values and
// settings, where it writes them, by address, each a number or a word.
// What they hold is the planner's check (check.ts, plan()). Every failure said, naming the file.
import type { Preset, Template } from './template.ts';

// what each item of a template's lists needs
const ITEMS = {
  inputs: ['name'],
  outputs: ['name'],
  children: ['name', 'kind'],
  wires: ['from', 'to'],
  macros: ['maps'],
  pools: ['child', 'wires'],
} as const;

// A template read from data, as it is once its shape is a template's; refused, every failure
// said, where it isn't.
export function templateOf(data: unknown, source: string): Template {
  const problems = shapeProblems(data);
  if (problems.length) {
    throw new Error([`${source}: not of the shape of a template:`, ...problems].join('\n  '));
  }
  return data as Template; // of its shape, as checked
}

// Presets by name read from data, as they are once their shape is presets'; refused, every
// failure said, where it isn't.
export function presetsOf(data: unknown, source: string): Readonly<Record<string, Preset>> {
  const problems =
    isObject(data) ?
      Object.entries(data).flatMap(([name, preset]) => presetProblems(name, preset))
    : [`not an object: ${valueOf(data)}`];
  if (problems.length) {
    throw new Error([`${source}: not of the shape of presets:`, ...problems].join('\n  '));
  }
  return data as Readonly<Record<string, Preset>>; // of their shape, as checked
}

// what keeps data from a template's shape
function shapeProblems(data: unknown): string[] {
  if (!isObject(data)) {
    return [`not an object: ${valueOf(data)}`];
  }
  const problems: string[] = [];
  if (typeof data['kind'] !== 'string') {
    problems.push('its kind not a word');
  }
  for (const word of ['form', 'extends']) {
    if (data[word] !== undefined && typeof data[word] !== 'string') {
      problems.push(`its ${word} not a word`);
    }
  }
  for (const [list, needs] of Object.entries(ITEMS)) {
    problems.push(...listProblems(list, data[list], needs));
  }
  return problems;
}
// a list's problems: not a list; an item not an object, or without what it needs
function listProblems(list: string, items: unknown, needs: readonly string[]): string[] {
  if (items === undefined) {
    return [];
  }
  if (!Array.isArray(items)) {
    return [`its ${list} not a list`];
  }
  return items.flatMap((item: unknown, index) => {
    if (!isObject(item)) {
      return [`${list} ${index + 1}: not an object`];
    }
    return needs.filter((field) => item[field] === undefined).map((field) => `${list} ${index + 1}: no ${field}`);
  });
}
// what keeps one preset from a preset's shape, said by its name
function presetProblems(name: string, preset: unknown): string[] {
  if (!isObject(preset)) {
    return [`${name}: not an object`];
  }
  const problems: string[] = [];
  if (preset['kind'] === undefined) {
    problems.push(`${name}: no kind`);
  } else if (typeof preset['kind'] !== 'string') {
    problems.push(`${name}: its kind not a word`);
  }
  for (const list of ['values', 'settings']) {
    if (preset[list] !== undefined && !isByAddress(preset[list])) {
      problems.push(`${name}: its ${list} not by address`);
    }
  }
  return problems;
}
// values by address: an object, each a number or a word
function isByAddress(data: unknown): boolean {
  return isObject(data) && Object.values(data).every((value) => typeof value === 'number' || typeof value === 'string');
}
// what data is where it's not an object: none, or a value of its type
function valueOf(data: unknown): string {
  return data === null || data === undefined ? 'none' : `a ${typeof data}`;
}
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
