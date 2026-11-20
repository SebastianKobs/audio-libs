// ---------- build/web-audio/blocks/lookahead-limiter: a lookahead limiter in Web Audio ----------
// A worklet of its processor (processors/lookahead-limiter-processor.ts), one input and one output, its channels following its input's,
// one gain for every channel; its four params its AudioParams, set, automated and cabled into as any.
// Its reduction as the processor posts it: the most taken off over the last 2048 frames, up to 43 ms old, kept as it comes and read
// as the limiter's reduction is, so a meter reads either the same way.
// Always running, as a desk's insert is: nothing is told to stop it while the desk stands.
// Where its worklet isn't loaded: the limiter (blocks/limiter.ts) at the same gain, ceiling and release, its params, points and
// reduction handed on; its clip held and heard nowhere. Not a placeholder: a master with no limiter clips.
import { BLOCKS } from '../../../plan/blocks/index.ts';
import type { Node } from '../../../plan/format/index.ts';
import { BuiltNode } from '../built-node.ts';
import { numberOf, type Making } from '../making.ts';
import { toldParam } from '../param-units.ts';
import { limiter } from './limiter.ts';

const PLAN = BLOCKS['lookahead limiter'];
const NAMES = PLAN.params.map(({ name }) => name);
const SHARED = ['gain', 'ceiling', 'release'] as const; // the limiter has these three

export function lookaheadLimiter(node: Node, making: Making): BuiltNode {
  const parameterData = Object.fromEntries(NAMES.map((name) => [name, numberOf(node, name)]));
  const made = making.worklets.node(making.context, 'lookahead limiter', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    parameterData,
  });
  if (!made) {
    return limiterInstead(node, making);
  }
  making.kept(made);
  let reduction = 0;
  made.port.onmessage = ({ data }: MessageEvent<{ reduction?: unknown } | null>) => {
    if (typeof data?.reduction === 'number') {
      reduction = data.reduction;
    }
  };
  const params = Object.fromEntries(NAMES.map((name) => [name, made.parameters.get(name)!])); // declared by its processor
  return new BuiltNode({
    input: made,
    output: made,
    params,
    cables: Object.fromEntries(NAMES.map((name) => [name, [params[name]!]])),
    points: { in: made, out: made },
    readings: { reduction: () => reduction },
    kind: 'a lookahead limiter worklet',
  });
}

// The limiter at the node's gain, ceiling and release, handed on whole: its params, its points, its reduction. The clip a value held,
// which moves nothing.
function limiterInstead(node: Node, making: Making): BuiltNode {
  const planned = BLOCKS.limiter;
  const stood: Node = {
    ...node,
    kind: planned.kind,
    params: planned.params.map((spec) => ({ spec, value: numberOf(node, spec.name) })),
    settings: [],
  };
  const library = limiter(stood, making);
  let heldClip = numberOf(node, 'clip');
  return new BuiltNode({
    input: library.input,
    output: library.output,
    params: {
      ...Object.fromEntries(SHARED.map((name) => [name, library.param(name)])),
      clip: toldParam(
        () => heldClip,
        (value) => (heldClip = value),
      ),
    },
    points: { ...library.points },
    readings: { ...library.readings },
    kind: 'a limiter, for a lookahead limiter',
  });
}
