# dsp

Signal processing on sample arrays, free of any audio API. Part of [the libraries](../README.md).

- [`filters/`](filters/README.md): a second-order filter run, filter coefficients worked out from a cutoff, a filter that saturates and sings, and the windowed sinc an interpolating filter is made of.
- [`crusher/`](crusher/README.md): a bit and sample-rate reducer.
- [`grains/`](grains/README.md): granular freeze and smear.
- [`loudness/`](loudness/README.md): an integrated loudness in LUFS.
- [`measures/`](measures/README.md): what a rendered hit or mix is read by.
- [`saturation/`](saturation/README.md): the curves a waveshaper reads, and a drive's styles.
- [`dynamics/`](dynamics/README.md): what a compressor does to a steady level.
- [`impulse/`](impulse/README.md): a reverb's impulse response, designed.
- [`wow/`](wow/README.md): a tape's wow, slow drift that loops.
- [`operator-levels/`](operator-levels/README.md): a DX's levels as an FM kernel's numbers.
- [`oscillators/`](oscillators/README.md): oscillator voices rendered sample by sample, hard sync, phase modulation and phase distortion, and a way to start and stop one.
- [`true-peak/`](true-peak/README.md): a true-peak meter and a limiter that keeps every point of the wave under a ceiling.

Reads: `libs/base/util/` alone, for `impulse/`'s seeded random, and in `grains/`'s tests. Inside the group, `loudness/`, `impulse/` and `true-peak/` read `filters/`; `impulse/` reads `measures/` and `true-peak/` reads `loudness/`, both in their tests.
