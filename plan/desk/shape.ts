// ---------- plan/desk/shape: a desk or a channel read from data ----------
// Data read from a file, YAML's, is unknown until it's checked.
// A light check of its shape, before deskTemplates()'s:
//   - its kind a word; its channels a list, each its name and its role, one of the desk's;
//   - a channel's parts: its inserts a list, each its name and its kind or a preset;
//     its pan true or false, its volume a number, its tap pre or post;
//   - a desk's taps by return, each pre or post; its pools a list, each its name.
// What they hold is deskTemplates()'s check, and the planner's.
// Every failure said, naming the file.
import { isObject, listProblems, notAnObject } from '../planner/index.ts';
import type { Channel } from './channel.ts';
import type { Desk } from './desk.ts';

const ROLES = ['channel', 'bus', 'return', 'master'];
const TAPS = ['pre', 'post'];

// A desk read from data, as it is once its shape is a desk's; refused where it isn't.
export function deskOf(data: unknown, source: string): Desk {
  return refusedUnless<Desk>(data, deskProblems(data), `${source}: not of the shape of a desk:`);
}
// A channel read from data, as it is once its shape is a channel's; refused where it isn't.
export function channelOf(data: unknown, source: string): Channel {
  return refusedUnless<Channel>(data, channelProblems(data), `${source}: not of the shape of a channel:`);
}

// the data as it is, where nothing's wrong; else refused, under its heading, a line each
function refusedUnless<Shape>(data: unknown, problems: readonly string[], heading: string): Shape {
  if (problems.length) {
    throw new Error([heading, ...problems].join('\n  '));
  }
  return data as Shape; // of its shape, as checked
}
// what keeps data from a desk's shape: its kind, what its lists' items need, then each one's parts
function deskProblems(data: unknown): string[] {
  if (!isObject(data)) {
    return [notAnObject(data)];
  }
  const channels = Array.isArray(data['channels']) ? data['channels'] : [];
  const pools = Array.isArray(data['pools']) ? data['pools'] : [];
  return [
    ...kindProblems(data),
    ...(data['channels'] === undefined ?
      ['no channels']
    : listProblems('channels', data['channels'], ['name', 'role'])),
    ...listProblems('pools', data['pools'], ['name']),
    ...channels.flatMap((channel: unknown, index) => onDeskProblems(channel, `channels ${index + 1}`)),
    ...pools.flatMap((pool: unknown, index) => onDeskProblems(pool, `pools ${index + 1}`)),
  ];
}
// what keeps data from a channel's shape: its kind, then its parts
function channelProblems(data: unknown): string[] {
  if (!isObject(data)) {
    return [notAnObject(data)];
  }
  return [...kindProblems(data), ...partsProblems(data, '')];
}
// its kind a word
function kindProblems(data: Record<string, unknown>): string[] {
  return typeof data['kind'] === 'string' ? [] : ['its kind not a word'];
}
// A channel on a desk, named in each line:
//   - its role one of the desk's;
//   - its parts;
//   - its taps each pre or post.
function onDeskProblems(channel: unknown, at: string): string[] {
  if (!isObject(channel)) {
    return []; // said by its list
  }
  const role = channel['role'];
  const roleProblems =
    role === undefined || ROLES.includes(role as string) ?
      []
    : [`${at}: its role ${shown(role)}, not channel, bus, return or master`];
  const taps = isObject(channel['taps']) ? Object.entries(channel['taps']) : [];
  return [
    ...roleProblems,
    ...partsProblems(channel, at),
    ...taps
      .filter(([, tap]) => !TAPS.includes(tap as string))
      .map(([to, tap]) => `${at}: its tap for ${to} ${shown(tap)}, not pre or post`),
  ];
}
// A channel's parts: its inserts, its pan, its volume, its tap.
// Each line after where it is: none for a channel of its own.
function partsProblems(data: Record<string, unknown>, at: string): string[] {
  const where = at ? `${at}: ` : '';
  const problems = listProblems(at ? `${at} inserts` : 'inserts', data['inserts'], ['name', ['kind', 'preset']]);
  if (data['pan'] !== undefined && typeof data['pan'] !== 'boolean') {
    problems.push(`${where}its pan not true or false`);
  }
  if (data['volume'] !== undefined && typeof data['volume'] !== 'number') {
    problems.push(`${where}its volume not a number`);
  }
  if (data['tap'] !== undefined && !TAPS.includes(data['tap'] as string)) {
    problems.push(`${where}its tap ${shown(data['tap'])}, not pre or post`);
  }
  return problems;
}
// a value as data wrote it, in a failure's line: a word as it is, anything else as JSON
function shown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value) ?? 'none';
}
