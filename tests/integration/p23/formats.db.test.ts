import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { isolatedPostgres } from '@shahn/test-support';
import { migrate } from '@shahn/database';
import { reportRegistry, type ExportCommand, type ExportJob } from '@shahn/contracts';
import { reportFixture } from './fixtures.js';
import { UnitOfWork } from '../../../apps/api/src/modules/kernel/unit-of-work.js';
import { snapshotRows } from '../../../apps/api/src/modules/reporting/service.js';
import {
  exportCommands,
  ExportWorker,
  downloadExport,
} from '../../../apps/api/src/modules/reporting/exports.js';
import { displayValue } from '../../../apps/api/src/modules/reporting/render.js';
it('A01 all nine authorized registry reports publish real XLSX/PDF jobs from the identical frozen rows/totals; parse every workbook cell and provenance identity', async () => {
  const db = await isolatedPostgres();
  await migrate(db.pool);
  const f = await reportFixture(db.pool);
  const evidence = [];
  try {
    await mkdir('docs/verification/P23/reports', { recursive: true });
    for (const def of reportRegistry) {
      const page = await f.report(def.id),
        rows = await snapshotRows(db.pool, f.company, page.snapshot.id),
        jobs = [];
      for (const format of ['xlsx', 'pdf'] as const) {
        const input: ExportCommand = {
          schemaVersion: 1,
          commandId: randomUUID(),
          companyId: f.company,
          type: 'report.export',
          snapshotId: page.snapshot.id,
          filterDigest: page.snapshot.filterDigest,
          format,
        };
        const job = (await exportCommands(db.pool).execute(f.admin.token, input)).body as ExportJob;
        await new ExportWorker(db.pool).runOne();
        const a = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'reports', (u) =>
          downloadExport(u, job.id),
        );
        if (format === 'xlsx') {
          const book = new ExcelJS.Workbook();
          await book.xlsx.load(Uint8Array.from(a.bytes!).buffer);
          const sheet = book.getWorksheet('التقرير')!,
            source = book.getWorksheet('المصادر')!;
          expect(source.rowCount).toBe(rows.length + 1);
          expect(String(sheet.getCell('A5').value)).toContain(page.snapshot.id);
          for (let i = 0; i < rows.length; i++) {
            expect(source.getRow(i + 2).getCell(1).value).toBe(rows[i]!.id);
            for (let c = 0; c < def.columns.length; c++) {
              const col = def.columns[c]!,
                actual = sheet.getRow(i + 8).getCell(c + 1);
              const expected = displayValue(col, rows[i]!.values[col.key]);
              expect(String(actual.value)).toBe(
                /^[\s\u0000-\u001f]*[=+@-]/.test(expected) && col.type !== 'money'
                  ? "'" + expected
                  : expected,
              );
              expect(actual.type).not.toBe(ExcelJS.ValueType.Formula);
              if (col.total)
                expect(String(sheet.getRow(rows.length + 8).getCell(c + 1).value)).toBe(
                  displayValue(col, page.snapshot.totals[col.key]),
                );
            }
          }
        } else expect(a.bytes!.subarray(0, 5).toString()).toBe('%PDF-');
        const path = `docs/verification/P23/reports/${def.id}.${format}`;
        await writeFile(path, a.bytes!);
        jobs.push({ format, jobId: job.id, sha256: a.sha256, path });
      }
      evidence.push({
        reportId: def.id,
        snapshot: page.snapshot,
        rowIds: rows.map((r) => r.id),
        jobs,
      });
    }
    await writeFile(
      'docs/verification/P23/all-report-formats.json',
      JSON.stringify(evidence, null, 2),
    );
  } finally {
    await f.close();
    await db.dispose();
  }
}, 120000);
