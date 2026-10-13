// ---------- libs/web-audio-synth: the synth played in Web Audio, its entry (Z7) ----------
// A note played on a patch (libs/synth/), built by the engine (libs/web-audio-engine/), its controls taking clock times; patches as they
// play, by name, each edit reaching every note of one that sounds, a value glided there, a change of structure rebuilt and crossfaded
export { playNote, type NoteControls, type NoteToPlay } from './play.ts';
export { Patches } from './patches.ts';
export { Sounding, builtNote, type Played, type SoundingNote, type Told } from './sounding.ts';
