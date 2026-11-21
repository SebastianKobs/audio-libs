# Technical log

A record of the libraries' changes: a change, its tests, its tooling and setup, and fixes to existing behavior. Newest first.

Sources: **Plan** = from the plan of the project it came from (Stim Garden's `mockup/architecture/plan.md`, ADD6c1). **Request** = the user asked for it. **Default** = a starting value chosen while building.
Files: by path from the repo root.
Commits: the labels and their logs are in `.githooks/rule-based-commit-logging/labels.yml`, the entry form and the hash rule in `.githooks/rule-based-commit-logging/claude-rule.md`.

---

## 2026-11-21

- `695034c` TECHNICAL: **Mounted in a project, nothing is installed here: Node and npx find the tools in the project's `node_modules/`, and the Makefile finds `ts-code-checks` as Node finds a package;** a second install in the mount was a copy of the project's, 119 MB. *(Source: Request: "do option 2", then option 1 chosen)* Files: `Makefile`, `README.md`, `CLAUDE.md`
- `12e5fd4` TECHNICAL: **a library README's shape stated whole in `CLAUDE.md`, the rule moved here from Stim Garden's, which points at it;** one fact, one home, and its script is here *(Request: "move the rule")* Files: `CLAUDE.md`
- `0122cbf` TECHNICAL: **ADD6d: the README says how to work on the libraries mounted in a project: the mount's hook set once per clone, its own checks run there, the project's pin moved after;** the first commit made through the mount in Stim Garden, at `mockup/src/libs/`, its entry filled by this repo's own hook. *(Source: Plan, ADD6d)* Files: `README.md`, `technical-log.md`
- `3af60be` TECHNICAL: **ADD6c2: the docs and comments written from audio-libs' root, its docs rules passing: the paths, the README's shape, the exports both ways, the dependency line, the spelling;** a library's docs name no path of the project it grew in, each pointer at a Stim Garden doc settled by its fact moved into a README or dropped, the root README saying how to use and test them. *(Source: Plan, ADD6c2)* Files: `test/unit/docs-rules.test.js`, `README.md`, `CLAUDE.md`, the READMEs and comments that named `libs/` or `mockup/` paths, `technical-log.md`
- `eadeb7b` TECHNICAL: **ADD6c1b: pinned to ts-code-checks' ADD6a3 commit, the file names check reading the whole repo with the scope `''`, its reading group by group gone;** the check names a misnamed file at any depth, and the group list isn't kept twice. *(Source: Plan, ADD6c1b)* Files: `package.json`, `package-lock.json`, `test/unit/file-names.test.js`, `technical-log.md`
- `b66c125` TECHNICAL: **ADD6c1: audio-libs made, the libraries' history carried over by `git filter-repo` from Stim Garden's `mockup/src/libs/`, with its tooling, its tests across libraries and its vectors, its own `make test-unit` passing alone but the docs rules;** the libraries move into a project of their own, each user mounting or copying them. *(Source: Plan, ADD6c1)* Files: `package.json`, `Makefile`, `tsconfig.json`, `.oxlintrc.json`, `.prettierrc.json`, `.prettierignore`, `knip.json`, `.gitignore`, `.claude/settings.json`, `.githooks/`, `CLAUDE.md`, `technical-log.md`, `tools/`, `types/`, `test/`, `test-vectors/`, `sequencing/clock/test/clock.test.js`, `spatial/gestures/test/gesture-tracker.test.js`, `spatial/hearing/test/hearing.test.js`
