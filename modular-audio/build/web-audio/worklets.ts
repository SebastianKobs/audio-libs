// ---------- build/web-audio/worklets: processors loaded into a context ----------
// Web Audio has no processor of its own to add: each is a JavaScript module, added to a context's AudioWorklet by its URL.
// The library knows no bundler: it's handed each module's URL by the name the processor registers.
// Loaded once a context exists, before anything is built with them: a node of a processor that isn't loaded can't be made.
// Never breaking the sound: a module that fails to load, a context with no AudioWorklet (an insecure origin) or a node that
// fails to be made is said once, and its node is none; the block that wanted it passes through or falls back.
// A module that hasn't loaded after PATIENCE is given up on, so the sound never waits on it.

// The name each processor registers under, one literal for the app's key, the maker's and the processor's, so none can differ.
// A processor file checks its own by a type-only import of this, as a worklet scope imports no code of the library's own.
export type ProcessorName =
  | 'lookahead limiter'
  | 'sync oscillator'
  | 'operators'
  | 'phase distortion'
  | 'crusher'
  | 'grains'
  | 'saturating filter'
  | 'germanium stage';
// each processor's module URL, by the name it registers; those a caller has
export type ProcessorModules = Readonly<Partial<Record<ProcessorName, string>>>;
// a worklet node of a loaded processor, made in a context; none where it can't be
export interface Worklets {
  node(context: BaseAudioContext, processor: ProcessorName, options: AudioWorkletNodeOptions): AudioWorkletNode | null;
}
// What loading is handed, for its tests: how a failure is said, how a node is made, how long a module is waited for.
interface Loading {
  readonly patience?: number;
  readonly warn?: (...said: unknown[]) => void;
  readonly construct?: (
    context: BaseAudioContext,
    processor: ProcessorName,
    options: AudioWorkletNodeOptions,
  ) => AudioWorkletNode;
}

const PATIENCE = 4000; // ms a module is waited for: a dev server's first fetch, with room to spare
const LIBRARY = 'modular-audio/build/web-audio'; // what a warning names

// none loaded: every node none, a pass-through in its place
export const NO_WORKLETS: Worklets = Object.freeze({ node: () => null });

// Every module added to a context's AudioWorklet, together; the worklets that loaded, ready to make nodes.
export async function loadWorklets(
  context: BaseAudioContext,
  modules: ProcessorModules,
  { warn = console.warn, construct = made, patience = PATIENCE }: Loading = {},
): Promise<Worklets> {
  const worklet = (context as Partial<BaseAudioContext>).audioWorklet;
  if (!worklet) {
    warn(
      `${LIBRARY}: no AudioWorklet in this context (an insecure origin?): the blocks of the worklets pass through or fall back`,
    );
    return NO_WORKLETS;
  }
  const loaded = new Set<ProcessorName>();
  const failed: ProcessorName[] = [];
  await Promise.all(
    processorsOf(modules).map(async ([processor, url]) => {
      try {
        await withPatience(worklet.addModule(url), patience);
        loaded.add(processor);
      } catch {
        failed.push(processor);
      }
    }),
  );
  if (failed.length) {
    warn(`${LIBRARY}: worklets not loaded, passing through or falling back: ${failed.join(', ')}`);
  }
  return madeFrom(loaded, { warn, construct });
}

// the processors a caller has a module for, each by its name
function processorsOf(modules: ProcessorModules): [ProcessorName, string][] {
  return (Object.entries(modules) as [ProcessorName, string | undefined][]).flatMap(([processor, url]) =>
    url === undefined ? [] : [[processor, url]],
  );
}
// a promise kept, or refused once it's taken longer than its patience
function withPatience(promise: Promise<void>, patience: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<void>((_, refuse) => {
    timer = setTimeout(() => refuse(new Error('took too long')), patience);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

// nodes of the loaded processors; one that fails to be made said once, then none
function madeFrom(
  loaded: ReadonlySet<ProcessorName>,
  { warn, construct }: Required<Omit<Loading, 'patience'>>,
): Worklets {
  const said = new Set<string>();
  return {
    node(context, processor, options) {
      if (!loaded.has(processor)) {
        return null;
      }
      try {
        return construct(context, processor, options);
      } catch (error) {
        if (!said.has(processor)) {
          warn(`${LIBRARY}: a ${processor} worklet node not made, passing through:`, error);
        }
        said.add(processor);
        return null;
      }
    },
  };
}
function made(context: BaseAudioContext, processor: ProcessorName, options: AudioWorkletNodeOptions): AudioWorkletNode {
  return new AudioWorkletNode(context, processor, options);
}
