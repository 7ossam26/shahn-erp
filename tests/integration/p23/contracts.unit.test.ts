import { expect, it } from 'vitest';
import {
  reportRegistry,
  validateReportCommand,
  validateExportCommand,
  openApi,
  type ReportSnapshot,
  type ReportRow,
} from '@shahn/contracts';
import { cairoDayRange } from '@shahn/domain';
import ExcelJS from 'exceljs';
import { writeFile } from 'node:fs/promises';
import { normalizeReportFilters } from '../../../apps/api/src/modules/reporting/service.js';
import {
  exactEgp,
  spreadsheetText,
  printHtml,
  renderXlsx,
} from '../../../apps/api/src/modules/reporting/render.js';
const uuid = '00000000-0000-4000-8000-000000000001';
it('selected registry includes P24 profit and excludes count/BI, combines payout placement, declares sources/dates and only closed filter contracts', () => {
  expect(reportRegistry.map((r) => r.id)).toEqual([
    'REP-01',
    'REP-05',
    'REP-07',
    'REP-08',
    'REP-09',
    'REP-10',
    'REP-12',
    'REP-14',
    'REP-15',
    'REP-18',
  ]);
  expect(reportRegistry.filter((r) => r.scope === 'wallet').map((r) => r.surface)).toEqual([
    '/brand-payouts',
    '/brand-payouts',
  ]);
  const input = {
    schemaVersion: 1,
    commandId: uuid,
    companyId: uuid,
    type: 'report.snapshot',
    reportId: 'REP-14',
    filters: {},
    sort: 'dateAsc',
  };
  expect(validateReportCommand(input)).toBe(true);
  expect(validateReportCommand({ ...input, sql: 'DROP TABLE' })).toBe(false);
  expect(validateReportCommand({ ...input, filters: { arbitrary: 'x' } })).toBe(false);
  expect(validateReportCommand({ ...input, reportId: 'REP-15' })).toBe(true);
  expect(() => normalizeReportFilters('REP-18', { from: '2026-10-01' })).toThrow(
    'INVALID_REPORT_FILTER',
  );
  expect(() => normalizeReportFilters('REP-14', { dateBasis: 'visit' })).toThrow(
    'INVALID_DATE_BASIS',
  );
});
it('canonical filters normalize digits, OR lists and inclusive minor bounds without permitting unsupported filters', () => {
  expect(normalizeReportFilters('REP-01', { search: ' ٠١۲٣ ', branchIds: [uuid, uuid] })).toEqual({
    search: '0123',
    branchIds: [uuid],
  });
  expect(() => normalizeReportFilters('REP-14', { minMinor: '100', maxMinor: '99' })).toThrow();
  expect(() => normalizeReportFilters('REP-14', { minMinor: '9223372036854775808' })).toThrow();
  expect(
    validateExportCommand({
      schemaVersion: 1,
      commandId: uuid,
      companyId: uuid,
      type: 'report.export',
      snapshotId: uuid,
      filterDigest: 'a'.repeat(64),
      format: 'xlsx',
    }),
  ).toBe(true);
});
it('exact large EGP never passes through Number; formula-like user strings are explicit literal text', () => {
  expect(exactEgp('9223372036854775807')).toBe('92233720368547758.07');
  expect(exactEgp('-20000')).toBe('-200.00');
  expect(spreadsheetText('\t=SUM(A1:A2)')).toBe("'\t=SUM(A1:A2)");
  expect(spreadsheetText('@cmd')).toBe("'@cmd");
  expect(typeof printHtml).toBe('function');
});
it('writer preserves a long numeric reference and bigint money as exact text with parsed XLSX cells; OpenAPI contains actual authorized binary download and queued response', async () => {
  const snapshot: ReportSnapshot = {
    id: uuid,
    reportId: 'REP-01',
    companyName: 'اختبار دقة الكاتب فقط',
    asOf: '2026-10-08T12:00:00Z',
    filterDigest: 'a'.repeat(64),
    dataDigest: 'b'.repeat(64),
    filters: {},
    sort: 'dateAsc',
    dateBasis: 'created',
    scope: {
      branchIds: [uuid],
      authorizationRevision: '1',
      completeCompany: false,
      policy: 'assigned',
    },
    totalRows: 1,
    totals: {},
    context: {},
    coverage: { complete: true, flags: [], revisions: [] },
  };
  const row: ReportRow = {
    id: uuid,
    values: { reference: '900719925474099312345', tariffMinor: '9223372036854775807' },
    sourceIds: [uuid],
    revision: '1',
    effectiveAt: null,
    recordedAt: null,
    detail: null,
  };
  const bytes = await renderXlsx(snapshot, [row]),
    book = new ExcelJS.Workbook();
  await book.xlsx.load(Uint8Array.from(bytes).buffer);
  const sheet = book.getWorksheet('التقرير')!;
  expect(sheet.getCell('A8').type).toBe(ExcelJS.ValueType.String);
  expect(sheet.getCell('A8').value).toBe(row.values['reference']);
  const moneyColumn = reportRegistry[0]!.columns.findIndex((c) => c.key === 'tariffMinor') + 1;
  expect(sheet.getRow(8).getCell(moneyColumn).value).toBe('92233720368547758.07');
  const unknownBook = new ExcelJS.Workbook();
  await unknownBook.xlsx.load(
    Uint8Array.from(
      await renderXlsx(snapshot, [{ ...row, values: { ...row.values, tariffMinor: null } }]),
    ).buffer,
  );
  expect(unknownBook.getWorksheet('التقرير')!.getRow(8).getCell(moneyColumn).value).toBe(
    'غير معلوم',
  );
  const paths = openApi['paths'] as Record<
    string,
    { post?: { responses: Record<string, unknown> }; get?: { security: unknown[] } }
  >;
  expect(paths['/api/v1/reports/exports']!.post!.responses['202']).toBeTruthy();
  expect(paths['/api/v1/reports/exports/{id}/download']!.get!.security).toEqual([
    { erpSession: [] },
  ]);
  await writeFile('docs/verification/P23/writer-precision.xlsx', bytes);
});
it('Cairo day filters are half-open UTC bounds and retain timezone-rule 23/25-hour transitions', () => {
  const spring = cairoDayRange('2026-04-24'),
    fall = cairoDayRange('2026-10-29');
  expect((Date.parse(spring.end) - Date.parse(spring.start)) / 3600000).toBe(23);
  expect((Date.parse(fall.end) - Date.parse(fall.start)) / 3600000).toBe(25);
});
