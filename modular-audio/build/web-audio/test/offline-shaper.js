// An offline audio context class, as a browser hands it in (BrowserAudio's OfflineAudioContext), whose WaveShaper holds a click back by
// the lags it's given, by oversampling: what measuredLags() (web-audio/shaper-lags.ts) renders and reads. `counted` keeps how often it
// rendered.
const CLICK_AT = 128; // the sample measuredLags() puts its click at

export const FIREFOX_LAGS = Object.freeze({ none: 0, '2x': 8, '4x': 8 });

export function offlineShaperWith(lags, counted = { renders: 0 }) {
  return class {
    constructor(channels, length, sampleRate) {
      Object.assign(this, { length, sampleRate, destination: {} });
    }
    createBuffer(_channels, length) {
      const samples = new Float32Array(length);
      return { getChannelData: () => samples };
    }
    createBufferSource() {
      return { connect: (to) => to, start() {} };
    }
    createWaveShaper() {
      const offline = this;
      return {
        connect: (to) => to,
        set oversample(oversample) {
          offline.oversample = oversample;
        },
      };
    }
    startRendering() {
      counted.renders++;
      const heard = new Float32Array(this.length);
      heard[CLICK_AT + lags[this.oversample]] = 1;
      return Promise.resolve({ getChannelData: () => heard });
    }
  };
}
