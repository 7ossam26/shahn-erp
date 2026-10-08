# Repository instructions

## Phase execution and Git workflow

Owner instruction, 2026-10-05: execute each selected plan/phase directly on `main` in this checkout. Do not create a feature branch or a worktree for phase work. Execute one phase at a time.

Read `phases/EXECUTION-CONTRACT.md` and the selected phase before editing. Follow its Git workflow for checking/synchronizing `main`, preserving owner changes, verification, commit and push.

After the phase is complete and all required checks and acceptance gates pass, stage only its implementation and evidence, commit with the phase number (`phase 14: <summary>` for P14), then push `main` to the existing `origin`. This is standing authorization; do not ask again for commit/push approval. A required failed, skipped, unavailable or blocked check prevents the completion commit and push. Preserve the work and report the blocker instead of claiming success.

Do not force-push, discard existing work, publish unrelated changes or automatically start another phase. Report the actual commit hash and push result. Historical execution records describe earlier runs; their branch choices and lack of commit authorization do not override this instruction.

Owner exception, 2026-10-08: verified ERP implementation commits may proceed with explicitly named Tawsel acceptance deferred, as recorded in `phases/EXECUTION-CONTRACT.md`. Every ERP-owned check and available independent live check must still pass. Keep the pending Tawsel gates and later closure evidence in the single `TAWSEL-CHANGE-REQUESTS.md` handoff; no full integration-readiness claim or implicit Tawsel edit. Stop after the selected phase.
