// ---------- plan/desk/mute-solo: which channels a mute or a solo silences ----------
// As Ableton's, over a desk plan's wires, each channel by its role:
//   - those muted;
//   - with any soloed, every one but what a soloed one needs to be heard:
//     the channels on its way out to the master, and those whose way out goes through it;
//   - a return never silenced by a solo; the master never silenced at all.
// Ways out by the channels' main outputs.
// A pool's copies are among the children where the caller adds them.
import type { Composite } from '../format/index.ts';

// which channels are muted and which soloed, by name
export interface Muting {
  readonly muted: ReadonlySet<string>;
  readonly soloed: ReadonlySet<string>;
}

// a cut's time constant, a mute's: at once, with no click
export const MUTE_GLIDE = 0.01; // s

// The channels silent, by name.
export function silenced(desk: Pick<Composite, 'children' | 'wires'>, { muted, soloed }: Muting): Set<string> {
  const roles = new Map(desk.children.map(({ name, role }) => [name, role]));
  const silenceable = (name: string): boolean => roles.has(name) && roles.get(name) !== 'master';
  const quiet = new Set([...muted].filter(silenceable));
  const solos = [...soloed].filter(silenceable);
  if (!solos.length) {
    return quiet;
  }
  const wayOut = waysOut(desk);
  const heard = new Set(solos.flatMap(wayOut));
  for (const name of roles.keys()) {
    if (wayOut(name).some((on) => solos.includes(on))) {
      heard.add(name); // what feeds a soloed one
    }
  }
  for (const [name, role] of roles) {
    if (role !== 'return' && role !== 'master' && !heard.has(name)) {
      quiet.add(name);
    }
  }
  return quiet;
}

// a channel's way out: the channel, then each its main output goes into, to the master
function waysOut({ wires }: Pick<Composite, 'wires'>): (name: string) => string[] {
  const next = new Map<string, string>();
  for (const { from, to } of wires) {
    if ('node' in from && from.output === 'out' && 'node' in to) {
      next.set(from.node, to.node);
    }
  }
  return (name) => {
    const way: string[] = [];
    for (let on: string | undefined = name; on !== undefined && !way.includes(on); on = next.get(on)) {
      way.push(on);
    }
    return way;
  };
}
