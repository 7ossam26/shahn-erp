import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { IncidentCommand, IncidentConfirmation, IncidentResult } from '@shahn/contracts';
import { returnFixture } from '../p14/fixtures.js';
import {
  incidentCommands,
  incidentDetail,
  incidentPreview,
  type IncidentHooks,
} from '../../../apps/api/src/modules/incidents/service.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
export async function incidentFixture(pool: Pool, origin = 'http://127.0.0.1:5381') {
  const f = await returnFixture(pool, origin);
  await pool.query(
    `INSERT INTO access.role_grant(company_id,role_id,capability) VALUES($1,$2,'incidents'),($1,$2,'brand.payout') ON CONFLICT DO NOTHING`,
    [f.company, f.adminRole],
  );
  const service = (hooks: IncidentHooks = {}) => incidentCommands(pool, hooks),
    command = (value: object) =>
      ({
        schemaVersion: 1,
        companyId: f.company,
        commandId: randomUUID(),
        ...value,
      }) as IncidentCommand;
  const detail = (id: string, token = f.admin.token) =>
    UnitOfWork.run(pool, token, f.company, 'incidents', (u) => incidentDetail(u, id));
  const report = async (
    shipmentId: string,
    extra: { quantity?: number; offset?: number; kind?: 'loss' | 'damage' } = {},
  ) => {
    const d = (await f.read(shipmentId))!;
    const input = command({
      type: 'incident.report',
      report: {
        brandId: d.fields.brandId,
        kind: extra.kind ?? 'damage',
        observedAt: new Date().toISOString(),
        cause: 'تلف أثناء الحيازة',
        comment: 'تقرير جزئي مع سبب طويل '.repeat(12),
        evidence: ['فحص فعلي للقطع المتأثرة'],
        items: [
          {
            kind: 'shipment_line',
            sourceId: d.id,
            lineId: d.fields.lines[0]!.id,
            offset: extra.offset ?? 0,
            quantity: extra.quantity ?? d.fields.lines[0]!.quantity,
          },
        ],
      },
    });
    return {
      input,
      result: (await service().execute(f.admin.token, input)).body as IncidentResult,
    };
  };
  const confirmation = (extra: Partial<IncidentConfirmation> = {}): IncidentConfirmation => ({
    expectedVersion: 1,
    goodsValueMinor: '40000',
    compensationMinor: '40000',
    companyShareMinor: '20000',
    employeeShareMinor: '20000',
    responsibleBranchId: f.a,
    branchReason: '',
    employeeId: f.employee.employeeId,
    payrollMonth: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }).slice(0, 7),
    agreementReason: 'قيمة البضاعة المتأثرة دون الشحن واتفاق مسؤولية النصف لكل طرف',
    ...extra,
  });
  const confirm = (incidentId: string, c = confirmation(), hooks: IncidentHooks = {}) =>
    service(hooks).execute(
      f.admin.token,
      command({ type: 'incident.confirm', incidentId, confirmation: c }),
    );
  const preview = (id: string, c = confirmation()) =>
    UnitOfWork.run(pool, f.admin.token, f.company, 'incidents', (u) => incidentPreview(u, id, c));
  const counts = async () => {
    const r = await pool.query(
      `SELECT (SELECT count(*)::int FROM kernel.journal_effect WHERE company_id=$1) effects,(SELECT count(*)::int FROM kernel.credit_lot WHERE company_id=$1) lots,(SELECT count(*)::int FROM employees.incident_obligation WHERE company_id=$1) obligations,(SELECT count(*)::int FROM finance.money_movement WHERE company_id=$1) cash`,
      [f.company],
    );
    return r.rows[0] as { effects: number; lots: number; obligations: number; cash: number };
  };
  const shipment = (prepaid = false) =>
    f.received({
      areaId: null,
      lines: [
        {
          id: randomUUID(),
          description: 'بضاعة اختبار التلف',
          quantity: 2,
          unitDue: { currency: 'EGP', amountMinor: prepaid ? '0' : '20000' },
        },
      ],
    });
  return {
    ...f,
    service,
    incidentCommand: command,
    incidentDetail: detail,
    report,
    confirmation,
    confirm,
    preview,
    counts,
    shipment,
  };
}
