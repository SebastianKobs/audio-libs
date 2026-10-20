// ---------- libs/view/tracks/dom/session-drawing: when the session view is drawn ----------
// What it draws is its drawers': the clip tracks', the mixer's, the device view's.
// What it shows of the session is its models': what the stream played (Session), the groups of
// tracks and what sounded (SessionTracks).
import type { DevicePanel } from '../../device/models/index.ts';
import type { Session, SessionTracks, Views } from '../models/index.ts';
import type { ClipTracksView } from './clip-tracks-view.ts';
import type { DevicePanelView } from '../../device/dom/index.ts';
import type { MixerView } from '../../mixer/dom/index.ts';

// The clock as the drawing reads it: its time, its 16ths, a beat's length at the tempo
//   now, and its 16ths.
interface SessionClock {
  now(): number;
  onStep(listener: (i: number) => void): unknown;
  readonly grid: { beatDuration(): number; stepsPerBeat(): number };
}

// Drawing the session view while it's open:
//   - draw(): the tracks, on every beat of the clock, and as it's shown, from a beat back.
//   - Playing back, the clock's grid is held, so draw() runs a beat after the last drawing.
//   - drawLive(): the level bars and the device view's knobs and views of their own, the
//     limiter's history among them, on every frame.
// On every beat, so a replay lights for a beat at most and never flickers.
// The next beat's drawing shows what a skipped one missed.
// Pressed: a beat's drawing waits while a pointer is pressed on the view. Redrawn under it,
// the press and its release would land on two elements, and the browser fires no click.
export class SessionDrawing {
  readonly #clock: SessionClock;
  readonly #frameStep: () => number;
  readonly #views: Pick<Views, 'shown'>;
  readonly #transport: { readonly playingBack: boolean };
  readonly #session: Pick<Session, 'at'>;
  readonly #tracks: Pick<SessionTracks, 'groups' | 'sounded'>;
  readonly #clipTracks: Pick<ClipTracksView, 'setBeat' | 'draw'> & {
    section: Pick<ClipTracksView['section'], 'light'>;
  };
  readonly #mixer: Pick<MixerView, 'draw' | 'drawLevels' | 'light'>;
  readonly #devicePanelView: Pick<DevicePanelView, 'refresh'>;
  #lastLook = -Infinity;
  #pressed = false; // a pointer pressed on the view

  constructor({
    clock,
    frameStep,
    views,
    transport,
    session,
    tracks,
    clipTracks,
    mixer,
    devicePanel,
    devicePanelView,
    flow,
    page,
  }: {
    clock: SessionClock;
    frameStep: () => number; // this frame's step in seconds, for the level bars' fall
    views: Pick<Views, 'shown' | 'onShow'>; // which view is open
    transport: { readonly playingBack: boolean };
    session: Pick<Session, 'at'>; // what the stream played
    tracks: Pick<SessionTracks, 'groups' | 'sounded'>; // in their groups, as the mixer shows them
    clipTracks: Pick<ClipTracksView, 'setBeat' | 'draw'> & { section: Pick<ClipTracksView['section'], 'light'> };
    mixer: Pick<MixerView, 'draw' | 'drawLevels' | 'light'>;
    devicePanel: Pick<DevicePanel<unknown>, 'close'>; // closed as both views hide
    devicePanelView: Pick<DevicePanelView, 'refresh'>;
    flow: EventTarget; // the session view's sections, a press on it held
    page: EventTarget; // where a press ends, anywhere: the window
  }) {
    this.#clock = clock;
    this.#frameStep = frameStep;
    this.#views = views;
    this.#transport = transport;
    this.#session = session;
    this.#tracks = tracks;
    this.#clipTracks = clipTracks;
    this.#mixer = mixer;
    this.#devicePanelView = devicePanelView;
    flow.addEventListener('pointerdown', () => {
      this.#pressed = true;
    });
    for (const ended of ['pointerup', 'pointercancel']) {
      page.addEventListener(ended, () => {
        this.#pressed = false;
      });
    }
    clock.onStep((i) => this.#onStep(i));
    views.onShow((view) => {
      if (view === null) {
        devicePanel.close();
      }
      this.#lookFromABeatBack();
    });
  }
  // on a beat while shown: the clip tracks told it, and drawn unless a pointer is pressed
  #onStep(i: number): void {
    const perBeat = this.#clock.grid.stepsPerBeat();
    if (!this.#sessionShown() || i % perBeat !== 0) {
      return;
    }
    this.#clipTracks.setBeat(i / perBeat);
    if (!this.#pressed) {
      this.draw();
    }
  }
  // As the session view is shown: drawn with what sounded in the last beat.
  #lookFromABeatBack(): void {
    if (!this.#sessionShown()) {
      return;
    }
    this.#lastLook = this.#clock.now() - this.#clock.grid.beatDuration();
    this.draw();
  }
  #sessionShown(): boolean {
    return this.#views.shown === 'session';
  }
  drawLive(): void {
    if (!this.#sessionShown()) {
      return;
    }
    this.#drawPlayingBack();
    this.#devicePanelView.refresh(); // its knobs as they play, its views of their own
    this.#mixer.drawLevels(this.#frameStep());
  }
  // Playing back, the live grid is held and hands out no 16ths, so no beat draws the view.
  // Drawn instead a beat after the last drawing, at the tempo now.
  #drawPlayingBack(): void {
    if (!this.#transport.playingBack || this.#pressed) {
      return;
    }
    const beat = this.#clock.grid.beatDuration();
    if (this.#clock.now() - this.#lastLook >= beat) {
      this.draw();
    }
  }
  draw(): void {
    const t = this.#clock.now();
    const since = Math.min(this.#lastLook, t);
    const seen = this.#session.at(t, since);
    this.#lastLook = t;
    this.#clipTracks.draw((track) => seen[track]?.lit ?? new Set());
    this.#mixer.draw(this.#tracks.groups(seen));
    const heard = this.#tracks.sounded(seen);
    this.#clipTracks.section.light(heard);
    this.#mixer.light(heard);
  }
}
