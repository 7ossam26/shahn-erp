# P10 runtime and artifact identities

Observed 2026-10-04: Node24.21.0, npm12.2.0, native PostgreSQL18.3, pinned workspace packages. No dependency/lockfile upgrades. PostgreSQL uses committed disposable clusters with fsync and synchronous_commit enabled; Docker18.6 belongs to earlier P01 evidence.

Actual deployed model/effort is not exposed by execution metadata; GPT-6/Codex is the session identification. The selected phase recommends gpt-6.1-sol/high; no model switch/subagents were used.

| Artifact | SHA256 |
| --- | --- |
| package-lock.json | 40864d48391bac2560e4f52fed913d4e488673199e4a2c9fd6bb9a331e2d5445 |
| ui-preview/package-lock.json | b7ab00d5584496d9da3acd4b5bad58bafb69093a2d425062db52e482a3e1758d |
| packages/database/migrations/0013_p09_accounts_expenses.sql | a5de87bdb2e5c8daec8d90876e8c6dbf3877b80fff41ff7bb003801e0ff08e42 |
| packages/database/migrations/0014_p10_treasury_transfers.sql | 46138bed504cfa10789bca8bb3a562e84e2643a266bde1b60306fa9fee2b7fe7 |
| packages/contracts/openapi.json | 58b235382f572c7e0490d55c328527b69c67353424db2ce302493af32ccfab5b |
| phases/10-treasury-transfers.md | 165d5bbac94f13a330227cffa6cfc64f000e1d0b9c681ff9dcfbe98eccecf7bb |
