// Whether a value is one a spec's control can take, for every package's tests:
// within its range (a gain's in dB), or one of its choices.
import { dBOf } from '../index.ts';

export function onControl({ range, choices, dB }, value) {
  if (choices) {
    return choices.includes(value);
  }
  const shown = dB ? dBOf(value) : value;
  return shown >= range[0] && shown <= range[1];
}
