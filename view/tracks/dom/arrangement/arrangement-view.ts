// ---------- view/tracks/dom/arrangement/arrangement-view: the arrangement on the page, what was heard laid out in time (G4a) ----------
// As Ableton's arrangement (mockup/architecture/views.md): the names in the page, the time on a
// canvas, both from its model (libs/view/tracks/models/arrangement/), which keeps the rows, the regions,
// the time in view and the playhead.
// Here:
//   - the page's parts, shown or hidden;
//   - a click on the names: a group folded, a track's lanes opened;
//   - a drag or a wheel across the time scrolling it;
//   - a press in the ruler placing the playhead, its model cueing it as it's let go;
//   - drawn on every frame while it shows.
import type { Arrangement, Row } from '../../models/index.ts';
import { TimeDrawing, type ArrangementColors, type DrawnRegion } from './time-drawing.ts';
export type { ArrangementColors } from './time-drawing.ts';
import type { DrawnLane } from './lane-drawing.ts';
import { STEP_PX, placeAt } from './pixels.ts';

// what's drawn, as the browser tests read it: the rows, the regions in view and their notes, the opened lanes' lines (G5b), whether it
// follows the present, the place at its left edge, the present's x, and the playhead's place and x where it's set back (P2)
export interface Drawn {
  rows: readonly Row[];
  regions: readonly DrawnRegion[];
  lanes: readonly DrawnLane[];
  following: boolean;
  left: number;
  present: number;
  playhead: { place: number; x: number } | null;
}

// The arrangement on the page:
//   - each group folded to its first track at first, its header unfolding it, a ▸ before its
//     name, with shift every group as it goes;
//   - a track's ▸ opening its lanes under it, with shift every track's as it goes (G5a);
//   - a click or a drag in the ruler setting the playhead back, on the nearest beat, a click
//     past the present putting it back on it (P2).
export class ArrangementView {
  readonly element = document.createElement('div');
  readonly #arrangement: Arrangement;
  readonly #names = document.createElement('div');
  readonly #canvas = document.createElement('canvas');
  readonly #ruler = document.createElement('canvas');
  readonly #drawing: TimeDrawing;
  #shown = false;
  #dragFrom: number | null = null; // a drag's last x

  // colors: the theme's, read as it draws
  constructor({ arrangement, colors }: { arrangement: Arrangement; colors: () => ArrangementColors }) {
    this.#arrangement = arrangement;
    this.#drawing = new TimeDrawing({ ruler: this.#ruler, rows: this.#canvas, colors });
    this.#build(this.#ruler);
  }
  show(shown: boolean): void {
    this.#shown = shown;
    this.element.style.display = shown ? '' : 'none';
    this.#arrangement.show(shown);
    if (shown) {
      this.drawFrame();
    }
  }
  // on every frame while it shows: the time in view following the present, drawn, the names with it
  drawFrame(): void {
    if (!this.#shown) {
      return;
    }
    const arrangement = this.#arrangement;
    arrangement.frame(this.#canvas.clientWidth / STEP_PX);
    this.#nameRows();
    this.#drawing.draw({
      rows: arrangement.rows,
      placed: arrangement.regions,
      lanes: arrangement.lanes,
      playhead: arrangement.playhead,
      left: arrangement.left,
      right: arrangement.right,
      map: arrangement.map,
      now: arrangement.now,
    });
  }
  // the playhead's place where it's set back, or none, on the present (P2)
  get playhead(): number | null {
    return this.#arrangement.playhead;
  }
  drawn(): Drawn {
    const arrangement = this.#arrangement;
    const playhead = arrangement.playhead;
    return {
      rows: arrangement.rows,
      regions: this.#drawing.drawn,
      lanes: this.#drawing.lanes,
      following: arrangement.following,
      left: arrangement.left,
      present: this.#drawing.present,
      playhead: playhead === null ? null : { place: playhead, x: this.#drawing.playhead ?? 0 },
    };
  }
  // the corner and the ruler above, and below them the names beside the rows' canvas, scrolling down together
  #build(ruler: HTMLCanvasElement): void {
    const corner = document.createElement('div');
    const tracks = document.createElement('div');
    this.element.className = 'arrangement';
    this.element.style.display = 'none';
    ruler.className = 'ruler';
    tracks.className = 'tracks';
    this.#names.className = 'names';
    this.#canvas.className = 'time';
    tracks.append(this.#names, this.#canvas);
    this.element.append(corner, ruler, tracks);
    this.#names.addEventListener('click', (event) => this.#clicked(event));
    this.#canvas.addEventListener('pointerdown', (event) => this.#press(event));
    this.#canvas.addEventListener('pointermove', (event) => this.#drag(event));
    for (const ended of ['pointerup', 'pointercancel'] as const) {
      this.#canvas.addEventListener(ended, () => {
        this.#dragFrom = null;
      });
    }
    this.#canvas.addEventListener('wheel', (event) => this.#wheel(event), { passive: false });
    ruler.addEventListener('pointerdown', (event) => {
      ruler.setPointerCapture(event.pointerId);
      this.#arrangement.press(this.#placeOf(event));
      this.drawFrame();
    });
    ruler.addEventListener('pointermove', (event) => {
      this.#arrangement.placeAt(this.#placeOf(event));
      this.drawFrame();
    });
    for (const ended of ['pointerup', 'pointercancel'] as const) {
      ruler.addEventListener(ended, () => this.#arrangement.release()); // cued on release (P3b)
    }
  }
  // the place under a pointer in the ruler
  #placeOf(event: PointerEvent): number {
    return placeAt(event.clientX - this.#ruler.getBoundingClientRect().left, this.#arrangement.left);
  }
  // the names, a row each, drawn again only when the rows change
  #nameRows(): void {
    const rows = this.#arrangement.rows;
    const names = rows.map((row) => `${row.key}\t${row.name}\t${row.open}`).join('\n');
    if (this.#names.dataset.rows === names) {
      return;
    }
    this.#names.dataset.rows = names;
    this.#names.replaceChildren(...rows.map((row) => nameOf(row)));
  }
  // a click on the names: a track's ▸ opening its lanes, or a group's header folding it
  #clicked(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const track = target.closest<HTMLElement>('[data-lanes]')?.dataset.lanes;
    if (track !== undefined) {
      this.#arrangement.toggleLanes(track, event.shiftKey);
    }
    const group = target.closest<HTMLElement>('[data-fold]')?.dataset.fold;
    if (group !== undefined) {
      this.#arrangement.toggleGroup(group, event.shiftKey);
    }
    if (track === undefined && group === undefined) {
      return;
    }
    this.drawFrame();
  }
  #press(event: PointerEvent): void {
    this.#dragFrom = event.clientX;
    this.#canvas.setPointerCapture(event.pointerId);
  }
  // a drag across the time: to the right, what came before
  #drag(event: PointerEvent): void {
    if (this.#dragFrom === null) {
      return;
    }
    this.#scrollBy(event.clientX - this.#dragFrom);
    this.#dragFrom = event.clientX;
  }
  // a wheel sideways, or with shift: down or right, later
  #wheel(event: WheelEvent): void {
    const sideways = event.shiftKey ? event.deltaY : event.deltaX;
    if (!sideways) {
      return;
    }
    event.preventDefault();
    this.#scrollBy(-sideways);
  }
  // px to the right showing what came before
  #scrollBy(px: number): void {
    this.#arrangement.scrollBy(px / STEP_PX);
    this.drawFrame();
  }
}

// a row's name: a group's header, with its ▸ where it has tracks to fold, folding it; a track's, with its ▸ where it has lanes; a lane's,
// its controller (G5a)
function nameOf(row: Row): HTMLElement {
  const name = document.createElement('div');
  name.textContent = row.name;
  if (row.header) {
    name.className = 'group';
    if (row.open !== undefined) {
      Object.assign(name.dataset, { fold: row.group });
      name.title =
        'Click to unfold this group, or fold it to its first track; shift-click: every group, as this one goes.';
      name.prepend(toggleOf(row.open, { fold: row.group }));
    }
    return name;
  }
  if (row.track !== undefined) {
    name.className = 'lane';
    return name;
  }
  name.className = 'track-row'; // not .track nor .row: the session view's strips and sections style those
  if (row.open !== undefined) {
    const toggle = toggleOf(row.open, { lanes: row.key });
    toggle.title = "Click to show this track's lanes, or hide them; shift-click: every track's, as this one goes.";
    name.prepend(toggle);
  }
  return name;
}
// a ▸ before a name, ▾ while what it shows is open, and what a click on it opens
function toggleOf(open: boolean, opens: Record<string, string>): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.textContent = open ? '▾' : '▸';
  Object.assign(toggle.dataset, opens);
  return toggle;
}
