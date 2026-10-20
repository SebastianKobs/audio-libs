// ---------- view/models/mixer-view-builder: a desk's view models, its strips and its mixer ----------
// On a device's view models (view-builder.ts):
//   - a channel as a strip, by its form, a pool's copy among them;
//   - the desk as a mixer, its strips by role.
import { nodeAt, type Address } from '../../plan/format/index.ts';
import { Mixer } from './mixer.ts';
import { Strip } from './strip.ts';
import { ViewBuilder } from './view-builder.ts';

// The view models of a desk's plan: a device builder's, and its strips and its mixer.
export class MixerViewBuilder extends ViewBuilder {
  // A channel as a strip, by its address, a pool's copy among them; none where nothing's there.
  strip(address: Address): Strip | undefined {
    const node = nodeAt(this.plan, address);
    if (!node) {
      return undefined;
    }
    return new Strip(this, address, node);
  }
  // the plan's desk as a mixer
  mixer(): Mixer {
    return new Mixer(this, (address) => this.strip(address));
  }
}
