// ---------- view/models/knob: a param with a range as a control ----------
// Its name, unit, range and taper its declared spec; its value and its address.
// Turned, set, typed or reset: a command by its address, where it's live; typed, read as its
// text shows it.
// Its rings: the range each of what moves it moves it through, on its control, as Serum's.
// Its text as a view shows it:
//   - a gain in dB, to a tenth: 0.0 at unity, -∞ all the way down;
//   - a pan by its side: C in the middle, L or R and how far, 0 to 50;
//   - any other to its step, its unit beside it.
import { dBOf, gainOf, isSwitch, positionOf, valueAt, type ParamSpec } from '../../params/index.ts';
import { addressText, mapOnto, type Move } from '../../plan/format/index.ts';
import { clamp } from '../../util/index.ts';
import { Control } from './device.ts';

// a range a move takes a knob through, by where it lies on its control, by what moves it
export interface Ring {
  readonly by: string;
  readonly from: number;
  readonly to: number;
}

// a gain is set to a hundredth, a share, as the session view's faders always were
const GAIN_STEP = 0.01;
// how far a pan's side is shown, all the way over
const PAN_SIDE = 50;

// A param or a setting with a range, as a knob.
export class Knob extends Control {
  get unit(): string | undefined {
    if (this.spec.dB) {
      return 'dB';
    }
    return this.spec.unit;
  }
  // a pan, drawn from its middle
  get isPan(): boolean {
    return isPan(this.spec);
  }
  get isSwitch(): boolean {
    return isSwitch(this.spec);
  }
  get value(): number {
    return Number(this.model.valueOf(this.address, this.found));
  }
  // where its value lies on its control, 0 at its bottom to 1 at its top, by its taper
  get position(): number {
    return positionOf(this.spec, this.value);
  }
  get text(): string {
    return textOf(this.spec, this.value);
  }
  // Where each of what moves it takes it, on its control:
  //   - a macro: across its own range, mapped, held within its map's ends;
  //   - a modulator: from its value by its reach, where it has one.
  // None for one it can't say, a choice's macro, a modulator with no reach.
  get rings(): Ring[] {
    return this.moves.flatMap((move) => {
      const span = this.#spanOf(move);
      return span ? [{ by: addressText(move.by), from: this.#placeOf(span[0]), to: this.#placeOf(span[1]) }] : [];
    });
  }
  // turned to a place on its control: its value there by its taper
  turnTo(position: number): void {
    this.set(valueAt(this.spec, position));
  }
  set(value: number): void {
    if (!this.live) {
      return;
    }
    this.model.send({ type: this.kind, address: this.address, value: rounded(this.spec, value) });
  }
  // Set from what's typed, read as its text shows it; false for what isn't a value, passed by.
  setText(typed: string): boolean {
    const value = valueOfText(this.spec, typed.trim());
    if (value === undefined) {
      return false;
    }
    this.set(value);
    return true;
  }
  // a switch on where it's off, off where it's on
  toggle(): void {
    this.set(this.value > 0 ? 0 : 1);
  }
  // back to its start
  reset(): void {
    this.set(Number(this.model.startOf(this.address, this.found)));
  }

  // the values a move takes it between
  #spanOf(move: Move): [number, number] | undefined {
    if (move.kind === 'macro') {
      const range = this.model.find(move.by)?.param.spec.range;
      return range && move.map && [mapOnto(move.map, range[0]), mapOnto(move.map, range[1])];
    }
    const reach = move.reach && this.model.find(move.reach);
    if (!reach) {
      return undefined;
    }
    return [this.value, this.value + Number(this.model.valueOf(move.reach, reach))];
  }
  // where a value lies on its control, held within its range
  #placeOf(value: number): number {
    const [low = -Infinity, high = Infinity] = this.spec.range ?? [];
    return positionOf(this.spec, clamp(value, low, high));
  }
}

// A value to its step: a gain to a hundredth, as a share; any other to its range's step.
function rounded({ dB, range }: ParamSpec, value: number): number {
  const step = dB ? GAIN_STEP : (range?.[2] ?? 0);
  if (step <= 0) {
    return value;
  }
  return Number((Math.round(value / step) * step).toFixed(decimalsOf(step)));
}
// A value from its text, as textOf() writes it: a gain in dB, -∞ silence; a pan by its side, C
// its middle; any other a number. None for what's none of these.
function valueOfText(spec: ParamSpec, text: string): number | undefined {
  if (spec.dB) {
    return text === '-∞' ? 0 : asNumber(text, gainOf);
  }
  if (isPan(spec)) {
    return sideOf(text) ?? asNumber(text, (pan) => pan);
  }
  return asNumber(text, (value) => value);
}
// a pan from its side: C, L or R and how far; none for any other text
function sideOf(text: string): number | undefined {
  if (text.toUpperCase() === 'C') {
    return 0;
  }
  const side = /^([LR])\s*(\d+(?:\.\d+)?)$/i.exec(text);
  if (!side) {
    return undefined;
  }
  const sign = side[1]!.toUpperCase() === 'L' ? -1 : 1; // matched: a side
  return (sign * Number(side[2])) / PAN_SIDE;
}
// a number typed, made a value; none where it isn't one
function asNumber(text: string, valueOf: (typed: number) => number): number | undefined {
  const typed = Number(text);
  return text !== '' && Number.isFinite(typed) ? valueOf(typed) : undefined;
}
// A value's text, as a view shows it: a gain in dB, a pan by its side, any other to its step.
export function textOf(spec: ParamSpec, value: number): string {
  if (spec.dB) {
    return dBText(value);
  }
  if (isPan(spec)) {
    return sideText(value);
  }
  return value.toFixed(decimalsOf(spec.range?.[2] ?? 1));
}
// whether a param is a pan, left to right, centred at 0: by its name, as every pan's spec has it
function isPan({ name }: ParamSpec): boolean {
  return name === 'pan';
}
// A gain in dB, to a tenth: 0.0 at unity, -∞ all the way down, a sign above unity.
function dBText(gain: number): string {
  if (gain <= 0) {
    return '-∞';
  }
  const decibels = dBOf(gain);
  if (Math.abs(decibels) < 0.05) {
    return '0.0';
  }
  const sign = decibels > 0 ? '+' : '';
  return `${sign}${decibels.toFixed(1)}`;
}
// A pan by its side: C in the middle, L or R and how far.
function sideText(pan: number): string {
  if (pan === 0) {
    return 'C';
  }
  const side = pan < 0 ? 'L' : 'R';
  return `${side}${Math.round(Math.abs(pan) * PAN_SIDE)}`;
}
// how many decimals a step has: 0.01, two
function decimalsOf(step: number): number {
  return String(step).split('.')[1]?.length ?? 0;
}
