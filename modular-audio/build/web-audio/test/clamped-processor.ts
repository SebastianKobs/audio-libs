// A processor for the worklets' end-to-end test (worklets.spec.js): every sample it outputs is clamp01(2), 1, so a render of it
// shows it ran in the worklet's scope with the library's own code, bundled in by Vite, not a copy of it.
import { clamp01 } from '../../../../base/util/index.ts';

class ClampedProcessor extends AudioWorkletProcessor {
  override process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    outputs[0]?.[0]?.fill(clamp01(2));
    return true;
  }
}
registerProcessor('clamped', ClampedProcessor);
