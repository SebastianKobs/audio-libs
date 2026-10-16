// ---------- view/dom/mixer-view: a mixer drawn, its strips side by side ----------
// Its sections in one row, as the sound flows:
//   1. the tracks, in the groups the view hands it, each group in a box of its own;
//   2. the buses, the desk's, a bus with the buses that go into it in a box;
//   3. the FX busses, the desk's returns;
//   4. the master.
// A strip's name and its slots open its devices, by its address (data-open).
// A send's knob is labelled by its return's short label.
// Level bars: each falls as a peak meter's, drawn on every frame.
// Lights: a folded section's, and a group's dot, while a hidden strip sounds; what the strips
// heard feed counted too.
import { addressOf, addressText, type Address } from '../../plan/format/index.ts';
import { shortName, type BusGroup, type Strip, type ViewBuilder } from '../models/index.ts';
import { html, makeElement, setHtml, type Html } from './elements.ts';
import { Levels, meterPosition } from './meter-view.ts';
import { SectionView } from './section-view.ts';
import { stripHtml, type StripLook } from './strip-view.ts';

// A track as the view hands it:
//   - its channel's address, and the name it's shown by;
//   - what plays on it now (its cell), and whether anything does.
export interface MixerTrack {
  readonly address: Address;
  readonly name: string;
  readonly now: Html;
  readonly playing: boolean;
}
// A group of tracks as the view hands it: its key, its header's name, whether it's the
// player's own (marked so), and its tracks.
export interface MixerGroup {
  readonly key: string;
  readonly name: string;
  readonly mine: boolean;
  readonly tracks: readonly MixerTrack[];
}
// How a view shows its mixer:
//   - labels: each section's label;
//   - tracksShown(): how many tracks a group's box shows before it scrolls; 0 shows all.
export interface MixerLook {
  readonly labels: Readonly<Record<'tracks' | 'buses' | 'returns' | 'master', string>>;
  readonly tracksShown: () => number;
}
// a strip's level bar's level, by the key it's read by
type LevelOf = (key: string) => number;

// what a click on a group's header does, and what its dot says
const FOLD_GROUP =
  'Click to fold this group to its first track, or unfold it; shift-click: all groups, as this one goes. Its dot shows while tracks are folded away or out of sight, lit while one of them sounds.';

// A mixer drawn in its sections, made at the end of what it's in.
export class MixerView {
  // its sections, in order: the tracks, the buses, the FX busses, the master
  readonly sections: readonly SectionView[];
  readonly #models: ViewBuilder;
  readonly #look: MixerLook;
  readonly #levels = new Levels();
  readonly #tracks: SectionView;
  readonly #buses: SectionView;
  readonly #returns: SectionView;
  readonly #master: SectionView;

  constructor({ within, models, look }: { within: HTMLElement; models: ViewBuilder; look: MixerLook }) {
    this.#models = models;
    this.#look = look;
    this.#tracks = new SectionView(within, look.labels.tracks);
    this.#buses = new SectionView(within, look.labels.buses);
    this.#returns = new SectionView(within, look.labels.returns);
    this.#master = new SectionView(within, look.labels.master, { folds: false });
    this.sections = [this.#tracks, this.#buses, this.#returns, this.#master];
  }
  // Drawn: the groups of tracks handed in, then the desk's own channels.
  draw(groups: readonly MixerGroup[]): void {
    const levelOf: LevelOf = (key) => this.#levels.of(key);
    this.#placeGroups(groups, levelOf);
    const { buses, returns, master } = deskHtml(this.#models, levelOf);
    setHtml(this.#buses.row, buses);
    setHtml(this.#returns.row, returns);
    setHtml(this.#master.row, master);
  }
  // The level bars, each falling from its last as a peak meter's, dt s on: on every frame.
  // A track not on the desk yet reads silence, as all do before the audio starts.
  drawLevels(dt: number): void {
    for (const section of this.sections) {
      for (const meter of section.row.querySelectorAll<HTMLElement>('[data-meter]')) {
        const key = meter.dataset.meter!; // selected by it
        const level = this.#levels.fall(key, this.#models.peakOf(addressOf(key)), dt);
        meter.style.setProperty('--m', String(meterPosition(level)));
        meter.classList.toggle('over', level >= 1);
      }
    }
  }
  // Its sections' lights, by what the strips heard feed.
  light(heard: ReadonlySet<string>): void {
    const fed = fedBy(this.#models, heard);
    for (const section of this.sections) {
      section.light(fed);
    }
  }
  // Each group in its box, the boxes kept across drawings, so a box stays where it was
  // scrolled to, and its scrollbar doesn't flicker on every drawing:
  //   1. A group seen before keeps its box; only its tracks are drawn again.
  //   2. A new group gets a box of its own, in its place among the others.
  //   3. A group no longer handed in is taken out.
  // Box: as wide as the tracks the look shows, scrolling sideways on its own.
  #placeGroups(groups: readonly MixerGroup[], levelOf: LevelOf): void {
    const row = this.#tracks.row;
    const kept = new Map(
      [...row.querySelectorAll<HTMLElement>('.group')].map((group) => [group.dataset.group!, group]), // each has its key
    );
    groups.forEach(({ key, name, mine, tracks }, index) => {
      const group = kept.get(key) ?? newGroup(key, name);
      kept.delete(key);
      const box = boxOf(group);
      box.classList.toggle('you', mine);
      setShown(box, this.#look.tracksShown());
      setHtml(box, html`${tracks.map((track) => trackHtml(this.#models, track, levelOf))}`);
      const there = row.children[index] ?? null;
      if (there !== group) {
        row.insertBefore(group, there);
      }
      lightGroup(group);
    });
    for (const gone of kept.values()) {
      gone.remove();
    }
  }
}

// The desk's own channels drawn, each section's:
//   - the buses: a bus with the buses that go into it in a box, one alone as it is;
//   - the FX busses, the desk's returns;
//   - the master.
export function deskHtml(models: ViewBuilder, levelOf: LevelOf): { buses: Html; returns: Html; master: Html } {
  const mixer = models.mixer();
  const drawn = (strip: Strip): Html => stripHtml(strip, lookOf(models, strip, strip.name, levelOf));
  return {
    buses: html`${mixer.buses.map((group) => busGroupHtml(group, drawn))}`,
    returns: html`${mixer.returns.map(drawn)}`,
    master: mixer.master ? drawn(mixer.master) : html``,
  };
}
// a bus with the buses that go into it, in a box; one alone as it is
function busGroupHtml({ bus, members }: BusGroup, drawn: (strip: Strip) => Html): Html {
  const strips = [bus, ...members].map(drawn);
  if (!members.length) {
    return html`${strips}`;
  }
  return html`<div class="kind you">${strips}</div>`;
}
// How a strip is shown: the name it's given, where it goes, its devices opened by its
// address, its sends by their returns' short labels, its level bar's level.
function lookOf(models: ViewBuilder, strip: Strip, name: string, levelOf: LevelOf): StripLook {
  const key = addressText(strip.address);
  return {
    name,
    route: strip.out === undefined ? 'out' : `to ${strip.out}`,
    opens: html` data-open="strip:${key}" data-title="${name}"`,
    sendLabel: (to) => shortName(models.plan, [to]),
    level: levelOf(key),
  };
}
// A track's strip drawn: the name the view gives it, what plays on it now.
// Empty while it plays nothing, its values a dash, but where it's set live.
export function trackHtml(models: ViewBuilder, track: MixerTrack, levelOf: LevelOf): Html {
  const strip = models.strip(track.address)!; // a track's channel, on the desk
  const empty = !track.playing && !strip.volume.live;
  return stripHtml(strip, { ...lookOf(models, strip, track.name, levelOf), now: track.now, empty });
}
// What the strips heard feed, they among it, for the lights: each through its way out, and
// through a send while it's turned up. A name not on the desk kept, not followed.
export function fedBy(models: ViewBuilder, heard: ReadonlySet<string>): Set<string> {
  return models.mixer().reached(heard, (from, to) => sendUp(models, from, to));
}
// whether a strip's send to a return is turned up, as set live or by its track's notes
function sendUp(models: ViewBuilder, from: string, to: string): boolean {
  const send = models.strip(addressOf(from))?.sends.find(({ name }) => name === to);
  return (send?.value ?? 0) > 0;
}
// A group, new: its header, the group's name with a dot as a section's, and its box.
// Folded at first, to its first track; a click on its header folds and unfolds it.
// Scrolled, its dot shows at once whether tracks are out of sight.
function newGroup(key: string, name: string): HTMLElement {
  const group = makeElement('div', 'group folded');
  group.dataset.group = key;
  const head = makeElement('div', 'subhead', `${name} →`); // an arrow, as a section's label
  Object.assign(head.dataset, { subfold: '', title: FOLD_GROUP });
  head.append(makeElement('i', 'dot'));
  const box = makeElement('div', 'kind');
  group.append(head, box);
  box.addEventListener('scroll', () => lightGroup(group), { passive: true });
  return group;
}
// A group's box: the scrolling element that holds its tracks.
function boxOf(group: HTMLElement): HTMLElement {
  return group.querySelector<HTMLElement>('.kind')!; // every group has its box
}
// The box's width in tracks, as the look says. At 0, no width: every track shows.
function setShown(box: HTMLElement, shown: number): void {
  if (shown <= 0) {
    box.style.removeProperty('--shown');
    return;
  }
  box.style.setProperty('--shown', String(shown));
}
// A group's dot, as a section's:
//   hidden: tracks are folded away or lie out of sight in the box, so the dot shows;
//   lit: one of them sounds.
// A track partly in sight counts as in sight. A folded-away track takes no room.
function lightGroup(group: HTMLElement): void {
  const box = boxOf(group).getBoundingClientRect();
  const hidden = [...group.querySelectorAll<HTMLElement>('.track')].filter((track) => {
    const at = track.getBoundingClientRect();
    return at.width === 0 || at.right <= box.left || at.left >= box.right;
  });
  const dot = group.querySelector('.subhead .dot')!; // every group's header has its dot
  dot.classList.toggle('hidden', hidden.length > 0);
  dot.classList.toggle(
    'lit',
    hidden.some((track) => track.querySelector('.cell.lit') !== null),
  );
}
