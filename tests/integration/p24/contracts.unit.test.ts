import { it, expect } from 'vitest';
import {
  reportDefinition,
  validateReportCommand,
  reportingResponseValidators,
  profitCategories,
} from '@shahn/contracts';
import { normalizeReportFilters } from '../../../apps/api/src/modules/reporting/service.js';
import { randomUUID } from 'node:crypto';
const command = {
  schemaVersion: 1,
  type: 'report.snapshot',
  companyId: randomUUID(),
  commandId: randomUUID(),
  reportId: 'REP-15',
  filters: { from: '2026-01-01', to: '2026-01-31', dateBasis: 'effective' },
  sort: 'dateAsc',
};
it('selectedREP15 declares only company/branch period controls and immutable source schema', () => {
  const r = reportDefinition('REP-15');
  expect(r.capabilities).toEqual(['reports']);
  expect(r.filters).toEqual(['branchIds', 'from', 'to', 'dateBasis']);
  expect(r.dateBases).toEqual(['effective', 'recorded']);
  expect(validateReportCommand(command)).toBe(true);
  expect(profitCategories).toHaveLength(10);
  expect(validateReportCommand({ ...command, reportId: 'REP-20' })).toBe(false);
});
it('filters fail closed for unrelated controls/datebasis, preserve branch OR canonical identity and require valid Cairo date ranges', () => {
  const a = randomUUID(),
    b = randomUUID();
  expect(
    normalizeReportFilters('REP-15', { branchIds: [b, a, b], dateBasis: 'recorded' }).branchIds,
  ).toEqual([a, b].sort());
  expect(() => normalizeReportFilters('REP-15', { brandIds: [a] })).toThrow(
    'INVALID_REPORT_FILTER',
  );
  expect(() => normalizeReportFilters('REP-15', { dateBasis: 'actual' })).toThrow(
    'INVALID_DATE_BASIS',
  );
  expect(() => normalizeReportFilters('REP-15', { from: '2026-02-01', to: '2026-01-31' })).toThrow(
    'VALIDATION_FAILED',
  );
  expect(validateReportCommand({ ...command, filters: { from: '2026-02-30' } })).toBe(false);
});
it('economic source detail does not accept guessed category or undocumented fields', () => {
  const row = {
    id: randomUUID(),
    values: {},
    sourceIds: [],
    revision: '1',
    effectiveAt: null,
    recordedAt: null,
    detail: null,
    economicEffect: {
      companyId: randomUUID(),
      sourceId: randomUUID(),
      effectId: randomUUID(),
      category: 'guessed_income',
      amountMinor: '700',
      effectiveDate: '2026-01-01',
      recordedAt: '2026-02-01T00:00:00Z',
      historicalBranchId: randomUUID(),
      postingBatchId: null,
      correctionOf: [],
      revision: '1',
      sourceCapability: 'tracking',
      sourcePath: null,
    },
  };
  expect(reportingResponseValidators.row(row)).toBe(false);
  expect(
    reportingResponseValidators.row({
      ...row,
      economicEffect: { ...row.economicEffect, category: 'shipping_gross' },
    }),
  ).toBe(true);
});
