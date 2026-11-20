# dsp/saturation

The curves a waveshaper reads to saturate a sound, as tables of floats, and the drive built from them. `shaperCurve()` is the plain case: a drive and a shape set where a soft knee turns hard, and a quiet sound passes at unity. A drive has five styles, `smooth`, `console`, `germanium`, `triode` and `pentode`, each a curve with a bias, so the top and the bottom bend apart and make even harmonics, and a heat of its own, so at one drive smooth is the cleanest and pentode the crunchiest. The level is taken back after the curve by an auto gain measured on a sine at -18 dBFS, so driving harder changes the sound, not the loudness. Each style also has a color: what is fed to the curve fuller, and what is rounded off after it.

Depends on: nothing.

```ts
import { autoGain, curveGain, driveCurve, shaperCurve, STYLE_COLORS } from './index.ts';

const table = driveCurve('triode'); // a WaveShaper's curve, 4097 points
const gain = curveGain('triode', 4, 0); // what to scale the input by: drive 4, no punish, its heat
const level = autoGain('triode', gain); // what to scale the output by, to keep its level
const plain = shaperCurve(4, 0.3); // a drive of 4, a knee a little hard
const around = STYLE_COLORS.triode; // an EQ before the curve, a rounding off after it
```

| Export | What it does |
|---|---|
| `shaperCurve()` | A waveshaper's table of 2049 points by default, from a drive and a shape from 0 to 1, its middle point 0 so silence stays silent (`shaper-curve.ts`). |
| `saturated()`, `CURVE_POINTS` | A saturation of one knee's order, straight below 1 and bending to ±1 past it; how many points a table has by default (`shaper-curve.ts`). |
| `driveCurve()` | A style's WaveShaper table: its input from -1 to 1 spans `CURVE_SPAN` units of drive (`drive-curve.ts`). |
| `styleBent()` | A style's curve at one input, clamped past its span as the table's ends are (`drive-curve.ts`). |
| `curveGain()` | Units of drive per unit of input: the drive, ten times that when punished, and the style's heat (`drive-curve.ts`). |
| `autoGain()` | The gain that brings the reference sine back to its level after the curve, by rms, its DC taken off (`drive-curve.ts`). |
| `DRIVE_STYLES`, `DriveStyle` | The five styles from smooth to crunchy, and the type of one (`drive-curve.ts`). |
| `STYLE_CURVES`, `StyleCurve` | Each style's knee order, bias and heat (`drive-curve.ts`). |
| `CURVE_SPAN`, `REFERENCE` | The units of drive across a table, 8; the reference sine's peak, -18 dBFS as a level (`drive-curve.ts`). |
| `STYLE_COLORS`, `StyleColor` | Each style's EQ before its curve and its rounding off after it, gains in dB as a biquad filter takes them (`drive-colors.ts`). |
| `Shelf`, `Peak` | A shelf's frequency and gain, and a peak's, with its Q (`drive-colors.ts`). |

Tests: `test/shaper-curve.test.js`, the table odd and through the middle, a quiet sound at unity, never louder than it came, and a harder shape. `test/drive-curve.test.js`, silence kept through every style, the knee at full scale, the auto gain within half a dB however hard it drives, a quiet sound driven getting dirty, and the styles' harmonics in order.
