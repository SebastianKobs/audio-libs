// ---------- libs/mixer/routing: where a desk's signals go, signals of any kind: its strips, their ways out and sends, mute and solo ----------
// Only where each goes, not how much, nor how signals combine: that's the desk's that owns it (the mixer sums sound, X0). A strip is a
// channel, a bus (a submix, what's routed into it combined) or a return (an FX channel, fed by sends). Each has one way out, the master
// or a bus, and sends, to returns. A way out or a send goes only to what's on the desk already, of its kind, so there are no loops;
// route() moves a way out, and refuses one that feeds the strip, through a way out or a send. silenced(): which strips are silent, as
// Ableton's mute and solo. reached(): what strips feed, as a desk's lights follow a signal (Z3)

// what a strip is: a channel, a bus, or a return
export type StripKind = 'channel' | 'bus' | 'return';
// a strip on the desk: what it is, its way out, and what it sends to
interface Place {
  readonly kind: StripKind;
  out: string;
  readonly to: string[];
}

const MASTER = 'master'; // the way out of the desk, where every strip ends

export class Routing {
  readonly #strips = new Map<string, Place>();

  // a strip put on the desk, its way out (the master if none is given) and its sends checked first: to the master or a bus on it, to a
  // return on it
  add(
    name: string,
    { kind, out = MASTER, to = [] }: { kind: StripKind; out?: string | undefined; to?: readonly string[] },
  ): void {
    this.#wayOut(out);
    for (const target of to) {
      this.#on(target, 'return');
    }
    this.#strips.set(name, { kind, out, to: [...to] });
  }
  // a strip's way out moved, to the master or a bus, but never into what feeds it
  route(name: string, out: string): void {
    const strip = this.#on(name);
    this.#wayOut(out);
    if (this.#feeds(out, name)) {
      throw new Error(`a loop: ${out} feeds ${name}`);
    }
    strip.out = out;
  }
  // A send added to a strip on the desk, as a send knob turned up for the first time.
  // Only to a return on the desk, never into what feeds the strip; listed once.
  send(name: string, to: string): void {
    const strip = this.#on(name);
    this.#on(to, 'return');
    if (strip.to.includes(to)) {
      return;
    }
    if (this.#feeds(to, name)) {
      throw new Error(`a loop: ${to} feeds ${name}`);
    }
    strip.to.push(to);
  }
  // whether a strip is on the desk; the master is where they end, not one of them
  has(name: string): boolean {
    return this.#strips.has(name);
  }
  kindOf(name: string): StripKind {
    return this.#on(name).kind;
  }
  outOf(name: string): string {
    return this.#on(name).out;
  }
  sentTo(name: string): readonly string[] {
    return this.#on(name).to;
  }
  // The returns a strip can reach, as a desk's send knobs: those put on the desk before it,
  // in their order, none that feeds it.
  returnsFor(name: string): string[] {
    this.#on(name);
    const before = [...this.#strips.keys()];
    return before
      .slice(0, before.indexOf(name))
      .filter((strip) => this.#on(strip).kind === 'return' && !this.#feeds(strip, name));
  }
  // everything the strips named feed, they among it: each through its way out, and the sends sendsUp lets through (all, unless it says),
  // on to the master, which isn't one of them; a name not on the desk kept, not followed
  reached(names: Iterable<string>, sendsUp: (from: string, to: string) => boolean = () => true): Set<string> {
    const reached = new Set(names);
    // a Set's loop visits what's added while it runs: what those feed too
    for (const name of reached) {
      const strip = this.#strips.get(name);
      if (!strip) {
        continue;
      }
      if (strip.out !== MASTER) {
        reached.add(strip.out);
      }
      for (const to of strip.to.filter((target) => sendsUp(name, target))) {
        reached.add(to);
      }
    }
    return reached;
  }
  // which strips are silent, as Ableton's mute and solo: those muted; and with any soloed, every one but what a soloed strip needs to be
  // heard, its own way out to the master and what feeds it, a return never silenced by a solo
  silenced(muted: ReadonlySet<string>, soloed: ReadonlySet<string>): Set<string> {
    const quiet = new Set(muted);
    if (!soloed.size) {
      return quiet;
    }
    const heard = new Set([...soloed].flatMap((name) => this.#wayOutOf(name)));
    // what feeds a soloed strip
    for (const name of this.#strips.keys()) {
      if (this.#wayOutOf(name).some((downstream) => soloed.has(downstream))) {
        heard.add(name);
      }
    }
    for (const [name, strip] of this.#strips) {
      if (strip.kind !== 'return' && !heard.has(name)) {
        quiet.add(name);
      }
    }
    return quiet;
  }
  // a strip and every one its sound goes through on its way to the master
  #wayOutOf(name: string): string[] {
    const strip = this.#strips.get(name);
    if (name === MASTER || !strip) {
      return [];
    }
    return [name, ...this.#wayOutOf(strip.out)];
  }
  // a way out: the master, or a bus on the desk
  #wayOut(out: string): void {
    if (out !== MASTER) {
      this.#on(out, 'bus');
    }
  }
  // whether one strip leads to another, through its way out or its sends: a route there would be a loop
  #feeds(from: string, to: string): boolean {
    if (from === MASTER) {
      return false;
    }
    if (from === to) {
      return true;
    }
    const strip = this.#on(from);
    return [strip.out, ...strip.to].some((next) => this.#feeds(next, to));
  }
  // a strip on the desk by its name, as the kind asked for, if one is
  #on(name: string, kind?: StripKind): Place {
    const strip = this.#strips.get(name);
    if (!strip || (kind && strip.kind !== kind)) {
      throw new Error(`not on the desk${asKind(kind)}: ${name}`);
    }
    return strip;
  }
}
// a kind as an error names it: ' as a bus', ' as a return'; nothing when none was asked for
function asKind(kind: StripKind | undefined): string {
  if (!kind) {
    return '';
  }
  return ` as a ${kind}`;
}
