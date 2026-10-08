// Narrow UI script harness. Authority and source maths are separately tested through real HTTP/PostgreSQL.
import { afterEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { reportRegistry, type ReportPage } from '@shahn/contracts';
import { ReportWorkspace } from '../../../apps/web/src/features/reports/reports.js';
const company = '00000000-0000-4000-8000-000000000001',
  principal = '00000000-0000-4000-8000-000000000002',
  branch = '00000000-0000-4000-8000-000000000003',
  snapshot = '00000000-0000-4000-8000-000000000004',
  job = '00000000-0000-4000-8000-000000000005';
vi.mock('../../../apps/web/src/features/access/access.js', () => ({
  useAccess: () => ({
    registry: {
      context: {
        companyId: company,
        grants: ['reports'],
        assignedBranches: [{ id: branch, name: 'الفرع أ' }],
      },
    },
    session: { principalId: principal, csrfToken: 'ui-fixture' },
  }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
const page: ReportPage = {
  snapshot: {
    id: snapshot,
    reportId: 'REP-14',
    companyName: 'UI script fixture',
    asOf: '2026-10-08T12:00:00Z',
    filterDigest: 'a'.repeat(64),
    dataDigest: 'b'.repeat(64),
    filters: { search: 'P23', branchIds: [branch] },
    sort: 'dateAsc',
    dateBasis: 'actual',
    scope: {
      branchIds: [branch],
      authorizationRevision: '1',
      completeCompany: false,
      policy: 'assigned',
    },
    totalRows: 27,
    totals: { amountMinor: '20000' },
    context: {},
    coverage: { complete: false, flags: ['SOURCE_HISTORY_INCOMPLETE'], revisions: [] },
  },
  rows: [
    {
      id: 'row',
      values: { description: 'P23', amountMinor: '20000' },
      sourceIds: [branch],
      revision: '1',
      effectiveAt: null,
      recordedAt: null,
      detail: null,
    },
  ],
  page: 1,
  limit: 25,
};
function mount(fetcher: typeof fetch) {
  vi.stubGlobal('fetch', fetcher);
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter
        initialEntries={[
          '/reports/REP-14?filters=' + encodeURIComponent(JSON.stringify(page.snapshot.filters)),
        ]}
      >
        <ReportWorkspace reportId="REP-14" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const json = (v: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } }),
  );
const catalog = {
  reports: reportRegistry,
  branches: [{ id: branch, name: 'الفرع أ' }],
  companyBranches: [],
  brands: [],
  drivers: [],
  accounts: [],
  references: [],
};
it('advanced filters stay collapsed by default, pagination keeps filters, applying/resetting starts page1 and source gaps stay visible', async () => {
  const requests: Record<string, unknown>[] = [];
  mount(
    vi.fn(async (url, options) => {
      const path = String(url);
      if (path.includes('catalog')) return json(catalog);
      if (options?.method === 'POST') {
        const body = JSON.parse(String(options.body));
        requests.push(body);
        return json({ ...page, snapshot: { ...page.snapshot, filters: body.filters } });
      }
      return json({ ...page, page: path.includes('page=2') ? 2 : 1 });
    }),
  );
  await screen.findByText(/البيانات غير مكتملة/);
  await waitFor(() => expect(screen.getByLabelText('إجماليات اللقطة')).toHaveTextContent('200.00'));
  expect(screen.getByText(/فلاتر متقدمة/).closest('details')).not.toHaveAttribute('open');
  fireEvent.click(await screen.findByRole('button', { name: 'التالي' }));
  await screen.findByText('صفحة 2 من 2');
  expect(screen.getByLabelText('بحث')).toHaveValue('P23');
  fireEvent.change(screen.getByLabelText('بحث'), { target: { value: 'P23 filtered' } });
  fireEvent.click(screen.getByRole('button', { name: 'تطبيق الفلاتر' }));
  await screen.findByText('صفحة 1 من 2');
  await waitFor(() =>
    expect(requests.at(-1)?.filters).toEqual({ search: 'P23 filtered', branchIds: [branch] }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'مسح الفلاتر' }));
  await waitFor(() => expect(requests.at(-1)?.filters).toEqual({}));
  expect(screen.getByLabelText('بحث')).toHaveValue('');
});
it('lost export response retains original command identity; no download announced until an existing completed artifact is returned', async () => {
  const exports: Record<string, unknown>[] = [];
  const retained = {
    id: job,
    snapshotId: snapshot,
    format: 'xlsx',
    state: 'pending',
    attempts: 0,
    error: null,
    artifactId: null,
    expiresAt: '2026-10-09T12:00:00Z',
    downloadUrl: null,
  };
  mount(
    vi.fn(async (url, options) => {
      const path = String(url);
      if (path.includes('catalog')) return json(catalog);
      if (path.endsWith('/exports')) {
        exports.push(JSON.parse(String(options?.body)));
        if (exports.length === 1) throw new TypeError('lost response');
        return json(retained);
      }
      if (path.includes('/exports/'))
        return json({
          ...retained,
          state: 'completed',
          artifactId: branch,
          downloadUrl: '/api/v1/reports/exports/' + job + '/download?companyId=' + company,
        });
      return json(page);
    }),
  );
  await screen.findByText(/27 صف/);
  fireEvent.click(await screen.findByRole('button', { name: 'تصدير XLSX' }));
  await screen.findByText(/لم تصل نتيجة التصدير/);
  expect(screen.queryByRole('link', { name: 'تنزيل XLSX' })).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: 'تصدير XLSX' }));
  await screen.findByRole('link', { name: 'تنزيل XLSX' });
  expect(exports).toHaveLength(2);
  expect(exports[0]).toEqual(exports[1]);
});
it('load errors and empty results are distinct and both retain selected filters', async () => {
  let failed = true;
  mount(
    vi.fn(async (url) =>
      String(url).includes('catalog')
        ? json(catalog)
        : failed
          ? json({ code: 'REQUEST_FAILED' }, 503)
          : json({
              ...page,
              rows: [],
              snapshot: { ...page.snapshot, totalRows: 0, totals: { amountMinor: '0' } },
            }),
    ),
  );
  await screen.findByText('تعذر تحميل التقرير');
  expect(screen.getByLabelText('بحث')).toHaveValue('P23');
  failed = false;
  fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
  await screen.findByText('لا توجد بيانات لهذه الفلاتر');
  expect(screen.getByLabelText('بحث')).toHaveValue('P23');
});
