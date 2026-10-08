import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PayrollMonth, PayrollCommand } from '@shahn/contracts';
import { calculatePayroll } from '@shahn/domain';
const id = '00000000-0000-4000-a000-000000000020';
vi.mock('../../../apps/web/src/features/access/access.js', () => ({
  useAccess: () => ({
    registry: {
      context: { companyId: id, assignedBranches: [{ id, name: 'فرع الرواتب' }] },
      capabilities: [],
    },
    session: { principalId: id, csrfToken: 'csrf' },
  }),
  Reauthenticate: () => null,
}));
const { PayrollActionPage, PayrollMonthPage } =
  await import('../../../apps/web/src/features/employees/payroll/payroll.js');
let month: PayrollMonth, commands: PayrollCommand[], lose: boolean;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
beforeEach(() => {
  sessionStorage.clear();
  commands = [];
  lose = false;
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  const earnings: PayrollMonth['earnings'] = [
    {
      id,
      kind: 'salary',
      amountMinor: '600000',
      branchId: id,
      workDate: '2026-10-01',
      recordedAt: '2026-10-01',
      sourceId: id,
      label: 'الراتب الكامل',
      visitId: null,
      policyId: id,
    },
  ];
  month = {
    employeeId: id,
    employeeName: 'موظف الاختبار',
    branchId: id,
    month: '2026-10',
    currentMonth: '2026-10',
    state: 'editable_unpaid',
    version: 1,
    digest: 'a'.repeat(64),
    frozenAt: null,
    calculation: calculatePayroll('2026-10', earnings, []),
    earnings,
    obligations: [],
    reviews: [],
    blockers: [],
    payment: null,
  };
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    if (url.includes('/catalog'))
      return json({
        accounts: [
          { id, name: 'خزنة الاختبار', type: 'cash', balanceMinor: '1000000', branchIds: [id] },
        ],
      });
    if (url.endsWith('/payout-preview'))
      return json({
        month,
        funding: JSON.parse(String(init.body)).funding,
        accountName: 'خزنة الاختبار',
        availableMinor: '1000000',
        blockers: [],
      });
    if (url.includes('/commands/')) return json({ code: 'NOT_FOUND' }, 404);
    if (init.method === 'POST') {
      const c = JSON.parse(String(init.body)) as PayrollCommand;
      commands.push(c);
      if (lose) {
        lose = false;
        throw Error('dropped response');
      }
      return json({
        commandId: c.commandId,
        employeeId: id,
        month: c.month,
        recordId: id,
        kind: c.type,
        amountMinor: c.type === 'payroll.zero-close' ? '0' : month.calculation.netPayable,
      });
    }
    return json(month);
  });
});
const mount = (mode: 'payout' | 'advance' = 'payout') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/employees/${id}/months/2026-10/${mode}`]}>
        <Routes>
          <Route
            path="/employees/:id/months/:month/:action"
            element={<PayrollActionPage mode={mode} />}
          />
          <Route path="/employees/:id/months/:month" element={<p>تم الحفظ</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
it('read-only full net; unknown response survives remount and 404 retry reuses the exact command identity', async () => {
  let view = mount();
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'دفع الصافي بالكامل' });
  expect(screen.queryByLabelText('المبلغ بالجنيه')).not.toBeInTheDocument();
  await user.selectOptions(await screen.findByLabelText('الحساب الممول'), id);
  await user.click(screen.getByRole('button', { name: 'معاينة الدفع الكامل' }));
  await screen.findByRole('heading', { name: 'تأكيد دفع الصافي الكامل' });
  lose = true;
  await user.click(screen.getByRole('button', { name: 'تأكيد دفع الصافي بالكامل' }));
  await screen.findByRole('button', { name: 'تحقق من نتيجة الطلب' });
  expect(screen.getByRole('button', { name: 'تأكيد دفع الصافي بالكامل' })).toBeDisabled();
  expect(commands).toHaveLength(1);
  expect(commands[0]).not.toHaveProperty('amountMinor');
  view.unmount();
  view = mount();
  await user.click(await screen.findByRole('button', { name: 'تحقق من نتيجة الطلب' }));
  await screen.findByText('تم الحفظ');
  expect(commands).toHaveLength(2);
  expect(commands[1]).toEqual(commands[0]);
  expect(sessionStorage.length).toBe(0);
  view.unmount();
});
it('zero closure has no account, method or invented cash amount', async () => {
  month.earnings = [];
  month.calculation = calculatePayroll(month.month, [], []);
  mount();
  await screen.findByRole('heading', { name: 'إقفال صافي صفر' });
  expect(screen.queryByLabelText('الحساب الممول')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'تأكيد إقفال صافي صفر' }));
  await screen.findByText('تم الحفظ');
  expect(commands[0]?.type).toBe('payroll.zero-close');
  expect(commands[0]).not.toHaveProperty('funding');
});
it('advance form uses explicit actual funding and waits for connection without sending money', async () => {
  mount('advance');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('المبلغ بالجنيه'), '١٠٠٠');
  await user.selectOptions(await screen.findByLabelText('الحساب الممول'), id);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  await user.click(screen.getByRole('button', { name: 'تأكيد صرف سلفة فعلية' }));
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(commands).toHaveLength(0);
  expect(sessionStorage.length).toBe(0);
});
it('posting-date filters use Cairo midnight for earnings and original obligations', async () => {
  const user = userEvent.setup();
  month.earnings[0]!.recordedAt = '2026-10-07T21:30:00Z';
  month.earnings[0]!.label = 'راتب سجل بعد منتصف الليل';
  month.obligations = [
    {
      id,
      kind: 'advance',
      sourceId: id,
      sourceLabel: 'سلفة يوم القاهرة',
      month: month.month,
      effectiveDate: '2026-10-01',
      recordedAt: '2026-10-07 21:30:00.123456+00',
      branchId: id,
      amountMinor: '100000',
      outstandingAmount: '100000',
      reservedForFrozenPeriods: '0',
      availableForNewAllocation: '100000',
    },
  ];
  month.calculation = calculatePayroll(month.month, month.earnings, month.obligations);
  month.reviews = [
    {
      id,
      visitId: id,
      workMonth: '2026-09',
      workDate: '2026-09-30',
      branchId: id,
      kind: 'late_commission',
      amountMinor: '500',
      postedMinor: '0',
      reason: 'عمولة قديمة',
      resolvedMonth: null,
    },
  ];
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter
        initialEntries={[
          `/employees/${id}/months/2026-10?dateBasis=recorded&from=2026-10-08&to=2026-10-08`,
        ]}
      >
        <Routes>
          <Route path="/employees/:id/months/:month" element={<PayrollMonthPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(await screen.findByText('راتب سجل بعد منتصف الليل')).toBeInTheDocument();
  expect(screen.getByText(/سلفة يوم القاهرة/)).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'مراجعة واعتماد تسوية مرتبطة' }).getAttribute('href'),
  ).toContain('dateBasis=recorded&from=2026-10-08&to=2026-10-08');
  expect(screen.getByRole('link', { name: 'ملف الموظف' }).getAttribute('href')).toContain(
    'dateBasis=recorded',
  );
  await user.selectOptions(screen.getByLabelText('أساس التاريخ'), 'work');
  expect(screen.queryByText('راتب سجل بعد منتصف الليل')).not.toBeInTheDocument();
  expect(screen.queryByText(/سلفة يوم القاهرة/)).not.toBeInTheDocument();
});
