// ---------- formats/midi-file/byte-reader: a file's bytes read in order, big-endian, each read checked against the end ----------
// A file read is an edge: a read past the end, or a quantity too long, is refused, saying where.
import { VARIABLE_LENGTH_BYTES } from './variable-length.ts';

const MORE = 0x80; // a variable-length quantity's top bit: another byte follows

// a refusal of a file, saying what's wrong and at which byte
export function refused(reason: string, at: number): Error {
  return new Error(`Can't read the MIDI file: ${reason}, at byte ${at}`);
}

// the bytes from a start to an end, read in order; its offsets are the whole file's, so a refusal says where in it
export class ByteReader {
  readonly #bytes: Uint8Array;
  readonly #end: number;
  #offset: number;

  constructor(bytes: Uint8Array, from = 0, end = bytes.length) {
    this.#bytes = bytes;
    this.#offset = from;
    this.#end = end;
  }
  get offset(): number {
    return this.#offset;
  }
  get atEnd(): boolean {
    return this.#offset >= this.#end;
  }
  // the bytes left to read
  get length(): number {
    return this.#end - this.#offset;
  }
  byte(): number {
    this.#need(1);
    return this.#bytes[this.#offset++]!; // within, as needed
  }
  uint16(): number {
    return (this.byte() << 8) | this.byte();
  }
  uint32(): number {
    return this.uint16() * 0x10000 + this.uint16();
  }
  // so many bytes as Latin-1 letters, a chunk's type
  text(length: number): string {
    return String.fromCharCode(...this.within(length).#rest());
  }
  // a variable-length quantity, refused past 4 bytes
  variableLength(): number {
    const at = this.#offset;
    let value = 0;
    for (let count = 0; count < VARIABLE_LENGTH_BYTES; count++) {
      const byte = this.byte();
      value = value * 128 + (byte & ~MORE);
      if ((byte & MORE) === 0) {
        return value;
      }
    }
    throw refused('a variable-length quantity over 4 bytes', at);
  }
  // a reader of the next so many bytes, this one moved past them
  within(length: number): ByteReader {
    this.#need(length);
    const part = new ByteReader(this.#bytes, this.#offset, this.#offset + length);
    this.#offset += length;
    return part;
  }
  #rest(): Uint8Array {
    return this.#bytes.subarray(this.#offset, this.#end);
  }
  #need(length: number): void {
    if (length > this.length) {
      throw refused(`cut short: ${length} bytes needed, ${this.length} left`, this.#offset);
    }
  }
}
