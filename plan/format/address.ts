// ---------- plan/format/address: where a param or a setting is in a plan ----------
// Its path by names from the plan's top, as a parent puts its child's name in front:
// desk/channel 3/utility/level. A path of names, as libs/util has it.
// The plan's top node isn't named: what was asked for, every address starts under it.
export { addressOf, addressText, under, type Address } from '../../util/index.ts';

// values by their addresses as text: a number, or one of its choices; a preset's, a template's child's
export type ValuesByAddress = Readonly<Record<string, number | string>>;
