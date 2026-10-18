// ---------- view/dom/clip-tracks-view: the clip tracks drawn, a column each ----------
// A section that folds, as the mixer's do, a clip track a column, a chip a clip.
// A chip lights while its clip sounds; a played track's chips have ▶ and ×.
// Its clicks are handed to its model (libs/view/models/clip-tracks.ts).
import type { ClipTrack } from '../control-surface/index.ts';
import type { ClipTracks, ShownClip, Toggles } from '../models/index.ts';
import { makeElement } from './elements.ts';
import { SectionView } from './section-view.ts';

// A clip track as drawn, made once so it keeps its scroll: its count, its list, its chips.
// A chip is kept with its clip; only its light and note count change.
interface DrawnTrack {
  count: HTMLSpanElement;
  list: HTMLDivElement;
  chips: Map<unknown, HTMLDivElement>;
}

// The clip tracks drawn (see the top of this file).
// Clicks anywhere in what it's made in, its own:
//   - a clip's ▶ and ×, handed to its model, the × asking first;
//   - a clip track's name opens what it opens, its instruments (open()).
// Anything but a ▶ or a × stops a × asking.
export class ClipTracksView {
  readonly section: SectionView;
  readonly #clips: ClipTracks;
  readonly #open: (title: string, what: string) => void;
  readonly #tracks = new Map<string, DrawnTrack>(); // by its clip track's key
  readonly #slots = new WeakMap<Element, unknown>(); // a chip's clip
  #beat = 0; // the clock's beat the view was last drawn on
  #askingShown: unknown = null; // the clip whose × shows it asks

  // within: what its section is made at the end of, its clicks listened to;
  // opens(): what a clip track's name opens, if anything;
  // open(): what it opens opened, by its title;
  // folding: which sections are folded, its own and those beside it;
  // folded(): told after a click folded it
  constructor({
    within,
    clips,
    opens,
    open,
    folding,
    folded,
  }: {
    within: HTMLElement;
    clips: ClipTracks;
    opens: (track: ClipTrack) => string | null;
    open: (title: string, what: string) => void;
    folding: Toggles;
    folded: () => void;
  }) {
    this.#clips = clips;
    this.#open = open;
    this.section = new SectionView(within, 'clip', { folding, folded });
    within.addEventListener('click', (event) => this.#clicked(event));
    for (const track of clips.tracks) {
      this.#tracks.set(track.key, this.#trackOf(track, opens(track)));
    }
  }
  // The beat the view is drawn on.
  setBeat(drawnOn: number): void {
    this.#beat = drawnOn;
  }
  // Every clip track as it is now, a clip lit while it sounds (lit(), by its track's key).
  draw(lit: (track: string) => ReadonlySet<unknown>): void {
    for (const track of this.#clips.tracks) {
      this.#draw(track, lit(track.key));
    }
  }
  // A × left unanswered stops asking. Checked on every frame.
  expire(): void {
    this.#clips.expire();
    this.#showAsking();
  }
  // A clip track's column, made once: its name, opening what it opens, its count, its list.
  #trackOf(track: ClipTrack, opens: string | null): DrawnTrack {
    const column = makeElement('div', 'track cliptrack');
    const head = makeElement('div', 'head', track.name);
    const count = makeElement('span');
    const list = makeElement('div', 'list');
    column.dataset.sounds = `clips ${track.key}`; // for a folded section's light
    if (opens) {
      Object.assign(head.dataset, { open: opens, title: track.name });
    }
    head.appendChild(count);
    column.append(head, list);
    this.section.row.appendChild(column);
    return { count, list, chips: new Map() };
  }
  // A clip track's chips: a clip gone, its chip gone; a new one's made; each lit as it is.
  #draw(track: ClipTrack, lit: ReadonlySet<unknown>): void {
    const drawn = this.#tracks.get(track.key)!; // every track's, made as the view started
    const clips = this.#clips.clipsOn(track);
    const present = new Set(clips.map(({ slot }) => slot));
    for (const [slot, chip] of drawn.chips) {
      if (!present.has(slot)) {
        chip.remove();
        drawn.chips.delete(slot);
      }
    }
    for (const clip of clips) {
      const chip = drawn.chips.get(clip.slot) ?? this.#chipFor(track, clip, drawn);
      this.#light(chip, clip, lit);
    }
    drawn.count.textContent = String(clips.length);
  }
  // A clip's chip, made the first time it's drawn: the clip's name and note count.
  // A played track's chip also gets ▶ and ×.
  #chipFor(track: ClipTrack, clip: ShownClip, drawn: DrawnTrack): HTMLDivElement {
    const chip = makeElement('div', 'cell');
    chip.append(makeElement('span', '', clip.name), ' ', makeElement('small'));
    drawn.list.appendChild(chip);
    drawn.chips.set(clip.slot, chip);
    this.#slots.set(chip, clip.slot);
    if (track.played) {
      const go = makeElement('b', 'launch', '▶');
      const drop = makeElement('b', 'drop', '×');
      go.dataset.launch = '';
      go.title = 'Play this clip in full, on the next beat';
      drop.dataset.delete = '';
      drop.title = 'Delete this plant: click again to confirm';
      chip.prepend(go, ' ');
      chip.append(' ', drop);
    }
    return chip;
  }
  // A chip as it is now: its note count, its ▶ flashing while its clip plays, and lit while
  // the clip sounds.
  #light(chip: HTMLDivElement, clip: ShownClip, lit: ReadonlySet<unknown>): void {
    chip.querySelector('small')!.textContent = String(clip.notes ?? ''); // every chip has a <small>
    const go = chip.querySelector('[data-launch]');
    if (go) {
      go.classList.toggle('playing', clip.playing);
      go.classList.toggle('flash', clip.playing && this.#beat % 2 === 0);
    } // a flash every two beats
    chip.classList.toggle('lit', lit.has(clip.slot));
  }
  // A click anywhere in what it's made in: a clip's ▶ or ×, or a clip track's name.
  #clicked(event: MouseEvent): void {
    const target = event.target as Element;
    const go = target.closest<HTMLElement>('[data-launch]');
    const drop = target.closest<HTMLElement>('[data-delete]');
    if (go) {
      this.#clips.launch(this.#slots.get(go.parentElement!)); // its chip
    } else if (drop) {
      this.#clips.drop(this.#slots.get(drop.parentElement!)); // its chip
    } else {
      this.#clips.stopAsking();
      this.#openName(target);
    }
    this.#showAsking();
  }
  // a clip track's name, opening what it opens
  #openName(target: Element): void {
    const name = target.closest<HTMLElement>('[data-open]');
    if (name && this.section.row.contains(name)) {
      this.#open(name.dataset.title!, name.dataset.open!); // a clip track's name has both
    }
  }
  // The × that asks shows "delete?", its chip marked; the one that stopped, × again.
  #showAsking(): void {
    const asking = this.#clips.asking;
    if (asking === this.#askingShown) {
      return;
    }
    this.#askAt(this.#askingShown, false);
    this.#askAt(asking, true);
    this.#askingShown = asking;
  }
  #askAt(slot: unknown, asking: boolean): void {
    const chip = [...this.#tracks.values()].map(({ chips }) => chips.get(slot)).find(Boolean);
    if (!chip) {
      return;
    }
    chip.classList.toggle('asking', asking);
    chip.querySelector('[data-delete]')!.textContent = asking ? 'delete?' : '×'; // a played chip has its ×
  }
}
