// ---------- plan/synth/instruments-file: a file of instruments, patches and racks, read ----------
// As a person writes it (a theme's instruments.yaml):
//   - instruments by their names, each its voice card's children, wires and macros;
//   - patches by names of their own, each the instrument it plays, its values and settings;
//   - racks by their names, each its pads, a key and the patch it plays.
// Read into what the planner takes:
//   - each instrument a template of a voice card's form, its name its kind, one mono output;
//   - each patch a preset, the instrument it plays its kind.
// Its shape checked as it loads, every failure said under the file's name; a pad naming a patch
// the file hasn't refused. An instrument a patch plays is the planner's to find, another file's
// among them.
import { fromData, type Shape } from '../../util/index.ts';
import { templateOf, type Preset, type WrittenTemplate } from '../planner/index.ts';
import { ARCHITECTURE_FORM } from './architecture-form.ts';

// a rack's pad: its key, and the patch it plays, by its name
export interface RackPad {
  readonly key: number;
  readonly patch: string;
}
// a file of instruments, read: their templates, the patches by name, the racks by name
export interface Instruments {
  readonly templates: readonly WrittenTemplate[];
  readonly patches: Readonly<Record<string, Preset>>;
  readonly racks: Readonly<Record<string, readonly RackPad[]>>;
}
// the file as it's written
interface Written {
  readonly instruments?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly patches?: Readonly<Record<string, Omit<Preset, 'kind'> & { readonly instrument: string }>>;
  readonly racks?: Readonly<Record<string, readonly RackPad[]>>;
}

// The file's shape: its instruments, each a voice card's lists, checked as a template is; its
// patches, each the instrument it plays; its racks, each pad a key and a patch.
const FILE_SHAPE: Shape = {
  fields: {
    instruments: {
      byName: {
        fields: { children: { listOf: {} }, wires: { listOf: {} }, macros: { listOf: {} } },
        needs: ['children'],
      },
    },
    patches: {
      byName: {
        fields: { instrument: 'word', values: { byName: 'word or number' }, settings: { byName: 'word or number' } },
        needs: ['instrument'],
      },
    },
    racks: { byName: { listOf: { fields: { key: 'number', patch: 'word' }, needs: ['key', 'patch'] } } },
  },
};

// A file of instruments read, as it is once it's of its shape; refused where it isn't.
export function instrumentsOf(data: unknown, source: string): Instruments {
  const file = fromData<Written>(data, FILE_SHAPE, { source, what: 'instruments' });
  const patches = Object.fromEntries(
    Object.entries(file.patches ?? {}).map(([name, { instrument, ...preset }]) => [
      name,
      { kind: instrument, ...preset },
    ]),
  );
  const racks = file.racks ?? {};
  refusedPads(racks, patches, source);
  return {
    templates: Object.entries(file.instruments ?? {}).map(([name, voiceCard]) =>
      templateOf(
        { kind: name, form: ARCHITECTURE_FORM.name, outputs: [{ name: 'out', channels: 1 }], ...voiceCard },
        `${source}: ${name}`,
      ),
    ),
    patches,
    racks,
  };
}

// each rack's pads playing patches the file has
function refusedPads(
  racks: Readonly<Record<string, readonly RackPad[]>>,
  patches: Readonly<Record<string, Preset>>,
  source: string,
): void {
  for (const [rack, pads] of Object.entries(racks)) {
    const astray = pads.find(({ patch }) => !Object.hasOwn(patches, patch));
    if (astray) {
      throw new Error(`${source}: rack ${rack}: pad ${astray.key} plays ${astray.patch}, no patch in it`);
    }
  }
}
