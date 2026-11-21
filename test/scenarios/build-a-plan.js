// Scenario 2: the voice planned in code (plan-in-code.js) built for Web Audio, as a library's user
// writes it: into an audio context handed in, run with no view, no clock and no engine.
import { planVoice } from './plan-in-code.js';
import { WebAudioBuilder } from '../../modular-audio/build/web-audio/index.ts';

// the voice built into the context's destination, its envelope's gate opened at a time
export function buildVoice(context) {
  const builder = new WebAudioBuilder({ context, beat: () => 0.5 });
  const built = builder.build(planVoice(), { into: context.destination });
  built.set(['envelope', 'gate'], 1, { at: 1 });
  return built;
}
