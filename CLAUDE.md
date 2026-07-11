# CLAUDE.md — k3s-pi5

> This file orients AI agents working in this repo: what the project is, where the
> sharp edges are, and how the developer wants to fly. It is a light marker, read at
> the start of every session — keep it short, point to deeper docs, never duplicate them.
>
> *The destination is never the code. Code is the idea made visible — the becoming,
> not the being. When the particulars disagree, climb: steer by the idea, and the
> idea decides.*

## Project: k3s-pi5

A browser-based, self-paced DevOps curriculum — an interactive command reference that
walks from a bare laptop to Kubernetes on a Raspberry Pi 5. Live at
[baiganio.github.io/k3s-pi5](https://baiganio.github.io/k3s-pi5/), repo at
[BaiGanio/k3s-pi5](https://github.com/BaiGanio/k3s-pi5).

The eidos: **the walking is the portfolio.** Self-built, free tools, owned hardware;
building a thing and documenting it are the same act. Every module carries the raw
command, a breakdown of every flag, the expected output, and a "why" — when a change
trades polish against that explanatory depth, depth wins.

## Co-pilot Contract

How the developer wants to work with an AI agent in this repo:

- **Act freely** in `modules/**` data files and `lib/registry.js` entries. **Ask first**
  before restructuring the renderer (`lib/index.js`), the shell (`lib/playground.js`,
  `index.html`), or the CSS token layer.
- **Never rewrite the README reference architecture or the `roadmap/` narrative without
  confirmation** — they are the canon the modules orbit; tone and framing are deliberate.
- **"Done" means verified in the browser**: serve the site locally, confirm the module
  appears in the sidebar and navbar, renders all its blocks, and search / filters /
  copy buttons / dark-light theme all still work. There is no test suite to hide behind.
- Terse expert mode. Explain only what is surprising.

## Quick Start

```bash
git clone https://github.com/BaiGanio/k3s-pi5.git
cd k3s-pi5
python3 -m http.server 8000   # then open http://localhost:8000
```

No install, no build, no dependencies. Push to `master` → GitHub Pages redeploys.

Key commands: `python3 -m http.server 8000` (run) · browser click-through (test).

## Tech Stack

- **Runtime**: Browser-only vanilla JavaScript — plain `<script>` tags and globals, no
  ES modules, no bundler, no `package.json`
- **Framework**: Bootstrap 5.3 + Bootstrap Icons via CDN; Inter / JetBrains Mono via
  Google Fonts
- **Database**: None — static site (the PostgreSQL in the README is teaching content,
  not infrastructure)
- **Testing**: None — manual browser verification; no CI
- **Hosting**: GitHub Pages, served from `master`

## Configuration

There is no env/flag configuration. The single source of truth is `MODULE_REGISTRY` in
`lib/registry.js` — the only file you edit to add a module (its header comment is the
how-to). UI state persists in `sessionStorage` (`sidebar-collapsed-groups`,
`welcome-collapsed-groups`).

Critical settings:
- `MODULE_REGISTRY[].modules[].script` — path to the module data file; a typo means the
  module silently fails to load
- `MODULE_REGISTRY[].modules[].id` — must be unique across all groups; used for routing

## Database

None. The schema in `README.md` belongs to the Rick & Morty reference architecture that
the curriculum teaches — do not "implement" it here.

## Fragile / No-Touch Zones

- `lib/index.js` — the block renderer. Supports **two** module data formats
  (`window.pageBlocks` typed blocks, and legacy flat `window.commandData` which gets
  auto-wrapped). Renaming any data field breaks dozens of modules with no error.
  Verify by loading one legacy module (e.g. Docker intro) and one block-based module.
- `lib/playground.js` — sidebar, routing, theme toggle, mobile overlay. Bound to exact
  DOM ids in `index.html` (`sidebar-nav`, `commandList`, `searchInput`, …).
- `styles/index.css` — design tokens; the other three stylesheets read only from these
  variables. Change tokens, check both themes.

## Module Coupling Map

| Coupling | Why |
|----------|-----|
| `lib/registry.js` ↔ `modules/**/*.js` | Registry `script` paths load module files by injection; each file must set `window.pageBlocks` or `window.commandData` |
| `lib/index.js` ↔ module data shape | Renderer expects exact fields (`command`, `parts[].text/.explanation`, `example`, `why`, `searchTerms`); a missing field breaks that accordion |
| `index.html` ↔ `lib/*.js` | `getElementById` contracts — renaming an id in one without the other kills the page silently |
| `styles/index.css` ↔ other stylesheets | All components read the token variables defined there |

## Security Model

- No auth, no secrets, no server — public static site.
- Module content is trusted authored HTML rendered via `innerHTML` by design;
  `escapeHtml()` covers command/example text. Never pipe untrusted input into module data.
- Never commit real credentials into lab examples. (A committed EC2 key pair was removed
  in July 2026 — it survives in git history, so treat that key as burned.)

## Code Conventions

- Plain browser JS, 2-space indent, no lint/format tooling — match surrounding style.
- Section banner comments: `// ── Title ────…` — keep them; they're the navigation.
- New modules prefer `window.pageBlocks` (typed `prose | note | commands` blocks);
  `window.commandData` is legacy, supported but not for new work.
- Every command entry is complete or it isn't done: unique `id`, `section`/`sectionTitle`,
  `commandTitle`, `command`, `searchTerms`, `description`, `parts` (each with
  `explanation`), realistic `example` output, and a `why`. The "why" is the product.
- HTML is allowed inside `description`/prose strings (rendered via `innerHTML`).

## Contribution Conventions

### Branch naming
AI agent commits: `type: <description> signed by <model-name>`. Humans: same prefix, no signature.
Types: `feature:`, `fix:`, `refactor:`, `chore:`.

### Commit messages
[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`.
Types: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.

### Changelog & versioning
No `CHANGELOG.md` or version files yet — the README's **Project Status tracker** is the
authoritative record of what's done vs. planned. Keep it in sync with reality. If a
changelog is introduced later, follow [Keep a Changelog](https://keepachangelog.com/)
and [SemVer](https://semver.org/).

## Plans

When asked to write or design a plan — architecture, feature design, migration strategy,
refactor roadmap — produce a plan document at `trash/plans/<slug>.md`. Use kebab-case slugs.

### Plan structure
Every plan must include:

1. **Objective** — one sentence: the problem being solved and why it matters
2. **Diagram** — a [Mermaid](https://mermaid.js.org/) diagram showing key components and their
   relationships. Mermaid is text-based, renders on GitHub, and is diffable. For UI mockups,
   generate a PNG and store alongside as `<slug>.png`.

   ```mermaid
   graph TD
       A[Input] --> B[Process]
       B --> C[Output]
   ```

3. **Model recommendation** — which model/provider to use for execution, with rationale.
   See model selection principles below. Include: recommended model, estimated input/output
   tokens, estimated cost, and one-sentence rationale.

4. **Steps** — ordered, each with a concrete acceptance criterion ("works when…"), and a
   reference to the companion test file (`trash/plans/<slug>-tests.md`) where each step's
   tests are defined in detail.

5. **Risks** — what can go wrong, mitigation for each
6. **Doc updates** — which files need changes after implementation (see Documentation Sync)

### TDD — Tests First

Every plan MUST have a companion test file at `trash/plans/<slug>-tests.md`, produced
alongside the plan itself. When the plan is executed, the verification criteria defined
in the test file are validated **before** the implementation is considered complete —
verify-first, not verify-after.

Tests adapt to the plan's domain — "test" means "provable criterion that the work is done
right." The structure is universal; the content is domain-specific:

| Plan domain | What a "test" means |
|-------------|---------------------|
| Software feature | Code test (unit, integration, e2e, contract) |
| Engineering (e.g., water mill) | Physical criterion (flow rate, RPM, load, tolerances) |
| Business / strategy | Measurable outcome (revenue, conversion, time-to-market) |
| Content / documentation | Review checklist, accuracy checks, style compliance |
| Infrastructure / ops | Health checks, SLO thresholds, chaos-test assertions |

**Test file structure** (`trash/plans/<slug>-tests.md`):

1. **Coverage map** — which plan steps each test group covers, so nothing falls through
   the cracks. Use a simple table:

   | Plan step | Test group | Coverage |
   |-----------|-----------|----------|
   | Step 1    | Unit: …   | …        |
   | Step 2    | …         | …        |

2. **Test cases** — each test case has:
   - **Name** — descriptive, unique across the file
   - **Input / setup** — preconditions, fixtures, mock data, or domain-specific preparation
   - **Expected behavior** — concrete, measurable outcome; avoid "should work"
   - **Assertions** — the specific checks that must pass (code assertions, physical
     measurements, financial targets — whatever the domain demands)
   - **Edge cases** — boundary conditions, failure modes, edge inputs, worst-case scenarios

3. **Test execution order** — dependencies between test groups. Tests within a group
   are independent; groups may depend on earlier groups.

4. **Diagrams** (optional) — if a test scenario involves data flow, state transitions,
   or component interactions that are easier to see than read, include a Mermaid diagram.

5. **Required setup** — any fixtures, tools, environment, migrations, config, or seed
   data needed before the test suite can run.

When a plan is executed:
1. Read the companion test file first
2. Prepare the verification criteria and confirm the current state does **not** satisfy
   them — red means the test file has teeth (for code: write stubs and watch them fail;
   for engineering: measure the current output against the target)
3. Implement the plan steps until all criteria are met (green)
4. Update the test file if discoveries during implementation change the expected outcome
5. Confirm the coverage map still holds — no orphaned plan steps, no untested paths

### Model selection
Right-size the model to the task. A typo fix does not need a frontier model. A security
audit does not belong on a 7B local model. Default priority:

1. **Local first** — no local model is configured yet; when one lands (e.g. Ollama on
   the M1 Pro), route code edits, file ops, and structured reasoning there. Zero API cost.
2. **Cheapest capable cloud** — Claude Sonnet for reasoning-heavy work (module authoring,
   refactors), Claude Haiku for throughput (bulk data-file edits, format conversions).
3. **Precision-critical only** — Claude Opus / Fable when instruction-following is
   paramount (renderer changes, security-sensitive review).

## Documentation Sync

After any change that alters behavior, adds a feature, fixes a security issue,
or changes configuration, check whether these files need updates:

| Change type | Files to update |
|-------------|-----------------|
| New module / group | `lib/registry.js`, README curriculum table & Status tracker |
| Curriculum progress (item done/planned) | README Project Status tracker, `roadmap/` phase file |
| Reference architecture change | `README.md` |
| Roadmap / phase change | `roadmap/roadmap.md` + the affected `phase-*.md` |

**Always confirm with the developer before writing doc updates.** State which files need
changes and why. Wait for confirmation. Never silently modify documentation.

After a commit, push, or release, re-check this table and offer to update any stale docs.

## Reference Files

Deep-dive docs live here — read on demand, not every turn:

| Topic | File |
|-------|------|
| Reference architecture (Rick & Morty 3-service app) | `README.md` |
| Curriculum map & rules of the road | `roadmap/roadmap.md` |
| Phase deep-dives | `roadmap/phase-1…4-*.md` |
| Homelab hardware guide | `roadmap/homelab-guide.md` |
| How to add a module | `lib/registry.js` (header comment) |
| Exam-prep scratch (not curriculum) | `notes/exam0/` |
| Vagrant VM scratch (not curriculum) | `planets-dev/` |

## Maintaining This File

This file is a marker, not a manual. Any agent reading it: if a claim here no longer
matches the repo, say so — a stale briefing is worse than none. Keep updates surgical:
fix the pointer, don't grow the prose. When something new deserves depth, it goes in a
reference file and earns one line here.

The unexamined briefing is not worth loading. *(Apology 38a, adjusted for context windows.)*
