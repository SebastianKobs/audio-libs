// ---------- build/web-audio/blocks/worklet-source: a source made by a worklet, started and stopped by message ----------
// A worklet node of its processor: no input, one mono output, its params its AudioParams, a signal cabled into those named.
// It is no Web Audio source node, so it's started and stopped as one by a message each:
// SourceTimes asks start() and stop() of it at its copy's time and by when its voice goes silent, and each is posted.
// None where its worklet isn't loaded: the block that wanted it falls back.
import { choiceIndex, type ParamSpec } from '../../../../base/params/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, valueOf, type Making, type ScheduledSource } from '../making.ts';
import type { Automatable } from '../param-units.ts';
import type { ProcessorName } from '../worklets.ts';
import { SourceTimes } from './source-times.ts';

// what a worklet source is made of
interface WorkletSourceMade {
  readonly processor: ProcessorName;
  // each AudioParam of the processor at the value it starts at
  readonly parameterData: Readonly<Record<string, number>>;
  // what the processor reads once, as it's made
  readonly processorOptions?: object;
  // the AudioParams a signal is cabled into
  readonly cabled: readonly string[];
  // params the plan has that the processor doesn't, held at what they are, moving nothing
  readonly held?: Readonly<Record<string, Automatable>>;
  // what it is, for an error's message
  readonly kind: string;
}

// The block built of its worklet, its stop a param of its own; null where the worklet isn't loaded.
export function workletSource(node: Node, making: Making, made: WorkletSourceMade): BuiltNode | null {
  const { processor, parameterData, processorOptions, cabled, held = {}, kind } = made;
  const worklet = making.worklets.node(making.context, processor, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    parameterData,
    ...(processorOptions && { processorOptions }),
  });
  if (!worklet) {
    return null;
  }
  making.kept(worklet);
  const source = messaged(worklet.port);
  const times = new SourceTimes(source, { stop: numberOf(node, 'stop'), now: () => making.context.currentTime });
  making.started(
    source,
    (at) => times.start(at),
    (at) => times.stopBy(at),
  );
  const param = (name: string): AudioParam => worklet.parameters.get(name)!; // declared by its processor
  return new BuiltNode({
    input: worklet,
    output: worklet,
    params: {
      ...Object.fromEntries(Object.keys(parameterData).map((name) => [name, param(name)])),
      ...held,
      stop: times.stopParam(),
    },
    cables: Object.fromEntries(cabled.map((name) => [name, [param(name)]])),
    kind,
  });
}

// A param's value as a number: a choice as its index among its choices, as a processor reads it.
export function numericOf(node: Node, spec: ParamSpec): number {
  if (spec.choices) {
    return choiceIndex(spec, String(valueOf(node, spec.name)));
  }
  return numberOf(node, spec.name);
}

// A source told by message: each start and stop posted to its processor, now as 0.
export function messaged(port: MessagePort): ScheduledSource {
  return {
    start: (at) => port.postMessage({ start: at ?? 0 }),
    stop: (at) => port.postMessage({ stop: at ?? 0 }),
  };
}
