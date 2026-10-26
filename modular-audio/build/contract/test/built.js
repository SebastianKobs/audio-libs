// What's built, a stand-in for the tests of whoever builds on a builder: each call recorded, by its
// address as text. A subclass records the rest of what its tests read (a copy's time, its levels).
export class BuiltStandIn {
  told = [];
  added = [];
  presets = [];
  tempi = [];

  set(address, value, when = {}) {
    this.told.push([address.join('/'), value, when]);
  }
  add(copy) {
    this.added.push(copy.join('/'));
  }
  preset(values, settings) {
    this.presets.push([values, settings]);
  }
  tempo(beat) {
    this.tempi.push(beat);
  }
  automate() {}
  stopBy() {}
  letGo() {}
  rebuild() {}
  faded() {
    return Infinity;
  }
  dispose() {}
}
