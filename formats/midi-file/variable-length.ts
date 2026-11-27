// ---------- formats/midi-file/variable-length: a variable-length quantity, a delta time's form ----------
// 7 bits a byte, the highest first, each byte but the last its top bit set; at most 4 bytes, so up to 0x0FFFFFFF.

export const LARGEST_VARIABLE_LENGTH = 0x0fffffff;
export const VARIABLE_LENGTH_BYTES = 4;

const SEVEN_BITS = 0x7f;
const MORE = 0x80; // the top bit: another byte follows

// a whole number from 0 to 0x0FFFFFFF as its bytes
export function variableLength(value: number): number[] {
  const bytes = [value & SEVEN_BITS];
  for (let rest = value >>> 7; rest > 0; rest >>>= 7) {
    bytes.unshift((rest & SEVEN_BITS) | MORE);
  }
  return bytes;
}
