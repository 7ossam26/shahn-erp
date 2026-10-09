# P10 evidence commit and main history audit — 2026-10-09

Owner request: commit the 14 pending P10 evidence files and ensure phases P01–P24 are on main. This is an evidence/history reconciliation, not implementation of another phase or a claim that all phase acceptance gates are closed.

The editor checkout started on codex/p10-treasury-transfers at df5b30005a86a8ff844648b33cb20bb790012bb5, with 13 modified P10 artifacts and untracked 34-reverification-phase.txt. The chat checkout was clean and detached at 21960c6da73b059cdca42b1eabdf3531ba46daa5. After fetching origin, origin/main already contained the full P01–P24 implementation history. Local main was behind only and was advanced using `git fetch origin main:main`; the editor checkout then switched safely to main with all pending files preserved. No feature branch, new worktree, merge, reset, stash or history rewrite was needed.

[History audit](p01-p24-main-audit-20261009.json) records the actual commit for each phase, verified ancestry in origin/main, execution-record presence and registered suite presence. The existing P03/P08, P09 and P10/P13 feature-branch tips are also ancestors of main. These checks establish Git inclusion; the other 23 phase suites were not rerun for this evidence-only change. Existing acceptance limitations remain in IMPLEMENTATION-STATUS.md and the single TAWSEL-CHANGE-REQUESTS.md handoff. In particular, the historical P16 commit subject says “not complete”; inclusion does not erase that qualification.

Pinned Node 24.21.0/npm 12.2.0 were selected through scripts/use-pinned-runtime.ps1. `npm ci` succeeded without changing the lockfile; npm reported two moderate advisories. Dependencies were not upgraded. Native PostgreSQL 18.3 was explicitly selected with SHAHN_TEST_PG_BIN=C:/Program Files/PostgreSQL/18/bin; tests created their own disposable databases.

| Check on main at 21960c6 | Result | Evidence |
| --- | --- | --- |
| npm run lint | Passed | [lint.txt](lint.txt) |
| npm run typecheck | Passed | [typecheck.txt](typecheck.txt) |
| npm run build | Passed; existing bundle-size warning retained | [build.txt](build.txt) |
| npm run test:phase -- P10 | 16 unit, 22 PostgreSQL/API/process, 6 browser tests passed; no skips | [phase.txt](phase.txt) |

P10 public integration is explicitly inapplicable: treasury transfers record local staff assertions and do not call bank or Tawsel APIs. No external gate was substituted with a mock.

The pending October 4 evidence is retained at its original P10 paths, including 34-reverification-phase.txt. The new run's changed generated files are retained separately under artifacts/. Files unchanged by the new run remain available at their original paths. [Preservation manifest](preserved-earlier-artifacts.json) lists files restored byte-for-byte from the pre-run backup after capturing the new output. Earlier failures and 33-final-consistency.json remain historical evidence for their original runs; their timestamps and hashes are not relabelled as current verification. Raw console logs are retained locally under ignored .tools/p10-main-checks-20261009; committed copies only normalize trailing whitespace.

The session identifies Codex/GPT-6; exact deployed model/effort is not exposed and is not inferred. No subagents were used. No implementation, migrations, production service, Tawsel code or deployment was changed. The actual final commit hash and verified push result are reported in chat to avoid a recursive bookkeeping commit.
