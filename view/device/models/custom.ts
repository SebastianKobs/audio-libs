// ---------- view/device/models/custom: a view of its own, where a view is more than its params ----------
// Registered by a node's kind, a block's (gain) or a composite's (Limiter): a meter, the
// limiter's reduction, an envelope's curve. The rest built from their params.
// The view itself the views': these hold whatever a view library registers.

// Views of their own, by kind.
export class CustomViews<View> {
  readonly #views = new Map<string, View>();

  // a view for a kind, once
  register(kind: string, view: View): void {
    if (this.#views.has(kind)) {
      throw new Error(`${kind}: a view's registered already`);
    }
    this.#views.set(kind, view);
  }
  // the view of a node's kind; none for one built from its params
  of({ kind }: { readonly kind: string }): View | undefined {
    return this.#views.get(kind);
  }
}
