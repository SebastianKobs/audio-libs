// ---------- libs/audio-plan/edit: a sounding plan following an edit to it (G0.2a) ----------
// As a synth's knob turned while a note sounds (mockup/architecture/done.md, G0.2): the note's plan before the edit and after it
// compared, and the operations that move what was built of it from a time, times from the note's start. Each param as the new plan has it
// from then, from where it is as it plays: a ramp coming takes it on to its end, a target it approaches is approached from there, a value
// it holds is glided to, by 50 ms or the smoothing asked for (SMOOTHING, W2a). Its sources' stops moved, never taken back. What the note was told since (applied: a release, a
// control's set) is played on both plans, so a note let go fades on as it plays, and a value a control set stays the control's. A change
// of structure, a node, an edge, a node's kind, its props (an osc's wave, a buffer) or its starts, comes back as none: a rebuild's, the
// old graph faded out through one of its gains (fadeOutThrough()) as a new one, its plan faded in through its own (fadeInThrough()),
// comes in (G0.2b); a synth's voice's through its out (libs/synth/fades.ts)
// A lasting graph, an FX module, follows an edit with no account of what it was told: glideEdit()
import {
  SMOOTHING,
  approachAt,
  continuedAs,
  eventsAfter,
  eventTime,
  levelAt,
  onTheWay,
  restartAt,
  scheduled,
  type Automation,
} from '../automation/index.ts';
import { lastStop, type AudioPlan, type Operation, type PlanNode } from './plan.ts';
import type { Seconds } from '../clock/index.ts';

const SAME = 1e-9; // a level this close to another is the same one

// the operations that move a sounding note from its plan before an edit to its plan after it, from at; none where the two differ in
// structure, a rebuild's
export function followEdit(
  before: AudioPlan,
  after: AudioPlan,
  at: Seconds,
  applied: readonly Operation[] = [],
  smoothing: Seconds = SMOOTHING,
): Operation[] | null {
  if (!sameStructure(before, after)) {
    return null;
  }
  const ops: Operation[] = [];
  for (const [index, node] of before.nodes.entries()) {
    ops.push(...paramOps(node, after.nodes[index]!, at, applied, smoothing)); // the same structure: as many nodes
  }
  for (const [index, node] of before.nodes.entries()) {
    const stop = stopOp(node, after.nodes[index]!, at, applied);
    if (stop === null) {
      return null;
    }
    ops.push(...stop);
  }
  return ops;
}

// The operations that glide a lasting graph, an FX module, from its plan before an edit to its plan after it, from at.
// It keeps no account of what it was told, so each param the edit changed goes on from where it plays, nothing cancelled:
//   - a value glided to by the smoothing, a target the edited plan approaches approached by its own time constant;
//   - a value told it ahead of its time keeps its place.
// None where the two differ in structure or in a source's stops, or a changed param has events still to come: a rebuild's.
export function glideEdit(
  before: AudioPlan,
  after: AudioPlan,
  at: Seconds,
  smoothing: Seconds = SMOOTHING,
): Operation[] | null {
  if (!sameStructure(before, after) || !sameStops(before, after)) {
    return null;
  }
  const glided: Operation[] = [];
  for (const [index, node] of before.nodes.entries()) {
    const ops = glidedParams(node, after.nodes[index]!, at, smoothing); // the same structure: as many nodes
    if (ops === null) {
      return null;
    }
    glided.push(...ops);
  }
  return glided;
}

// a graph faded out from at over a time through one of its gains, as a rebuilt one fades in (G0.2b): the gain from where it is as it
// plays down to nothing, the graph's sources stopped once it has, none later than it would have stopped, none that has stopped by then
export function fadeOutThrough(
  plan: AudioPlan,
  gain: PlanNode,
  at: Seconds,
  over: Seconds,
  applied: readonly Operation[] = [],
): Operation[] {
  const told = applied.filter((op) => op.id === gain.id && op.param === 'gain');
  const level = levelAt(played(gain.params.gain!, told), at); // a gain node's gain, planned
  const fade: Operation = {
    id: gain.id,
    param: 'gain',
    events: [...restartAt(level, at), ['linear', 0, at + over]],
  };
  return [fade, ...plan.nodes.flatMap((node) => stopOnceFaded(node, at, at + over, applied))];
}
// a graph's plan faded in from at over a time through one of its gains, as an old one fades out (G0.2b): the gain from nothing at at up
// to where it would be by the fade's end, the rest as planned; the plan it's made from left as it was
export function fadeInThrough<Planned extends AudioPlan>(
  plan: Planned,
  gain: PlanNode,
  at: Seconds,
  over: Seconds,
): Planned {
  const automation = gain.params.gain!; // a gain node's gain, planned
  const faded: Automation[] = [
    ...automation.filter((event) => eventTime(event) <= at),
    ['set', 0, at],
    ['linear', levelAt(automation, at + over), at + over],
    ...eventsAfter(automation, at + over),
  ];
  return {
    ...plan,
    nodes: plan.nodes.map((node) => (node === gain ? { ...node, params: { ...node.params, gain: faded } } : node)),
  };
}

// whether two plans are built alike: the same nodes, each its kind, block, props, starts and params, in the same order, the same edges
function sameStructure(before: AudioPlan, after: AudioPlan): boolean {
  return (
    before.nodes.length === after.nodes.length
    && JSON.stringify(before.edges) === JSON.stringify(after.edges)
    && before.nodes.every(
      (node, index) => JSON.stringify(builtOf(node)) === JSON.stringify(builtOf(after.nodes[index]!)),
    )
  );
}
// what of a node is built once and stays: all but its params' values and its stops
function builtOf({ id, node, block, props, starts, params }: PlanNode): unknown[] {
  return [id, node, block, props, starts, Object.keys(params)];
}
// a node's params whose automation differs from at, each moved from where it is as it plays to where the edited plan has it
function paramOps(
  node: PlanNode,
  edited: PlanNode,
  at: Seconds,
  applied: readonly Operation[],
  smoothing: Seconds,
): Operation[] {
  return Object.keys(node.params).flatMap((param) => {
    const told = applied.filter((op) => op.id === node.id && op.param === param);
    const playing = played(node.params[param]!, told); // a param of a node, by its key
    const wanted = played(edited.params[param]!, told); // the same structure: the same params
    if (sameFrom(playing, wanted, at)) {
      return [];
    }
    return [{ id: node.id, param, events: continuedAs(playing, wanted, at, smoothing) }];
  });
}
// a param's automation as it plays: its plan's, with what the note was told since, each operation's events in turn, a cancel dropping
// what was planned from its time, as Web Audio's cancelScheduledValues(), the rest in time order, as Web Audio keeps them
function played(automation: Automation[], told: readonly Operation[]): Automation[] {
  return scheduled(
    automation,
    told.flatMap((op) => op.events ?? []),
  );
}
// whether a lasting graph's sources stop alike before an edit and after it
function sameStops(before: AudioPlan, after: AudioPlan): boolean {
  return before.nodes.every((node, index) => JSON.stringify(node.stops) === JSON.stringify(after.nodes[index]!.stops));
}
// A node's params an edit changed, each glided from where it plays to where the edited plan has it.
// None where a changed param has events still to come, as it plays or as edited: nothing is cancelled.
function glidedParams(node: PlanNode, edited: PlanNode, at: Seconds, smoothing: Seconds): Operation[] | null {
  const changed = Object.keys(node.params).filter(
    (param) => !sameFrom(node.params[param]!, edited.params[param]!, at), // the same structure: the same params
  );
  if (
    changed.some(
      (param) => eventsAfter(node.params[param]!, at).length || eventsAfter(edited.params[param]!, at).length,
    )
  ) {
    return null;
  }
  return changed.map((param) => ({ id: node.id, param, events: onTheWay(edited.params[param]!, at, [], smoothing) }));
}
// whether two automations go on alike from at: the same level there, approaching the same target, the same events after it
function sameFrom(playing: Automation[], wanted: Automation[], at: Seconds): boolean {
  return (
    Math.abs(levelAt(playing, at) - levelAt(wanted, at)) < SAME
    && JSON.stringify(approachAt(playing, at)) === JSON.stringify(approachAt(wanted, at))
    && JSON.stringify(eventsAfter(playing, at)) === JSON.stringify(eventsAfter(wanted, at))
  );
}
// a source's stop moved where the edited plan has it, the last told it since kept on both; none for a node that's no source, one that
// has stopped by at, or one that stops as it did; and none at all where it would never stop now, a stop not taken back: a rebuild's
function stopOp(node: PlanNode, edited: PlanNode, at: Seconds, applied: readonly Operation[]): Operation[] | null {
  if (!node.starts.length) {
    return [];
  }
  const told = toldStop(node, applied);
  const playing = told ?? lastStop(node);
  const wanted = told ?? lastStop(edited);
  if (playing === wanted || playing < at) {
    return [];
  }
  if (!Number.isFinite(wanted)) {
    return null;
  }
  return [{ id: node.id, stop: Math.max(wanted, at) }];
}
// the last stop a source was told since, which holds, as Web Audio's; none
function toldStop(node: PlanNode, applied: readonly Operation[]): number | undefined {
  return applied.filter((op) => op.id === node.id && op.stop !== undefined).at(-1)?.stop;
}
// a source fading out stopped at the fade's end, or as it would have stopped, if sooner; none that has stopped by at, or isn't a source
function stopOnceFaded(node: PlanNode, at: Seconds, end: Seconds, applied: readonly Operation[]): Operation[] {
  if (!node.starts.length) {
    return [];
  }
  const stop = toldStop(node, applied) ?? lastStop(node);
  if (stop < at) {
    return [];
  }
  return [{ id: node.id, stop: Math.min(stop, end) }];
}
