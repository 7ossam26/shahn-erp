import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { cairoDate } from '@shahn/domain';
import type { SettlementCommand, SettlementOperation, SettlementResult } from '@shahn/contracts';
import { incidentFixture } from '../p18/fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { SettlementService } from '../../../apps/api/src/modules/settlements/service.js';
import { BrandWalletService } from '../../../apps/api/src/modules/finance/brand-wallet/wallet.service.js';

let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof incidentFixture>>;
const evidence: Record<string, unknown> = {};
const today = cairoDate(new Date());
beforeAll(async () => {
  db = await isolatedPostgres();
  await migrate(db.pool);
  f = await incidentFixture(db.pool, 'http://127.0.0.1:5424');
  await db.pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'settlements') ON CONFLICT DO NOTHING`,
    [f.company, f.adminRole],
  );
});
afterAll(async () => {
  if (f)
    await writeFile(
      'docs/verification/P21/native-incidents.json',
      JSON.stringify(evidence, null, 2),
    );
  await (f as unknown as { close?: () => Promise<void> })?.close?.();
  await db?.dispose();
});
const service = () => new SettlementService(db.pool);
const settle = async (operation: SettlementOperation) => {
  const p = await service().prepare(f.admin.token, { companyId: f.company, operation });
  const input: SettlementCommand = {
    schemaVersion: 1,
    commandId: randomUUID(),
    companyId: f.company,
    type: 'settlement.confirm',
    reason: 'نتيجة مراجعة الحادث الموثقة',
    operation,
    expectedVersions: p.versions,
    expectedDigest: p.digest,
  };
  return {
    preview: p,
    input,
    result: (await service().confirm(f.admin.token, input)).body as SettlementResult,
  };
};
const wallet = (brandId: string) =>
  UnitOfWork.run(db.pool, f.admin.token, f.company, 'brand.payout', async (u) => {
    await BrandWalletService.lock(u, [brandId]);
    return new BrandWalletService(u, brandId).amounts();
  });

it('incident review: linked compensation correction at the incident branch keeps the employee share and releases only its hold', async () => {
  const x = await f.shipment(),
    r = await f.report(x.s.shipmentId);
  await f.confirm(r.result.incidentId);
  const d = await f.incidentDetail(r.result.incidentId);
  await f.service().execute(
    f.admin.token,
    f.incidentCommand({
      type: 'incident.review',
      incidentId: d.id,
      expectedVersion: d.version,
      reason: 'قيمة البضاعة المتفق عليها أقل',
    }),
  );
  const brandId = d.report.brandId;
  const w0 = await wallet(brandId);
  expect(w0.heldMinor).toBe('40000');
  const below = await service().prepare(f.admin.token, {
    companyId: f.company,
    operation: {
      operation: 'incident.resolve',
      incidentId: d.id,
      decision: 'correct_compensation',
      compensationDeltaMinor: '-25000',
      actualDate: today,
    },
  });
  expect(below.blockers).toContain('COMPENSATION_BELOW_EMPLOYEE_SHARE');
  const { preview, input, result } = await settle({
    operation: 'incident.resolve',
    incidentId: d.id,
    decision: 'correct_compensation',
    compensationDeltaMinor: '-10000',
    actualDate: today,
  });
  expect(preview.facts.find((x) => x.key === 'compensation')).toMatchObject({
    before: '40000',
    after: '30000',
  });
  expect(preview.facts.find((x) => x.key === 'employeeShare')).toMatchObject({
    before: '20000',
    after: '20000',
  });
  expect(result.classification).toBe('incident_review_correction');
  expect(await wallet(brandId)).toMatchObject({
    heldMinor: '0',
    eligibleMinor: String(BigInt(w0.eligibleMinor) - 10000n),
  });
  const operating = (
    await db.pool.query(
      `SELECT kind,amount_minor::text FROM kernel.journal_effect WHERE company_id=$1 AND family='operating' AND subject_id=$2 ORDER BY recorded_at`,
      [f.company, d.id],
    )
  ).rows;
  expect(operating).toEqual(
    expect.arrayContaining([
      { kind: 'cost', amount_minor: '-40000' },
      { kind: 'correction', amount_minor: '10000' },
    ]),
  );
  // The original confirmation and employee obligation are unchanged; a second resolution is refused.
  expect((await f.incidentDetail(d.id)).confirmation?.compensationMinor).toBe('40000');
  const again = await service().prepare(f.admin.token, {
    companyId: f.company,
    operation: {
      operation: 'incident.resolve',
      incidentId: d.id,
      decision: 'retain_original',
      actualDate: today,
    },
  });
  expect(again.blockers).toContain('SETTLEMENT_ALREADY_RESOLVED');
  expect(((await service().confirm(f.admin.token, input)).body as SettlementResult).caseId).toBe(
    result.caseId,
  );
  evidence.incidentCorrection = { incidentId: d.id, result, operating };
});

it('parcel loss/damage delegates to the P18 report: custody hold, no money, linked case', async () => {
  const x = await f.shipment();
  const sd = (await f.read(x.s.shipmentId))!;
  const before = await f.counts();
  const { result } = await settle({
    operation: 'parcel.incident',
    report: {
      brandId: sd.fields.brandId,
      kind: 'loss',
      observedAt: new Date().toISOString(),
      cause: 'فقد بعد الاستلام في الفرع',
      comment: '',
      evidence: ['مطابقة الرف'],
      items: [
        {
          kind: 'shipment_line',
          sourceId: sd.id,
          lineId: sd.fields.lines[0]!.id,
          offset: 0,
          quantity: 1,
        },
      ],
    },
  });
  expect(result.classification).toBe('parcel_incident_report');
  const incident = result.links.find((l) => l.entityKind === 'incident')!;
  expect((await f.incidentDetail(incident.entityId)).state).toBe('reported');
  expect(await f.counts()).toEqual(before);
});
