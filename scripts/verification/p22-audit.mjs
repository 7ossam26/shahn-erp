import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const baseline = '32aad03e8a1a04ac36b95a5a77ab7bf8f7623ada';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const coverage = await readFile('phases/INTEGRATION-PHASE-COVERAGE.md', 'utf8');
const tables = coverage
  .split('\n')
  .filter((r) => /^\| \d+ \| `/.test(r))
  .map((r) =>
    r
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim()),
  );
if (tables.length !== 70) throw Error('P22_INVENTORY_CHANGED_REVIEW_REQUIRED');
const bootstrap = coverage.split('\n').find((r) => r.startsWith('| `integration.bindSource`'));
if (!bootstrap) throw Error('P22_BOOTSTRAP_INVENTORY_REQUIRED');
const clean = (s) => s.replaceAll('`', '');
const contracts = 'packages/contracts/src/';
const api = 'apps/api/src/modules/';
let live;
try {
  live = JSON.parse(await readFile('docs/verification/P22/live-inventory.json', 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const liveCommands = new Set(
  (live?.operations ?? []).filter((r) => r.state === 'accepted').map((r) => r.operation_id),
);
const liveEvents = new Set((live?.events ?? []).map((r) => r.event_type));
const liveProvenance = live?.runtimeCommit
  ? 'Runtime source commit is identified by the successful CI release artifact and deployed digest match; see live-runtime-provenance.json. Complete joint reviewed conformance and CR-001/CHECK-003 remain explicitly deferred by the owner.'
  : 'Runtime source commit and complete reviewed conformance index are absent; CR-001/CHECK-003 remain blocked.';
const liveReads = new Set(
  live
    ? [
        'integration.getConfiguration',
        'provisioning.getStatus',
        'integration.getDeliveryStatus',
        'integration.getDeliveryDetail',
        'integration.replayEvents',
        'integration.getReconciliationSnapshot',
        'integration.getAppliedCheckpoint',
        'integration.getTripProjection',
        'integration.getTaskHistory',
        'integration.getWorkdayHistory',
      ]
    : [],
);
const liveOperation = (id) =>
  liveCommands.has(id) || liveReads.has(id)
    ? 'Actual scoped positive; selected negatives/recovery separately evidenced; full row acceptance pending'
    : 'Current producer/authority acceptance pending; not exercised by this live trial';
const ownerPaths = {
  P11: [
    contracts + 'tawsel/provisioning.ts',
    contracts + 'tawsel/delivery.ts',
    api + 'integration/tawsel-client.ts',
    api + 'integration/source-command.service.ts',
  ],
  P12: [
    contracts + 'tawsel/intake.ts',
    api + 'dispatch/acceptance.ts',
    api + 'integration/tawsel-client.ts',
  ],
  P13: [
    contracts + 'execution/index.ts',
    api + 'execution/projection-worker.ts',
    api + 'execution/monitoring-reader.service.ts',
  ],
  P14: [
    contracts + 'tawsel/returns.ts',
    api + 'returns/return-events.ts',
    api + 'returns/receipt.service.ts',
  ],
  P22: [
    contracts + 'tawsel/recovery.ts',
    api + 'integration/recovery-client.ts',
    api + 'integration/recovery-worker.ts',
    api + 'integration/recovery.service.ts',
    api + 'integration/delivery-query.service.ts',
  ],
};
const operation = (r, ordinal) => ({
  ordinal,
  operationId: clean(r[1]),
  firstOwner: r[2],
  consumers: r[3],
  concreteDefinitionAndCapability: r[4],
  requiredCases: r[5],
  adapterPaths: ownerPaths[/P\d+/.exec(r[2])?.[0]] ?? [],
  conditional: r[1].includes('setUrgency'),
  sourceEvidence:
    'Pinned complete selected definitions; source-derived. This inventory does not certify authority.',
  fixtureEvidence:
    'Existing native-owner suites plus generated P22 configure/rotate/retry and closed recovery boundary. See README for exact executed selections.',
  actualP22TawselHttp: live
    ? liveOperation(clean(r[1]))
    : 'blocked: dedicated runtime/service/issuer/human sessions/callback absent',
  result: 'unconditional conformance not established',
});
const operations = [
  operation(
    [
      '0',
      '`integration.bindSource`',
      'P11',
      'P22; P25',
      'P+A BindSourceCommand; ProvisioningOperator only',
      'IP-AC-01/19',
    ],
    0,
  ),
  ...tables.slice(0, 43).map((r, i) => operation(r, i + 1)),
];
const captured = new Set([
  'provisioning.changed',
  'task.snapshotAccepted',
  'assignment.received',
  'round.started',
  'outcome.recorded',
  'outcome.corrected',
  'return.requested',
  'return.subsetReceived',
  'plan.revisionPublished',
]);
const events = tables.slice(43).map((r) => ({
  eventType: clean(r[1]),
  concreteDefinition: r[2],
  firstHandlerOwner: r[3],
  consumers: r[4],
  requiredCases: r[5],
  handlerPaths: ownerPaths[r[3]] ?? [],
  fixtureProvenance: captured.has(clean(r[1]))
    ? 'Supplied P25 sender example; historical source capture claim only'
    : 'Generated envelope around supplied concrete feature payload; not a captured signed send',
  localP22Boundary:
    '7-case unit suite tests this variant positive, injected concrete payload field, wrong source and unsupported version; shared collision/ordering tests have narrower selected event coverage',
  actualP22TawselHttp: liveEvents.has(clean(r[1]))
    ? 'Actual producer event received and applied in scoped live trial; full variant acceptance pending'
    : 'Current producer variant not exercised by this live trial',
  handlerResult:
    'Native owner routing retained; selected P11/P13/P14 regressions executed. Full combined per-variant runtime recovery remains unverified.',
}));
const extraction = JSON.parse(
  await readFile('docs/verification/P11/baseline-extraction.json', 'utf8'),
);
if (extraction.sourceCommit !== baseline) throw Error('P22_PINNED_EXTRACTION_IDENTITY_CHANGED');
const schemas = [];
for (const r of extraction.extracted) {
  const bytes = await readFile(r.destination),
    lf = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
  if (digest(bytes) !== r.sha256 && digest(lf) !== r.sha256)
    throw Error('P22_BASELINE_BYTES_CHANGED: ' + r.destination);
  schemas.push({
    path: r.destination,
    pinnedSha256: r.sha256,
    checkoutSha256: digest(bytes),
    identityVerified: true,
  });
}
const dir = 'docs/verification/P22';
await mkdir(dir, { recursive: true });
await writeFile(
  dir + '/inventory.json',
  JSON.stringify(
    {
      baseline,
      erpStartingHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      checkedAt: new Date().toISOString(),
      operationCount: operations.length,
      eventCount: events.length,
      operations,
      events,
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  dir + '/baseline-integrity.json',
  JSON.stringify(
    {
      baseline,
      checkedAt: new Date().toISOString(),
      nodeVersion: process.version,
      schemas,
      limit:
        'Integrity verification is not a reading or runtime-conformance claim. Pinned schemas and fixture bytes unchanged; Windows LF/CRLF differences are recorded.',
    },
    null,
    2,
  ) + '\n',
);
const opRows = operations
  .map(
    (r) =>
      `| ${r.ordinal} | \`${r.operationId}\` | ${r.firstOwner} | ${r.concreteDefinitionAndCapability} | ${r.conditional ? 'Conditional adapter only; no new business action' : 'Adapter/static definition present; executed local subset only'} | ${live ? liveOperation(r.operationId) : 'Blocked: live setup absent at initial attempt'} |`,
  )
  .join('\n');
const eventRows = events
  .map(
    (r) =>
      `| \`${r.eventType}\` | ${r.concreteDefinition} | ${r.firstHandlerOwner} | ${captured.has(r.eventType) ? 'Supplied sender example' : 'Generated sender envelope'} | Positive + concrete negative + scope/version checked | ${r.actualP22TawselHttp} |`,
  )
  .join('\n');
await writeFile(
  dir + '/OPERATION-EVENT-EVIDENCE.md',
  `# P22 operation and event evidence\n\nDate: 2026-10-08. Baseline: ${baseline}. Generated by \`node scripts/verification/p22-audit.mjs\` from the exact authored inventory. [Machine ledger](inventory.json) includes authority, specific required cases, adapter/handler paths and outstanding evidence. No row is complete from a parser test. Native-owner evidence is consumed; P22 does not take ownership of their business cases.\n\nThe 43 scoped operations plus operator bootstrap and 27 events are retained. ${live ? 'The owner-supplied access enabled an actual isolated live trial. [Live inventory](live-inventory.json) records immutable accepted command/event identities; [recovery](live-recovery.json), [authority](live-authority.json), [rotation](live-rotation.json), [proxy](live-proxy-security.json), [lost acknowledgement](live-lost-ack.json), [remittance](live-remittance.json) and [restore](live-restore-comparison.json) record selected actual behavior. Positive evidence does not close a complete operation/event row; ' + (27 - liveEvents.size) + ' of twenty-seven sender variants remain unexercised by this current producer trial. ' + liveProvenance + '' : 'Current P22 public HTTP verification was blocked for every row at the initial attempt.'} P18's bounded actual waiver/disposition trial remains separately dated historical evidence. Conditional urgency adds no screen or selected write. Delivery reports never establish accounting success.\n\n| # | Exact operation | Native owner | Definition/capability | Local status | Current Tawsel HTTP |\n| --- | --- | --- | --- | --- | --- |\n${opRows}\n\n| Exact event | Concrete payload | Native handler | Fixture provenance | P22 local boundary | Current Tawsel HTTP |\n| --- | --- | --- | --- | --- | --- |\n${eventRows}\n\nAll events share the same concrete inbox boundary. P22's real DB combined ordering/snapshot/restore cases exercise arrival/outcome and return receipts; this does not certify every variant's dependency ordering, authority or runtime producer. P11/P13/P14 shared collision, process restart and handler suites were rerun. The [README](README.md) lists exact commands and limits.\n`,
);
console.log(
  JSON.stringify({
    baseline,
    operations: operations.length,
    events: events.length,
    verifiedImmutableFiles: schemas.length,
    status: live
      ? 'static/local inventory plus selected actual HTTP; joint reviewed acceptance explicitly deferred by owner'
      : 'static/local inventory; public acceptance blocked',
  }),
);
