// ---------- timeline/recorder: what happened, kept as regions of events and as lanes, for a window of time (L1c) ----------
// A generic event recorder, as a DAW records its arrangement, knowing nothing of what its events are. Each element's events into the
// region it names by its number, a region running from its first event to the end of its last; one with no number a region of its own. An
// event with no length held open until its end is told (endAt()); one still open as its element's next numbered region begins ended there
// and carried into it, as carry() makes it. Lanes of points, by an id of the caller's, and an event's own, by their names, each in time
// order, a point that changes nothing thinned once it's settled. Kept for a window, the last 30 minutes unless told: an event ended before
// it let go, and a region with none, a lane's points before it but its last. The sequencer's recorder maps what's heard onto it
// (sound/sequencer/recorder.ts)
import type { Seconds } from '../clock/index.ts';
import { keptFrom, placed, thinned, type EventLanes, type Lane, type LanePoint } from './lanes.ts';

// an event on the timeline: when, how long, none while it's open, and its own lanes, by their names
export interface TimedEvent {
  t: Seconds;
  duration?: Seconds | undefined;
  lanes?: EventLanes | undefined;
}
// a region as it's handed out: the element it's of, its number if it has one, what began it, its events, and from when to when, an open
// one's end never
export interface Region<Header, Event extends TimedEvent> {
  element: unknown;
  number: number | undefined;
  header: Header;
  events: Event[];
  from: Seconds;
  to: Seconds;
}
// how an event still open is carried into its element's next region, from a time
export type Carry<Event> = (event: Event, at: Seconds) => Event;
// what the recorder is told: its window; how an open event is carried; where an event's own lane starts, which its first point is
// thinned against, none by default
export interface RecorderOptions<Event> {
  keep?: Seconds | undefined;
  carry?: Carry<Event> | undefined;
  startOf?: ((event: Event, lane: string) => number | undefined) | undefined;
}
// a region as it's kept: its element, number and what began it, and its events as they come
interface Kept<Header, Event> {
  element: unknown;
  number: number | undefined;
  header: Header;
  events: Event[];
}

const KEEP: Seconds = 30 * 60; // the last 30 minutes, as an arrangement shows them
const LET_GO_EVERY: Seconds = 1; // as events come, what's past let go at most once a second of their time, not on every event
const SETTLED: Seconds = 1; // a point a second past: nothing comes that late, so one that changes nothing is thinned from then

export class EventRecorder<Header, Event extends TimedEvent, LaneId extends object> {
  readonly #keep: Seconds;
  readonly #carry: Carry<Event>;
  readonly #startOf: (event: Event, lane: string) => number | undefined;
  #kept: Kept<Header, Event>[] = []; // in the order they began
  readonly #numbered = new Map<unknown, Map<number, Kept<Header, Event>>>(); // each element's regions, by their number
  readonly #lanes = new Map<string, Lane<LaneId>>(); // by their id, in the order they began
  #letGoBefore = -Infinity; // the last time what's past was let go as events came

  constructor({ keep = KEEP, carry = carried, startOf = () => undefined }: RecorderOptions<Event> = {}) {
    this.#keep = keep;
    this.#carry = carry;
    this.#startOf = startOf;
  }
  // an element's events, into its region by its number, or a new one, those still open in its others ended where it begins and carried
  // into it after its own; with no number, a region of its own; what began it kept from its first. Its own copies, which it changes
  record(element: unknown, number: number | undefined, header: Header, events: readonly Event[]): void {
    if (!events.length) {
      return;
    }
    const { kept, carriedIn } = this.#regionOf(element, number, header, events);
    kept.events.push(...events, ...carriedIn);
    const before = earliest(events) - this.#keep;
    if (before >= this.#letGoBefore + LET_GO_EVERY) {
      this.#letGo(before);
    }
  }
  // an element's latest open event that matches, from its latest region back, the first open there: the one an end told now ends
  openEventOf(element: unknown, match: (event: Event) => boolean): Event | undefined {
    for (const kept of [...this.#kept].reverse().filter((region) => region.element === element)) {
      const event = kept.events.find((open) => open.duration === undefined && match(open));
      if (event) {
        return event;
      }
    }
    return undefined;
  }
  // an element's latest event that matches, open or not, from its latest region back: the one a change told now is to
  latestEventOf(element: unknown, match: (event: Event) => boolean): Event | undefined {
    for (let at = this.#kept.length - 1; at >= 0; at--) {
      const kept = this.#kept[at]!; // within the list
      const event = kept.element === element ? kept.events.findLast(match) : undefined;
      if (event) {
        return event;
      }
    }
    return undefined;
  }
  // an open event's end told, at a time: its length from where it starts, never less than none
  endAt(event: Event, t: Seconds): void {
    event.duration = Math.max(0, t - event.t);
  }
  // a point on an event's own lane, by its name, among those there in time order
  placeOnEvent(event: Event, lane: string, point: LanePoint): void {
    const lanes = (event.lanes ??= {});
    placed((lanes[lane] ??= []), point);
  }
  // a point on a lane by its id, made the first time a point comes for it, among those there in time order
  placeOnLane(id: LaneId, point: LanePoint): void {
    placed(this.#laneOf(id).points, point);
  }
  // the regions kept at a time, in the order they began, those wholly before the window let go
  regions(now: Seconds): Region<Header, Event>[] {
    this.#letGo(now - this.#keep);
    this.#thin(now - SETTLED);
    return this.#kept.map((kept) => regionOf(kept));
  }
  // the lanes at a time, in the order they began, their points before the window let go but each one's last
  lanes(now: Seconds): Lane<LaneId>[] {
    this.#letGo(now - this.#keep);
    this.#thin(now - SETTLED);
    return [...this.#lanes.values()];
  }
  #laneOf(id: LaneId): Lane<LaneId> {
    const key = JSON.stringify(id);
    const known = this.#lanes.get(key);
    if (known) {
      return known;
    }
    const lane: Lane<LaneId> = { ...id, points: [] };
    this.#lanes.set(key, lane);
    return lane;
  }
  // the points that change nothing, once they're settled, left out of every lane, a caller's and an event's own
  #thin(settled: Seconds): void {
    for (const lane of this.#lanes.values()) {
      lane.points = thinned(lane.points, settled);
    }
    for (const event of this.#kept.flatMap((kept) => kept.events)) {
      this.#thinEvent(event, settled);
    }
  }
  // an event's own lanes thinned, each one's first against where it starts, a jump
  #thinEvent(event: Event, settled: Seconds): void {
    const { lanes } = event;
    if (!lanes) {
      return;
    }
    for (const [name, points] of Object.entries(lanes)) {
      const start = this.#startOf(event, name);
      lanes[name] = thinned(points ?? [], settled, start === undefined ? undefined : { t: event.t, value: start });
    }
  }
  // the region an element's events are of: its by their number, or a new one, those still open in its others ending where it begins
  // and carried into it; with no number, a region of its own
  #regionOf(
    element: unknown,
    number: number | undefined,
    header: Header,
    events: readonly Event[],
  ): { kept: Kept<Header, Event>; carriedIn: Event[] } {
    if (number === undefined) {
      return { kept: this.#begin(element, number, header), carriedIn: [] };
    }
    const numbered = this.#numbered.get(element) ?? new Map<number, Kept<Header, Event>>();
    this.#numbered.set(element, numbered);
    const known = numbered.get(number);
    if (known) {
      return { kept: known, carriedIn: [] };
    }
    const begins = earliest(events);
    const carriedIn = [...numbered.values()].flatMap((before) => this.#heldThrough(before, begins));
    const kept = this.#begin(element, number, header);
    numbered.set(number, kept);
    return { kept, carriedIn };
  }
  // a region's events still open as its element's next region begins: each ended there, and carried from there
  #heldThrough(before: Kept<Header, Event>, begins: Seconds): Event[] {
    const open = before.events.filter((event) => event.duration === undefined);
    for (const event of open) {
      event.duration = begins - event.t;
    }
    return open.map((event) => this.#carry(event, begins));
  }
  #begin(element: unknown, number: number | undefined, header: Header): Kept<Header, Event> {
    const kept: Kept<Header, Event> = { element, number, header, events: [] };
    this.#kept.push(kept);
    return kept;
  }
  // the events ended before a time let go, and each region with none left, from its element's too; each lane's points before it but
  // its last
  #letGo(before: Seconds): void {
    this.#letGoBefore = before;
    for (const lane of this.#lanes.values()) {
      lane.points = keptFrom(lane.points, before);
    }
    for (const kept of this.#kept) {
      kept.events = kept.events.filter((event) => endOf(event) >= before);
    }
    for (const gone of this.#kept.filter((kept) => !kept.events.length)) {
      this.#forget(gone);
    }
    this.#kept = this.#kept.filter((kept) => kept.events.length);
  }
  #forget(kept: Kept<Header, Event>): void {
    const numbered = this.#numbered.get(kept.element);
    if (kept.number !== undefined) {
      numbered?.delete(kept.number);
    }
    if (numbered?.size === 0) {
      this.#numbered.delete(kept.element);
    }
  }
}

// an event carried as it is: from where its element's next region begins, open, its own lanes staying with the one ended
function carried<Event extends TimedEvent>(event: Event, at: Seconds): Event {
  const { duration: _ended, lanes: _before, ...open } = event;
  return { ...open, t: at } as Event; // the event's own fields, but those it ended with
}
// where the earliest of some events starts
function earliest(events: readonly TimedEvent[]): Seconds {
  return Math.min(...events.map((event) => event.t));
}
// a kept region as it's handed out: from its first event to the end of its last
function regionOf<Header, Event extends TimedEvent>(kept: Kept<Header, Event>): Region<Header, Event> {
  const { element, number, header, events } = kept;
  return {
    element,
    number,
    header,
    events,
    from: earliest(events),
    to: Math.max(...events.map((event) => endOf(event))),
  };
}
// where an event ends: at its length, or, open, never yet
function endOf(event: TimedEvent): Seconds {
  return event.duration === undefined ? Infinity : event.t + event.duration;
}
