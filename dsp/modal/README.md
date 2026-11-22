# dsp/modal

Objects that ring in their modes, and the contacts between them, for physical models of struck, plucked and rattling things. A mode bank holds an object's modes: each a frequency, a decay time and how far it moves at each of the object's points, stepped so it rings true at any frequency under Nyquist. Forces act at points, positions are read at points. A contact joins a point to another bank's point or to a barrier the caller moves, by a Hunt-Crossley law: a force that grows as a power of the penetration, with damping and an optional preload, the force the parts press together with at rest. Every contact's force is solved at once each sample, so the energy is kept without damping as contacts open and close. A uniform cantilever's modes, the ratios and shapes of a tine or a tongue clamped at one end, come with it.

Depends on: nothing.

```ts
import { ContactLaw, Contacts, ModeBank } from './index.ts';

// a tongue's first three bending modes, shaped at its tip (point 0) and at the bridge (point 1)
const tongue = new ModeBank(
  [
    { frequency: 262, decayTime: 4, shape: [1, 0.2] },
    { frequency: 1703, decayTime: 1, shape: [0.9, -0.5] },
    { frequency: 4533, decayTime: 0.3, shape: [0.8, 0.6] },
  ],
  48000,
);
// the bridge under it, pressed by a preload: the tongue rattles only when a pluck overcomes it
const bridge = new ContactLaw({ stiffness: 1e9, exponent: 1.5, damping: 1e4, preload: 2000 });
// a thumb above the tip, a barrier moved each sample
const thumb = new ContactLaw({ stiffness: 1e10, exponent: 1.5 });
const contacts = new Contacts(
  [
    { law: bridge, on: { bank: tongue, point: 1 }, facing: -1 },
    { law: thumb, on: { bank: tongue, point: 0 }, barrier: 1e-3 },
  ],
  48000,
);
contacts.moveBarrier(1, -1e-4); // the thumb presses down
contacts.advance(); // one sample
const sound = tongue.position(0);
```

## How it works

1. Each sample, every contact's penetration at the next sample is its free value, where the banks would go with no contact force, less a matrix of compliances times the forces.
2. The forces depend on the penetrations: each is the potential's mean slope over the step, plus damping. Newton solves all contacts at once. A contact open at both earlier samples keeps its constant force outside the solve, and joins it only if the solve shows it closing.
3. Every bank a contact touches then advances with those forces; a force pushed onto a bank beforehand acts too.

| Export | What it does |
|---|---|
| `ModeBank`, `Mode`, `ModeState` | An object's modes, those at or over half the sample rate left out (`modes`); `state()` and `setState()` read and set a mode's displacement now and a sample before, to hand its motion to another model and back; `push()` holds a force at a point for the next sample, `freePosition()` gives a point's next position with only those forces, `compliance()` how far one point moves at the next sample per unit force at another, `advance()` steps a sample with forces a point, `position()` and `energy()` read it (`mode-bank.ts`). |
| `cantileverRatio()`, `cantileverShape()` | A uniform beam clamped at one end and free at the other: a mode's frequency against the first (1, 6.267, 17.55 …), and its shape at a place along it from the clamp (0) to the free end (1), normalized, ±2 at the free end (`cantilever.ts`). |
| `ContactLaw`, `ContactLawValues`, `MeanForce` | Hunt and Crossley's law with a preload, the penetration measured from rest: `force()`, `potential()`, `averageForce()` over a step and its slope `averageForceSlope()`, both at once by `meanForceInto()`, kept true over a step far shorter than the rest penetration, `isOpen()`, `dampingAt()`, and `restPenetration` under the preload; stiffness, an exponent of 1 or more, damping and preload (`contact-law.ts`). |
| `Contacts`, `Contact`, `ContactPoint` | Contacts, each a law, the point that presses, what it presses into (another bank's point or a barrier) and which way; `advance()` solves every force at once and steps every bank they touch, `moveBarrier()`, `force()`, `penetration()`, `energy()`, and `stalls`, the samples whose solve ran out of steps (`contacts.ts`). |

Tests: `test/mode-bank.test.js`, a mode at its frequency, 60 dB down at its decay time, its energy kept without damping and never rising with it, a point as the sum of the modes by their shapes, a force's response by its compliance, a mode over Nyquist left out, and a state handed to another bank going on as the first would have. `test/cantilever.test.js`, the ratios as Rayleigh found them, each shape held and level at the clamp and ±2 at the free end, normalized and orthogonal. `test/contact-law.test.js`, no force apart, the preload at rest and when open, the force as the potential's slope, the mean force over a step and its slope, both in one call, its slope true over a tiny step under a large preload, open past the rest penetration, and damping. `test/contacts.test.js`, a barrier pushing a bank ahead, the energy kept as a preloaded contact opens and closes, never rising with damping, linear under the preload and not over it, two contacts on one bank, a contact between two banks, a stiff contact struck hard, a contact barely moving long after a strike, never stalling on rounding, and a large preload solving as truly as a small one.
