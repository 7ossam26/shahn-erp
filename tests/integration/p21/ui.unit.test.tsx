import { beforeEach, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  OpeningCommand,
  OpeningPreview,
  SettlementCatalog,
  SettlementCommand,
  SettlementPreview,
} from '@shahn/contracts';
const id = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;
vi.mock('../../../apps/web/src/features/access/access.js', () => ({
  useAccess: () => ({
    registry: {
      context: { companyId: id(1), authorizationRevision: 1, assignedBranches: [] },
      capabilities: [],
    },
    session: { principalId: id(9), csrfToken: 'csrf' },
  }),
  Reauthenticate: () => null,
}));
const { SettlementNewPage } =
  await import('../../../apps/web/src/features/settlements/settlements.js');
const { OpeningNewPage } = await import('../../../apps/web/src/features/settlements/opening.js');

let catalog: SettlementCatalog,
  preview: SettlementPreview,
  openingPreview: OpeningPreview,
  commands: (SettlementCommand | OpeningCommand)[],
  prepares: unknown[],
  respond: (c: SettlementCommand | OpeningCommand) => Response | 'drop',
  recovery: () => Response;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const result = (c: SettlementCommand) => ({
  commandId: c.commandId,
  caseId: id(30),
  caseReference: '7',
  resolutionId: id(31),
  operation: preview.operation,
  classification: preview.classification,
  state: 'resolved',
  preview,
  links: [],
});
beforeEach(() => {
  sessionStorage.clear();
  commands = [];
  prepares = [];
  catalog = {
    branches: [{ id: id(2), name: 'فرع أ' }],
    grants: ['inventory', 'storage'],
    accounts: [{ id: id(5), name: 'خزنة أ', type: 'cash', branchIds: [id(2)] }],
    brands: [{ id: id(3), name: 'براند أ' }],
    employees: [],
    categories: [],
    variants: [{ variantId: id(4), brandId: id(3), label: 'قميص أزرق' }],
    today: '2026-10-08',
  };
  preview = {
    operation: 'product.observe',
    classification: 'stock_observation',
    target: {
      kind: 'product',
      id: id(4),
      label: 'قميص أزرق',
      branchId: id(2),
      branchName: 'فرع أ',
    },
    facts: [{ key: 'soundOnHand', unit: 'quantity', before: '12', after: '10' }],
    effects: [
      {
        ledger: 'stock',
        kind: 'adjustment',
        label: 'فرق جرد سليم',
        amountMinor: null,
        quantity: -2,
        effectiveDate: '2026-10-08',
      },
    ],
    dependents: [],
    warnings: [],
    blockers: [],
    versions: [{ key: 'stock.position', version: '3' }],
    digest: 'a'.repeat(64),
  };
  openingPreview = {
    openingDate: '2026-10-08',
    lines: [
      {
        lineNumber: 1,
        classification: 'account_balance',
        targetKey: 'account:' + id(5),
        label: 'خزنة أ',
        branchName: 'فرع أ',
        amountMinor: '50000',
        quantity: null,
        ledger: 'money',
        readiness: 'available',
      },
    ],
    totals: {
      moneyMinor: '50000',
      brandEligibleMinor: '0',
      brandPendingMinor: '0',
      brandDebtMinor: '0',
      employeeObligationMinor: '0',
      employeeEntitlementMinor: '0',
      stockQuantity: 0,
    },
    existing: [],
    blockers: [],
    digest: 'c'.repeat(64),
  };
  respond = (c) => json(result(c as SettlementCommand));
  recovery = () => json({ code: 'NOT_FOUND' }, 404);
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    if (url.includes('/catalog')) return json(catalog);
    if (url.includes('/prepare')) {
      prepares.push(JSON.parse(String(init.body)));
      return json(url.includes('/opening/') ? openingPreview : preview);
    }
    if (url.includes('/commands/')) return recovery();
    if (url.endsWith('/commands') && init.method === 'POST') {
      const c = JSON.parse(String(init.body)) as SettlementCommand | OpeningCommand;
      commands.push(c);
      const r = respond(c);
      if (r === 'drop') throw Error('dropped response');
      return r;
    }
    return json({ code: 'NOT_FOUND' }, 404);
  });
});
const mount = (path = '/settlements/new?target=product') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settlements/new" element={<SettlementNewPage />} />
          <Route path="/settlements/:caseId" element={<p>تم تأكيد الحالة</p>} />
          <Route path="/settings/opening-balances/new" element={<OpeningNewPage />} />
          <Route path="/settings/opening-balances/:batchId" element={<p>تم تسجيل الدفعة</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
async function reviewProduct(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('المنتج والصنف'), id(4));
  await user.type(screen.getByLabelText('الكمية الفعلية'), '١٠');
  await user.click(screen.getByRole('button', { name: 'مراجعة الأثر' }));
  await screen.findByRole('heading', { name: /الأثر الذي سيُؤكد/ });
}
it('target picker shows only granted targets; there is no free-form balance edit', async () => {
  mount('/settlements/new');
  const picker = await screen.findByRole('list', { name: 'اختر هدف التسوية' });
  const links = [...picker.querySelectorAll('a')].map((a) => a.getAttribute('href'));
  expect(links).toEqual(['/settlements/new?target=product', '/settlements/new?target=storage']);
  // Choosing a target comes first: no amount, balance or quantity can be typed on the picker.
  expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
});
it('normal: the reviewed observation is confirmed once with the previewed versions and a required reason', async () => {
  mount();
  const user = userEvent.setup();
  await reviewProduct(user);
  expect(prepares[0]).toMatchObject({
    operation: { operation: 'product.observe', observedQuantity: 10, variantId: id(4) },
  });
  expect(screen.getByRole('row', { name: /الكمية السليمة/ })).toHaveTextContent('١٢');
  const confirm = screen.getByRole('button', { name: 'تأكيد التسوية' });
  expect(confirm).toBeDisabled();
  await user.type(screen.getByLabelText('سبب التسوية (مطلوب)'), 'جرد يدوي');
  await user.click(confirm);
  await user.click(await screen.findByRole('button', { name: 'تأكيد نهائي' }));
  await screen.findByText('تم تأكيد الحالة');
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    type: 'settlement.confirm',
    reason: 'جرد يدوي',
    expectedDigest: preview.digest,
    expectedVersions: preview.versions,
  });
  expect(commands[0]).not.toHaveProperty('delta');
  expect(sessionStorage.length).toBe(0);
});
it('stale: nothing is recorded, the new effect is re-previewed and must be confirmed again', async () => {
  mount();
  const user = userEvent.setup();
  await reviewProduct(user);
  await user.type(screen.getByLabelText('سبب التسوية (مطلوب)'), 'جرد');
  respond = () =>
    json(
      { code: 'SETTLEMENT_PREVIEW_STALE', details: { current: { digest: 'b'.repeat(64) } } },
      409,
    );
  preview = {
    ...preview,
    digest: 'b'.repeat(64),
    facts: [{ key: 'soundOnHand', unit: 'quantity', before: '11', after: '10' }],
  };
  await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }));
  await user.click(await screen.findByRole('button', { name: 'تأكيد نهائي' }));
  await screen.findByText(/تغيرت البيانات بعد مراجعتك/);
  await waitFor(() => expect(prepares).toHaveLength(2));
  expect(screen.getByRole('row', { name: /الكمية السليمة/ })).toHaveTextContent('١١');
  expect(screen.queryByRole('button', { name: 'تأكيد نهائي' })).not.toBeInTheDocument();
  respond = (c) => json(result(c as SettlementCommand));
  await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }));
  await user.click(await screen.findByRole('button', { name: 'تأكيد نهائي' }));
  await screen.findByText('تم تأكيد الحالة');
  expect(commands.map((c) => c.expectedDigest)).toEqual(['a'.repeat(64), 'b'.repeat(64)]);
  expect(commands[0]!.commandId).not.toBe(commands[1]!.commandId);
});
it('blocked: a blocker is shown with its consequence and confirmation is impossible', async () => {
  preview = { ...preview, blockers: ['INCIDENT_CUSTODY_HELD'] };
  mount();
  const user = userEvent.setup();
  await reviewProduct(user);
  await user.type(screen.getByLabelText('سبب التسوية (مطلوب)'), 'جرد');
  expect(screen.getByRole('alert')).toHaveTextContent('محجوز لبلاغ حادث');
  expect(screen.getByRole('button', { name: 'تأكيد التسوية' })).toBeDisabled();
  expect(commands).toHaveLength(0);
});
it('warnings: a reservation shortage lists the held work before confirmation', async () => {
  preview = {
    ...preview,
    warnings: ['RESERVATION_SHORTAGE_HOLDS_AFFECTED_WORK'],
    dependents: [{ kind: 'shipment', id: id(40), label: 'شحنة 15', state: 'held' }],
  };
  mount();
  await reviewProduct(userEvent.setup());
  expect(screen.getByRole('note')).toHaveTextContent('تتوقف كل الطلبات غير المسلمة');
  expect(screen.getByText('شحنة 15').closest('li')).toHaveTextContent('ستُوقف');
});
it('unknown result survives remount, blocks a second identity and recovers with the same command', async () => {
  let view = mount();
  const user = userEvent.setup();
  await reviewProduct(user);
  await user.type(screen.getByLabelText('سبب التسوية (مطلوب)'), 'جرد');
  respond = () => 'drop';
  await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }));
  await user.click(await screen.findByRole('button', { name: 'تأكيد نهائي' }));
  await screen.findByRole('button', { name: 'التحقق من النتيجة' });
  expect(screen.getByRole('button', { name: 'تأكيد نهائي' })).toBeDisabled();
  view.unmount();
  view = mount();
  await screen.findByRole('button', { name: 'التحقق من النتيجة' });
  expect(screen.getByRole('button', { name: 'مراجعة الأثر' })).toBeDisabled();
  respond = (c) => json(result(c as SettlementCommand));
  await user.click(screen.getByRole('button', { name: 'التحقق من النتيجة' }));
  await screen.findByText('تم تأكيد الحالة');
  expect(commands).toHaveLength(2);
  expect(commands[1]).toEqual(commands[0]);
  expect(sessionStorage.length).toBe(0);
  view.unmount();
});
it('already resolved: the definite answer releases the identity and explains where to look', async () => {
  mount();
  const user = userEvent.setup();
  await reviewProduct(user);
  await user.type(screen.getByLabelText('سبب التسوية (مطلوب)'), 'جرد');
  respond = () => json({ code: 'SETTLEMENT_ALREADY_RESOLVED' }, 409);
  await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }));
  await user.click(await screen.findByRole('button', { name: 'تأكيد نهائي' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('سُويت بالفعل');
  expect(sessionStorage.length).toBe(0);
  expect(screen.queryByRole('button', { name: 'التحقق من النتيجة' })).not.toBeInTheDocument();
});
it('denied: an out-of-scope target answer records nothing and keeps the form', async () => {
  mount();
  const user = userEvent.setup();
  await reviewProduct(user);
  await user.type(screen.getByLabelText('سبب التسوية (مطلوب)'), 'جرد');
  respond = () => json({ code: 'FORBIDDEN_SCOPE' }, 403);
  await user.click(screen.getByRole('button', { name: 'تأكيد التسوية' }));
  await user.click(await screen.findByRole('button', { name: 'تأكيد نهائي' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('خارج صلاحياتك');
  expect(screen.getByLabelText('الكمية الفعلية')).toHaveValue('١٠');
});
it('storage refund requires the explicit actual cash-out assertion before review', async () => {
  mount('/settlements/new?target=storage');
  const user = userEvent.setup();
  await user.selectOptions(await screen.findByLabelText('البراند'), id(3));
  await user.selectOptions(screen.getByLabelText('الحساب'), id(5));
  await user.type(screen.getByLabelText('المبلغ (ج.م)'), '100');
  expect(screen.getByRole('button', { name: 'مراجعة الأثر' })).toBeDisabled();
  await user.click(screen.getByLabelText(/تم صرف المبلغ فعليًا/));
  await user.click(screen.getByRole('button', { name: 'مراجعة الأثر' }));
  await waitFor(() => expect(prepares).toHaveLength(1));
  expect(prepares[0]).toMatchObject({
    operation: { operation: 'storage.refund', amountMinor: '10000', confirmCashOut: true },
  });
});
it('opening batch: typed lines, no-profit notice and one confirmation', async () => {
  mount('/settings/opening-balances/new');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('وصف الدفعة'), 'أرصدة البدء');
  await user.click(screen.getByRole('button', { name: 'إضافة بند' }));
  await user.selectOptions(screen.getByLabelText('الحساب'), id(5));
  await user.type(screen.getByLabelText('المبلغ (ج.م)'), '500');
  await user.click(screen.getByRole('button', { name: 'مراجعة الدفعة' }));
  await screen.findByText(/لا تُنشئ أي إيراد أو مصروف تشغيل/);
  expect(prepares[0]).toMatchObject({
    openingDate: '2026-10-08',
    lines: [{ classification: 'account_balance', accountId: id(5), amountMinor: '50000' }],
  });
  respond = (c) =>
    json({
      commandId: c.commandId,
      batchId: id(50),
      reference: '1',
      openingDate: '2026-10-08',
      lines: [
        {
          lineNumber: 1,
          classification: 'account_balance',
          targetKey: 'account:' + id(5),
          effectId: id(51),
          stockSourceId: null,
        },
      ],
      preview: openingPreview,
    });
  await user.click(screen.getByRole('button', { name: 'تأكيد الدفعة' }));
  await user.click(await screen.findByRole('button', { name: 'تسجيل نهائي' }));
  await screen.findByText('تم تسجيل الدفعة');
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    type: 'opening.confirm',
    expectedDigest: openingPreview.digest,
  });
});
it('opening duplicate target is blocked with the existing batch reference', async () => {
  openingPreview = {
    ...openingPreview,
    blockers: ['DUPLICATE_OPENING_TARGET'],
    existing: [{ targetKey: 'account:' + id(5), batchReference: '1' }],
  };
  mount('/settings/opening-balances/new');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('وصف الدفعة'), 'تكرار');
  await user.click(screen.getByRole('button', { name: 'إضافة بند' }));
  await user.selectOptions(screen.getByLabelText('الحساب'), id(5));
  await user.type(screen.getByLabelText('المبلغ (ج.م)'), '500');
  await user.click(screen.getByRole('button', { name: 'مراجعة الدفعة' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('مسجل سابقًا في الدفعة رقم 1');
  expect(screen.getByRole('button', { name: 'تأكيد الدفعة' })).toBeDisabled();
});
it('opening lost response is recovered from the command record without a second batch', async () => {
  mount('/settings/opening-balances/new');
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('وصف الدفعة'), 'أرصدة البدء');
  await user.click(screen.getByRole('button', { name: 'إضافة بند' }));
  await user.selectOptions(screen.getByLabelText('الحساب'), id(5));
  await user.type(screen.getByLabelText('المبلغ (ج.م)'), '500');
  await user.click(screen.getByRole('button', { name: 'مراجعة الدفعة' }));
  respond = () => 'drop';
  await user.click(await screen.findByRole('button', { name: 'تأكيد الدفعة' }));
  await user.click(await screen.findByRole('button', { name: 'تسجيل نهائي' }));
  const check = await screen.findByRole('button', { name: 'التحقق من النتيجة' });
  expect(screen.getByRole('button', { name: 'تسجيل نهائي' })).toBeDisabled();
  recovery = () =>
    json({
      commandId: commands[0]!.commandId,
      batchId: id(50),
      reference: '1',
      openingDate: '2026-10-08',
      lines: [],
      preview: openingPreview,
    });
  await user.click(check);
  await screen.findByText('تم تسجيل الدفعة');
  expect(commands).toHaveLength(1);
  expect(sessionStorage.length).toBe(0);
});
