// ---------- plan/synth/modules: the modules, a YAML template each ----------
// As a synth's panel names them: VCO, Noise source, LFO, FM, Envelope generator, VCA, VCF,
// Tremolo, Ring, Out. Each read as it loads, its shape checked, naming its file.
import { templateOf, type WrittenTemplate } from '../planner/index.ts';
import { frozen } from '../../util/index.ts';
import envelopeGenerator from './modules/envelope-generator.yaml';
import fm from './modules/fm.yaml';
import lfo from './modules/lfo.yaml';
import noiseSource from './modules/noise-source.yaml';
import out from './modules/out.yaml';
import ring from './modules/ring.yaml';
import tremolo from './modules/tremolo.yaml';
import vca from './modules/vca.yaml';
import vcf from './modules/vcf.yaml';
import vco from './modules/vco.yaml';

// the modules, by their jobs: the sources, the modulators, the stages, the output
export const MODULE_TEMPLATES: readonly WrittenTemplate[] = frozen([
  templateOf(vco, 'libs/plan/synth/modules/vco.yaml'),
  templateOf(noiseSource, 'libs/plan/synth/modules/noise-source.yaml'),
  templateOf(lfo, 'libs/plan/synth/modules/lfo.yaml'),
  templateOf(fm, 'libs/plan/synth/modules/fm.yaml'),
  templateOf(envelopeGenerator, 'libs/plan/synth/modules/envelope-generator.yaml'),
  templateOf(vca, 'libs/plan/synth/modules/vca.yaml'),
  templateOf(vcf, 'libs/plan/synth/modules/vcf.yaml'),
  templateOf(tremolo, 'libs/plan/synth/modules/tremolo.yaml'),
  templateOf(ring, 'libs/plan/synth/modules/ring.yaml'),
  templateOf(out, 'libs/plan/synth/modules/out.yaml'),
]);
