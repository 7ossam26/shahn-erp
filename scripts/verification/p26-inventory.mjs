import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

// Structural inventory only. File presence and historical labels never prove acceptance.
const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const present = (path) => existsSync(resolve(root, path));
const rows = (path) => {
  let section = '';
  return read(path)
    .split(/\r?\n/)
    .flatMap((line, index) => {
      if (line.startsWith('## ')) section = line;
      return line.startsWith('|')
        ? [
            {
              line: index + 1,
              section,
              cells: line
                .slice(1, line.lastIndexOf('|'))
                .split('|')
                .map((c) => c.trim()),
            },
          ]
        : [];
    });
};
const phasesIn = (value) => [...new Set(value.match(/\bP\d{2}\b/g) ?? [])];
const write = (path, value) => {
  mkdirSync(dirname(resolve(root, path)), { recursive: true });
  writeFileSync(resolve(root, path), value);
};
const registry = json('scripts/phase-suites.json');
const manifest = json('phases/phase-manifest.json');
const assignments = json('phases/requirement-phase-map.json');
const gaps = [];
const addGap = (id, owner, observed, closure) => gaps.push({ id, owner, observed, closure });
const fileInventory = (path) => {
  const bytes = readFileSync(resolve(root, path));
  return { path, bytes: bytes.length, sha256: sha256(bytes) };
};
const committedFileInventory = (path) => {
  const bytes = execFileSync('git', ['show', `HEAD:${path}`], { cwd: root, maxBuffer: 2000000 });
  return { path, bytes: bytes.length, sha256: sha256(bytes) };
};
const phaseRecords = manifest.phases.map((phase) => {
  const path = `phases/execution/${phase.id}.md`;
  const source = read(path);
  const layers = Object.entries(registry[phase.id] ?? {}).map(([layer, definition]) => {
    if (definition.deferred || definition.applicable === false)
      return { layer, definition, executedByInventory: false };
    const files = present(definition.directory)
      ? readdirSync(resolve(root, definition.directory), { recursive: true })
          .filter((file) => typeof file === 'string')
          .map((file) => definition.directory + '/' + file.replaceAll('\\', '/'))
          .filter(
            (file) =>
              file.includes(definition.extension) &&
              /\.(ts|tsx|mjs)$/.test(file) &&
              (!definition.filter || definition.filter.includes(file)),
          )
          .sort()
      : [];
    if (!files.length)
      addGap(
        `${phase.id}:${layer}:NO_FILES`,
        'ERP test maintainer',
        'No registered files found',
        path,
      );
    return { layer, definition, files, executedByInventory: false };
  });
  return {
    id: phase.id,
    record: fileInventory(path),
    recordedOpeningStatus: source.split(/\r?\n/).find((line) => line.startsWith('Prompt:')) ?? null,
    historicalLimitExcerpts: source
      .split(/\r?\n/)
      .filter((line) => /blocked|unrun|unavailable|skipped|pending/i.test(line))
      .slice(0, 6),
    layers,
    currentAcceptance: 'not reverified by inventory',
  };
});
const evidenceFor = (owners) =>
  owners.map((id) => ({
    phase: id,
    execution: `phases/execution/${id}.md`,
    traceability: present(`docs/verification/${id}/TRACEABILITY.md`)
      ? `docs/verification/${id}/TRACEABILITY.md`
      : null,
    suiteRegistered: Object.hasOwn(registry, id),
    meaning: 'candidate historical owner evidence; no row-level behavioral pass inferred',
  }));
const matrix = rows('REQUIREMENTS-TRACEABILITY.md').flatMap(({ line, cells }) => {
  const id = cells[0]?.match(/ERP-[RD]-\d{3}/)?.[0];
  if (!id) return [];
  const owners = phasesIn(cells.at(-1));
  const mapped = assignments[id.startsWith('ERP-R-') ? 'requirements' : 'decisions'][id] ?? [];
  if (JSON.stringify([...owners].sort()) !== JSON.stringify([...mapped].sort()))
    addGap(
      `${id}:OWNERSHIP_MISMATCH`,
      'ERP planning maintainer',
      `${owners} versus ${mapped}`,
      `REQUIREMENTS-TRACEABILITY.md:${line}`,
    );
  return [
    {
      id,
      source: `REQUIREMENTS-TRACEABILITY.md:${line}`,
      sourceCells: cells,
      recordedScope: cells[1],
      owners,
      evidence: evidenceFor(owners),
      finalPilotResult: 'not run',
      gap: 'P26-FINAL-EVIDENCE-MISSING',
    },
  ];
});
const ownershipRows = rows('phases/PHASE-COVERAGE.md');
const screens = rows('docs/planning/ERP-SCREEN-SPEC.md').flatMap(({ line, cells }) => {
  const id = cells[0]?.match(/^UI-[A-Z-]+-\d{3}/)?.[0];
  if (!id) return [];
  const ownerRow = ownershipRows.find((row) => row.cells[0].includes(id));
  const owners = phasesIn(ownerRow?.cells[2] ?? '');
  if (!owners.length)
    addGap(
      `${id}:NO_OWNER`,
      'ERP UI maintainer',
      'No explicit screen owner',
      `docs/planning/ERP-SCREEN-SPEC.md:${line}`,
    );
  return [
    {
      id,
      source: `docs/planning/ERP-SCREEN-SPEC.md:${line}`,
      sourceCells: cells,
      owners,
      evidence: evidenceFor(owners),
      finalPilotResult: 'not run',
      gap: 'P26-UI-EVIDENCE-MISSING',
    },
  ];
});
const integrationRows = rows('phases/INTEGRATION-PHASE-COVERAGE.md');
const operationRow = ({ cells }) =>
  cells[0] === '`integration.bindSource`' || /^\d+$/.test(cells[0]);
const operations = integrationRows
  .filter((row) => /^## [23]\./.test(row.section) && operationRow(row))
  .map(({ line, cells }) => {
    const bootstrap = cells[0] === '`integration.bindSource`';
    const id = cells[bootstrap ? 0 : 1].replaceAll('`', '');
    const owners = phasesIn(cells[bootstrap ? 1 : 2]);
    return {
      id,
      kind: bootstrap ? 'operator bootstrap' : 'scoped service',
      source: `phases/INTEGRATION-PHASE-COVERAGE.md:${line}`,
      sourceCells: cells,
      owners,
      evidence: evidenceFor(owners),
      finalPilotResult: 'not run',
      gap: 'P26-PUBLIC-EVIDENCE-MISSING',
    };
  });
const events = integrationRows
  .filter((row) => /^## 4\./.test(row.section) && /^\d+$/.test(row.cells[0]))
  .map(({ line, cells }) => {
    const owners = phasesIn(cells[3]);
    return {
      id: cells[1].replaceAll('`', ''),
      source: `phases/INTEGRATION-PHASE-COVERAGE.md:${line}`,
      sourceCells: cells,
      owners,
      evidence: evidenceFor(owners),
      finalPilotResult: 'not run',
      gap: 'P26-PUBLIC-EVIDENCE-MISSING',
    };
  });
const reports = rows('ERP-REPORT-CATALOG.md').flatMap(({ line, cells }) => {
  const id = cells[0]?.match(/REP-\d{2}/)?.[0];
  return id
    ? [
        {
          id,
          source: `ERP-REPORT-CATALOG.md:${line}`,
          sourceCells: cells,
          recordedSelection: cells.at(-1),
          finalPilotResult: 'not run; selected or exclusion parity must be reviewed',
          gap: 'P26-REPORT-EVIDENCE-MISSING',
        },
      ]
    : [];
});
for (const [name, count, expected] of [
  ['requirements', matrix.filter((row) => row.id.startsWith('ERP-R-')).length, 214],
  ['decisions', matrix.filter((row) => row.id.startsWith('ERP-D-')).length, 205],
  ['operations', operations.length, 44],
  ['events', events.length, 27],
  ['reports', reports.length, 28],
]) {
  if (count !== expected)
    addGap(
      `INVENTORY:${name}`,
      'ERP audit maintainer',
      `Found ${count}; expected ${expected}`,
      'Repair source/parser before using inventory',
    );
}
const pin = '32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada';
const baselineRoot = `docs/integration/tawsel-baseline/${pin}`;
const baselineManifest = json(`${baselineRoot}/planning-manifest.json`);
const baseline = baselineManifest.artifacts
  .filter((artifact) => /^0[1-7]-/.test(artifact.path))
  .map((artifact) => {
    const observed = fileInventory(`${baselineRoot}/${artifact.path}`);
    const committed = committedFileInventory(observed.path);
    const matches = observed.bytes === artifact.bytes && observed.sha256 === artifact.sha256;
    const committedMatches =
      committed.bytes === artifact.bytes && committed.sha256 === artifact.sha256;
    if (!matches)
      addGap(
        `BASELINE:${artifact.path}`,
        'ERP integration maintainer',
        `Working bytes ${observed.bytes} differ from manifest ${artifact.bytes}; SHA-256 also differs`,
        'Recover exact publisher bytes only after each original source and full bundle hash match; preserve old observations',
      );
    return {
      ...observed,
      expected: artifact,
      workingBytesMatchManifest: matches,
      committed,
      committedBytesMatchManifest: committedMatches,
      workingLfMatchesCommitted:
        sha256(Buffer.from(read(observed.path).replaceAll('\r\n', '\n'))) === committed.sha256,
    };
  });
if (baseline.length !== 7 || baselineManifest.sourceCommit !== pin)
  addGap(
    'BASELINE:IDENTITY',
    'ERP integration maintainer',
    'Expected seven attachments under the selected commit',
    'Investigate retained baseline',
  );
const retainedManifest = fileInventory(`${baselineRoot}/planning-manifest.json`);
const committedManifest = committedFileInventory(retainedManifest.path);
if (committedManifest.sha256 !== '07a6a87a4a7b9720b6310a1dea2f66609a81de7a64237d653b37b74fe8a9a6d9')
  addGap(
    'BASELINE:MANIFEST',
    'ERP integration maintainer',
    'Committed manifest digest differs from adopted pin',
    'Investigate retained baseline',
  );
const migrations = readdirSync(resolve(root, 'packages/database/migrations'))
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => fileInventory(`packages/database/migrations/${file}`));
const requiredReading = [
  'master-plan.md',
  'docs/planning/ERP-DOMAIN-SPEC.md',
  'docs/planning/ERP-DATA-AND-TRANSACTIONS.md',
  'docs/planning/ERP-SCREEN-SPEC.md',
  'docs/planning/ERP-ARCHITECTURE-AND-OPERATIONS.md',
  'ERP-TAWSEL-INTEGRATION-PLAN.md',
  'docs/planning/INTEGRATION-CONTRACT-COVERAGE.md',
  'phases/README.md',
  'phases/EXECUTION-CONTRACT.md',
  'ERP-REPORT-CATALOG.md',
  'TAWSEL-BASELINE.md',
  'INTEGRATION-CHANGELOG.md',
  'TAWSEL-CHANGE-REQUESTS.md',
  'docs/verification/P25/VERSIONS.md',
  '.gitattributes',
  'docs/verification/P26/live-host-access.json',
  'docs/verification/P26/baseline-restoration.json',
  'docs/verification/P26/LIVE-SETUP-REVIEW.md',
  'docs/verification/P26/READINESS.md',
  'docs/verification/P26/live/release-acceptance.json',
  'docs/verification/P26/live/pilot-versions.json',
  'docs/verification/P26/live/issuer-login.json',
  'docs/verification/P26/live/public-link.json',
  'docs/verification/P26/live/callback-restoration.json',
  'scripts/verification/p26-edge.mjs',
  'docs/verification/P26/live/edge-admission.json',
  'scripts/verification/p26-seed.mjs',
  'scripts/verification/p26-login.mjs',
  'scripts/verification/p26-release.mjs',
  'scripts/verification/p26-link.mjs',
  'apps/api/src/modules/access/config.ts',
  'tests/integration/p26/issuer-config.unit.test.ts',
];
addGap(
  'P26-ENVIRONMENT',
  'ERP deployment and Tawsel test operators',
  'Isolated ERP/PG/client and4 real logins verified; shared test callback restored/disabled. Support MFA, operational driver terms and human execution sessions remain absent. See live evidence',
  'Complete support/driver/business fixture after material P25 prerequisites; reactivate scoped callback only with guaranteed restoration',
);
addGap(
  'P25-OPERATIONS',
  'ERP deployment maintainer',
  'Fresh required operations suite fails all five gates; see transcripts/p25-prerequisite-operations.txt',
  'Complete clean release, queued upgrade, live restore, capacity and second-layout collectors',
);
addGap(
  'P22-LIVE',
  'Tawsel test operator and ERP integration maintainer',
  'Fresh public suite fails eight cases; see transcripts/p22-prerequisite-public.txt',
  'Renew the approved dedicated trial and run actual public assertions',
);
addGap(
  'P26-FINAL-EVIDENCE-MISSING',
  'ERP pilot maintainer',
  'Access-v1 exists without business effects; complete shared business seed, ten connected journeys and registered end-to-end suite remain absent',
  'Implement fixture and connected assertions after material prerequisites pass',
);
addGap(
  'P26-UI-EVIDENCE-MISSING',
  'ERP pilot maintainer and owner',
  'Access-only home browser captures exist; full keyboard/business/error-state comparison and physical phone trial absent',
  'Run complete connected UI matrix; label emulation separately from physical trial',
);
addGap(
  'P26-PUBLIC-EVIDENCE-MISSING',
  'ERP integration maintainer and Tawsel operator',
  'Fresh3 branch provisions/key/webhook commands and4 signed receipts exist; appliedThrough0 and complete44-operation/27-event coverage absent',
  'Close per-row authority/rejection/recovery evidence; named reviewed gates remain in TAWSEL-CHANGE-REQUESTS.md',
);
addGap(
  'P26-REPORT-EVIDENCE-MISSING',
  'ERP reporting maintainer',
  'No common P26 snapshot screen/XLSX/PDF comparison',
  'Run selected report and exclusion assertions with authorized identical snapshot',
);
const inventory = {
  revision: 'P26-INVENTORY-001',
  businessDate: '2026-10-09',
  generatedAt: new Date().toISOString(),
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  boundary:
    'Structural source and registered-file inventory. No suite or endpoint is executed by this script. No behavioral or readiness pass inferred.',
  counts: {
    requirements: matrix.filter((row) => row.id.startsWith('ERP-R-')).length,
    decisions: matrix.filter((row) => row.id.startsWith('ERP-D-')).length,
    screens: screens.length,
    operations: operations.length,
    events: events.length,
    reports: reports.length,
  },
  sourceFiles: requiredReading.map(fileInventory),
  baseline: {
    pin,
    manifest: retainedManifest,
    committedManifest,
    attachments: baseline,
    runtimeIdentity:
      'Observed deployed image in live-host-access.json; source commit not reattested by image metadata',
  },
  versions: {
    node: process.version,
    declaredEngines: json('package.json').engines,
    lockfile: fileInventory('package-lock.json'),
    deploymentVersionEvidence: fileInventory('docs/verification/P25/VERSIONS.md'),
  },
  migrations: {
    files: migrations,
    appliedPilotDatabase:
      '28 current, actual live/release-acceptance.json; no business acceptance inferred',
  },
  phaseRecords,
  matrix,
  screens,
  operations,
  events,
  reports,
  gaps,
  finalReadiness: 'blocked; no complete V1 claim',
};
write('docs/verification/P26/coverage-inventory.json', JSON.stringify(inventory, null, 2) + '\n');
write(
  'docs/verification/P26/gaps.json',
  JSON.stringify({ revision: inventory.revision, gaps }, null, 2) + '\n',
);
const tables = [
  ['Requirements and decisions', matrix],
  ['Screens', screens],
  ['Operations', operations],
  ['Events', events],
  ['Reports', reports],
];
write(
  'docs/verification/P26/COVERAGE-RESULTS.md',
  '# P26 structural coverage inventory\n\nStatus: blocked; pilot acceptance unrun. Generated by `node scripts/verification/p26-inventory.mjs`.\n\n' +
    inventory.boundary +
    '\n\nAll original scope, supersession and acceptance cells are retained in [coverage-inventory.json](coverage-inventory.json). Candidate owner records and registered test paths are inventory only; specific test-to-clause and final journey proof remain unreviewed. Superseded/excluded rows need exclusion checks, not new implementation.\n\n' +
    `Observed ${matrix.length} requirement/decision rows, ${screens.length} screens, ${operations.length} operations, ${events.length} events and ${reports.length} report catalog rows.\n\n` +
    tables
      .map(
        ([label, entries]) =>
          `## ${label}\n\n| ID | Owning phases | Final P26 result | Gap |\n| --- | --- | --- | --- |\n` +
          entries
            .map(
              (row) =>
                `| ${row.id} | ${row.owners?.join(', ') ?? 'See preserved catalog selection'} | ${row.finalPilotResult} | ${row.gap} |`,
            )
            .join('\n'),
      )
      .join('\n\n') +
    '\n\n## Prerequisite and evidence gaps\n\n' +
    gaps
      .map((gap) => `- **${gap.id}** (${gap.owner}): ${gap.observed}. Closure: ${gap.closure}.`)
      .join('\n') +
    '\n',
);
console.log(
  JSON.stringify({
    counts: inventory.counts,
    gaps: gaps.length,
    finalReadiness: inventory.finalReadiness,
  }),
);
// This command cannot certify readiness even if every structural reference exists.
process.exitCode = 2;
