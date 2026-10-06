import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type {
  BrandPayoutCatalog,
  BrandPayoutCommand,
  BrandPayoutPreview,
  BrandWalletSummary,
} from '@shahn/contracts';
const ids = {
  company: '0b7c8f86-0d5c-4ad0-9f77-3a2f3a9c1e01',
  brand: '4e0f6b1a-1f7e-4c55-8d5d-1b7a2c9e3f02',
  branch: '8a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c04',
  account: '2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e06',
  principal: '6f5e4d3c-2b1a-4098-8765-43210fedcba9',
  payout: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  movement: '9e8d7c6b-5a49-4382-9170-6f5e4d3c2b10',
};
vi.mock('../../../apps/web/src/features/access/access.js', () => ({
  useAccess: () => ({
    registry: {
      context: {
        companyId: ids.company,
        principalId: ids.principal,
        authorizationRevision: '1',
        companyBranches: [{ id: ids.branch, name: 'الفرع ب' }],
        assignedBranches: [{ id: ids.branch, name: 'الفرع ب' }],
      },
      capabilities: [],
    },
    session: { principalId: ids.principal, csrfToken: 'csrf' },
  }),
  Reauthenticate: () => null,
}));
const { PayoutForm, BrandPayoutsPage, BrandWalletPage } =
  await import('../../../apps/web/src/features/finance/brand-payouts/brand-payouts.js');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
const todayWeekday = new Date(today + 'T00:00:00Z').getUTCDay();
const amounts = {
  eligibleMinor: '25000',
  pendingMinor: '30000',
  debitsMinor: '0',
  heldMinor: '5000',
  coverMinor: '5000',
  signedEntitlementMinor: '55000',
  eligibleToPayMinor: '15000',
  paidMinor: '0',
};
const wallet = (weekdays = [todayWeekday]): BrandWalletSummary => ({
  brandId: ids.brand,
  brandName: 'براند الاختبار',
  active: true,
  allowNegativeBalance: false,
  payoutWeekdays: weekdays,
  policyVersion: 1,
  amounts,
  readinessRevision: 'a'.repeat(64),
  branches: [],
  reasons: ['PENDING_REMITTANCE', 'HELD_FOR_REVIEW', 'SHIPPING_COVER'],
  today,
  scheduledToday: weekdays.includes(todayWeekday),
  nextPayoutDate: today,
  openReviews: 1,
  activeHolds: 1,
});
const catalog: BrandPayoutCatalog = {
  branches: [{ id: ids.branch, name: 'الفرع ب' }],
  accounts: [
    {
      id: ids.account,
      name: 'خزنة الفرع ب',
      type: 'cash',
      currency: 'EGP',
      branchIds: [ids.branch],
      active: true,
      bankDescription: '',
      version: 1,
      balanceMinor: '100000',
    },
  ],
  brands: [{ id: ids.brand, name: 'براند الاختبار', active: true, payoutWeekdays: [todayWeekday] }],
};
const preview = (o: Partial<BrandPayoutPreview> = {}): BrandPayoutPreview => ({
  brandId: ids.brand,
  amountMinor: '10000',
  wallet: wallet(),
  account: {
    id: ids.account,
    name: 'خزنة الفرع ب',
    type: 'cash',
    active: true,
    availableMinor: '100000',
  },
  weekday: todayWeekday,
  offDay: false,
  blockers: [],
  eligibleToPayAfterMinor: '5000',
  readinessRevision: 'a'.repeat(64),
  ...o,
});
type Call = { url: string; method: string; body: unknown };
let calls: Call[] = [];
let responder: (call: Call) => Promise<Response> | Response;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const resultFor = (c: BrandPayoutCommand) => ({
  commandId: c.commandId,
  payoutId: ids.payout,
  reference: '17',
  brandId: ids.brand,
  amountMinor: c.amountMinor,
  actualDate: c.actualDate,
  movementId: ids.movement,
  eligibleToPayAfterMinor: '5000',
  signedEntitlementAfterMinor: '45000',
});
beforeEach(() => {
  calls = [];
  sessionStorage.clear();
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const call = {
      url,
      method: init.method ?? 'GET',
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return responder(call);
  });
});
function Detail() {
  return <p>تفاصيل التحصيل {useParams().payoutId}</p>;
}
function renderForm(summary = wallet()) {
  const refresh = vi.fn(async () => undefined);
  render(
    <MemoryRouter initialEntries={['/brand-payouts/brands/' + ids.brand + '/pay']}>
      <Routes>
        <Route
          path="/brand-payouts/brands/:brandId/pay"
          element={<PayoutForm wallet={summary} catalog={catalog} refreshWallet={refresh} />}
        />
        <Route path="/brand-payouts/payouts/:payoutId" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );
  return refresh;
}
async function fill(user: ReturnType<typeof userEvent.setup>, amount = '100') {
  await user.selectOptions(screen.getByLabelText('فرع الدفع'), ids.branch);
  await user.selectOptions(screen.getByLabelText('الحساب'), ids.account);
  await user.type(screen.getByLabelText('المبلغ بالجنيه'), amount);
}
const posts = (path: string) => calls.filter((c) => c.method === 'POST' && c.url.endsWith(path));
describe('P17 payout form (connected browser-equivalent script checks, no Playwright)', () => {
  it('labels payable, pending, held and cover separately instead of one balance', () => {
    responder = () => json({});
    renderForm();
    const summary = screen.getByRole('region', { name: 'المتاح الآن' });
    for (const label of [
      'المتاح للتحصيل الآن',
      'أموال لدى المندوبين — معلّقة',
      'موقوف لمراجعة مصدر',
      'محجوز لتغطية الشحن',
    ])
      expect(within(summary).getByText(label)).toBeVisible();
    expect(within(summary).getByText('150.00 ج.م')).toBeVisible();
    expect(within(summary).getByRole('link', { name: 'استلام أموال المندوبين' })).toBeVisible();
  });
  it('reviews a closed scope, confirms once with the preview revision and follows the committed response', async () => {
    const user = userEvent.setup();
    responder = (c) =>
      c.url.endsWith('/preview') ? json(preview()) : json(resultFor(c.body as BrandPayoutCommand));
    renderForm();
    await fill(user);
    await user.type(screen.getByLabelText('مرجع التحويل — اختياري'), 'IP-55');
    expect(screen.queryByLabelText('سبب التحصيل خارج الأيام المتفق عليها')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'مراجعة التحصيل' }));
    const dialog = await screen.findByRole('dialog');
    expect(Object.keys(posts('/preview')[0]!.body as object).sort()).toEqual(
      [
        'accountId',
        'actualDate',
        'amountMinor',
        'brandId',
        'companyId',
        'method',
        'payingBranchId',
      ].sort(),
    );
    expect(within(dialog).getByText('100.00 ج.م')).toBeVisible();
    const confirm = within(dialog).getByRole('button', { name: 'تأكيد التحصيل الفعلي' });
    await user.dblClick(confirm);
    expect(await screen.findByText('تفاصيل التحصيل ' + ids.payout)).toBeVisible();
    expect(posts('/brand-payouts/commands')).toHaveLength(1);
    const command = posts('/brand-payouts/commands')[0]!.body as BrandPayoutCommand;
    expect(command).toMatchObject({
      type: 'brand.payout.confirm',
      amountMinor: '10000',
      externalReference: 'IP-55',
      expectedReadinessRevision: 'a'.repeat(64),
    });
    expect(command).not.toHaveProperty('offDayReason');
    expect(Object.keys(sessionStorage)).toHaveLength(0);
  });
  it('requires an off-day reason before confirmation; the server decides off-day', async () => {
    const user = userEvent.setup();
    responder = (c) =>
      c.url.endsWith('/preview')
        ? json(preview({ offDay: true }))
        : json(resultFor(c.body as BrandPayoutCommand));
    renderForm(wallet([(todayWeekday + 1) % 7]));
    await fill(user);
    expect(screen.getByLabelText('سبب التحصيل خارج الأيام المتفق عليها')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'مراجعة التحصيل' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'تأكيد التحصيل الفعلي' })).toBeDisabled();
    expect(within(dialog).getByText(/ليس من أيام التحصيل المتفق عليها/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'تعديل المدخلات' }));
    await user.type(
      screen.getByLabelText('سبب التحصيل خارج الأيام المتفق عليها'),
      'طلب البراند بموافقة الإدارة',
    );
    await user.click(screen.getByRole('button', { name: 'مراجعة التحصيل' }));
    await user.click(await screen.findByRole('button', { name: 'تأكيد التحصيل الفعلي' }));
    await screen.findByText('تفاصيل التحصيل ' + ids.payout);
    expect((posts('/brand-payouts/commands')[0]!.body as BrandPayoutCommand).offDayReason).toBe(
      'طلب البراند بموافقة الإدارة',
    );
  });
  it('shows server blockers (insufficient funds or held credit) and cannot confirm', async () => {
    const user = userEvent.setup();
    responder = () =>
      json(
        preview({
          blockers: ['INSUFFICIENT_FUNDS', 'INSUFFICIENT_ELIGIBLE_CREDIT'],
          eligibleToPayAfterMinor: null,
        }),
      );
    renderForm();
    await fill(user, '2000');
    await user.click(screen.getByRole('button', { name: 'مراجعة التحصيل' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('رصيد الحساب لا يكفي.')).toBeVisible();
    expect(within(dialog).getByText('المبلغ أكبر من المتاح للتحصيل الآن.')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'تأكيد التحصيل الفعلي' })).toBeDisabled();
    expect(posts('/brand-payouts/commands')).toHaveLength(0);
  });
  it('an unknown result keeps the same command identity through reload-style recovery; no second payout', async () => {
    const user = userEvent.setup();
    let committed: BrandPayoutCommand | null = null;
    responder = (c) => {
      if (c.url.endsWith('/preview')) return json(preview());
      if (c.method === 'POST') {
        committed = c.body as BrandPayoutCommand;
        throw new TypeError('connection lost after commit');
      }
      return json(resultFor(committed!));
    };
    renderForm();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'مراجعة التحصيل' }));
    await user.click(await screen.findByRole('button', { name: 'تأكيد التحصيل الفعلي' }));
    expect(await screen.findByText(/لم تصل نتيجة التحصيل/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'تعديل المدخلات' }));
    const recover = screen.getByRole('button', { name: 'استرداد نتيجة التحصيل' });
    expect(screen.getByRole('button', { name: 'مراجعة التحصيل' })).toBeDisabled();
    const stored = JSON.parse(Object.values(sessionStorage)[0] as string) as BrandPayoutCommand;
    expect(stored.commandId).toBe(committed!.commandId);
    await user.click(recover);
    expect(await screen.findByText('تفاصيل التحصيل ' + ids.payout)).toBeVisible();
    expect(posts('/brand-payouts/commands')).toHaveLength(1);
    expect(calls.at(-1)!.url).toContain('/brand-payouts/commands/' + committed!.commandId);
    expect(Object.keys(sessionStorage)).toHaveLength(0);
  });
  it('a changed wallet reopens review with committed numbers and keeps the entered intent', async () => {
    const user = userEvent.setup();
    let previews = 0;
    responder = (c) => {
      if (c.url.endsWith('/preview')) {
        previews++;
        return json(
          previews === 1
            ? preview()
            : preview({
                readinessRevision: 'b'.repeat(64),
                eligibleToPayAfterMinor: '0',
                wallet: { ...wallet(), amounts: { ...amounts, eligibleToPayMinor: '10000' } },
              }),
        );
      }
      return json(
        {
          code: 'WALLET_CHANGED',
          messageKey: 'kernel.wallet_changed',
          commandId: (c.body as BrandPayoutCommand).commandId,
          correlationId: ids.movement,
          details: { amounts: { ...amounts, eligibleToPayMinor: '10000' } },
        },
        409,
      );
    };
    const refresh = renderForm();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'مراجعة التحصيل' }));
    await user.click(await screen.findByRole('button', { name: 'تأكيد التحصيل الفعلي' }));
    await waitFor(() => expect(previews).toBe(2));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText(/تغيّرت أرقام محفظة البراند/).length).toBeGreaterThan(0);
    expect(refresh).toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'تعديل المدخلات' }));
    expect(screen.getByLabelText('المبلغ بالجنيه')).toHaveValue('100');
    expect(Object.keys(sessionStorage)).toHaveLength(0);
  });
});
describe('P17 dues list and wallet page reads', () => {
  const page = (path: string, element: React.ReactNode, route: string) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={element} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  it('explains an empty filtered result and resets filters without mutating data', async () => {
    const user = userEvent.setup();
    responder = (c) =>
      json({
        items: c.url.includes('state=payable')
          ? []
          : [
              {
                brandId: ids.brand,
                brandName: 'براند الاختبار',
                active: true,
                payoutWeekdays: [todayWeekday],
                scheduledToday: true,
                nextPayoutDate: today,
                amounts,
                reasons: ['PENDING_REMITTANCE'],
              },
            ],
        total: c.url.includes('state=payable') ? 0 : 1,
        page: 1,
        limit: 25,
        today,
      });
    page('/brand-payouts?state=payable', <BrandPayoutsPage />, '/brand-payouts');
    expect(await screen.findByText('لا توجد براندات تطابق الفلاتر')).toBeVisible();
    const panel = screen.getByText('لا توجد براندات تطابق الفلاتر').closest('section')!;
    await user.click(within(panel as HTMLElement).getByRole('button', { name: 'مسح الفلاتر' }));
    expect(await screen.findByText('براند الاختبار')).toBeVisible();
    expect(screen.getByText('موعد التحصيل اليوم')).toBeVisible();
    expect(calls.every((c) => c.method === 'GET')).toBe(true);
  });
  it('shows the wallet, branch detail and a reconciled statement in local views', async () => {
    const user = userEvent.setup();
    responder = (c) =>
      c.url.includes('/statement')
        ? json({
            brandId: ids.brand,
            brandName: 'براند الاختبار',
            from: null,
            to: null,
            filtered: false,
            openingMinor: '0',
            closingMinor: '15000',
            creditsMinor: '25000',
            debitsMinor: '10000',
            items: [],
            total: 0,
            page: 1,
            limit: 50,
            current: amounts,
            journalMinor: '15000',
            reconciled: true,
          })
        : c.url.includes('/lots')
          ? json({ items: [], total: 0, page: 1, limit: 25 })
          : json({
              ...wallet(),
              branches: [
                {
                  branchId: ids.branch,
                  branchName: 'الفرع ب',
                  eligibleMinor: '25000',
                  pendingMinor: '30000',
                  heldMinor: '5000',
                  debitsMinor: '0',
                  coverMinor: '5000',
                },
              ],
            });
    page(
      '/brand-payouts/brands/' + ids.brand,
      <BrandWalletPage />,
      '/brand-payouts/brands/:brandId',
    );
    expect(await screen.findByRole('heading', { name: 'براند الاختبار' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'تسجيل تحصيل' })).toBeVisible();
    expect(screen.getByRole('table')).toHaveTextContent('الفرع ب');
    await user.click(screen.getByRole('button', { name: 'كشف الحساب' }));
    expect(await screen.findByText('رصيد آخر المدة')).toBeVisible();
    expect(screen.getByRole('button', { name: 'كشف الحساب' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByText(/لا تطابق نموذج المستحقات/)).toBeNull();
  });
});
