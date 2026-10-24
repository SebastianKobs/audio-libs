// ---------- gestures/tracker: the gesture tracker: a pointer's events from press to release, its input in: down, move, up and cancel ----------
// It only tells: everything else reacts to its events (events.ts).
// Each pointer has a state:
// - the left button, or any but the right: pressed, then dragging once it's moved past the drag threshold, or holding once it's stayed
//   pressed for holdDelay. Either is for good, until it's let go. A drag that winds into a small loop is looping from then on
// - the right button: panning
// - two fingers (pair.ts): a second pointer down within "two-finger window" of the first makes the two a pair, which pans, as the design
//   document has it: one finger is for stimming, two move the view. Whatever the first had started is taken back. Lift one, and the other
//   does nothing until it's lifted, or a finger goes down again beside it, which pans on. A second pointer after the window, or a third,
//   is ignored, so a stray finger or a palm never interrupts a stroke
// Each input takes a pointer on through its states: a second pointer goes to pair.ts, and a drag's every move to stroke.ts.
// A press becomes a hold, and a still drag rests, on the clock's tick
import { Events, approach } from '../../base/util/index.ts';
import type { Clock } from '../../sequencing/clock/index.ts';
import type { EventType, Extra, GestureEvents, StrokeShape } from './events.ts';
import type { HandedIn, Pointer, PointerInput, Tracking } from './pointers.ts';
import type { TrackerSettings } from './settings.ts';
import { emitPan, pairUp, unpair } from './pair.ts';
import { readStroke, REST, stillSince } from './stroke.ts';

// the gesture tracker: its input, each pointer's down, move, up and cancel, from the page; its
// events, to on(type, listener); what's handed in (configure()); the pointers that are down and what's asked of them. Its tick listener,
// a press's hold and a drag's rest, kept from its making until dispose()
export class GestureTracker implements Tracking {
  readonly pointers = new Map<number, Pointer>(); // every pointer that's down, by id, and what it's doing. Written by the tracker's parts only
  // what's handed in, its defaults until it is (pointers.ts)
  readonly handedIn: HandedIn = { height: 900, zoneAt: () => null };
  readonly settings: TrackerSettings;
  readonly #clock: Clock;
  readonly #events = new Events<GestureEvents>();
  readonly #stopTicking: () => void;

  constructor({ settings, clock }: { settings: TrackerSettings; clock: Clock }) {
    this.settings = settings;
    this.#clock = clock;
    this.#stopTicking = clock.onTick((t) => this.#tick(t));
  }
  // listener(event) on each event of a type; returns a function that stops listening
  on<Type extends EventType>(type: Type, listener: (...args: GestureEvents[Type]) => void): () => void {
    return this.#events.on(type, listener);
  }
  configure(options: Partial<HandedIn>): void {
    Object.assign(this.handedIn, options);
  }
  tracking(id: number): boolean {
    return this.pointers.has(id);
  }
  // a press in progress, not a pan
  inGesture(): boolean {
    return [...this.pointers.values()].some((pointer) => pointer.state !== 'panning');
  }
  shapeOf(id: number): StrokeShape {
    return this.pointers.get(id)?.track?.shape ?? 'straight';
  }
  // how fast a drag's hand moves (handSpeed()), or null while it isn't known
  speedOf(id: number): number | null {
    return this.pointers.get(id)?.speed ?? null;
  }
  // s since a drag last moved
  restingFor(id: number): number {
    const stroke = this.pointers.get(id)?.track;
    return stroke ? this.#clock.now() - stroke.lastMoved : 0;
  }
  // every event of the tracker's is one argument, its payload
  emit<Type extends EventType>(type: Type, pointer: Pointer, more?: Extra<Type>): void {
    (this.#events.emit as (type: Type, event: GestureEvents[Type][0]) => void)(type, {
      id: pointer.id,
      t: pointer.t,
      x: pointer.x,
      y: pointer.y,
      g: pointer.g,
      state: pointer.state,
      ...more,
    });
  }
  // each input: the pointer's id, its button (down only), screen x, y, its own time t, on the clock's timeline, and the floor point g
  down({ id, button, x, y, t, g }: PointerInput): void {
    if (this.pointers.size) {
      pairUp(this, { id, x, y, t, g });
      return;
    }
    const pointer: Pointer = {
      id,
      state: button === 2 ? 'panning' : 'pressed',
      pressX: x,
      pressY: y,
      pressT: t,
      pressG: g,
      x,
      y,
      t,
      g,
      track: null,
    };
    this.pointers.set(id, pointer);
    this.emit(pointer.state === 'panning' ? 'panstart' : 'press', pointer);
  }
  move({ id, x, y, t, g }: PointerInput): void {
    const pointer = this.pointers.get(id);
    if (!pointer || pointer.state === 'holding' || pointer.state === 'done') {
      return;
    }
    if (pointer.state === 'pair') {
      Object.assign(pointer, { x, y, t, g });
      emitPan(this, 'panmove', pointer);
      return;
    }
    if (
      pointer.state === 'pressed'
      && Math.hypot(x - pointer.pressX!, y - pointer.pressY!) <= this.settings.moveThreshold
    ) {
      return;
    }
    this.#handSpeed(pointer, x, y, t);
    Object.assign(pointer, { x, y, t, g });
    if (pointer.state === 'panning') {
      this.emit('panmove', pointer);
      return;
    }
    this.#drag(pointer);
  }
  // a drag moves on: past the threshold a press starts one; its stroke read, or a loop's stillness
  #drag(pointer: Pointer): void {
    if (pointer.state === 'pressed') {
      pointer.state = 'dragging';
      this.emit('dragstart', pointer);
    }
    if (pointer.state === 'dragging') {
      readStroke(this, pointer);
    } else if (pointer.state === 'looping') {
      // its shape is read no more, but how long it's been still is (restingFor())
      stillSince(pointer);
    }
    this.emit('dragmove', pointer);
  }
  up({ id, x, y, t, g }: PointerInput): void {
    const pointer = this.pointers.get(id);
    if (!pointer) {
      return;
    }
    this.pointers.delete(id);
    if (pointer.state === 'pair') {
      pointer.t = t;
      unpair(this, pointer);
      return;
    } // where the pair last was
    if (pointer.state === 'done') {
      return;
    }
    Object.assign(pointer, { x, y, t, g });
    if (pointer.state === 'panning') {
      this.emit('panend', pointer);
      return;
    }
    if (pointer.state === 'pressed') {
      this.emit('tap', pointer);
    }
    this.emit('release', pointer);
  }
  cancel(id: number, t = this.#clock.now()): void {
    const pointer = this.pointers.get(id);
    if (!pointer) {
      return;
    }
    this.pointers.delete(id);
    pointer.t = t;
    if (pointer.state === 'pair') {
      unpair(this, pointer);
      return;
    }
    if (pointer.state === 'done') {
      return;
    }
    this.emit(pointer.state === 'panning' ? 'panend' : 'cancel', pointer);
  }
  cancelAll(t = this.#clock.now()): void {
    for (const id of this.pointers.keys()) {
      this.cancel(id, t); // a Map's iteration skips what cancel() deletes
    }
  }
  dispose(): void {
    this.#stopTicking();
  }
  // on each tick of the clock: a press that has stayed for holdDelay becomes a hold, and a drag that has been still for 0.1 s rests
  #tick(t: number): void {
    for (const pointer of this.pointers.values()) {
      if (pointer.state === 'pressed' && t - pointer.pressT! >= this.settings.holdDelay - 1e-9) {
        pointer.state = 'holding';
        this.emit('hold', pointer, { t });
      } else if (
        pointer.state === 'dragging'
        && pointer.track
        && !pointer.track.rested
        && t - pointer.track.lastMoved >= REST - 1e-9
      ) {
        pointer.track.rested = true;
        this.emit('rest', pointer, { t });
      }
    }
  }
  // how fast the hand moves, on the screen: screen heights a second, smoothed over
  // about "hand smoothing" (speedOf()). After a standstill the first move spans the
  // rest, and the first of a drag comes from the press, so it isn't known (null) until
  // the next, and then that move's own.
  // Moves stamped at one time (a mouse's, coalesced, many a frame) count in the next
  // move with a time of its own, measured from the last one that had one.
  #handSpeed(pointer: Pointer, screenX: number, screenY: number, t: number): void {
    const dt = t - pointer.t;
    if (!(dt > 0)) {
      return;
    }
    const fromX = pointer.timedX ?? pointer.x;
    const fromY = pointer.timedY ?? pointer.y;
    pointer.timedX = screenX;
    pointer.timedY = screenY;
    if (dt >= REST || pointer.state === 'pressed') {
      pointer.speed = null;
      return;
    }
    const moveSpeed = Math.hypot(screenX - fromX, screenY - fromY) / this.handedIn.height / dt;
    pointer.speed =
      pointer.speed == null ? moveSpeed : approach(pointer.speed, moveSpeed, dt, this.settings.handSmooth);
  }
}
