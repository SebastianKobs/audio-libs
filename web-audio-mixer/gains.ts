// ---------- libs/web-audio-mixer/gains: a strip's mute, its time constant ----------
import type { Timing } from '../web-audio-fx/index.ts';

export const MUTE: Timing = Object.freeze({ glide: 0.01 }); // a mute's: at once, with no click
