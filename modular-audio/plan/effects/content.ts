// ---------- plan/effects/content: the effects, each a template read from YAML ----------
// Utility, Filter, Limiter, Lookahead limiter, Delay, Tape delay, Reverb, Drive, Crusher, Chorus, Ducker, Grains, Align, EQ,
// Isolator, Compressor, JunoChorus, TapeEcho, Hiss and Room, a YAML file each, its comments the reasons.
// The Tape delay built on the Delay (extends), merged by the planner.
// Each read as it loads, its shape checked, every failure said, naming its file.
// Handed to the planner with the effects' form (index.ts); an owner's or a desk's presets on them.
import { templateOf, type WrittenTemplate } from '../planner/index.ts';
import { frozen } from '../../../base/util/index.ts';
import align from './align.yaml';
import chorus from './chorus.yaml';
import compressor from './compressor.yaml';
import crusher from './crusher.yaml';
import delay from './delay.yaml';
import drive from './drive.yaml';
import ducker from './ducker.yaml';
import equalizer from './eq.yaml';
import filter from './filter.yaml';
import grains from './grains.yaml';
import hiss from './hiss.yaml';
import isolator from './isolator.yaml';
import junoChorus from './juno-chorus.yaml';
import limiter from './limiter.yaml';
import lookaheadLimiter from './lookahead-limiter.yaml';
import reverb from './reverb.yaml';
import room from './room.yaml';
import tapeDelay from './tape-delay.yaml';
import tapeEcho from './tape-echo.yaml';
import utility from './utility.yaml';

// the effects, in the order a device view lists them
export const EFFECT_TEMPLATES: readonly WrittenTemplate[] = frozen([
  templateOf(utility, 'libs/modular-audio/plan/effects/utility.yaml'),
  templateOf(filter, 'libs/modular-audio/plan/effects/filter.yaml'),
  templateOf(limiter, 'libs/modular-audio/plan/effects/limiter.yaml'),
  templateOf(lookaheadLimiter, 'libs/modular-audio/plan/effects/lookahead-limiter.yaml'),
  templateOf(delay, 'libs/modular-audio/plan/effects/delay.yaml'),
  templateOf(tapeDelay, 'libs/modular-audio/plan/effects/tape-delay.yaml'),
  templateOf(reverb, 'libs/modular-audio/plan/effects/reverb.yaml'),
  templateOf(drive, 'libs/modular-audio/plan/effects/drive.yaml'),
  templateOf(crusher, 'libs/modular-audio/plan/effects/crusher.yaml'),
  templateOf(chorus, 'libs/modular-audio/plan/effects/chorus.yaml'),
  templateOf(ducker, 'libs/modular-audio/plan/effects/ducker.yaml'),
  templateOf(grains, 'libs/modular-audio/plan/effects/grains.yaml'),
  templateOf(align, 'libs/modular-audio/plan/effects/align.yaml'),
  templateOf(equalizer, 'libs/modular-audio/plan/effects/eq.yaml'),
  templateOf(isolator, 'libs/modular-audio/plan/effects/isolator.yaml'),
  templateOf(compressor, 'libs/modular-audio/plan/effects/compressor.yaml'),
  templateOf(junoChorus, 'libs/modular-audio/plan/effects/juno-chorus.yaml'),
  templateOf(tapeEcho, 'libs/modular-audio/plan/effects/tape-echo.yaml'),
  templateOf(hiss, 'libs/modular-audio/plan/effects/hiss.yaml'),
  templateOf(room, 'libs/modular-audio/plan/effects/room.yaml'),
]);
