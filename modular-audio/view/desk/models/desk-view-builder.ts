// ---------- view/desk/models/desk-view-builder: a desk's view models, its strips and its desk ----------
// On a device's view models (view-builder.ts):
//   - a channel as a strip, by its form, a pool's copy among them;
//   - the desk read as its strips, by role.
import { nodeAt } from '../../../plan/format/index.ts';
import type { Address } from '../../../../base/util/index.ts';
import { DeskModel } from './desk-model.ts';
import { Strip } from './strip.ts';
import { ViewBuilder } from '../../device/models/index.ts';

// The view models of a desk's plan: a device builder's, and its strips and its desk.
export class DeskViewBuilder extends ViewBuilder {
  // A channel as a strip, by its address, a pool's copy among them; none where nothing's there.
  strip(address: Address): Strip | undefined {
    const node = nodeAt(this.plan, address);
    if (!node) {
      return undefined;
    }
    return new Strip(this, address, node);
  }
  // the plan's desk, its strips by role
  desk(): DeskModel {
    return new DeskModel(this, (address) => this.strip(address));
  }
}
