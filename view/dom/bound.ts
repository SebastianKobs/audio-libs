// ---------- view/dom/bound: drawn elements bound to their models ----------
// Whoever draws an element binds it, as it's drawn, to the model it was drawn from.
// A drag, a refresh and a click then find the model by the element alone, with no routing.
// An element is marked with its model's address (data-knob, data-set, …); its drawer's models
// say what's there.
import { addressOf, type Address } from '../../plan/format/index.ts';

// the marks a control is drawn with: a knob, a live one's drag, a switch, a list of choices
export const CONTROL_MARKS: readonly string[] = Object.freeze(['knob', 'set', 'toggle', 'choose']);

// Elements bound to models, each to the one it was last drawn from.
// marks: the data- marks that carry an element's address.
export class Bound<Model> {
  readonly #marks: readonly string[];
  readonly #selector: string;
  readonly #models = new WeakMap<Element, Model>();

  constructor(marks: readonly string[]) {
    this.#marks = marks;
    this.#selector = marks.map((mark) => `[data-${mark}]`).join(',');
  }
  // Every marked element within, bound to the model at its address; one with none, to none.
  bind(within: ParentNode, modelOf: (address: Address) => Model | undefined): void {
    for (const element of within.querySelectorAll<HTMLElement>(this.#selector)) {
      const mark = this.#marks.find((each) => element.dataset[each] !== undefined)!; // selected by one
      const model = modelOf(addressOf(element.dataset[mark]!));
      if (model === undefined) {
        this.#models.delete(element);
      } else {
        this.#models.set(element, model);
      }
    }
  }
  // the model an element was drawn from; none for one not bound
  at(element: Element): Model | undefined {
    return this.#models.get(element);
  }
}
