import { createHash } from 'node:crypto';
import type { ProfitActualMoney, ProfitReconciliationFinding } from '@shahn/contracts';
import type { UnitOfWork } from '../kernel/unit-of-work.js';
import type { SourceIssue } from './profit-sources.js';

/** Findings are immutable evidence within their snapshot, never instructions to post money. */
export async function loadProfitReconciliation(
  u: UnitOfWork,
  branches: string[],
  issues: SourceIssue[],
  money: ProfitActualMoney,
) {
  const findings: ProfitReconciliationFinding[] = [];
  const add = (
    v: Omit<ProfitReconciliationFinding, 'id' | 'asOf' | 'branchIds'>,
    scope = branches,
  ) =>
    findings.push({
      ...v,
      asOf: money.asOf,
      branchIds: scope,
      id: createHash('sha256')
        .update(
          JSON.stringify([
            u.access.companyId,
            v.kind,
            v.targetType,
            v.targetId,
            v.observedVersion,
            v.deltaMinor,
            money.asOf,
          ]),
        )
        .digest('hex'),
    });
  for (const i of issues) {
    const amounts = /^source:(-?\d+):effect:(-?\d+|missing)$/.exec(i.observedVersion);
    add(
      {
        kind:
          i.code === 'DUPLICATE_ECONOMIC_EFFECT'
            ? 'duplicate_effect'
            : i.code === 'MISSING_ECONOMIC_EFFECT'
              ? 'missing_economic_source'
              : i.code === 'ECONOMIC_SOURCE_MISMATCH'
                ? 'economic_source_mismatch'
                : i.code === 'UNATTRIBUTED_ECONOMIC_SOURCE'
                  ? 'unattributed_source'
                  : 'missing_classification',
        targetType: i.targetKind,
        targetId: i.targetId,
        sourceIds: i.sourceIds,
        observedVersion: i.observedVersion,
        expectedMinor: amounts?.[1] ?? null,
        observedMinor: amounts ? (amounts[2] === 'missing' ? null : amounts[2]!) : null,
        deltaMinor: i.deltaMinor,
        recoveryPath: i.sourcePath,
        message: i.message,
        sourceCapability: i.sourceCapability,
      },
      i.branchId ? [i.branchId] : branches,
    );
  }
  for (const a of money.accounts)
    if (a.bookMinor !== a.journalMinor) {
      const journal = (
        await u.client.query<{ id: string; source_id: string; branch_id: string }>(
          `SELECT id,source_id,branch_id FROM kernel.journal_effect WHERE company_id=$1 AND family='money' AND subject_id=$2 ORDER BY effective_date,recorded_at,id`,
          [u.access.companyId, a.id],
        )
      ).rows;
      add(
        {
          kind: 'account_projection',
          targetType: 'account',
          targetId: a.id,
          sourceIds: [...new Set(journal.flatMap((j) => [j.source_id, j.id]))],
          observedVersion: a.projectionVersion,
          expectedMinor: a.journalMinor,
          observedMinor: a.bookMinor,
          deltaMinor: (BigInt(a.bookMinor) - BigInt(a.journalMinor)).toString(),
          recoveryPath: '/settlements',
          message:
            'إسقاط رصيد الحساب لا يطابق سجل المال؛ يلزم إعادة بناء الإسقاط من مصادره المحفوظة.',
          sourceCapability: 'finance.accounts',
        },
        journal.length
          ? [...new Set(journal.map((j) => j.branch_id))].filter((b) => branches.includes(b))
          : branches,
      );
    }
  const args = [u.access.companyId, branches];
  if (u.access.grants.includes('finance.accounts')) {
    const transit = (
      await u.client.query<{
        id: string;
        version: string;
        expected: string;
        observed: string;
        ids: string[];
        phase: string;
      }>(
        `SELECT t.id,t.version::text||':'||p.phase AS version,p.phase,
      (CASE WHEN p.phase='send' THEN t.amount_minor WHEN t.state='received' THEN -t.amount_minor ELSE 0 END)::text AS expected,
      COALESCE((SELECT sum(m.amount_minor) FROM finance.treasury_transit_movement m WHERE(m.company_id,m.transfer_id)=(t.company_id,t.id) AND m.phase=p.phase),0)::text AS observed,
      ARRAY[t.send_source_id::text,COALESCE(t.receipt_source_id::text,'')]
       ||ARRAY(SELECT m.id::text FROM finance.treasury_transit_movement m WHERE(m.company_id,m.transfer_id)=(t.company_id,t.id) AND m.phase=p.phase ORDER BY m.id) AS ids
      FROM finance.treasury_transfer t CROSS JOIN (VALUES('send'),('receive')) p(phase)
      WHERE t.company_id=$1 AND t.source_branch_id=ANY($2::uuid[]) ORDER BY t.id,p.phase`,
        args,
      )
    ).rows;
    for (const t of transit)
      if (t.expected !== t.observed)
        add({
          kind: 'transit_projection',
          targetType: 'treasury_transfer',
          targetId: t.id,
          sourceIds: t.ids.filter(Boolean),
          observedVersion: t.version,
          expectedMinor: t.expected,
          observedMinor: t.observed,
          deltaMinor: (BigInt(t.observed) - BigInt(t.expected)).toString(),
          recoveryPath: '/treasury/transfers/' + t.id,
          message:
            'سجل الأموال العابرة لا يطابق مرحلة ' +
            t.phase +
            ' للتحويل؛ المراجعة عبر مسار التحويل.',
          sourceCapability: 'treasury.send',
        });
  }
  if (u.access.grants.includes('brand.payout')) {
    const wallet = (
      await u.client.query<{
        id: string;
        expected: string;
        observed: string;
        revision: string;
        ids: string[];
      }>(
        `SELECT b.id,
      COALESCE((SELECT sum(amount_minor) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id),0)::text AS expected,
      (COALESCE((SELECT sum(l.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=$1 AND a.lot_id=l.id),0)) FROM kernel.credit_lot l WHERE l.company_id=$1 AND l.brand_id=b.id),0)
       -COALESCE((SELECT sum(-e.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM kernel.lot_allocation a WHERE a.company_id=$1 AND a.effect_id=e.id),0)) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id AND e.amount_minor<0 AND e.kind<>'payout'),0))::text AS observed,
      (SELECT count(*) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id)::text AS revision,
      ARRAY(SELECT e.id::text FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id ORDER BY e.id)
       ||ARRAY(SELECT e.source_id::text FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id ORDER BY e.id) AS ids
      FROM commercial.brand b WHERE b.company_id=$1 AND EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id AND e.branch_id=ANY($2::uuid[]))
      AND NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='brand' AND e.subject_id=b.id AND NOT e.branch_id=ANY($2::uuid[])) ORDER BY b.id`,
        args,
      )
    ).rows;
    for (const w of wallet)
      if (w.expected !== w.observed)
        add({
          kind: 'wallet_lots',
          targetType: 'brand',
          targetId: w.id,
          sourceIds: [...new Set(w.ids)],
          observedVersion: w.revision,
          expectedMinor: w.expected,
          observedMinor: w.observed,
          deltaMinor: (BigInt(w.observed) - BigInt(w.expected)).toString(),
          recoveryPath: '/brand-payouts/brands/' + w.id,
          message: 'رصيد المحفظة من الدفعات والتخصيصات لا يطابق السجل؛ يلزم مراجعة المصادر.',
          sourceCapability: 'brand.payout',
        });
  }
  if (u.access.grants.includes('storage')) {
    const storage = (
      await u.client.query<{
        id: string;
        expected: string;
        observed: string;
        revision: string;
        ids: string[];
      }>(
        `SELECT a.brand_id AS id,a.version::text AS revision,
      COALESCE((SELECT sum(e.amount_minor) FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='storage' AND e.subject_id=a.brand_id),0)::text AS expected,
      (COALESCE((SELECT sum(r.amount_minor) FROM storage.receipt r WHERE r.company_id=$1 AND r.brand_id=a.brand_id),0)-COALESCE((SELECT sum(x.amount_minor) FROM storage.allocation x WHERE x.company_id=$1 AND x.brand_id=a.brand_id),0)-COALESCE((SELECT sum(f.amount_minor) FROM storage.refund f WHERE f.company_id=$1 AND f.brand_id=a.brand_id),0))::text AS observed,
      ARRAY(SELECT e.id::text FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='storage' AND e.subject_id=a.brand_id ORDER BY e.id)
       ||ARRAY(SELECT e.source_id::text FROM kernel.journal_effect e WHERE e.company_id=$1 AND e.family='storage' AND e.subject_id=a.brand_id ORDER BY e.id) AS ids
      FROM storage.credit_account a WHERE a.company_id=$1 AND EXISTS(SELECT 1 FROM storage.agreement ag
       JOIN LATERAL(SELECT branch_id FROM storage.agreement_revision g WHERE g.company_id=$1 AND g.agreement_id=ag.id ORDER BY revision DESC LIMIT 1) g ON true
       WHERE ag.company_id=$1 AND ag.brand_id=a.brand_id AND g.branch_id=ANY($2::uuid[])) ORDER BY a.brand_id`,
        args,
      )
    ).rows;
    for (const s of storage)
      if (s.expected !== s.observed)
        add({
          kind: 'storage_credit',
          targetType: 'storage_credit',
          targetId: s.id,
          sourceIds: [...new Set(s.ids)],
          observedVersion: s.revision,
          expectedMinor: s.expected,
          observedMinor: s.observed,
          deltaMinor: (BigInt(s.observed) - BigInt(s.expected)).toString(),
          recoveryPath: '/storage',
          message: 'ائتمان التخزين من الإيصالات والتخصيصات لا يطابق سجله؛ لا تنشأ تسوية تلقائية.',
          sourceCapability: 'storage',
        });
  }
  return findings;
}
