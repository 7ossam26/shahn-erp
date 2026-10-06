import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  IncidentCatalog,
  IncidentDetail,
  IncidentConfirmation,
  IncidentCommand,
  IncidentPreview,
  IncidentCandidate,
} from '@shahn/contracts';
const ids = {
  company: '0b7c8f86-0d5c-4ad0-9f77-3a2f3a9c1e01',
  brand: '4e0f6b1a-1f7e-4c55-8d5d-1b7a2c9e3f02',
  branch: '8a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c04',
  employee: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e06',
  principal: '6f5e4d3c-2b1a-4098-8765-43210fedcba9',
  incident: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  shipment: '9e8d7c6b-5a49-4382-9170-6f5e4d3c2b10',
};
vi.mock('../../../apps/web/src/features/access/access.js', () => ({
  useAccess: () => ({
    registry: {
      context: {
        companyId: ids.company,
        principalId: ids.principal,
        authorizationRevision: '1',
        assignedBranches: [{ id: ids.branch, name: 'فرع الحيازة' }],
      },
      capabilities: [],
    },
    session: { principalId: ids.principal, csrfToken: 'csrf' },
  }),
  Reauthenticate: () => null,
}));
const { IncidentConfirmationForm, IncidentReportPage } =
  await import('../../../apps/web/src/features/incidents/incidents.js');
const catalog: IncidentCatalog = {
  branches: [{ id: ids.branch, name: 'فرع الحيازة' }],
  brands: [{ id: ids.brand, name: 'البراند' }],
  employees: [{ id: ids.employee, name: 'الموظف', branchId: ids.branch }],
  currentMonth: '2026-10',
};
const candidate: IncidentCandidate = {
  kind: 'shipment_line',
  sourceId: ids.shipment,
  lineId: ids.employee,
  key: 'shipment_line:' + ids.shipment + ':' + ids.employee,
  brandId: ids.brand,
  branchId: ids.branch,
  shipmentId: ids.shipment,
  label: '123 · قطع متأثرة',
  capacity: 3,
  holder: 'driver',
  driverId: ids.employee,
  variantId: null,
  sourceCondition: 'sound',
  returnRequestId: null,
  returnItemId: null,
  returnRevision: null,
  claimed: [{ offset: 0, quantity: 1 }],
};
const detail = {
  id: ids.incident,
  version: 1,
  custodyBranchId: ids.branch,
  responsibleBranchId: ids.branch,
} as IncidentDetail;
type Call = { url: string; body?: IncidentCommand | { confirmation: IncidentConfirmation } };
let calls: Call[], respond: (c: Call) => Promise<Response> | Response;
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
const preview = (c: IncidentConfirmation, blocked = false): IncidentPreview => ({
  confirmation: c,
  blockers: blocked ? ['PAYROLL_PERIOD_PROTECTED'] : [],
  allowedPayrollMonth: blocked ? '2026-11' : '2026-10',
  walletCreditMinor: c.compensationMinor,
  employeeObligationMinor: c.employeeShareMinor,
  compensationCostMinor: c.compensationMinor,
  employeeCompensationShareMinor: c.employeeShareMinor,
  cashMinor: '0',
});
const result = (c: IncidentCommand) => ({
  commandId: c.commandId,
  incidentId: ids.incident,
  reference: '18',
  version: 2,
});
beforeEach(() => {
  calls = [];
  sessionStorage.clear();
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const c = { url, ...(init.body ? { body: JSON.parse(String(init.body)) } : {}) };
    calls.push(c);
    return respond(c);
  });
});
async function fill() {
  const user = userEvent.setup();
  for (const [label, value] of [
    ['قيمة البضاعة المتأثرة (ج.م)', '٤٠٠'],
    ['التعويض المتفق عليه (ج.م)', '400'],
    ['حصة الشركة (ج.م)', '200'],
    ['حصة الموظف (ج.م)', '200'],
  ]) {
    await user.clear(screen.getByLabelText(label!));
    await user.type(screen.getByLabelText(label!), value!);
  }
  await user.selectOptions(screen.getByLabelText('الموظف المسؤول'), ids.employee);
  await user.type(
    screen.getByLabelText('أساس القيمة واتفاق المسؤولية'),
    'اتفاق المسؤولية وقيمة البضاعة دون الشحن '.repeat(3),
  );
  return user;
}
it('explicit review explains 400 eligible / 200 obligation / zero cash before confirm and preserves unknown response across remount', async () => {
  const saved = vi.fn();
  let committed: IncidentCommand | undefined;
  respond = (c) => {
    if (c.url.endsWith('confirmation-preview'))
      return json(preview((c.body as { confirmation: IncidentConfirmation }).confirmation));
    if (c.url.includes('/commands/')) return json(result(committed!));
    committed = c.body as IncidentCommand;
    throw Error('lost response');
  };
  const mount = () =>
    render(<IncidentConfirmationForm detail={detail} catalog={catalog} onSaved={saved} />);
  let view = mount();
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'معاينة آثار التأكيد' }));
  const review = await screen.findByRole('region', { name: 'آثار تأكيد التعويض' });
  expect(within(review).getByText('400.00 ج.م')).toBeVisible();
  expect(within(review).getByText('200.00 ج.م')).toBeVisible();
  expect(within(review).getByText('0 ج.م')).toBeVisible();
  expect(calls.filter((c) => c.url.endsWith('/confirm'))).toHaveLength(0);
  await user.dblClick(screen.getByRole('button', { name: 'تأكيد التعويض والمسؤولية' }));
  await screen.findByRole('button', { name: 'التحقق من النتيجة' });
  expect(calls.filter((c) => c.url.endsWith('/confirm'))).toHaveLength(1);
  expect(screen.getByLabelText('التعويض المتفق عليه (ج.م)')).toBeDisabled();
  view.unmount();
  view = mount();
  await user.click(screen.getByRole('button', { name: 'التحقق من النتيجة' }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(calls.filter((c) => c.url.endsWith('/confirm'))).toHaveLength(1);
  expect(sessionStorage.length).toBe(0);
  view.unmount();
});
it('protected period and incorrect shares keep confirmation disabled; explicit allowed month requires another preview', async () => {
  respond = (c) =>
    json(
      preview(
        (c.body as { confirmation: IncidentConfirmation }).confirmation,
        (c.body as { confirmation: IncidentConfirmation }).confirmation.payrollMonth === '2026-10',
      ),
    );
  render(<IncidentConfirmationForm detail={detail} catalog={catalog} onSaved={vi.fn()} />);
  const user = await fill();
  await user.clear(screen.getByLabelText('حصة الشركة (ج.م)'));
  await user.type(screen.getByLabelText('حصة الشركة (ج.م)'), '199');
  expect(screen.getByRole('button', { name: 'معاينة آثار التأكيد' })).toBeDisabled();
  await user.clear(screen.getByLabelText('حصة الشركة (ج.م)'));
  await user.type(screen.getByLabelText('حصة الشركة (ج.م)'), '200');
  await user.click(screen.getByRole('button', { name: 'معاينة آثار التأكيد' }));
  expect(await screen.findByRole('button', { name: 'تأكيد التعويض والمسؤولية' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'استخدام الفترة المسموحة 2026-11' }));
  expect(screen.getByLabelText('فترة الالتزام')).toHaveValue('2026-11');
  expect(screen.queryByRole('button', { name: 'تأكيد التعويض والمسؤولية' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'معاينة آثار التأكيد' }));
  expect(await screen.findByRole('button', { name: 'تأكيد التعويض والمسؤولية' })).toBeEnabled();
});
it('partial report selects only unclaimed pieces, preserves long reasons and has no valuation intake field', async () => {
  respond = (c) =>
    c.url.includes('/catalog')
      ? json(catalog)
      : c.url.includes('/candidates')
        ? json({ items: [candidate] })
        : json(result(c.body as IncidentCommand));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/incidents/new?brandId=' + ids.brand]}>
        <Routes>
          <Route path="/incidents/new" element={<IncidentReportPage />} />
          <Route path="/incidents/:id" element={<p>تم حفظ البلاغ</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('الكمية المتأثرة · ' + candidate.label), '١');
  await user.type(screen.getByLabelText('الحالة والسبب'), 'سبب طويل '.repeat(30));
  expect(screen.queryByLabelText('قيمة البضاعة المتأثرة (ج.م)')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'تسجيل البلاغ دون تعويض' }));
  await screen.findByText('تم حفظ البلاغ');
  const command = calls.find((c) => c.body)?.body as Extract<
    IncidentCommand,
    { type: 'incident.report' }
  >;
  expect(command.report.items).toEqual([
    { kind: 'shipment_line', sourceId: ids.shipment, lineId: ids.employee, offset: 1, quantity: 1 },
  ]);
  expect(command.report.cause.length).toBeGreaterThan(200);
  expect(command).not.toHaveProperty('confirmation');
});
