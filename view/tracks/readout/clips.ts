// ---------- view/tracks/readout/clips: the clip slots, as a view's clip tracks read them ----------
// Types only. Whatever answers fits them by its shape:
//   - a clip player (libs/clip-player/), for the slots it holds;
//   - a control surface, for the clips it holds on no player, and its clip tracks' names.

// Clips in slots on tracks, as what holds them knows them; a clip track names them (held):
//   - slotsOn(): a track's slots, in the order put;
//   - playing(): whether a slot's clip plays.
interface ClipSlots<Slot = unknown> {
  slotsOn(track: string): readonly Slot[];
  playing(slot: Slot): boolean;
}
// Where a clip track's clips are held: what holds them, and their track there.
interface HeldClips {
  slots: ClipSlots;
  track: string;
}
// A clip track, as a view shows it:
//   - key: what it's known by; name: the name on its head;
//   - roles: the roles whose instruments play its clips;
//   - played: whether its clips are launched and deleted from the view;
//   - held: where its clips are, in the order shown.
export interface ClipTrack {
  key: string;
  name: string;
  roles: readonly string[];
  played: boolean;
  held: readonly HeldClips[];
}
// The control surface the clips were played on:
//   - clipTracks: in the order shown;
//   - clipName(): a clip's name, on its clip track;
//   - notesIn(): how many notes a clip holds; none for one that holds no notes.
export interface ClipsReadout {
  readonly clipTracks: readonly ClipTrack[];
  clipName(slot: unknown, track: string): string;
  notesIn(slot: unknown, track: string): number | undefined;
}
