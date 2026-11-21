// What an audio worklet's scope has that lib.dom lacks: a processor file (modular-audio/build/web-audio/processors/, and the test's
// test/clamped-processor.ts) is written in TypeScript and runs there, where registerProcessor(), the base class and the rate are globals
// a param a processor declares, as the scope reads it
interface AudioParamDescriptor {
  name: string;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
  automationRate?: AutomationRate;
}
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: AudioWorkletNodeOptions);
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare function registerProcessor(
  name: string,
  processor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor,
): void;
declare const sampleRate: number; // the context's, in Hz
declare const currentTime: number; // the context's time at the block's first frame, in s
