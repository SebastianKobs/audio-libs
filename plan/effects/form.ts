// ---------- plan/effects/form: what every effect is ----------
// One input and one output, as an insert slot or a return holds it; its children free of roles.
import type { Form } from '../planner/index.ts';

export const EFFECT_FORM: Form = Object.freeze({
  name: 'effect',
  inputs: Object.freeze(['in']),
  outputs: Object.freeze(['out']),
});
