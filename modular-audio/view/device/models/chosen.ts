// ---------- view/device/models/chosen: what's chosen in the composites a view shows. Pure ----------
// As a synth's panel keeps the page you were on:
//   - each rack's chosen pad, by the rack's key;
//   - each group's chosen tab, by its composite's key and the group's title.
// None until chosen: a view shows the first then.

export class Chosen {
  readonly #pads = new Map<string, string>(); // by the rack's key
  readonly #tabs = new Map<string, string>(); // by the composite's key and the group's title

  padOf(rack: string): string | undefined {
    return this.#pads.get(rack);
  }
  choosePad(rack: string, pad: string): void {
    this.#pads.set(rack, pad);
  }
  tabOf(composite: string, group: string): string | undefined {
    return this.#tabs.get(`${composite}/${group}`);
  }
  chooseTab(composite: string, group: string, tab: string): void {
    this.#tabs.set(`${composite}/${group}`, tab);
  }
}
