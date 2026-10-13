// ---------- libs/synth/fades: a voice crossfaded as it's rebuilt (G0.2b), through its out ----------
// A voice edited in its structure while it sounds is rebuilt: the old one faded out as the new one fades in, each through its out, the
// gain every instrument leaves by (blocks/out.ts); a graph's fades are the plan's (libs/audio-plan/), the out a voice's (W2a)
import { fadeInThrough, fadeOutThrough, type Operation, type PlanNode } from '../audio-plan/index.ts';
import type { Plan } from './plan.ts';
import type { Seconds } from './values.ts';

// a voice faded out from at over a time, through its out: its sources stopped once it has
export function fadeOut(plan: Plan, at: Seconds, over: Seconds, applied: readonly Operation[] = []): Operation[] {
  return fadeOutThrough(plan, outOf(plan), at, over, applied);
}
// a voice's plan faded in from at over a time, through its out
export function fadeIn(plan: Plan, at: Seconds, over: Seconds): Plan {
  return fadeInThrough(plan, outOf(plan), at, over);
}
// a voice's out, the gain it leaves by
function outOf(plan: Plan): PlanNode {
  return plan.nodes.find((node) => node.block === 'out' && node.node === 'gain')!; // every voice has its out
}
