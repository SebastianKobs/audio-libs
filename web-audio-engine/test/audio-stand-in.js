// The stand-in for Web Audio, the builder's (libs/build/web-audio/test/), for the libraries on the engine; and an engine on it
import { StandInContext } from '../../build/web-audio/test/audio-stand-in.js';
import { Engine } from '../index.ts';
export * from '../../build/web-audio/test/audio-stand-in.js';

// an engine on the stand-in, its time now(), with any other options an engine takes
export function engineOn(now, options = {}) {
  const AudioContext = class extends StandInContext {
    constructor() {
      super(now);
    }
  };
  return new Engine({ AudioContext, ...options });
}
