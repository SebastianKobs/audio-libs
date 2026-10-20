// ---------- plan/instrument/content: the modules, a YAML template each ----------
// As a synth's panel names them: VCO, Noise source, LFO, FM, Envelope generator, VCA, VCF,
// Tremolo, Ring, Out. Each read as it loads, its shape checked, naming its file.
// Handed to the planner with the synth's forms (index.ts), through a file of instruments (instrumentsOf()).
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
  templateOf(vco, 'libs/plan/instrument/modules/vco.yaml'),
  templateOf(noiseSource, 'libs/plan/instrument/modules/noise-source.yaml'),
  templateOf(lfo, 'libs/plan/instrument/modules/lfo.yaml'),
  templateOf(fm, 'libs/plan/instrument/modules/fm.yaml'),
  templateOf(envelopeGenerator, 'libs/plan/instrument/modules/envelope-generator.yaml'),
  templateOf(vca, 'libs/plan/instrument/modules/vca.yaml'),
  templateOf(vcf, 'libs/plan/instrument/modules/vcf.yaml'),
  templateOf(tremolo, 'libs/plan/instrument/modules/tremolo.yaml'),
  templateOf(ring, 'libs/plan/instrument/modules/ring.yaml'),
  templateOf(out, 'libs/plan/instrument/modules/out.yaml'),
]);
