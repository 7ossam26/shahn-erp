import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate, transaction, type TransactionClient } from '@shahn/database';
import type {
  OpeningCommand,
  OpeningLine,
  ProfitReconciliationFinding,
  SettlementCommand,
  SettlementOperation,
  StoragePaymentCommand,
} from '@shahn/contracts';
import { profitFixture, type ProfitFixture } from './fixtures.js';
import { loadAccess } from '../../../apps/api/src/modules/access/sessions.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { loadProfitSources } from '../../../apps/api/src/modules/reporting/profit-sources.js';
import { loadProfitReconciliation } from '../../../apps/api/src/modules/reporting/profit-reconciliation.js';
import { summarizeProfit } from '../../../apps/api/src/modules/reporting/profit-read.js';
import { StorageService } from '../../../apps/api/src/modules/storage/service.js';
import { controlledStorageClock } from '../../../apps/api/src/modules/storage/clock.js';
import { OpeningService } from '../../../apps/api/src/modules/settlements/opening.service.js';
import { SettlementService } from '../../../apps/api/src/modules/settlements/service.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>, f: ProfitFixture, transferId: string;
const evidence: Record<string, unknown> = {};
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await profitFixture(db.pool);
  transferId = await f.transfer();
  const storage = new StorageService(
    db.pool,
    controlledStorageClock(() => f.today),
  );
  const scope = {
    companyId: f.company,
    brandId: f.storageBrand,
    branchId: f.b,
    accountId: f.bCash,
    method: 'cash' as const,
    amountMinor: '300000',
    actualDate: f.today,
  };
  const preview = await storage.paymentPreview(f.admin.token, scope);
  const command: StoragePaymentCommand = {
    ...scope,
    schemaVersion: 1,
    type: 'storage.payment.record',
    commandId: randomUUID(),
    expectedCreditVersion: preview.creditVersion,
    confirmReceived: true,
  };
  await storage.recordPayment(f.admin.token, command);
}, 120000);
afterAll(async () => {
  await mkdir('docs/verification/P24', { recursive: true });
  await writeFile(
    'docs/verification/P24/reconciliation-faults.json',
    JSON.stringify(evidence, null, 2),
  );
  await db?.dispose();
}, 120000);

async function inspect(tx: TransactionClient) {
  const u = new UnitOfWork(tx, await loadAccess(tx, f.admin.token, f.company));
  const source = await loadProfitSources(u, [f.a, f.b], {
    from: f.from,
    to: f.to,
    dateBasis: 'effective',
  });
  const findings = await loadProfitReconciliation(u, [f.a, f.b], source.issues, source.actualMoney);
  return { ...source, findings };
}
/** This helper is reachable only from the isolated PostgreSQL test. No corrupt value is committed:
 * one named immutable trigger is disabled after a savepoint and restored by rollback with its row. */
async function fault(
  name: string,
  table: 'kernel.journal_effect' | 'kernel.credit_lot' | 'finance.treasury_transit_movement',
  trigger: 'immutable_history' | 'immutable_treasury_transit',
  sql: string,
  args: unknown[],
  verify: (observed: Awaited<ReturnType<typeof inspect>>) => ProfitReconciliationFinding,
) {
  const before = (
    await db.pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM kernel.journal_effect WHERE company_id=$1`,
      [f.company],
    )
  ).rows[0]!.n;
  await expect(db.pool.query(sql, args)).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
  await transaction(db.pool, async (tx) => {
    await tx.query('SAVEPOINT isolated_fault');
    await tx.query(`ALTER TABLE ${table} DISABLE TRIGGER ${trigger}`);
    await tx.query(sql, args);
    const observed = await inspect(tx),
      finding = verify(observed);
    expect(finding.sourceIds.length).toBeGreaterThan(0);
    expect(finding.asOf).toBe(observed.actualMoney.asOf);
    expect(finding.observedVersion).toBeTruthy();
    expect(finding.recoveryPath).toBeTruthy();
    evidence[name] = {
      finding,
      sourceIssues: observed.issues,
      profit: summarizeProfit(
        observed.effects,
        new Map([
          [f.a, 'أ'],
          [f.b, 'ب'],
        ]),
        observed.payrollExclusions,
        !observed.issues.length,
      ),
      restoration:
        'Normal mutation rejected. Test-only savepoint rollback restores original source and immutable guard; no financial repair posting.',
    };
    await tx.query('ROLLBACK TO SAVEPOINT isolated_fault');
    const restored = await inspect(tx);
    expect(
      restored.findings.some((x) => x.kind === finding.kind && x.targetId === finding.targetId),
    ).toBe(false);
  });
  expect(
    (
      await db.pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM kernel.journal_effect WHERE company_id=$1`,
        [f.company],
      )
    ).rows[0]!.n,
  ).toBe(before);
  // The guard was restored too, not merely the test value.
  await expect(db.pool.query(sql, args)).rejects.toThrow('IMMUTABLE_KERNEL_HISTORY');
}

it('links each persisted economic source to its actual ordinary source route', async () => {
  await transaction(db.pool, async (tx) => {
    const sources = await inspect(tx);
    const storage = sources.effects.find((e) => e.category === 'storage_revenue')!;
    const agreementId = (
      await tx.query<{ agreement_id: string }>(
        'SELECT agreement_id FROM storage.period WHERE company_id=$1 AND id=$2',
        [f.company, storage.periodId],
      )
    ).rows[0]!.agreement_id;
    expect(storage.sourcePath).toBe('/storage/' + agreementId);
    const expense = sources.effects.find((e) => e.category === 'paid_expense')!;
    const expenseId = (
      await tx.query<{ expense_id: string }>(
        'SELECT expense_id FROM finance.paid_cost WHERE company_id=$1 AND effect_id=$2',
        [f.company, expense.effectId],
      )
    ).rows[0]!.expense_id;
    expect(expense.sourcePath).toBe('/expenses/' + expenseId);
    for (const e of sources.effects.filter((e) => e.sourceCapability === 'employees')) {
      expect(e.employeeId).toBeTruthy();
      expect(e.sourcePath).toMatch(
        new RegExp('^/employees/' + e.employeeId + '/months/\\d{4}-\\d{2}$'),
      );
    }
  });
});

it('detects exact source/effect mismatch and preserves every unrelated classified result', async () => {
  const shipping = (
    await db.pool.query<{ id: string }>(
      `SELECT id FROM kernel.journal_effect WHERE company_id=$1 AND family='operating' AND kind='shipping' AND source_id=$2`,
      [
        f.company,
        (
          await db.pool.query<{ source_record_id: string }>(
            `SELECT source_record_id FROM execution.visit_fact WHERE company_id=$1 AND shipment_id=$2`,
            [f.company, f.visit.s.shipmentId],
          )
        ).rows[0]!.source_record_id,
      ],
    )
  ).rows[0]!.id;
  await fault(
    'economic_source',
    'kernel.journal_effect',
    'immutable_history',
    'UPDATE kernel.journal_effect SET amount_minor=amount_minor+1 WHERE company_id=$1 AND id=$2',
    [f.company, shipping],
    (observed) => {
      const finding = observed.findings.find(
        (x) =>
          (x.kind === 'economic_source_mismatch' && x.targetId === f.visit.s.shipmentId) ||
          (x.kind === 'economic_source_mismatch' && x.sourceIds.includes(shipping)),
      )!;
      expect(finding).toMatchObject({
        expectedMinor: '1000000',
        observedMinor: '1000001',
        deltaMinor: '1',
      });
      expect(observed.effects.some((e) => e.effectId === shipping)).toBe(false);
      expect(observed.effects.find((e) => e.category === 'storage_revenue')?.amountMinor).toBe(
        '200000',
      );
      expect(observed.issues.some((i) => i.code === 'ECONOMIC_SOURCE_MISMATCH')).toBe(true);
      return finding;
    },
  );
});

it('exposes an absent economic effect as a source gap while retaining unrelated storage and cost evidence', async () => {
  const shipping = (
    await db.pool.query<{ id: string }>(
      `SELECT e.id FROM kernel.journal_effect e JOIN execution.visit_fact v ON(v.company_id,v.source_record_id)=(e.company_id,e.source_id)
    WHERE e.company_id=$1 AND e.family='operating' AND e.kind='shipping' AND v.shipment_id=$2`,
      [f.company, f.visit.s.shipmentId],
    )
  ).rows[0]!.id;
  await fault(
    'missing_economic_source',
    'kernel.journal_effect',
    'immutable_history',
    'DELETE FROM kernel.journal_effect WHERE company_id=$1 AND id=$2',
    [f.company, shipping],
    (observed) => {
      const finding = observed.findings.find(
        (x) => x.kind === 'missing_economic_source' && x.targetType === 'visit_shipping',
      )!;
      expect(finding).toMatchObject({
        expectedMinor: '1000000',
        observedMinor: null,
        deltaMinor: '-1000000',
      });
      expect(observed.effects.some((e) => e.category === 'shipping_gross')).toBe(false);
      expect(observed.effects.find((e) => e.category === 'storage_revenue')?.amountMinor).toBe(
        '200000',
      );
      expect(observed.effects.find((e) => e.category === 'paid_expense')?.amountMinor).toBe(
        '-150000',
      );
      return finding;
    },
  );
});

it('reconciles treasury send and receipt phases independently so cancelling faults cannot hide', async () => {
  await fault(
    'transit',
    'finance.treasury_transit_movement',
    'immutable_treasury_transit',
    "UPDATE finance.treasury_transit_movement SET amount_minor=amount_minor+9 WHERE company_id=$1 AND transfer_id=$2 AND phase='receive'",
    [f.company, transferId],
    (observed) => {
      const finding = observed.findings.find(
        (x) => x.kind === 'transit_projection' && x.targetId === transferId,
      )!;
      expect(finding).toMatchObject({
        expectedMinor: '-30000',
        observedMinor: '-29991',
        deltaMinor: '9',
      });
      expect(finding.observedVersion).toContain('receive');
      expect(finding.recoveryPath).toBe('/treasury/transfers/' + transferId);
      expect(finding.sourceCapability).toBe('treasury.send');
      return finding;
    },
  );
});

it('compares brand lots and immutable allocations against the signed commercial journal', async () => {
  const lot = (
    await db.pool.query<{ lot_id: string }>(
      `SELECT lot_id FROM incidents.confirmation WHERE company_id=$1 AND incident_id=$2`,
      [f.company, f.incidentId],
    )
  ).rows[0]!.lot_id;
  await fault(
    'wallet',
    'kernel.credit_lot',
    'immutable_history',
    'UPDATE kernel.credit_lot SET amount_minor=amount_minor+11 WHERE company_id=$1 AND id=$2',
    [f.company, lot],
    (observed) => {
      const finding = observed.findings.find(
        (x) => x.kind === 'wallet_lots' && x.targetId === f.seed.brand,
      )!;
      expect(finding.deltaMinor).toBe('11');
      expect(finding.sourceIds).toContain(lot);
      expect(BigInt(finding.observedMinor!) - BigInt(finding.expectedMinor!)).toBe(11n);
      return finding;
    },
  );
});

it('reconciles separate storage credit receipts/allocations without posting cash or profit', async () => {
  const receipt = (
    await db.pool.query<{ credit_effect_id: string }>(
      `SELECT credit_effect_id FROM storage.receipt WHERE company_id=$1 AND brand_id=$2`,
      [f.company, f.storageBrand],
    )
  ).rows[0]!.credit_effect_id;
  await fault(
    'storage_credit',
    'kernel.journal_effect',
    'immutable_history',
    'UPDATE kernel.journal_effect SET amount_minor=amount_minor+13 WHERE company_id=$1 AND id=$2',
    [f.company, receipt],
    (observed) => {
      const finding = observed.findings.find(
        (x) => x.kind === 'storage_credit' && x.targetId === f.storageBrand,
      )!;
      expect(finding).toMatchObject({
        expectedMinor: '100013',
        observedMinor: '100000',
        deltaMinor: '-13',
      });
      expect(finding.sourceIds).toContain(receipt);
      expect(observed.actualMoney.storageCreditMinor).toBe('100000');
      expect(observed.effects.find((e) => e.category === 'storage_revenue')?.amountMinor).toBe(
        '200000',
      );
      return finding;
    },
  );
});

it('an actual P21 employee opening entitlement changes obligations but never operating profit or addition sources', async () => {
  const before = await f.report();
  const employee = await f.payroll.create('P24 استحقاق قبل النظام خارج تكلفة التشغيل', '0');
  const opening = new OpeningService(db.pool, {}, f.payroll.clock);
  const lines: OpeningLine[] = [
    {
      classification: 'employee_entitlement',
      employeeId: employee.employeeId,
      branchId: f.a,
      month: f.month,
      amountMinor: '100000',
    },
  ];
  const preview = await opening.prepare(f.admin.token, {
    companyId: f.company,
    openingDate: f.today,
    lines,
  });
  const command: OpeningCommand = {
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    type: 'opening.confirm',
    openingDate: f.today,
    description: 'P24 isolated pre-ERP employee entitlement',
    evidence: 'test opening register',
    lines,
    expectedDigest: preview.digest,
  };
  const result = await opening.confirm(f.admin.token, command);
  expect(await opening.confirm(f.admin.token, command)).toEqual(result);
  const source = (
    await db.pool.query<{ source_id: string }>(
      `SELECT source_id FROM employees.payroll_adjustment WHERE company_id=$1 AND employee_id=$2 AND kind='opening_entitlement'`,
      [f.company, employee.employeeId],
    )
  ).rows[0]!.source_id;
  const after = await f.report();
  expect(after.snapshot.context['profit']).toEqual(before.snapshot.context['profit']);
  expect(after.rows.some((r) => r.economicEffect?.sourceId === source)).toBe(false);
  evidence['opening_exclusion'] = {
    employeeId: employee.employeeId,
    commandId: command.commandId,
    sourceId: source,
    before: before.snapshot.context['profit'],
    after: after.snapshot.context['profit'],
  };
});

it('validates a late correction native ancestor outside the selected recorded-date window', async () => {
  const incident = await f.incidentDetail(f.incidentId);
  await f.service().execute(
    f.admin.token,
    f.incidentCommand({
      type: 'incident.review',
      incidentId: incident.id,
      expectedVersion: incident.version,
      reason: 'P24 recorded-date ancestor verification',
    }),
  );
  const service = new SettlementService(db.pool);
  const corrector = await f.make('p24-recorded-window-corrector', [f.a, f.b], f.adminRole);
  const operation: SettlementOperation = {
    operation: 'incident.resolve',
    incidentId: incident.id,
    decision: 'correct_compensation',
    compensationDeltaMinor: '-10000',
    actualDate: f.today,
  };
  const preview = await service.prepare(corrector.token, { companyId: f.company, operation });
  const command: SettlementCommand = {
    ...f.env({}),
    type: 'settlement.confirm',
    reason: 'P24 native correction before isolated timestamp-window fault',
    operation,
    expectedVersions: preview.versions,
    expectedDigest: preview.digest,
  };
  await service.confirm(corrector.token, command);
  const correction = (
    await db.pool.query<{ id: string; supersedes_id: string }>(
      `SELECT id,supersedes_id FROM kernel.journal_effect
       WHERE company_id=$1 AND family='operating' AND kind='correction' AND subject_id=$2`,
      [f.company, f.incidentId],
    )
  ).rows[0]!;
  const tomorrow = new Date(new Date(f.today + 'T12:00:00Z').getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  await transaction(db.pool, async (tx) => {
    await tx.query('SAVEPOINT isolated_recorded_window');
    await tx.query('ALTER TABLE kernel.journal_effect DISABLE TRIGGER immutable_history');
    // The real service posted both records. Only the isolated fault fixture shifts the correction
    // timestamp so a single-day recorded window excludes its original; both changes roll back.
    await tx.query(
      'UPDATE kernel.journal_effect SET recorded_at=$3::timestamptz WHERE company_id=$1 AND id=$2',
      [f.company, correction.id, tomorrow + 'T12:00:00Z'],
    );
    const u = new UnitOfWork(tx, await loadAccess(tx, f.admin.token, f.company));
    const selected = () =>
      loadProfitSources(u, [f.a, f.b], {
        from: tomorrow,
        to: tomorrow,
        dateBasis: 'recorded',
      });
    const valid = await selected();
    expect(valid.effects.filter((e) => e.category === 'brand_compensation')).toHaveLength(1);
    expect(valid.effects.find((e) => e.effectId === correction.id)?.amountMinor).toBe('10000');
    expect(valid.effects.some((e) => e.effectId === correction.supersedes_id)).toBe(false);
    expect(valid.issues.some((i) => i.code === 'ECONOMIC_SOURCE_MISMATCH')).toBe(false);
    await tx.query(
      'UPDATE kernel.journal_effect SET amount_minor=amount_minor-1 WHERE company_id=$1 AND id=$2',
      [f.company, correction.supersedes_id],
    );
    const invalid = await selected();
    const finding = (
      await loadProfitReconciliation(u, [f.a, f.b], invalid.issues, invalid.actualMoney)
    ).find((x) => x.kind === 'economic_source_mismatch')!;
    expect(finding).toMatchObject({
      expectedMinor: '-50000',
      observedMinor: '-50001',
      deltaMinor: '-1',
    });
    expect(finding.sourceIds).toContain(correction.supersedes_id);
    expect(invalid.effects.some((e) => e.effectId === correction.id)).toBe(false);
    evidence['recorded_window_ancestor'] = {
      commandId: command.commandId,
      correctionId: correction.id,
      originalId: correction.supersedes_id,
      selectedRecordedDate: tomorrow,
      validCorrection: valid.effects.find((e) => e.effectId === correction.id),
      finding,
      restoration:
        'Only isolated savepoint fault timestamps create the separate recorded window; original amount, timestamp and immutable guard roll back. No future recorded business event is claimed.',
    };
    await tx.query('ROLLBACK TO SAVEPOINT isolated_recorded_window');
    expect((await inspect(tx)).issues.some((i) => i.code === 'ECONOMIC_SOURCE_MISMATCH')).toBe(
      false,
    );
  });
});
