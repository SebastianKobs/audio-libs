// ---------- build/desk/automation/desk-automation: the desk's automation, a package fitted to a desk ----------
// A copy of whoever operates the desk: each controller taken as it comes back off a track, set on
// the desk on time, the motors; a note's own controllers on its track's channel among them.
// The desk works without it.
// As its track's controllers name them: by their params' addresses on the strip, as the
// views set them:
//   - its fader's volume and pan, a send by its FX channel's name; its mute and solo;
//   - its Utility's level and pan; the master's volume and its limiter's gain, ceiling and
//     release;
//   - an FX channel's own param: a delay's time.
// On the desk, the strip's address in front (my tap/1/send/reverb).
// Where each goes:
//   1. one a track's notes set, where a note is heard from and what its phrase drew: its
//      channel's, at its time on the audio's clock, the channel added as it comes (a live
//      track's, which its instrument adds, not);
//   2. a strip's mute and solo: the desk's mute() and solo();
//   3. any other: the desk's, which keeps it.
// When, each held on the clock's cues:
//   - one that glides: until its lead ahead of its time, as the 16ths are, then set at its
//     time, gliding;
//   - a switch, a choice and a param its spec says never glides (a delay line's time): until
//     its time.
// Each checked as it comes: an address the desk hasn't refused, naming it.
import { Cues, LOOKAHEAD, type Clock } from '../../../../sequencing/clock/index.ts';
import type { Controller } from '../../../../sequencing/midi/index.ts';
import { atItsTime } from '../../../../base/params/index.ts';
import { controlAddress } from '../../../plan/desk/index.ts';
import { splitAtChild } from '../../../plan/format/index.ts';
import { addressText } from '../../../../base/util/index.ts';
import type { DeskBuilt, DeskSetup, MixingDesk } from '../mixing/index.ts';
import { whenOf, type Change } from './change.ts';

type AutomatedDesk = Pick<MixingDesk<DeskBuilt>, 'plan' | 'specOf' | 'set' | 'mute' | 'solo' | 'channelOf'>;

export class DeskAutomation {
  readonly #desk: AutomatedDesk;
  readonly #setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
  readonly #clock: Pick<Clock, 'now' | 'onTick'>;
  readonly #at: (t: number) => number;
  readonly #stripTracks: ReadonlySet<string>; // the strips that are tracks of their own (isStripTrack())
  // the changes held, by when they're set:
  //   ahead: those that glide, set their lead ahead;
  //   due: switches, choices and a param that never glides, set at their time
  readonly #held: Readonly<Record<'ahead' | 'due', Cues<Change>>>;

  // desk: the desk it's fitted to, whose own channels are tracks of their own;
  // setup: its rules, which tracks are set live, what a track's notes set;
  // clock: its time now and its ticks; at(): a time on it on the audio's clock
  constructor({
    desk,
    setup,
    clock,
    at,
  }: {
    desk: AutomatedDesk;
    setup: Pick<DeskSetup, 'isLive' | 'setBy'>;
    clock: Pick<Clock, 'now' | 'onTick'>;
    at: (t: number) => number;
  }) {
    this.#desk = desk;
    this.#setup = setup;
    this.#clock = clock;
    this.#at = at;
    // a desk is a composite
    this.#stripTracks = new Set(desk.plan.node.children!.map(({ name }) => name));
    const timeOf = (change: Change): number => change.t;
    const handOn = (change: Change): void => this.#set(change);
    this.#held = { ahead: new Cues({ timeOf, handOn, lead: LOOKAHEAD }), due: new Cues({ timeOf, handOn }) };
    clock.onTick((now) => {
      this.#held.ahead.tick(now);
      this.#held.due.tick(now);
    });
  }
  // Whether a track is a strip of the desk's alone, its instrument the strip itself: the buses,
  // the FX busses and the master. A pool's tracks are
  // tracks with instruments, which pass a strip's controllers on.
  isStripTrack(track: string): boolean {
    return this.#stripTracks.has(track);
  }
  // Whether a control glides there, as a knob's move is smoothed: not a switch, as its param
  // is declared (a mute, a solo), nor a choice, nor a param its spec says never glides (a delay
  // line's time), which land at their time. One no strip has glides, refused as it comes.
  glides(strip: string, controller: string): boolean {
    const address = controlAddress(strip, controller);
    const spec = this.#desk.specOf(address);
    return !spec || !atItsTime(spec);
  }
  // A strip's controller set on time, as a change to its key, gliding by its time constant
  // where it has one: on its track's channel where its notes set it, else held for the desk.
  control(strip: string, { controller, value, t, glide }: Controller): void {
    const address = controlAddress(strip, controller);
    const change: Change = { address, value, t, ...(glide === undefined ? {} : { glide }) };
    if (this.#setByNotes(strip, change)) {
      return;
    }
    this.#hold(change);
  }
  // A change on a track's channel where its notes set it, at its time on the audio's clock.
  // Its channel added as any controller comes but a live track's, which its instrument adds.
  // Returns false for one it doesn't set: a live track's, a param not its notes', a track
  // with no pool.
  #setByNotes(track: string, change: Change): boolean {
    if (this.#setup.isLive(track) || !this.#desk.channelOf(track) || this.#setup.setBy(change.address) === undefined) {
      return false;
    }
    this.#desk.set(change.address, change.value, whenOf(change, { now: this.#clock.now(), at: this.#at }));
    return true;
  }

  // A change for the desk, checked as it comes, held until it's set on time.
  #hold(change: Change): void {
    const spec = this.#desk.specOf(change.address);
    if (!spec) {
      const { child, within } = splitAtChild(change.address);
      throw new Error(`no controller ${addressText(within)} on strip ${addressText(child)}`);
    }
    const due = atItsTime(spec);
    this.#held[due ? 'due' : 'ahead'].cue(change, this.#clock.now());
  }
  // A change set by its address's shape, when it says:
  //   - a strip's own mute or solo (strip/mute): the live mix's switch;
  //   - any other (strip/volume, strip/send/reverb, strip/utility/level): the desk's.
  #set({ address, value, t, glide }: Change): void {
    const { child, within } = splitAtChild(address);
    const [own] = within;
    if (within.length === 1 && (own === 'mute' || own === 'solo')) {
      this.#switched(addressText(child), own, value > 0);
      return;
    }
    this.#desk.set(address, value, whenOf({ t, glide }, { now: this.#clock.now(), at: this.#at }));
  }
  #switched(strip: string, param: 'mute' | 'solo', on: boolean): void {
    if (param === 'mute') {
      this.#desk.mute(strip, on);
      return;
    }
    this.#desk.solo(strip, on);
  }
}
