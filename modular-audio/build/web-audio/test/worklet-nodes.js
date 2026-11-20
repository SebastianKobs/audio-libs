// Worklet nodes on the stand-in for Web Audio (audio-stand-in.js): a node of a processor with its params at the values it's made with and
// a port that keeps what's posted to it, as a browser's AudioWorkletNode has them.
// The browser's own class stood in for where a loader makes the nodes itself (ClockedContext's, AudioPower's).

// a stand-in context's node of a processor, its options as it's made with them
export function workletNodeOn(context, processor, options) {
  const node = context.createWorkletNode(processor, options);
  node.parameters = new Map(
    Object.entries(options.parameterData ?? {}).map(([name, value]) => {
      const param = context.createGain().gain; // a recording param
      param.v = value; // the value it starts at, no event
      return [name, param];
    }),
  );
  node.port = {
    messages: [],
    onmessage: null,
    postMessage(message) {
      this.messages.push(message);
    },
  };
  return node;
}

// Where a module is loaded, a node of its processor; the processors a test names, none for any other, as the loader has it.
export function standInWorklets(loaded = ['lookahead limiter']) {
  return {
    node: (context, processor, options) =>
      loaded.includes(processor) ? workletNodeOn(context, processor, options) : null,
  };
}

// The browser's AudioWorkletNode stood in for, until the function it returns is called.
export function installWorkletNodes() {
  globalThis.AudioWorkletNode = class {
    constructor(context, processor, options) {
      return workletNodeOn(context, processor, options);
    }
  };
  return () => {
    delete globalThis.AudioWorkletNode;
  };
}
