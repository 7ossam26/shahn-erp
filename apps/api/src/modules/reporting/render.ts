import ExcelJS from 'exceljs';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import {
  reportDefinition,
  reportDisplayText,
  reportContextDisplay,
  type ReportSnapshot,
  type ReportRow,
  type ReportColumn,
} from '@shahn/contracts';

export function exactEgp(minor: string) {
  const n = BigInt(minor),
    a = n < 0n ? -n : n;
  return `${n < 0n ? '-' : ''}${a / 100n}.${(a % 100n).toString().padStart(2, '0')}`;
}
/** Explicit string cells only; no user input enters an Excel formula object. */
export function spreadsheetText(s: string) {
  return /^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'" + s : s;
}
export function displayValue(c: ReportColumn, v: string | null | undefined) {
  return v == null
    ? 'غير معلوم'
    : c.type === 'money'
      ? exactEgp(v)
      : c.type === 'date' && v.includes('T')
        ? new Intl.DateTimeFormat('ar-EG', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'Africa/Cairo',
          }).format(new Date(v))
        : reportDisplayText(c.key, v);
}
const htmlEscape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export async function renderXlsx(snapshot: ReportSnapshot, rows: ReportRow[]): Promise<Buffer> {
  const def = reportDefinition(snapshot.reportId),
    book = new ExcelJS.Workbook();
  book.creator = 'Shahn ERP';
  book.created = new Date(snapshot.asOf);
  const sheet = book.addWorksheet('التقرير', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 7 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '7:7',
    },
  });
  sheet.columns = def.columns.map((c) => ({ key: c.key, width: c.type === 'text' ? 25 : 22 }));
  sheet.addRow([snapshot.companyName + ' | ' + def.title]);
  sheet.addRow(['Africa/Cairo | EGP | ' + snapshot.asOf]);
  sheet.addRow([def.dateMeaning]);
  sheet.addRow([JSON.stringify(snapshot.filters)]);
  sheet.addRow(['snapshot ' + snapshot.id + ' | ' + snapshot.dataDigest]);
  sheet.addRow([
    snapshot.coverage.complete
      ? 'مصادر مكتملة ضمن اللقطة'
      : 'مصادر غير مكتملة: ' + snapshot.coverage.flags.join(', '),
  ]);
  sheet.addRow(def.columns.map((c) => c.title));
  for (const row of rows) {
    const r = sheet.addRow(
      def.columns.map((c) =>
        c.type === 'money'
          ? displayValue(c, row.values[c.key])
          : spreadsheetText(displayValue(c, row.values[c.key])),
      ),
    );
    r.height = 45;
  }
  sheet.addRow(
    def.columns.map((c, i) =>
      c.total
        ? displayValue(c, snapshot.totals[c.key])
        : i === 0
          ? 'الإجمالي · ' + rows.length + ' صف'
          : '',
    ),
  );
  sheet.autoFilter = {
    from: { row: 7, column: 1 },
    to: { row: Math.max(7, 7 + rows.length), column: def.columns.length },
  };
  sheet.eachRow((r, n) => {
    r.eachCell((c) => {
      c.font = { name: 'Cairo', size: 11, bold: n <= 7 || n === 8 + rows.length };
      c.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
      c.numFmt = '@';
    });
    if (n <= 6) {
      sheet.mergeCells(n, 1, n, def.columns.length);
      r.height = n === 3 ? 40 : 30;
    }
  });
  sheet.headerFooter = { oddFooter: '&R&P / &N&LSnapshot ' + snapshot.id };
  const source = book.addWorksheet('المصادر', { views: [{ rightToLeft: true }] });
  source.addRow([
    'هوية الصف',
    'المصادر',
    'المراجعة',
    'الفعال UTC',
    'التسجيل UTC',
    'القيم الأصلية - قروش صحيحة',
    'الأثر الاقتصادي وتصحيحه',
  ]);
  for (const row of rows)
    source.addRow(
      [
        row.id,
        row.sourceIds.join(', '),
        row.revision,
        row.effectiveAt ?? 'unknown',
        row.recordedAt ?? 'unknown',
        JSON.stringify(row.values),
        JSON.stringify(row.economicEffect ?? null),
      ].map(spreadsheetText),
    );
  source.columns.forEach((c) => {
    c.width = 40;
  });
  const context = book.addWorksheet('سياق وأرصدة', { views: [{ rightToLeft: true }] });
  context.columns = [{ width: 30 }, { width: 120 }];
  for (const line of reportContextDisplay(snapshot))
    context.addRow(['السياق', spreadsheetText(line)]);
  for (const [key, value] of Object.entries({
    ...snapshot.context,
    scope: snapshot.scope,
    formula: def.formula,
    totals: snapshot.totals,
    coverage: snapshot.coverage,
    filters: snapshot.filters,
  }))
    context.addRow([key, spreadsheetText(JSON.stringify(value))]);
  return Buffer.from(await book.xlsx.writeBuffer());
}
export function printHtml(snapshot: ReportSnapshot, rows: ReportRow[], fontCss = '') {
  const def = reportDefinition(snapshot.reportId),
    e = htmlEscape;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${fontCss}
  @page{size:A3 landscape;margin:14mm 10mm 20mm}*{box-sizing:border-box}body{font-family:Cairo,Arial,sans-serif;font-size:11px;color:#17211a}h1{font-size:22px;margin:0 0 8px}p{margin:4px 0;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;table-layout:fixed;margin-top:14px}thead{display:table-header-group}th,td{border:1px solid #bcc7bd;padding:6px;text-align:right;vertical-align:top;overflow-wrap:anywhere;white-space:normal}th{background:#edf5de;font-weight:700}tr{break-inside:avoid}td.money{direction:ltr;unicode-bidi:isolate;text-align:right}.totals{break-inside:avoid;background:#edf5de;margin-top:10px;padding:10px;font-size:13px}.context{margin-top:14px;border-top:1px solid #ccc}.context pre{font-size:10px;direction:ltr;white-space:pre-wrap;overflow-wrap:anywhere}small{font-size:9px}.warning{color:#783600}footer{font-size:9px} </style></head><body>
  <h1>${e(snapshot.companyName)} · ${e(def.title)}</h1><p>${e(def.dateMeaning)} · أساس التاريخ: ${e(snapshot.dateBasis)} · Cairo / EGP</p>
  <p>وقت اللقطة: <bdi>${e(snapshot.asOf)}</bdi> · عدد الصفوف: ${rows.length} · ${snapshot.scope.completeCompany ? 'نطاق الشركة الكامل' : 'نطاق الفروع المختارة'}</p>
  <p>الفلاتر: <bdi>${e(JSON.stringify(snapshot.filters))}</bdi></p><p>${e(def.formula)}</p>
  ${snapshot.coverage.complete ? '' : `<p class="warning">المصادر غير مكتملة: ${e(snapshot.coverage.flags.join(' · '))}</p>`}
  <small dir="ltr">snapshot ${e(snapshot.id)} | digest ${e(snapshot.dataDigest)}</small>
  <table><thead><tr>${def.columns.map((c) => `<th>${e(c.title)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${def.columns.map((c) => `<td class="${c.type === 'money' ? 'money' : ''}">${e(displayValue(c, r.values[c.key]))}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <div class="totals">عدد الصفوف: ${rows.length} · ${def.columns
    .filter((c) => c.total)
    .map((c) => `${e(c.title)}: <bdi>${e(displayValue(c, snapshot.totals[c.key]))}</bdi>`)
    .join(' · ')}</div>
  ${
    Object.keys(snapshot.context).length
      ? `<div class="context"><h2>الأرصدة والسياق داخل اللقطة</h2>${reportContextDisplay(snapshot)
          .map((line) => `<p>${e(line)}</p>`)
          .join('')}</div>`
      : ''
  }
  </body></html>`;
}
export async function renderPdf(snapshot: ReportSnapshot, rows: ReportRow[]): Promise<Buffer> {
  const require = createRequire(import.meta.url);
  const fonts = await Promise.all(
    ['arabic', 'latin'].map(async (lang) => {
      const p = require.resolve(
        '@fontsource-variable/cairo/files/cairo-' + lang + '-wght-normal.woff2',
      );
      return `@font-face{font-family:Cairo;src:url(data:font/woff2;base64,${(await readFile(p)).toString('base64')}) format('woff2');font-weight:200 1000;}`;
    }),
  );
  const browser = await chromium.launch({
    headless: true,
    ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']
      ? { executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] }
      : {}),
  });
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.route('**/*', (r) => r.abort());
    await page.setContent(printHtml(snapshot, rows, fonts.join('\n')));
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: 'A3',
      landscape: true,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:9px;text-align:center">${htmlEscape(snapshot.id)} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      margin: { bottom: '20mm' },
    });
  } finally {
    await browser.close();
  }
}
