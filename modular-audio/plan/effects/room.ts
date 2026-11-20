// ---------- plan/effects/room: the PCM-60's room and plate ----------
// The values of a Room (room.yaml) for each: set as its macros, beside a `decay`.
// The room is the kernel's defaults (a pre-delay of 20 to 60 ms, highs dying twice as fast).
// The plate's five values are estimates, no source gives them; no return uses it here.
export const PCM60 = {
  room: { 'pre delay': 0.02, taps: 8, dense: 0.08, 'low decay': 1, 'high decay': 0.5 },
  plate: { 'pre delay': 0, taps: 0, dense: 0.01, 'low decay': 1, 'high decay': 0.8 },
} as const;
// the unit's range of decay in s; the block runs to 8 s as the library's reverb does,
// and the percussion's hall is 6.5
export const PCM60_DECAY = [0.2, 4.5] as const;
