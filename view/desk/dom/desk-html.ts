// ---------- view/desk/dom/desk-html: a desk's strips as HTML, and what they light ----------
// The desk's own channels, a section each (deskHtml()); a track's strip (trackHtml()).
// A send's knob is labelled by its return's short label.
// Lights: what the strips heard feed, through ways out and sends turned up (fedBy()).
import { addressOf, addressText } from '../../../util/index.ts';
import {
  shortName,
  type BusGroup,
  type DeskTrack,
  type Strip,
  type TrackNow,
  type DeskViewBuilder,
} from '../models/index.ts';
import { html, type Html } from '../../html/index.ts';
import { stripHtml, type StripLook } from './strip-view.ts';

// a strip's level bar's level, by the key it's read by
export type LevelOf = (key: string) => number;

// The desk's own channels drawn, each section's:
//   - the buses: a bus with the buses that go into it in a box, one alone as it is;
//   - the FX busses, the desk's returns;
//   - the master.
export function deskHtml(models: DeskViewBuilder, levelOf: LevelOf): { buses: Html; returns: Html; master: Html } {
  const desk = models.desk();
  const drawn = (strip: Strip): Html => stripHtml(strip, lookOf(models, strip, strip.name, levelOf));
  return {
    buses: html`${desk.buses.map((group) => busGroupHtml(group, drawn))}`,
    returns: html`${desk.returns.map(drawn)}`,
    master: desk.master ? drawn(desk.master) : html``,
  };
}
// a bus with the buses that go into it, in a box; one alone as it is
function busGroupHtml({ bus, members }: BusGroup, drawn: (strip: Strip) => Html): Html {
  const strips = [bus, ...members].map(drawn);
  if (!members.length) {
    return html`${strips}`;
  }
  return html`<div class="kind bus-group">${strips}</div>`;
}
// How a strip is shown: the name it's given, where it goes, its devices opened by its
// address, its sends by their returns' short labels, its level bar's level.
function lookOf(models: DeskViewBuilder, strip: Strip, name: string, levelOf: LevelOf): StripLook {
  const key = addressText(strip.address);
  return {
    name,
    route: strip.out === undefined ? 'out' : `to ${strip.out}`,
    opens: html` data-open="${key}" data-title="${name}"`,
    sendLabel: (to) => shortName(models.plan, [to]),
    level: levelOf(key),
  };
}
// A track's strip drawn: the name the view gives it, what plays on it now.
// Empty while it plays nothing, its values a dash, but where it's set live.
export function trackHtml(models: DeskViewBuilder, track: DeskTrack, levelOf: LevelOf): Html {
  const strip = models.strip(track.address)!; // a track's channel, on the desk
  const empty = !track.playing && !strip.volume.live;
  return stripHtml(strip, { ...lookOf(models, strip, track.name, levelOf), now: cellHtml(track.now), empty });
}
// what a track plays now, its cell: lit while it sounds, dimmed while its play waits
function cellHtml({ text, lit, waiting }: TrackNow): Html {
  return html`<div class="cell${lit ? ' lit' : ''}${waiting ? ' waiting' : ''}">${text}</div>`;
}
// What the strips heard feed, they among it, for the lights: each through its way out, and
// through a send while it's turned up. A name not on the desk kept, not followed.
export function fedBy(models: DeskViewBuilder, heard: ReadonlySet<string>): Set<string> {
  return models.desk().reached(heard, (from, to) => sendUp(models, from, to));
}
// whether a strip's send to a return is turned up, as set live or by its track's notes
function sendUp(models: DeskViewBuilder, from: string, to: string): boolean {
  const send = models.strip(addressOf(from))?.sends.find(({ name }) => name === to);
  return (send?.value ?? 0) > 0;
}
