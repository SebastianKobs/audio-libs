// ---------- view/models/choice: a param or a setting with choices, as a control ----------
// Its options its spec's choices; its value one of them.
// Chosen or reset: a command by its address, where it's live; a setting's a rebuild.
import { Control } from './device.ts';

// A param or a setting with choices, as a choice.
export class Choice extends Control {
  get options(): readonly string[] {
    return this.spec.choices ?? [];
  }
  get value(): string {
    return String(this.model.valueOf(this.address, this.found));
  }
  // One of its options chosen; one it hasn't refused.
  choose(option: string): void {
    if (!this.options.includes(option)) {
      throw new Error(`${this.name}: no choice ${option}`);
    }
    if (!this.live) {
      return;
    }
    this.model.send({ type: this.kind, address: this.address, value: option });
  }
  // back to its start
  reset(): void {
    this.choose(String(this.model.startOf(this.address, this.found)));
  }
}
