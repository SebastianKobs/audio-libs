// ---------- plan/instrument/content: the modules, a YAML template each ----------
// As a synth's panel names them: VCO, Noise source, SyncVCO, Operators, PhaseVCO, LFO, FM,
// Envelope generator, VCA, VCF, SaturatingVCF, Saturator, Tremolo, Ring, Out, Panned out.
// Each read as it loads, its shape checked, naming its file.
// Handed to the planner with the synth's forms (index.ts), through a file of instruments (instrumentsOf()).
import { templateOf, type WrittenTemplate } from '../planner/index.ts';
import { frozen } from '../../../base/util/index.ts';
import envelopeGenerator from './modules/envelope-generator.yaml';
import fm from './modules/fm.yaml';
import lfo from './modules/lfo.yaml';
import noiseSource from './modules/noise-source.yaml';
import operators from './modules/operators.yaml';
import out from './modules/out.yaml';
import pannedOut from './modules/panned-out.yaml';
import phaseVco from './modules/phase-vco.yaml';
import ring from './modules/ring.yaml';
import saturatingVcf from './modules/saturating-vcf.yaml';
import saturator from './modules/saturator.yaml';
import syncVco from './modules/sync-vco.yaml';
import tremolo from './modules/tremolo.yaml';
import vca from './modules/vca.yaml';
import vcf from './modules/vcf.yaml';
import vco from './modules/vco.yaml';

// the modules, by their jobs: the sources, the modulators, the stages, the output
export const MODULE_TEMPLATES: readonly WrittenTemplate[] = frozen([
  templateOf(vco, 'modular-audio/plan/instrument/modules/vco.yaml'),
  templateOf(noiseSource, 'modular-audio/plan/instrument/modules/noise-source.yaml'),
  templateOf(syncVco, 'modular-audio/plan/instrument/modules/sync-vco.yaml'),
  templateOf(operators, 'modular-audio/plan/instrument/modules/operators.yaml'),
  templateOf(phaseVco, 'modular-audio/plan/instrument/modules/phase-vco.yaml'),
  templateOf(lfo, 'modular-audio/plan/instrument/modules/lfo.yaml'),
  templateOf(fm, 'modular-audio/plan/instrument/modules/fm.yaml'),
  templateOf(envelopeGenerator, 'modular-audio/plan/instrument/modules/envelope-generator.yaml'),
  templateOf(vca, 'modular-audio/plan/instrument/modules/vca.yaml'),
  templateOf(vcf, 'modular-audio/plan/instrument/modules/vcf.yaml'),
  templateOf(saturatingVcf, 'modular-audio/plan/instrument/modules/saturating-vcf.yaml'),
  templateOf(saturator, 'modular-audio/plan/instrument/modules/saturator.yaml'),
  templateOf(tremolo, 'modular-audio/plan/instrument/modules/tremolo.yaml'),
  templateOf(ring, 'modular-audio/plan/instrument/modules/ring.yaml'),
  templateOf(out, 'modular-audio/plan/instrument/modules/out.yaml'),
  templateOf(pannedOut, 'modular-audio/plan/instrument/modules/panned-out.yaml'),
]);
