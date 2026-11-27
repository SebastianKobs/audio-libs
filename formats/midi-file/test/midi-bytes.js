// A Standard MIDI File built by hand, a chunk at a time, for the reader's and the writer's tests (formats/midi-file/)

// the bytes of a file from its parts, each a list of bytes or a chunk
export function fileOf(...parts) {
  return Uint8Array.from(parts.flat());
}
// a header chunk: its format, its track count and its ticks to a quarter
export function header(format, tracks, ppq) {
  return chunk('MThd', [...uint16(format), ...uint16(tracks), ...uint16(ppq)]);
}
// a chunk: its type's four letters, its length, its body
export function chunk(type, body) {
  return [...[...type].map((letter) => letter.charCodeAt(0)), ...uint32(body.length), ...body];
}
// a track's chunk from its events' bytes, its end appended
export function track(...events) {
  return chunk('MTrk', [...events.flat(), ...END_OF_TRACK]);
}
export const END_OF_TRACK = [0x00, 0xff, 0x2f, 0x00];

function uint16(value) {
  return [(value >> 8) & 0xff, value & 0xff];
}
function uint32(value) {
  return [(value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
