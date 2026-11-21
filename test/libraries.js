// ---------- the libraries' groups, and their files read as the checks read them ----------
// ts-code-checks' sourcesIn() and testsIn() read one folder, and here the libraries sit beside the tests, the tools and node_modules:
// each group is read alone, its files named by their paths from the root.
import { join } from 'node:path';

// the groups, each a folder at the root (README.md); the import rules' layout (test/module-rules.js) holds every library of them
export const GROUPS = Object.freeze([
  'base',
  'dsp',
  'formats',
  'midi',
  'midi-devices',
  'modular-audio',
  'music',
  'sequencing',
  'spatial',
]);

// the files the reader finds in each group, by path from the root → text; the reader is sourcesIn() or testsIn()
export function inGroups(read, root) {
  return new Map(
    GROUPS.flatMap((group) => [...read(join(root, group))].map(([path, text]) => [`${group}/${path}`, text])),
  );
}
