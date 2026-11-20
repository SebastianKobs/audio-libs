// ---------- build/web-audio/blocks/saturation: the Drive's heart in Web Audio ----------
// Its style's color before (a low shelf, a peak, a high shelf), the push (a GainNode: the drive, punish and heat over the
// curve's span), a WaveShaper of the style's curve, a DC block, its color after (a low shelf, a one pole, a lowpass),
// its level (a GainNode: the auto gain c(g)^auto). Colors and curves libs/dsp/saturation/'s.
// The drive moves the push and the level together, a glide the same on both; punish, style and auto set them again at
// the drive held. A curve made each time a style is set, each WaveShaper its own.
import { choiceAt, choiceIndex } from '../../../../base/params/index.ts';
import {
  autoGain,
  curveGain,
  CURVE_SPAN,
  driveCurve,
  STYLE_COLORS,
  type DriveStyle,
  type Peak,
  type Shelf,
} from '../../../../dsp/saturation/index.ts';
import { SATURATION_SPECS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, valueOf, type Making } from '../making.ts';
import { heldBy, ParamInUnits, toldParam } from '../param-units.ts';
import { OnePoleBetween } from './one-pole.ts';

const BUTTERWORTH_Q = -3.01; // dB, as Web Audio reads a lowpass's or a highpass's Q: flat to the cutoff
const DC_BLOCK = 15; // Hz: under the sound, over the bias's drift

export function saturation(node: Node, making: Making): BuiltNode {
  const { context } = making;
  const biquad = (type: BiquadFilterType): BiquadFilterNode => {
    const made = making.kept(context.createBiquadFilter());
    made.type = type;
    return made;
  };
  const before = { lowShelf: biquad('lowshelf'), peak: biquad('peaking'), highShelf: biquad('highshelf') };
  const push = making.kept(context.createGain());
  const shaper = making.kept(context.createWaveShaper());
  const dcBlock = biquad('highpass');
  const after = { lowShelf: biquad('lowshelf'), lowpass: biquad('lowpass') };
  const level = making.kept(context.createGain());
  dcBlock.frequency.value = DC_BLOCK;
  dcBlock.Q.value = BUTTERWORTH_Q;
  after.lowpass.Q.value = BUTTERWORTH_Q;
  before.lowShelf
    .connect(before.peak)
    .connect(before.highShelf)
    .connect(push)
    .connect(shaper)
    .connect(dcBlock)
    .connect(after.lowShelf);
  after.lowpass.connect(level);

  const held = {
    drive: numberOf(node, 'drive'),
    punish: numberOf(node, 'punish'),
    style: choiceIndex(SATURATION_SPECS.style, String(valueOf(node, 'style'))),
    auto: numberOf(node, 'auto'),
    oversample: choiceIndex(SATURATION_SPECS.oversample, String(valueOf(node, 'oversample'))),
  };
  const style = (): DriveStyle => choiceAt(SATURATION_SPECS.style, held.style) as DriveStyle; // one of its choices
  const pole = new OnePoleBetween(making, after.lowShelf, after.lowpass, STYLE_COLORS[style()].after.onePole);

  const staged = new ParamInUnits([
    [push.gain, (drive) => curveGain(style(), drive, held.punish) / CURVE_SPAN],
    [level.gain, (drive) => autoGain(style(), curveGain(style(), drive, held.punish)) ** held.auto],
  ]);
  const restage = (at?: number): void => {
    if (at === undefined) {
      staged.value = held.drive;
      return;
    }
    staged.setValueAtTime(held.drive, at);
  };
  const styled = (): void => {
    shaper.curve = driveCurve(style());
    const { before: fed, after: rounded } = STYLE_COLORS[style()];
    shelve(before.lowShelf, fed.lowShelf);
    peakAt(before.peak, fed.peak);
    shelve(before.highShelf, fed.highShelf);
    shelve(after.lowShelf, rounded.lowShelf);
    pole.tune(rounded.onePole);
    after.lowpass.frequency.value = rounded.lowpass ?? context.sampleRate / 2; // at Nyquist: open
  };
  const oversampled = (): void => {
    shaper.oversample = choiceAt(SATURATION_SPECS.oversample, held.oversample) as OverSampleType; // its choices Web Audio's own
  };
  const restaged = (name: 'punish' | 'style' | 'auto', also = (): void => {}) =>
    toldParam(
      () => held[name],
      (value, at) => {
        held[name] = value;
        also();
        restage(at);
      },
    );
  styled();
  oversampled();
  restage();
  return new BuiltNode({
    input: before.lowShelf,
    output: level,
    params: {
      drive: heldBy(staged, (value) => {
        held.drive = value;
      }),
      punish: restaged('punish'),
      style: restaged('style', styled),
      auto: restaged('auto'),
      oversample: toldParam(
        () => held.oversample,
        (index) => {
          held.oversample = index;
          oversampled();
        },
      ),
    },
    kind: 'a saturation, a WaveShaper between gains and BiquadFilterNodes',
  });
}

// a shelf at its color's, flat where it has none
function shelve(filter: BiquadFilterNode, shelf: Shelf | undefined): void {
  filter.gain.value = shelf?.dB ?? 0;
  if (shelf) {
    filter.frequency.value = shelf.hz;
  }
}
function peakAt(filter: BiquadFilterNode, peak: Peak | undefined): void {
  shelve(filter, peak);
  if (peak) {
    filter.Q.value = peak.q;
  }
}
