# P01 version manifest

Checked 2026-10-03, Africa/Cairo. All direct dependencies use exact stable versions; the root lockfile pins transitives with integrity hashes. The prototype is preserved and excluded from the production workspaces.

| Runtime | Selected / observed |
| --- | --- |
| Node LTS | **24.21.0**, Krypton; official distribution date 2026-09-07 |
| npm | **12.2.0**; compatible engine includes Node >=24.15.0 |
| PostgreSQL | **18.6**, supported stable major 18 |
| Database image | `postgres:18.6-bookworm@sha256:3725f4e2499eef5134592b3b4ab79a543ed7f8e533b05b5b637af926630f6650` |
| Docker engine | **29.7.2**, Linux/amd64 via Docker Desktop **4.88.1 (237512)** |
| Original PATH runtime | Node **24.19.0**, npm **11.1.0**; retained unchanged |
| Local isolated runtime | `.tools/runtime/node-v24.21.0-win-x64` and `.tools/npm`; terminal-only selection helper |

Official Node ZIP SHA256 verified against SHASUMS256.txt: `158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541`. Node's bundled npm was 11.19.0; npm 12.2.0 was installed only in the ignored local tool directory. No global runtime/config was changed.

## Direct dependency pins

| Package | Version |
| --- | --- |
| `typescript` | `6.0.3` |
| `vite` | `8.3.2` |
| `@vitejs/plugin-react` | `6.1.1` |
| `react` | `19.3.0` |
| `react-dom` | `19.3.0` |
| `@nestjs/common` | `12.1.2` |
| `@nestjs/core` | `12.1.2` |
| `@nestjs/platform-fastify` | `12.1.2` |
| `fastify` | `5.12.5` |
| `pg` | `8.23.1` |
| `@types/pg` | `8.23.1` |
| `@types/node` | `24.19.1` |
| `@types/react` | `19.3.0` |
| `@types/react-dom` | `19.3.0` |
| `reflect-metadata` | `0.2.2` |
| `rxjs` | `7.8.2` |
| `vitest` | `5.0.3` |
| `@playwright/test` | `1.63.0` |
| `@testing-library/react` | `16.3.3` |
| `@testing-library/user-event` | `14.6.7` |
| `@testing-library/jest-dom` | `7.0.1` |
| `@testing-library/dom` | `10.4.2` |
| `jsdom` | `30.1.1` |
| `react-router-dom` | `7.18.4` |
| `@tanstack/react-query` | `5.104.1` |
| `react-hook-form` | `7.89.0` |
| `ajv` | `8.20.0` |
| `ajv-formats` | `3.0.1` |
| `@fontsource-variable/cairo` | `5.3.0` |
| `radix-ui` | `1.6.7` |
| `@radix-ui/react-slot` | `1.3.3` |
| `class-variance-authority` | `0.7.1` |
| `clsx` | `2.1.1` |
| `lucide-react` | `1.51.0` |
| `motion` | `14.0.0` |
| `tailwind-merge` | `3.7.0` |
| `tailwindcss` | `4.3.3` |
| `@tailwindcss/vite` | `4.3.3` |
| `tw-animate-css` | `1.4.0` |
| `eslint` | `10.12.0` |
| `typescript-eslint` | `8.71.0` |
| `eslint-plugin-react-hooks` | `7.1.1` |
| `prettier` | `3.9.9` |
| `tsx` | `4.23.15` |

Workspace package links use exact internal `0.1.0` dependencies and declared public exports. There are no private relative cross-package source imports, path aliases substituting for dependencies, ORM, Redis or SaaS dependencies.

The inspected latest stable TypeScript was 7.0.2, outside typescript-eslint 8.71.0's supported peer range (>=4.8.4 <6.1.0). The final selected **6.0.3** is the highest checked stable release in that compatible major range; it passed the complete workspace compiler/build/lint. Initial 5.9.3 diagnostics were retained before that final selection. React 19.3.0, Vite 8.3.2/plugin-react 6.1.1, Tailwind 4.3.3, Radix 1.6.7 and Motion 14.0.0 match the prototype's compatible family; Nest packages share exact 12.1.2 and Fastify is 5.12.5. No prerelease was selected.

## Release / compatibility evidence

- [Node release policy](https://nodejs.org/en/about/previous-releases), [exact Node distribution](https://nodejs.org/dist/v24.21.0/) and [official checksums](https://nodejs.org/dist/v24.21.0/SHASUMS256.txt). The current release index and archive checksum were actually fetched.
- [PostgreSQL support/version policy](https://www.postgresql.org/support/versioning/) and the actual official-image pull/RepoDigest in [prerequisites](00-prerequisites.txt). Tests query a real PostgreSQL server; no SQLite/memory substitution.
- [Nest Fastify adapter](https://docs.nestjs.com/techniques/performance) and [Nest migration guidance](https://docs.nestjs.com/migration-guide); adapter/framework peer versions were checked in registry metadata and the actual processes were exercised.
- [shadcn React 19/Tailwind support](https://ui.shadcn.com/docs/react-19), [RTL guidance](https://ui.shadcn.com/docs/rtl), [Smooth button documentation](https://smoothui.dev/docs/components/smooth-button) and [official registry source](https://smoothui.dev/r/smooth-button.json). The retained reviewed source was adapted only for package imports; original licenses and provenance remain in packages/ui.
- [Vite runtime requirements](https://vite.dev/guide/), [React Router Data Mode](https://reactrouter.com/start/data/installation), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) and [Rolldown chunk execution order](https://rolldown.rs/reference/OutputOptions.codeSplitting). Production vendor splitting explicitly preserves execution order, and production rendering is a browser assertion.
- The React Hook Form web-document fetch failed in the first check; its exact official-registry version/React peer metadata was verified, and the connected actual form tests pass. No unsupported compatibility claim relies on that failed page.
- [Package metadata probes](version-probes.json) record selected version, engines, peers and integrity for each exact official registry package. [Prototype lock review](prototype-lock-review.json) records the existing lock's actual versions. npm 12 permits only the pinned esbuild postinstall through root allowScripts; no blanket install-script bypass.

## Artifact identities

| Artifact | SHA256 |
| --- | --- |
| Root package-lock.json | `f3a6808c553059748ca0726821b4ac0952f6247bc7a9cf6134cdfcecb8e2f95e` |
| Preserved prototype lock | `87de7e105abe4638fe1d7c2c74d31635589ccd2f5caa57b3c3c9add804ba0323` |
| Initial infrastructure migration | `76e06daf1100a47ac61387f39e1563fe4ad84fb90d1327dcad212c268a354c4e` |
| Extracted Smooth button (after import/format adaptation) | `b2fd02afe662a394e14b11c7cf9d20e82b49dd250f337a5e2cd17b66db2e8219` |

The prototype notices' original hashes identify their historical source bytes; the extracted file has its own identity above. No new palette approval, performance guarantee, production deployment, backup or external connector conformance is implied by a version pin.

## P08 reuse — 2026-10-04

P08 reuses the existing exact workspace dependency pins and unchanged root lockfile. Actual terminal runtime is Node24.21.0/npm12.2.0; isolated native test databases are PostgreSQL18.3 on this Windows host, distinct from P01's Docker18.6 evidence. Additive migration0012 uses the server's bundled `btree_gist` extension for effective interval exclusions. Shared workspace exports and generated OpenAPI were extended; no external dependency was installed/upgraded. [P08 verification](../P08/README.md) records observed tests and pending external mapping.

## P09 reuse — 2026-10-04

P09 uses the unchanged external dependency pins/root lockfile, Node24.21.0/npm12.2.0 and disposable native PostgreSQL18.3. Migration0013 is additive to the actual0012 employee schema and extends the existing P04 catalog. No new runtime library, provider integration or global package upgrade was installed. [P09 evidence](../P09/README.md) separates real local PostgreSQL/API/process/browser verification from pending customer issuer/device/production work.

## P10 reuse — 2026-10-04

P10 retains all exact dependency pins and the root/prototype lockfiles. Actual runtime is Node24.21.0/npm12.2.0 and disposable native PostgreSQL18.3. Additive0014 extends P09 finance with source-linked treasury transit and safe full receipt. No runtime library, bank provider or package upgrade was installed. [P10 identities/evidence](../P10/VERSIONS.md) distinguish local fixture verification from customer issuer, owner/device and production acceptance.
