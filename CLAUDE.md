# audio-libs

**What this is.** Audio libraries in TypeScript, each usable alone: a sound as data (a plan), built for Web Audio and shown as a device view, a MIDI sequencer and its clock, notes and scales, signal processing on sample arrays, places heard by distance, pointer input as gestures. They grew inside Stim Garden's `mockup/src/libs/`, their history carried over; Stim Garden mounts this repo there as a git submodule, and other projects take the layers they need. `README.md` maps them by role and by layer.

**First steps.** `npm install`, then `make test-unit` runs the type check, the format check, the linter, Knip, the class members check and the clone finder, then the unit tests. The checks that know nothing of this project come from `ts-code-checks`, an optional dependency (`package.json`): without it they say they're skipped and the unit tests run uncapped.

## Rules for the code

- **Test-driven.** A change in behavior starts with a test that fails for the reason it names; the library's tests are in its own `test/` folder, those across libraries in `test/unit/`, the code a user writes in `test/scenarios/`.
- **A library is a folder, its face its entries.** Its entry is `index.ts`, and a `content.ts` where it holds templates as data, imported apart. Another library is reached only through its entries, and a library imports only those its row names in `test/module-rules.js`, the one place the import order is kept. What a library exports from its entries, and every public member of a class it exports there, is its API, kept though nothing here uses it. Anything else is exported only where another file uses it, a test aside, and a class member is public only where something outside its class uses it. A test reaches a library through its entries or a helper in a `test/` folder.
- **Each file has one job, and every piece of state one owner.** A file is named for what it holds: its one class or type, by its name or its ending, its folder's name counting as part of its own, never repeated in it; a file of helpers, for their topic; never `shared`, `common`, `misc`, `utils` or `helpers`.
- **Reuse first, special cases kept to the minimum.** Before writing code, look for something built that does the job already: use it, make it generic, or move it low enough in the import order (`base/util/` at the bottom) for both to share. The clone finder fails on a new clone over 60 tokens; the known ones are listed in `tools/known-clones.js`, a list that only shrinks.
- **No file keeps state or acts as it loads, outside a class,** but the worklet processors, which register as they load. No top-level `let`, no instance made, no statement run as it loads; a lookup made once and typed read-only passes.
- **Only the builder makes Web Audio nodes** (`modular-audio/build/web-audio/`), from a plan, so a sound is data until it's built.
- **One order inside every file:** imports, types, constants, state, functions and classes, what runs as it loads; each helper below its first caller; every top-level function a `function` declaration.
- **Readable, not terse:** names from the domain, no single letters but `t` (a clock time), `x`, `z` (on the floor) and `i` (a 16th's number) in short scopes; if/else and early returns over ternaries, a ternary only to pick between two short values, never chained or nested. No top-level name under 3 characters but `dt`, `dB`, `UI`, `at`, `fm`, `on`, `up`.
- **One source of time:** everything asks the clock (`sequencing/clock/`).
- **Logic that doesn't need the DOM or Web Audio stays free of them,** so it runs and is tested in node; I/O and validation are at the edges.
- **Comments say why,** in short plain sentences, one idea a line, under about 90 characters.
- **American spelling in prose, code, YAML and names.**
- **A test file run by hand runs with its memory capped,** `node node_modules/ts-code-checks/tools/memory-capped.js 1500M node --import ./tools/yaml-hooks.js --test <file>`, capped and with the YAML hooks as `make test-unit` runs them, which caps eight files at a time at 4G: a failing assertion printing a big value can run the machine out of memory. A Claude Code hook (`.claude/settings.json`) refuses `node --test` run without it.
- **Test vectors are recorded on purpose:** `test-vectors/`, written by `tools/make-*-vectors.js` from the libraries alone; a change in them is a change in behavior, written again only on purpose.

## Commits

How commits are labeled and logged, and the hook that fills in their hashes, are in [`.githooks/rule-based-commit-logging/`](.githooks/rule-based-commit-logging/claude-rule.md): once per clone, `git config core.hooksPath .githooks`.

@.githooks/rule-based-commit-logging/claude-rule.md
