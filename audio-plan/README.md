# audio-plan

An audio graph as data: what to build, not built. A plan's nodes, each of a kind Web Audio has, with its props, its params' values and automation, its starts and stops; its edges, by sound or into a param, `'out'` its one output; its input, where it has one. A package of its own since W2c, moved out of the synth: the synth plans a note into one (`sound/synth/`), and the engine builds one in Web Audio (`sound/engine/`), neither knowing the other.

Its words are Web Audio's: `biquad`, `convolver`, a buffer source; automation as an `AudioParam` schedules it, `setTargetAtTime()`'s time constant among it. It isn't neutral to the engine: another engine, flutter_soloud's say, builds a plan by doing what those words mean there, and `levelAt()` is the automation's half of that already, Web Audio's curves worked out in plain code.

```ts
import { followEdit, levelAt, type AudioPlan } from './index.ts';
const sound: AudioPlan = {
  nodes: [
    { id: 0, node: 'oscillator', block: 'tone', props: {}, params: {}, starts: [[0]], stops: [[4]] },
    { id: 1, node: 'gain', block: 'level', props: {}, params: { gain: [['value', 0.5]] }, starts: [], stops: [] },
  ],
  edges: [[0, 1], [1, 'out']],
};
levelAt([['set', 0, 0], ['linear', 1, 2]], 1);   // 0.5: halfway up the ramp
followEdit(sound, edited, 2);                    // the operations that move it, sounding, to the edited plan from 2 s; null: rebuild it
```

| | |
|---|---|
| `AudioPlan`, `PlanNode`, `NodeKind`, `Edge`, `Automation`, `BufferSpec`, `Operation` | the plan, as types (`plan.ts`): a graph; a node, of a kind (`oscillator`, `gain`, `biquad`, `buffer`, `panner`, `delay`, `convolver`, `limiter`, built from several); a param's automation, `['value', v]`, `['set' \| 'linear' \| 'exp', v, at]`, `['target', v, at, tc]`, `['cancel', at]`, times in seconds from the plan's start; a buffer it names, so many seconds of noise or an impulse response; what a sounding one is told, a param's new automation or a node's stop |
| `levelAt(automation, t)` | a param's automation as Web Audio plays it, its level at a time: set at once; a ramp, straight or exponential, from where the event before left it, an exponential one from or to nothing holding, then jumping at its end; a target approached from its start by its time constant (`automation.ts`, I1h1) |
| `followEdit(before, after, at, applied, smoothing)` | a sounding plan following an edit to it, as a knob turned while a note sounds (G0.2a): its plan before and after compared, the operations that move what was built of it from a time, each param from where it is as it plays, a ramp coming taking it on, a target approached from there, a held value glided to by the smoothing, its sources' stops moved; what it was told since played on both; none, `null`, for a change of structure, a rebuild's (`edit.ts`) |
| `SMOOTHING` | 0.05 s, the time constant a held value glides to a new one by, as a plugin smooths a knob against zipper noise: an edit's, unless another is asked for, and a synth's control's set |
| `fadeOutThrough(plan, gain, at, over, applied)`, `fadeInThrough(plan, gain, at, over)` | a plan faded out through one of its gains, from where it is as it plays down to nothing, its sources stopped once it has, none later than its own stop; one faded in through its own, from nothing up to where it would be, the plan it's made from left as it was: a rebuild crossfaded (G0.2b) |

Tested in node, in its `test/` folder, on plans written by hand (`test/audio-plan.test.js`); with a synth's plans in `mockup/test/unit/plan-edit.test.js`.
