// ---------- libs/plan/synth: the synth's templates and forms ----------
// A voice card, an architecture: its modules, a YAML template each, wired by its form; the note's
// sources its macros, set as each note starts.
// Its parts:
//   - note.ts: a note's sources into a voice, as a voice card's CV, and the note's settings;
//   - architecture-form.ts: what a voice card is, its modules' forms by their jobs, an
//     instrument's;
//   - instrument.ts: an instrument, a pool of voices, or a drum rack, a pool for each pad;
//   - preset.ts: a preset changed, each value and setting that differs, by its address;
//   - bank.ts: patches by name, a program change picking one;
//   - instruments-file.ts: a file of instruments, patches and racks, as a person writes it, read;
//   - modules/: the modules, VCO, Noise source, LFO, FM, Envelope generator, VCA, VCF, Tremolo,
//     Ring, Out; none named as a block is.
// Each read as it loads, its shape checked, every failure said, naming its file.
// Handed to the planner, with the forms.
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

export { NOTE_SETTINGS, NOTE_SOURCES, type NoteSource } from './note.ts';
export { Bank } from './bank.ts';
export { instrumentOf, type Chain } from './instrument.ts';
export { instrumentsOf, type Instruments, type RackPad } from './instruments-file.ts';
export { changesFrom, type Changes } from './preset.ts';
export {
  ARCHITECTURE_FORM,
  INSTRUMENT_FORM,
  MODULATOR_FORM,
  OUTPUT_FORM,
  SOURCE_FORM,
  STAGE_FORM,
  SYNTH_FORMS,
} from './architecture-form.ts';

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
