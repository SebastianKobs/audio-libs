// ---------- plan/planner/shape: a template read from data, its shape checked ----------
// Data read from a file, YAML's, is unknown until it's checked. A light check, before the planner's:
//   - its kind a word, its form a word where it names one;
//   - each list it writes a list, each item an object with what that item needs:
//     a jack its name, a child its name and kind, a wire its two ends, a macro its targets,
//     a pool its child and its wires.
// What they hold is the planner's check (check.ts). Every failure said, naming the file.
import type { Template } from './template.ts';

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

// what keeps data from a template's shape
function shapeProblems(data: unknown): string[] {
  if (!isObject(data)) {
    return [`not an object: ${valueOf(data)}`];
  }
  const problems: string[] = [];
  if (typeof data['kind'] !== 'string') {
    problems.push('its kind not a word');
  }
  if (data['form'] !== undefined && typeof data['form'] !== 'string') {
    problems.push('its form not a word');
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
// what data is where it's not an object: none, or a value of its type
function valueOf(data: unknown): string {
  return data === null || data === undefined ? 'none' : `a ${typeof data}`;
}
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
