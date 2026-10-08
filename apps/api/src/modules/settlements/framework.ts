import { randomUUID } from 'node:crypto';
import { AccessError, assertCapability, type Capability } from '@shahn/domain';
import type {
  SettlementClassification,
  SettlementLink,
  SettlementOperation,
  SettlementOperationName,
  SettlementPreview,
  SettlementTargetKind,
  SettlementVersion,
} from '@shahn/contracts';
import { canonical, digest } from '../access/crypto.js';
import type { UnitOfWork } from '../kernel/unit-of-work.js';

export type PreviewBody = Omit<SettlementPreview, 'digest'>;
export type SettlementFaultStage = 'recorded' | 'effects' | 'links' | 'result';
export interface SettlementHooks {
  /** Test-only seams inside the single confirmation transaction; production passes none. */
  fault?: (stage: SettlementFaultStage) => Promise<void>;
  /** Test-only barrier after the resolver has taken its locks and before verification. */
  afterLock?: (u: UnitOfWork, operation: SettlementOperationName) => Promise<void>;
}
export interface RecordInput {
  classification: SettlementClassification;
  amountMinor: string | null;
  quantity: number | null;
  sourceId: string | null;
}
export interface ConfirmContext {
  recordId: string;
  reason: string;
  /** The versions the user reviewed; a delegated owner may recheck them under its own locks. */
  expectedVersions: readonly SettlementVersion[];
  hooks: SettlementHooks;
  /** Lock an existing case first (identity class) and return its row. */
  lockCase(caseId: string): Promise<CaseRow>;
  /** Recalculated under the resolver's locks; rejects a stale or blocked preview. */
  verify(body: PreviewBody): Promise<SettlementPreview>;
  /** Persist case (new) and the immutable resolution before effects that reference it. */
  record(input: RecordInput): Promise<{ caseId: string; resolutionId: string; reference: string }>;
  link(role: SettlementLink['role'], entityKind: string, entityId: string, label: string): void;
}
export interface ConfirmResult {
  state: 'open' | 'resolved';
}
export interface CaseRow {
  id: string;
  reference: string;
  target_kind: SettlementTargetKind;
  target_id: string;
  branch_id: string;
  operation: SettlementOperationName;
  state: 'open' | 'resolved';
  version: number;
}
/**
 * One explicitly registered typed resolver. It declares authority, the states it accepts, the
 * transitions it refuses and performs its own ordered locking. Nothing here interprets a client
 * table/column/kind name: dispatch is by the closed `operation` discriminator only.
 */
export interface Resolver<O extends SettlementOperation = SettlementOperation> {
  operation: SettlementOperationName;
  targetKind: SettlementTargetKind;
  /** Screen grants required in addition to `settlements`. */
  capabilities: readonly Capability[];
  allowedStates: string;
  forbidden: readonly string[];
  matches(op: SettlementOperation): op is O;
  branchOf(u: UnitOfWork, op: O): Promise<string>;
  preview(u: UnitOfWork, op: O): Promise<PreviewBody>;
  confirm(u: UnitOfWork, op: O, ctx: ConfirmContext): Promise<ConfirmResult>;
}
export function previewDigest(op: SettlementOperation, body: PreviewBody): string {
  return digest(canonical({ op, body }));
}
export function finishPreview(op: SettlementOperation, body: PreviewBody): SettlementPreview {
  return { ...body, digest: previewDigest(op, body) };
}
export function assertResolverGrants(u: UnitOfWork, r: Resolver) {
  assertCapability(u.access, 'settlements');
  for (const c of r.capabilities) assertCapability(u.access, c);
}
export function branchName(u: UnitOfWork, id: string) {
  const b =
    u.access.assignedBranches.find((x) => x.id === id) ??
    u.access.companyBranches.find((x) => x.id === id);
  return b?.name ?? id;
}
export const sameVersions = (a: readonly SettlementVersion[], b: readonly SettlementVersion[]) =>
  canonical([...a].sort((x, y) => x.key.localeCompare(y.key))) ===
  canonical([...b].sort((x, y) => x.key.localeCompare(y.key)));
export function rejection(code: string, details: Record<string, unknown>) {
  return Object.assign(new AccessError(code, 409), { details });
}
export async function lockCaseRow(u: UnitOfWork, caseId: string): Promise<CaseRow> {
  u.lockOrder('identity', 'settlement-case:' + caseId);
  const row = (
    await u.client.query<CaseRow>(
      `SELECT id,reference,target_kind,target_id,branch_id,operation,state,version FROM settlements.adjustment_case WHERE company_id=$1 AND id=$2 FOR UPDATE`,
      [u.access.companyId, caseId],
    )
  ).rows[0];
  if (!row) throw new AccessError('NOT_FOUND', 404);
  u.assertBranch(row.branch_id);
  return row;
}
export interface ConfirmState {
  caseId: string | null;
  caseReference: string | null;
  resolutionId: string | null;
  preview: SettlementPreview | null;
  links: SettlementLink[];
}
export function newConfirmState(): ConfirmState {
  return { caseId: null, caseReference: null, resolutionId: null, preview: null, links: [] };
}
/** Shared recorder used by the confirmation definition. */
export function confirmContext(
  u: UnitOfWork,
  op: SettlementOperation,
  input: {
    recordId: string;
    reason: string;
    expectedVersions: SettlementVersion[];
    expectedDigest: string;
    hooks: SettlementHooks;
    resolver: Resolver;
  },
  state: ConfirmState,
): ConfirmContext {
  let existing: CaseRow | null = null;
  return {
    recordId: input.recordId,
    reason: input.reason,
    expectedVersions: input.expectedVersions,
    hooks: input.hooks,
    lockCase: async (caseId) => {
      existing = await lockCaseRow(u, caseId);
      return existing;
    },
    verify: async (body) => {
      await input.hooks.afterLock?.(u, input.resolver.operation);
      const preview = finishPreview(op, body);
      if (
        preview.digest !== input.expectedDigest ||
        !sameVersions(preview.versions, input.expectedVersions)
      )
        throw rejection('SETTLEMENT_PREVIEW_STALE', {
          currentDigest: preview.digest,
          versions: preview.versions,
          blockers: preview.blockers,
        });
      if (preview.blockers.length)
        throw rejection(preview.blockers[0]!, { blockers: preview.blockers });
      state.preview = preview;
      return preview;
    },
    record: async (r) => {
      const preview = state.preview;
      if (!preview) throw new Error('SETTLEMENT_VERIFY_REQUIRED');
      const company = u.access.companyId;
      let caseId: string, reference: string;
      const actualDate =
        'actualDate' in op
          ? op.actualDate
          : op.operation === 'account.resolve'
            ? op.resolution.actualDate
            : op.operation === 'employee.adjust'
              ? op.workDate
              : op.operation === 'parcel.incident'
                ? op.report.observedAt.slice(0, 10)
                : null;
      const today = (
        await u.client.query<{ today: string }>(
          `SELECT (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date::text AS today`,
        )
      ).rows[0]!.today;
      const effectiveDate = actualDate && actualDate <= today ? actualDate : today;
      if (actualDate && actualDate > today) throw rejection('FUTURE_ACTUAL_DATE', { today });
      if (existing) {
        if (existing.state !== 'open') throw rejection('SETTLEMENT_ALREADY_RESOLVED', {});
        caseId = existing.id;
        reference = existing.reference;
      } else {
        caseId = randomUUID();
        reference = (
          await u.client.query<{ reference: string }>(
            `INSERT INTO settlements.adjustment_case(company_id,id,target_kind,target_id,branch_id,operation,state,reason,actual_date,opened_command_record_id,actor_id,actor_name)
             VALUES($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,$11) RETURNING reference`,
            [
              company,
              caseId,
              preview.target.kind,
              preview.target.id,
              preview.target.branchId,
              input.resolver.operation,
              input.reason,
              effectiveDate,
              input.recordId,
              u.access.principalId,
              u.access.displayName,
            ],
          )
        ).rows[0]!.reference;
      }
      const resolutionId = randomUUID();
      await u.client.query(
        `INSERT INTO settlements.resolution(company_id,id,case_id,operation,classification,amount_minor,quantity,source_id,effect_digest,preview,reason,actual_date,command_record_id,actor_id,actor_name)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          company,
          resolutionId,
          caseId,
          op.operation,
          r.classification,
          r.amountMinor,
          r.quantity,
          r.sourceId,
          preview.digest,
          JSON.stringify(preview),
          input.reason,
          effectiveDate,
          input.recordId,
          u.access.principalId,
          u.access.displayName,
        ],
      );
      state.caseId = caseId;
      state.caseReference = reference;
      state.resolutionId = resolutionId;
      await input.hooks.fault?.('recorded');
      return { caseId, resolutionId, reference };
    },
    link: (role, entityKind, entityId, label) => {
      if (
        !state.links.some(
          (l) => l.role === role && l.entityKind === entityKind && l.entityId === entityId,
        )
      )
        state.links.push({ role, entityKind, entityId, label: label.slice(0, 300) });
    },
  };
}
