// What's built, a stand-in for the voices' tests: each call recorded, by its address as text,
// a copy's destination with it where it has one;
// when each envelope has faded as the test says, by its address, never where it says none.
import { BuiltStandIn as RecordingBuilt } from '../../contract/test/built.js';

export class BuiltStandIn extends RecordingBuilt {
  letGone = [];
  stoppedBy = [];
  rebuilt = [];
  fadedAt = new Map();

  // where a copy's outputs go is recorded as a third item, only where it's told
  add(copy, at, into) {
    this.added.push(into === undefined ? [copy.join('/'), at] : [copy.join('/'), at, into]);
  }
  stopBy(copy, at) {
    this.stoppedBy.push([copy.join('/'), at]);
  }
  letGo(copy) {
    this.letGone.push(copy.join('/'));
  }
  faded(address) {
    return this.fadedAt.get(address.join('/')) ?? Infinity;
  }
  rebuild(plan) {
    this.rebuilt.push(plan);
  }
}
