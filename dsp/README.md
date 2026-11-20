# dsp

Signal processing on sample arrays, free of any audio API. Part of [the libraries](../README.md).

- [`filters/`](filters/README.md): a second-order filter run, and filter coefficients worked out from a cutoff.
- [`loudness/`](loudness/README.md): an integrated loudness in LUFS.
- [`measures/`](measures/README.md): what a rendered hit or mix is read by.
- [`saturation/`](saturation/README.md): the curves a waveshaper reads, and a drive's styles.
- [`dynamics/`](dynamics/README.md): what a compressor does to a steady level.
- [`impulse/`](impulse/README.md): a reverb's impulse response, designed.
- [`wow/`](wow/README.md): a tape's wow, slow drift that loops.
- [`operator-levels/`](operator-levels/README.md): a DX's levels as an FM kernel's numbers.
- [`true-peak/`](true-peak/README.md): a true-peak meter and a limiter that keeps every point of the wave under a ceiling.

Reads: `libs/base/util/` alone, for `impulse/`'s seeded random. Inside the group, `loudness/` and `impulse/` read `filters/`; `impulse/` reads `measures/` and `true-peak/` reads `loudness/`, both in their tests.
