import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  FormGroup,
  PageHeading,
  StatePanel,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@shahn/ui';
import type {
  BrandDuesList,
  BrandPayoutCatalog,
  BrandPayoutDetail,
  BrandPayoutList,
  BrandPayoutPreview,
  BrandWalletAmounts,
  BrandWalletSummary,
  PaymentMethod,
  PayoutCalendar,
  WalletLotList,
  WalletReason,
  WalletStatement,
} from '@shahn/contracts';
import { useAccess, Reauthenticate } from '../../access/access.js';
import { CommercialError, Field, displayMinor, inputMinor } from '../../brands/api.js';
import { PayoutApiError, payoutApi, usePayoutMutation } from './api.js';
import '../finance.css';
import './brand-payouts.css';

export const weekdayNames = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];
export const methodNames: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bank_deposit: 'إيداع بنكي',
  instapay: 'إنستا باي',
};
const movementNames: Record<string, string> = {
  goods: 'مستحقات بضاعة',
  compensation: 'تعويض مؤكد',
  fee: 'رسوم شحن على البراند',
  payout: 'تحصيل للبراند',
  correction: 'تصحيح مرتبط',
  opening: 'رصيد افتتاحي',
};
const lotStates: Record<string, string> = {
  pending: 'بانتظار استلام أموال المندوب',
  eligible: 'متاح',
  held: 'موقوف للمراجعة',
  consumed: 'مُستخدم بالكامل',
};
export const reasonCopy: Record<WalletReason, { text: string; link?: [string, string] }> = {
  PENDING_REMITTANCE: {
    text: 'جزء من الاستحقاق ما زال أموالًا لدى المندوبين؛ يصبح متاحًا بعد تسجيل الاستلام الكامل للجولة.',
    link: ['/remittances', 'استلام أموال المندوبين'],
  },
  HELD_FOR_REVIEW: {
    text: 'مبلغ موقوف بسبب تصحيح أو فجوة في مصدر محدد، دون إيقاف بقية المستحقات.',
    link: ['/execution/reviews', 'مراجعات التسوية'],
  },
  SHIPPING_COVER: {
    text: 'مبلغ محجوز لتغطية شحن معروف يتحمله البراند لطلبات سُلّمت للمندوب.',
  },
  DEBT: { text: 'توجد رسوم أو خصومات مسجلة تقلل ما يمكن تحصيله، وقد يصبح الرصيد سالبًا.' },
  NO_ELIGIBLE_CREDIT: { text: 'لا توجد مستحقات مسجلة لهذا البراند حتى الآن.' },
};
const messages: Record<string, string> = {
  INSUFFICIENT_ELIGIBLE_CREDIT:
    'المبلغ أكبر من المتاح للتحصيل الآن. لم يُخصم أي مبلغ؛ راجع الأرقام الحالية.',
  WALLET_CHANGED:
    'تغيّرت أرقام محفظة البراند بعد مراجعتك. لم يُسجل شيء؛ راجع الأرقام الجديدة ثم أكّد من جديد.',
  INSUFFICIENT_FUNDS: 'رصيد الحساب المختار لا يكفي. لم يُسجل تحصيل ولم يتغير أي رصيد.',
  OFF_DAY_REASON_REQUIRED: 'التاريخ ليس من أيام التحصيل المتفق عليها. اكتب سبب التحصيل في يوم آخر.',
  OFF_DAY_REASON_NOT_APPLICABLE: 'التاريخ من أيام التحصيل المتفق عليها؛ لا يلزم سبب.',
  FUTURE_PAYMENT_DATE: 'اختر تاريخ التحصيل الفعلي اليوم أو قبله.',
  ACCOUNT_INACTIVE: 'الحساب موقوف. اختر حسابًا نشطًا.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح لفرع الدفع المختار.',
  METHOD_ACCOUNT_MISMATCH:
    'النقدي يحتاج حسابًا نقديًا، والإيداع البنكي وإنستا باي يحتاجان حسابًا بنكيًا.',
  ACCOUNT_RECONCILIATION_REQUIRED: 'رصيد الحساب يحتاج مراجعة قبل أي صرف منه.',
  COMMAND_PAYLOAD_CONFLICT: 'هذا الطلب سُجل سابقًا ببيانات مختلفة. افتح السجل قبل أي تحصيل جديد.',
  RESULT_UNKNOWN: 'لم تصل نتيجة التحصيل. لا تكرر الدفع؛ استرد النتيجة بنفس الطلب أولًا.',
  CONNECTION_LOST: 'تعذر الاتصال. البيانات الظاهرة قد تكون قديمة؛ المدخلات باقية.',
  FORBIDDEN_SCOPE: 'هذا الإجراء خارج صلاحياتك أو فروعك الحالية.',
  CSRF_FAILED: 'انتهت صلاحية الجلسة لهذا الإجراء. حدّث الصفحة ثم حاول.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجّل الدخول؛ المدخلات باقية.',
  NOT_FOUND: 'السجل غير متاح ضمن صلاحياتك الحالية.',
  VALIDATION_FAILED: 'راجع المبلغ والتاريخ والحقول المطلوبة.',
  INVALID_RESPONSE: 'وصل رد غير متوقع من الخادم. حدّث الصفحة.',
};
export function Amount({ value, strong = false }: { value: string; strong?: boolean }) {
  return (
    <bdi dir="ltr" className={strong ? 'finance-amount' : 'payout-amount'}>
      {displayMinor(value)} ج.م
    </bdi>
  );
}
export function PayoutError({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  const code = error instanceof Error ? error.message : '';
  const details = error instanceof PayoutApiError ? error.details : undefined;
  return (
    <div ref={ref} className="commercial-error" role="alert" tabIndex={-1}>
      <p>{messages[code] ?? 'تعذر إكمال الطلب. راجع البيانات والاتصال.'}</p>
      {details?.amounts && (
        <p>
          المتاح للتحصيل الآن: <Amount value={details.amounts.eligibleToPayMinor} />
        </p>
      )}
      {details?.availableMinor !== undefined && (
        <p>
          الرصيد المتاح بالحساب: <Amount value={details.availableMinor} />
        </p>
      )}
      {error instanceof CommercialError && error.status === 401 && <Reauthenticate />}
    </div>
  );
}
function LocalViews() {
  const { pathname } = useLocation();
  const views: [string, string][] = [
    ['/brand-payouts', 'المستحقات'],
    ['/brand-payouts/calendar', 'التقويم'],
    ['/brand-payouts/history', 'سجل التحصيلات'],
  ];
  return (
    <nav className="payout-views" aria-label="عروض صفحة التحصيل">
      {views.map(([to, label]) => (
        <Link key={to} to={to} aria-current={pathname === to ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
function useNarrow() {
  const query = '(max-width: 600px)';
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(query),
      on = () => setNarrow(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return narrow;
}
/** Desktop: expandable panel. Phone: focused dialog with Apply and Reset. Never mutates data. */
function AdvancedFilters({
  count,
  children,
  onReset,
}: {
  count: number;
  children: ReactNode;
  onReset: () => void;
}) {
  const narrow = useNarrow(),
    [open, setOpen] = useState(false),
    label = 'فلاتر متقدمة' + (count ? ` (${count})` : '');
  if (!narrow)
    return (
      <details className="finance-filters">
        <summary>{label}</summary>
        <div className="commercial-fields">{children}</div>
        <Button type="button" variant="outline" onClick={onReset}>
          مسح الفلاتر
        </Button>
      </details>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <DialogContent dir="rtl" className="review-dialog payout-dialog">
        <DialogTitle>فلاتر متقدمة</DialogTitle>
        <DialogDescription>تطبق الفلاتر على العرض فقط ولا تغير أي بيانات.</DialogDescription>
        <div className="commercial-fields">{children}</div>
        <div className="dialog-actions">
          <Button type="button" onClick={() => setOpen(false)}>
            تطبيق
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onReset();
              setOpen(false);
            }}
          >
            مسح الفلاتر
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function useParamState() {
  const [params, setParams] = useSearchParams();
  const set = (name: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(name, value);
    else p.delete(name);
    if (name !== 'page') p.delete('page');
    setParams(p);
  };
  return { params, setParams, set };
}
function Pager({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="finance-pagination">
      <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        السابق
      </Button>
      <span>
        صفحة {page} من {Math.max(1, Math.ceil(total / limit))}
      </span>
      <Button variant="outline" disabled={page * limit >= total} onClick={() => onPage(page + 1)}>
        التالي
      </Button>
    </div>
  );
}
function AmountsList({ amounts }: { amounts: BrandWalletAmounts }) {
  return (
    <dl className="payout-amounts">
      <div className="payout-primary">
        <dt>المتاح للتحصيل الآن</dt>
        <dd>
          <Amount value={amounts.eligibleToPayMinor} strong />
        </dd>
      </div>
      <div>
        <dt>صافي الاستحقاق (يشمل المعلّق والديون)</dt>
        <dd>
          <Amount value={amounts.signedEntitlementMinor} />
        </dd>
      </div>
      <div>
        <dt>مستحقات مستلمة فعليًا</dt>
        <dd>
          <Amount value={amounts.eligibleMinor} />
        </dd>
      </div>
      <div>
        <dt>أموال لدى المندوبين — معلّقة</dt>
        <dd>
          <Amount value={amounts.pendingMinor} />
        </dd>
      </div>
      <div>
        <dt>موقوف لمراجعة مصدر</dt>
        <dd>
          <Amount value={amounts.heldMinor} />
        </dd>
      </div>
      <div>
        <dt>محجوز لتغطية الشحن</dt>
        <dd>
          <Amount value={amounts.coverMinor} />
        </dd>
      </div>
      <div>
        <dt>رسوم وخصومات غير مسوّاة</dt>
        <dd>
          <Amount value={amounts.debitsMinor} />
        </dd>
      </div>
      <div>
        <dt>إجمالي ما تم تحصيله</dt>
        <dd>
          <Amount value={amounts.paidMinor} />
        </dd>
      </div>
    </dl>
  );
}
function Reasons({ reasons }: { reasons: WalletReason[] }) {
  if (!reasons.length) return null;
  return (
    <ul className="payout-reasons">
      {reasons.map((r) => (
        <li key={r}>
          {reasonCopy[r].text}{' '}
          {reasonCopy[r].link && <Link to={reasonCopy[r].link![0]}>{reasonCopy[r].link![1]}</Link>}
        </li>
      ))}
    </ul>
  );
}
const heading = 'تحصيل البراندات';
export function BrandPayoutsPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    { params, setParams, set } = useParamState();
  const query = new URLSearchParams(params);
  query.set('companyId', company ?? '');
  const data = useQuery({
    queryKey: ['brand-dues', company, params.toString(), registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () => payoutApi<BrandDuesList>('/brand-wallets?' + query, 'dues'),
  });
  return (
    <>
      <PageHeading
        eyebrow="المالية · محفظة واحدة لكل براند في كل الفروع"
        title={heading}
        description="المتاح للتحصيل محسوب من أموال استلمتها الشركة فعليًا بعد الخصومات والحجوزات وتغطية الشحن. أموال المندوبين غير المستلمة تظهر منفصلة."
      />
      <LocalViews />
      <div className="commercial-filter-row">
        <Field label="بحث باسم البراند">
          <input
            value={params.get('search') ?? ''}
            onChange={(e) => set('search', e.target.value)}
          />
        </Field>
        <Field label="الحالة">
          <select
            value={params.get('state') ?? 'all'}
            onChange={(e) => set('state', e.target.value)}
          >
            <option value="all">كل البراندات</option>
            <option value="payable">متاح للتحصيل</option>
            <option value="pending">لديه أموال لدى المندوبين</option>
            <option value="held">لديه مبالغ موقوفة</option>
            <option value="debt">لديه رسوم أو دين</option>
          </select>
        </Field>
      </div>
      <AdvancedFilters
        count={params.get('scheduled') === 'today' ? 1 : 0}
        onReset={() => setParams({})}
      >
        <Field label="أيام التحصيل">
          <select
            value={params.get('scheduled') ?? 'all'}
            onChange={(e) => set('scheduled', e.target.value)}
          >
            <option value="all">كل الأيام</option>
            <option value="today">موعد تحصيله اليوم</option>
          </select>
        </Field>
      </AdvancedFilters>
      {data.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل المستحقات" />
      ) : data.isError ? (
        <PayoutError error={data.error} />
      ) : !data.data.items.length ? (
        <StatePanel state="empty" title="لا توجد براندات تطابق الفلاتر">
          <Button variant="outline" onClick={() => setParams({})}>
            مسح الفلاتر
          </Button>
        </StatePanel>
      ) : (
        <>
          <div className="finance-list">
            {data.data.items.map((d) => (
              <Link
                className="finance-row"
                key={d.brandId}
                to={'/brand-payouts/brands/' + d.brandId}
                state={{ back: '/brand-payouts?' + params.toString() }}
              >
                <div>
                  <strong>{d.brandName}</strong>
                  <span>
                    {d.scheduledToday
                      ? 'موعد التحصيل اليوم'
                      : 'الموعد القادم ' +
                        d.nextPayoutDate +
                        ' — ' +
                        weekdayNames[new Date(d.nextPayoutDate + 'T00:00:00Z').getUTCDay()]}
                    {!d.active && ' · البراند موقوف'}
                  </span>
                  <span className="payout-chips">
                    {d.amounts.pendingMinor !== '0' && (
                      <span>
                        معلّق لدى المندوبين <Amount value={d.amounts.pendingMinor} />
                      </span>
                    )}
                    {d.amounts.heldMinor !== '0' && (
                      <span>
                        موقوف <Amount value={d.amounts.heldMinor} />
                      </span>
                    )}
                    {d.amounts.coverMinor !== '0' && (
                      <span>
                        تغطية شحن <Amount value={d.amounts.coverMinor} />
                      </span>
                    )}
                    {d.amounts.debitsMinor !== '0' && (
                      <span>
                        رسوم غير مسوّاة <Amount value={d.amounts.debitsMinor} />
                      </span>
                    )}
                  </span>
                </div>
                <div className="payout-row-amount">
                  <span>المتاح الآن</span>
                  <Amount value={d.amounts.eligibleToPayMinor} strong />
                </div>
              </Link>
            ))}
          </div>
          <Pager
            page={data.data.page}
            limit={data.data.limit}
            total={data.data.total}
            onPage={(p) => set('page', String(p))}
          />
        </>
      )}
    </>
  );
}
const cairoToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
const shiftDate = (date: string, days: number) => {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export function BrandPayoutCalendarPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    { params, set } = useParamState();
  const from = params.get('from') ?? cairoToday(),
    to = shiftDate(from, 13);
  const data = useQuery({
    queryKey: ['payout-calendar', company, from, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      payoutApi<PayoutCalendar>(
        `/brand-wallets/calendar?companyId=${company}&from=${from}&to=${to}`,
        'calendar',
      ),
  });
  return (
    <>
      <PageHeading
        eyebrow="المالية · محفظة واحدة لكل براند"
        title="تقويم التحصيل"
        description="الأيام المتفق عليها تنظم العمل ولا تمنع التحصيل في يوم آخر بسبب مكتوب. المبالغ المعروضة هي المتاح الآن، وليست توقعًا لمستقبل."
      />
      <LocalViews />
      <div className="payout-calendar-nav">
        <Button variant="outline" onClick={() => set('from', shiftDate(from, -14))}>
          الأسبوعان السابقان
        </Button>
        <span>
          {from} — {to}
        </span>
        <Button variant="outline" onClick={() => set('from', shiftDate(from, 14))}>
          الأسبوعان التاليان
        </Button>
      </div>
      {data.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل التقويم" />
      ) : data.isError ? (
        <PayoutError error={data.error} />
      ) : (
        <ol className="payout-calendar">
          {data.data.days.map((d) => (
            <li key={d.date} aria-current={d.date === data.data.today ? 'date' : undefined}>
              <h2>
                {weekdayNames[d.weekday]} <bdi dir="ltr">{d.date}</bdi>
                {d.date === data.data.today && <small> · اليوم</small>}
              </h2>
              {d.scheduled.length ? (
                <ul>
                  {d.scheduled.map((s) => (
                    <li key={s.brandId}>
                      <Link to={'/brand-payouts/brands/' + s.brandId}>{s.brandName}</Link> — متاح
                      الآن <Amount value={s.eligibleToPayMinor} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">لا توجد مواعيد متفق عليها.</p>
              )}
              {d.payouts.map((p) => (
                <p key={p.id}>
                  <Link to={'/brand-payouts/payouts/' + p.id}>تحصيل {p.reference}</Link> ·{' '}
                  {p.brandName} · <Amount value={p.amountMinor} />
                  {p.offDay && ' · خارج الموعد'}
                </p>
              ))}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
function HistoryFilters({
  brands,
  fixedBrand,
}: {
  brands: { id: string; name: string }[];
  fixedBrand?: string;
}) {
  const { registry } = useAccess(),
    { params, setParams, set } = useParamState(),
    branches = registry?.context.companyBranches ?? [];
  const advanced = ['sourceBranchId', 'dateBasis', 'search', 'offDay'].filter((k) =>
    params.get(k),
  ).length;
  return (
    <>
      <div className="commercial-filter-row">
        {!fixedBrand && (
          <Field label="البراند">
            <select
              value={params.get('brandId') ?? ''}
              onChange={(e) => set('brandId', e.target.value)}
            >
              <option value="">كل البراندات</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="من تاريخ">
          <input
            type="date"
            value={params.get('from') ?? ''}
            onChange={(e) => set('from', e.target.value)}
          />
        </Field>
        <Field label="إلى تاريخ">
          <input
            type="date"
            value={params.get('to') ?? ''}
            onChange={(e) => set('to', e.target.value)}
          />
        </Field>
        <Field label="طريقة الدفع">
          <select
            value={params.get('method') ?? 'all'}
            onChange={(e) => set('method', e.target.value)}
          >
            <option value="all">كل الطرق</option>
            {Object.entries(methodNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <AdvancedFilters
        count={advanced + (params.get('payingBranchId') ? 1 : 0)}
        onReset={() => setParams(fixedBrand ? { view: 'payouts' } : {})}
      >
        <Field label="أساس التاريخ">
          <select
            value={params.get('dateBasis') ?? 'actual'}
            onChange={(e) => set('dateBasis', e.target.value)}
          >
            <option value="actual">تاريخ الدفع الفعلي</option>
            <option value="recorded">وقت التسجيل</option>
          </select>
        </Field>
        <Field label="فرع الدفع">
          <select
            value={params.get('payingBranchId') ?? ''}
            onChange={(e) => set('payingBranchId', e.target.value)}
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="فرع مصدر المستحقات">
          <select
            value={params.get('sourceBranchId') ?? ''}
            onChange={(e) => set('sourceBranchId', e.target.value)}
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="رقم التحصيل أو المرجع">
          <input
            value={params.get('search') ?? ''}
            onChange={(e) => set('search', e.target.value)}
          />
        </Field>
        <Field label="يوم التحصيل">
          <select
            value={params.get('offDay') ?? 'all'}
            onChange={(e) => set('offDay', e.target.value)}
          >
            <option value="all">الكل</option>
            <option value="false">في الأيام المتفق عليها</option>
            <option value="true">خارج الأيام المتفق عليها</option>
          </select>
        </Field>
      </AdvancedFilters>
    </>
  );
}
function PayoutHistoryList({ brandId }: { brandId?: string }) {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    { params, setParams, set } = useParamState(),
    location = useLocation();
  const query = new URLSearchParams();
  for (const k of [
    'brandId',
    'payingBranchId',
    'sourceBranchId',
    'method',
    'dateBasis',
    'from',
    'to',
    'search',
    'offDay',
    'page',
  ])
    if (
      params.get(k) &&
      !(k === 'method' && params.get(k) === 'all') &&
      !(k === 'offDay' && params.get(k) === 'all')
    )
      query.set(k, params.get(k)!);
  if (brandId) query.set('brandId', brandId);
  query.set('companyId', company ?? '');
  const valid = !(
    params.get('from') &&
    params.get('to') &&
    params.get('from')! > params.get('to')!
  );
  const data = useQuery({
    queryKey: [
      'payout-history',
      company,
      query.toString(),
      registry?.context.authorizationRevision,
    ],
    enabled: !!company && valid,
    retry: false,
    queryFn: () => payoutApi<BrandPayoutList>('/brand-payouts?' + query, 'list'),
  });
  if (!valid) return <PayoutError error={new CommercialError('VALIDATION_FAILED', 400)} />;
  if (data.isPending) return <StatePanel state="pending" title="جارٍ تحميل التحصيلات" />;
  if (data.isError) return <PayoutError error={data.error} />;
  if (!data.data.items.length)
    return (
      <StatePanel state="empty" title="لا توجد تحصيلات تطابق الفلاتر">
        <Button variant="outline" onClick={() => setParams(brandId ? { view: 'payouts' } : {})}>
          مسح الفلاتر
        </Button>
      </StatePanel>
    );
  return (
    <>
      <div className="finance-list">
        {data.data.items.map((p) => (
          <Link
            className="finance-row"
            key={p.payoutId}
            to={'/brand-payouts/payouts/' + p.payoutId}
            state={{ back: location.pathname + location.search }}
          >
            <div>
              <strong>
                تحصيل {p.reference} · {p.brandName}
              </strong>
              <span>
                {p.actualDate} · {p.payingBranchName} · {p.accountName} · {methodNames[p.method]}
                {p.externalReference && ' · مرجع ' + p.externalReference}
                {p.offDay && ' · خارج الموعد'}
              </span>
            </div>
            <Amount value={p.amountMinor} strong />
          </Link>
        ))}
      </div>
      <Pager
        page={data.data.page}
        limit={data.data.limit}
        total={data.data.total}
        onPage={(p) => set('page', String(p))}
      />
    </>
  );
}
function useCatalog() {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['payout-catalog', company, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      payoutApi<BrandPayoutCatalog>('/brand-payouts/catalog?companyId=' + company, 'catalog'),
  });
}
export function BrandPayoutHistoryPage() {
  const catalog = useCatalog();
  return (
    <>
      <PageHeading
        eyebrow="المالية · سجل ثابت لا يُعدَّل"
        title="سجل تحصيلات البراندات"
        description="كل تحصيل فعلي كامل أو جزئي، مع فرع وحساب الدفع وطريقة الدفع والمرجع الاختياري."
      />
      <LocalViews />
      <HistoryFilters brands={catalog.data?.brands ?? []} />
      <PayoutHistoryList />
    </>
  );
}
function LotsView({ brandId }: { brandId: string }) {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    { params, set } = useParamState();
  const query = new URLSearchParams({ companyId: company ?? '' });
  for (const k of ['state', 'branchId', 'page']) if (params.get(k)) query.set(k, params.get(k)!);
  const data = useQuery({
    queryKey: [
      'wallet-lots',
      company,
      brandId,
      query.toString(),
      registry?.context.authorizationRevision,
    ],
    enabled: !!company,
    retry: false,
    queryFn: () => payoutApi<WalletLotList>(`/brand-wallets/${brandId}/lots?${query}`, 'lots'),
  });
  return (
    <section aria-label="المستحقات ومصادرها">
      <div className="commercial-filter-row">
        <Field label="حالة المستحق">
          <select
            value={params.get('state') ?? 'all'}
            onChange={(e) => set('state', e.target.value)}
          >
            <option value="all">الكل</option>
            {Object.entries(lotStates).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="فرع المصدر">
          <select
            value={params.get('branchId') ?? ''}
            onChange={(e) => set('branchId', e.target.value)}
          >
            <option value="">كل الفروع</option>
            {(registry?.context.companyBranches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {data.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل المستحقات" />
      ) : data.isError ? (
        <PayoutError error={data.error} />
      ) : !data.data.items.length ? (
        <StatePanel state="empty" title="لا توجد مستحقات تطابق الفلاتر" />
      ) : (
        <>
          <div className="finance-list">
            {data.data.items.map((l) => (
              <article className="finance-row" key={l.lotId}>
                <div>
                  <strong>
                    {movementNames[l.kind]} · {lotStates[l.state]}
                  </strong>
                  <span>
                    {l.effectiveDate} · فرع المصدر {l.branchName}
                    {l.shipment && (
                      <>
                        {' · '}
                        <Link to={'/tracking/' + l.shipment.id}>الشحنة {l.shipment.reference}</Link>
                      </>
                    )}
                    {l.remittance && (
                      <>
                        {' · '}
                        <Link to={'/remittances/' + l.remittance.id}>
                          استلام {l.remittance.reference}
                        </Link>
                      </>
                    )}
                  </span>
                  <span>
                    الأصل <Amount value={l.amountMinor} /> · مُستخدم{' '}
                    <Amount value={l.allocatedMinor} /> · موقوف <Amount value={l.heldMinor} />
                  </span>
                  {l.holds
                    .filter((h) => h.active)
                    .map((h) => (
                      <span key={h.id}>سبب الإيقاف: {h.reason}</span>
                    ))}
                </div>
                <div className="payout-row-amount">
                  <span>المتبقي</span>
                  <Amount value={l.remainingMinor} strong />
                </div>
              </article>
            ))}
          </div>
          <Pager
            page={data.data.page}
            limit={data.data.limit}
            total={data.data.total}
            onPage={(p) => set('page', String(p))}
          />
        </>
      )}
    </section>
  );
}
function StatementView({ brandId }: { brandId: string }) {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    { params, set } = useParamState();
  const query = new URLSearchParams({ companyId: company ?? '' });
  for (const k of ['from', 'to', 'kind', 'basis', 'branchId', 'page'])
    if (params.get(k) && !(['kind', 'basis'].includes(k) && params.get(k) === 'all'))
      query.set(k, params.get(k)!);
  const valid = !(
    params.get('from') &&
    params.get('to') &&
    params.get('from')! > params.get('to')!
  );
  const data = useQuery({
    queryKey: [
      'wallet-statement',
      company,
      brandId,
      query.toString(),
      registry?.context.authorizationRevision,
    ],
    enabled: !!company && valid,
    retry: false,
    queryFn: () =>
      payoutApi<WalletStatement>(`/brand-wallets/${brandId}/statement?${query}`, 'statement'),
  });
  return (
    <section aria-label="كشف حساب البراند">
      <div className="commercial-filter-row">
        <Field label="من تاريخ الحركة">
          <input
            type="date"
            value={params.get('from') ?? ''}
            onChange={(e) => set('from', e.target.value)}
          />
        </Field>
        <Field label="إلى تاريخ الحركة">
          <input
            type="date"
            value={params.get('to') ?? ''}
            onChange={(e) => set('to', e.target.value)}
          />
        </Field>
        <Field label="نوع الحركة">
          <select value={params.get('kind') ?? 'all'} onChange={(e) => set('kind', e.target.value)}>
            <option value="all">كل الحركات</option>
            {Object.entries(movementNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="أساس الفرع">
          <select
            value={params.get('basis') ?? 'all'}
            onChange={(e) => set('basis', e.target.value)}
          >
            <option value="all">مصدر ودفع</option>
            <option value="source">فرع المصدر</option>
            <option value="paying">فرع الدفع</option>
          </select>
        </Field>
      </div>
      {!valid ? (
        <PayoutError error={new CommercialError('VALIDATION_FAILED', 400)} />
      ) : data.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل كشف الحساب" />
      ) : data.isError ? (
        <PayoutError error={data.error} />
      ) : (
        <>
          <dl className="payout-amounts payout-statement-totals">
            <div>
              <dt>رصيد أول المدة</dt>
              <dd>
                <Amount value={data.data.openingMinor} />
              </dd>
            </div>
            <div>
              <dt>إضافات {data.data.filtered ? '(حسب الفلتر)' : ''}</dt>
              <dd>
                <Amount value={data.data.creditsMinor} />
              </dd>
            </div>
            <div>
              <dt>خصومات وتحصيلات {data.data.filtered ? '(حسب الفلتر)' : ''}</dt>
              <dd>
                <Amount value={data.data.debitsMinor} />
              </dd>
            </div>
            <div>
              <dt>رصيد آخر المدة</dt>
              <dd>
                <Amount value={data.data.closingMinor} strong />
              </dd>
            </div>
          </dl>
          {!data.data.reconciled && (
            <p role="alert" className="commercial-error">
              الحركات لا تطابق نموذج المستحقات. لا تعتمد على الرصيد قبل المراجعة.
            </p>
          )}
          {!data.data.items.length ? (
            <StatePanel state="empty" title="لا توجد حركات في هذه الفترة" />
          ) : (
            <ol className="payout-statement">
              {data.data.items.map((m) => (
                <li key={m.id}>
                  <div>
                    <strong>{movementNames[m.kind]}</strong>
                    <span>
                      {m.effectiveDate} · {m.basis === 'paying' ? 'فرع الدفع' : 'فرع المصدر'}{' '}
                      {m.branchName}
                      {m.readiness === 'pending' && ' · بانتظار استلام أموال المندوب'}
                    </span>
                    <span>
                      {m.payout && (
                        <Link to={'/brand-payouts/payouts/' + m.payout.id}>
                          تحصيل {m.payout.reference}
                        </Link>
                      )}
                      {m.shipment && (
                        <Link to={'/tracking/' + m.shipment.id}>الشحنة {m.shipment.reference}</Link>
                      )}
                      {m.remittance && (
                        <Link to={'/remittances/' + m.remittance.id}>
                          استلام {m.remittance.reference}
                        </Link>
                      )}
                      {m.reason && <small>{m.reason}</small>}
                    </span>
                  </div>
                  <div className="payout-row-amount">
                    <Amount value={m.amountMinor} strong />
                    <span>
                      الرصيد بعد الحركة <Amount value={m.balanceAfterMinor} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Pager
            page={data.data.page}
            limit={data.data.limit}
            total={data.data.total}
            onPage={(p) => set('page', String(p))}
          />
        </>
      )}
    </section>
  );
}
function useWallet(brandId: string | undefined) {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['brand-wallet', company, brandId, registry?.context.authorizationRevision],
    enabled: !!company && !!brandId,
    retry: false,
    queryFn: () =>
      payoutApi<BrandWalletSummary>(`/brand-wallets/${brandId}?companyId=${company}`, 'summary'),
  });
}
export function BrandWalletPage() {
  const { brandId } = useParams(),
    location = useLocation(),
    wallet = useWallet(brandId),
    { params, setParams } = useParamState(),
    titleRef = useRef<HTMLDivElement>(null);
  const view = params.get('view') ?? 'lots',
    back = (location.state as { back?: string } | null)?.back ?? '/brand-payouts';
  useEffect(() => {
    titleRef.current?.focus();
  }, [wallet.data?.brandId]);
  if (!wallet.data)
    return wallet.isError ? (
      <PayoutError error={wallet.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل محفظة البراند" />
    );
  const w = wallet.data;
  const views: [string, string][] = [
    ['lots', 'المستحقات'],
    ['statement', 'كشف الحساب'],
    ['payouts', 'التحصيلات'],
  ];
  return (
    <>
      <div ref={titleRef} tabIndex={-1}>
        <PageHeading
          eyebrow="محفظة البراند المشتركة بين الفروع"
          title={w.brandName}
          description={
            'أيام التحصيل المتفق عليها: ' +
            w.payoutWeekdays.map((d) => weekdayNames[d]).join('، ') +
            (w.scheduledToday ? ' · اليوم موعد تحصيل' : ' · الموعد القادم ' + w.nextPayoutDate)
          }
        />
      </div>
      <Link className="back-link" to={back}>
        العودة للمستحقات
      </Link>
      <section className="finance-detail payout-summary" aria-label="ملخص المحفظة">
        <AmountsList amounts={w.amounts} />
        <Reasons reasons={w.reasons} />
        {w.amounts.eligibleToPayMinor !== '0' ? (
          <Link
            className="commercial-primary-link"
            to={`/brand-payouts/brands/${w.brandId}/pay`}
            state={{ back: location.pathname + location.search }}
          >
            تسجيل تحصيل
          </Link>
        ) : (
          <p className="muted">لا يوجد مبلغ متاح للتحصيل الآن.</p>
        )}
      </section>
      {w.branches.length > 0 && (
        <section className="payout-branches" aria-label="تفصيل الفروع">
          <h2>تفصيل حسب فرع المصدر</h2>
          <div className="table-wrap">
            <table className="shipment-table">
              <caption className="sr-only">مبالغ المحفظة حسب الفرع</caption>
              <thead>
                <tr>
                  <th scope="col">الفرع</th>
                  <th scope="col">مستلم فعليًا</th>
                  <th scope="col">معلّق</th>
                  <th scope="col">موقوف</th>
                  <th scope="col">رسوم</th>
                  <th scope="col">تغطية شحن</th>
                </tr>
              </thead>
              <tbody>
                {w.branches.map((b) => (
                  <tr key={b.branchId ?? 'none'}>
                    <td>{b.branchName}</td>
                    <td>
                      <Amount value={b.eligibleMinor} />
                    </td>
                    <td>
                      <Amount value={b.pendingMinor} />
                    </td>
                    <td>
                      <Amount value={b.heldMinor} />
                    </td>
                    <td>
                      <Amount value={b.debitsMinor} />
                    </td>
                    <td>
                      <Amount value={b.coverMinor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            المتاح للتحصيل يُحسب على مستوى البراند كله، ويمكن الدفع من أي فرع مسموح لك.
          </p>
        </section>
      )}
      <nav className="payout-views" aria-label="عروض محفظة البراند">
        {views.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setParams({ view: key })}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === 'statement' ? (
        <StatementView brandId={w.brandId} />
      ) : view === 'payouts' ? (
        <>
          <HistoryFilters brands={[]} fixedBrand={w.brandId} />
          <PayoutHistoryList brandId={w.brandId} />
        </>
      ) : (
        <LotsView brandId={w.brandId} />
      )}
    </>
  );
}
const blockerCopy: Record<string, string> = {
  INSUFFICIENT_ELIGIBLE_CREDIT: 'المبلغ أكبر من المتاح للتحصيل الآن.',
  INSUFFICIENT_FUNDS: 'رصيد الحساب لا يكفي.',
  ACCOUNT_INACTIVE: 'الحساب موقوف.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح لفرع الدفع.',
  METHOD_ACCOUNT_MISMATCH: 'طريقة الدفع لا تناسب نوع الحساب.',
  FUTURE_PAYMENT_DATE: 'تاريخ الدفع في المستقبل.',
  ACCOUNT_RECONCILIATION_REQUIRED: 'رصيد الحساب يحتاج مراجعة.',
};
export function BrandPayoutNewPage() {
  const { brandId } = useParams(),
    wallet = useWallet(brandId),
    catalog = useCatalog();
  if (!wallet.data || !catalog.data)
    return wallet.isError || catalog.isError ? (
      <PayoutError error={wallet.error ?? catalog.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل المحفظة والحسابات" />
    );
  return (
    <PayoutForm
      wallet={wallet.data}
      catalog={catalog.data}
      refreshWallet={() => wallet.refetch()}
    />
  );
}
export function PayoutForm({
  wallet,
  catalog,
  refreshWallet,
}: {
  wallet: BrandWalletSummary;
  catalog: BrandPayoutCatalog;
  refreshWallet: () => Promise<unknown>;
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    { registry, session } = useAccess(),
    back =
      (location.state as { back?: string } | null)?.back ??
      '/brand-payouts/brands/' + wallet.brandId;
  const [branchId, setBranch] = useState(
      catalog.branches.length === 1 ? catalog.branches[0]!.id : '',
    ),
    [method, setMethod] = useState<PaymentMethod>('cash'),
    [accountId, setAccount] = useState(''),
    [amount, setAmount] = useState(''),
    [date, setDate] = useState(cairoToday),
    [reference, setReference] = useState(''),
    [reason, setReason] = useState(''),
    [preview, setPreview] = useState<BrandPayoutPreview | null>(null),
    [reviewing, setReviewing] = useState(false),
    [notice, setNotice] = useState(''),
    [checking, setChecking] = useState(false),
    [formError, setFormError] = useState<unknown>(null);
  const mutation = usePayoutMutation(wallet.brandId, (r) =>
    navigate('/brand-payouts/payouts/' + r.payoutId, { state: { confirmed: true, back } }),
  );
  const offDay = !wallet.payoutWeekdays.includes(new Date(date + 'T00:00:00Z').getUTCDay());
  const accounts = catalog.accounts.filter(
    (a) =>
      a.active && a.branchIds.includes(branchId) && (a.type === 'cash') === (method === 'cash'),
  );
  const locked = mutation.busy || !!mutation.pending || checking;
  const invalidate = () => {
    setPreview(null);
    setReviewing(false);
    setNotice('');
  };
  const scope = () => {
    let amountMinor: string;
    try {
      amountMinor = inputMinor(amount);
    } catch {
      throw new CommercialError('VALIDATION_FAILED', 400);
    }
    if (!branchId || !accountId || amountMinor === '0' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new CommercialError('VALIDATION_FAILED', 400);
    return {
      companyId: registry!.context.companyId,
      brandId: wallet.brandId,
      payingBranchId: branchId,
      accountId,
      method,
      amountMinor,
      actualDate: date,
    };
  };
  const review = async (message = '') => {
    setChecking(true);
    setFormError(null);
    try {
      const p = await payoutApi<BrandPayoutPreview>(
        '/brand-payouts/preview',
        'preview',
        scope(),
        session?.csrfToken,
      );
      setPreview(p);
      setNotice(message);
      setReviewing(true);
    } catch (e) {
      setFormError(e);
      setReviewing(false);
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    const e = mutation.error;
    if (
      e instanceof CommercialError &&
      ['WALLET_CHANGED', 'INSUFFICIENT_ELIGIBLE_CREDIT', 'INSUFFICIENT_FUNDS'].includes(e.code)
    ) {
      // Reopen review with the committed numbers; the entered intent is kept as-is.
      mutation.setError(null);
      void refreshWallet();
      void review(messages[e.code]!);
    }
  }, [mutation.error]);
  const reasonMissing = (preview?.offDay ?? offDay) && !reason.trim();
  const canConfirm = !!preview && !preview.blockers.length && !reasonMissing && !locked;
  return (
    <>
      <PageHeading
        eyebrow={'تحصيل · ' + wallet.brandName}
        title="تسجيل تحصيل للبراند"
        description="سجّل مبلغًا دفعته الشركة فعليًا للبراند. يمكن أن يكون جزئيًا، ولا يتجاوز المتاح الآن ولا رصيد الحساب."
      />
      <Link className="back-link" to={back}>
        العودة للمحفظة
      </Link>
      <section className="payout-summary finance-detail" aria-label="المتاح الآن">
        <AmountsList amounts={wallet.amounts} />
        <Reasons reasons={wallet.reasons} />
      </section>
      {mutation.pending && (
        <StatePanel
          state="pending"
          title="نتيجة التحصيل قيد التحقق"
          action={
            <Button type="button" disabled={mutation.busy} onClick={() => void mutation.recover()}>
              استرداد نتيجة التحصيل
            </Button>
          }
        >
          <p>
            احتفظنا بنفس الطلب ({displayMinor(mutation.pending.amountMinor)} ج.م). لا تدفع مرة أخرى
            قبل معرفة النتيجة.
          </p>
        </StatePanel>
      )}
      <PayoutError error={formError ?? (reviewing ? null : mutation.error)} />
      <form
        className="finance-form"
        onSubmit={(e) => {
          e.preventDefault();
          void review();
        }}
      >
        <fieldset disabled={locked}>
          <FormGroup
            title="من أين يُدفع"
            description="فرع الدفع مستقل عن فروع مصدر المستحقات. يظهر لك فقط ما تسمح به صلاحياتك."
          >
            <div className="commercial-fields">
              <Field label="فرع الدفع">
                <select
                  required
                  value={branchId}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setAccount('');
                    invalidate();
                  }}
                >
                  <option value="">اختر الفرع</option>
                  {catalog.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="طريقة الدفع">
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value as PaymentMethod);
                    setAccount('');
                    invalidate();
                  }}
                >
                  {Object.entries(methodNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الحساب">
                <select
                  required
                  value={accountId}
                  onChange={(e) => {
                    setAccount(e.target.value);
                    invalidate();
                  }}
                >
                  <option value="">اختر الحساب</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {branchId && !accounts.length && (
              <p className="muted">لا يوجد حساب نشط مناسب لهذا الفرع وطريقة الدفع.</p>
            )}
          </FormGroup>
          <FormGroup
            title="التحصيل الفعلي"
            description="المبلغ بالجنيه، ويُقبل حتى قرشين بعد العلامة العشرية."
          >
            <div className="commercial-fields">
              <Field label="المبلغ بالجنيه">
                <input
                  required
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    invalidate();
                  }}
                />
              </Field>
              <Field label="تاريخ الدفع الفعلي">
                <input
                  required
                  type="date"
                  value={date}
                  max={cairoToday()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    invalidate();
                  }}
                />
              </Field>
              <Field label="مرجع التحويل — اختياري">
                <input
                  maxLength={120}
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value);
                    invalidate();
                  }}
                />
              </Field>
            </div>
            <p className="muted">لا تُطلب صور أو إثبات من مزود الدفع. المرجع للتتبع فقط.</p>
            {offDay && (
              <Field label="سبب التحصيل خارج الأيام المتفق عليها">
                <textarea
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            )}
            {offDay && (
              <p className="muted">
                {weekdayNames[new Date(date + 'T00:00:00Z').getUTCDay()]} ليس من أيام التحصيل المتفق
                عليها. السبب لا يتجاوز الرصيد المتاح أو أموال الحساب.
              </p>
            )}
          </FormGroup>
        </fieldset>
        <Button type="submit" disabled={locked}>
          {checking ? 'جارٍ المراجعة…' : 'مراجعة التحصيل'}
        </Button>
      </form>
      <Dialog
        open={reviewing && !!preview}
        onOpenChange={(open) => !mutation.busy && setReviewing(open)}
      >
        <DialogContent dir="rtl" className="review-dialog payout-dialog">
          <DialogTitle>مراجعة التحصيل الفعلي</DialogTitle>
          <DialogDescription>
            أكّد فقط بعد دفع المبلغ للبراند فعليًا. لا يمكن حذف التحصيل بعد تسجيله.
          </DialogDescription>
          {preview && (
            <>
              {notice && (
                <p role="alert" className="commercial-error">
                  {notice}
                </p>
              )}
              <dl className="payout-review">
                <div>
                  <dt>البراند</dt>
                  <dd>{preview.wallet.brandName}</dd>
                </div>
                <div>
                  <dt>المبلغ</dt>
                  <dd>
                    <Amount value={preview.amountMinor} strong />
                  </dd>
                </div>
                <div>
                  <dt>من</dt>
                  <dd>
                    {catalog.branches.find((b) => b.id === branchId)?.name} · {preview.account.name}{' '}
                    · {methodNames[method]}
                  </dd>
                </div>
                <div>
                  <dt>تاريخ الدفع</dt>
                  <dd>
                    {weekdayNames[preview.weekday]} <bdi dir="ltr">{date}</bdi>
                    {preview.offDay ? ' — خارج الموعد' : ' — موعد متفق عليه'}
                  </dd>
                </div>
                <div>
                  <dt>المتاح للتحصيل الآن</dt>
                  <dd>
                    <Amount value={preview.wallet.amounts.eligibleToPayMinor} />
                  </dd>
                </div>
                <div>
                  <dt>المتبقي بعد التحصيل</dt>
                  <dd>
                    {preview.eligibleToPayAfterMinor === null ? (
                      '—'
                    ) : (
                      <Amount value={preview.eligibleToPayAfterMinor} />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>رصيد الحساب المتاح</dt>
                  <dd>
                    <Amount value={preview.account.availableMinor} />
                  </dd>
                </div>
                {reference.trim() && (
                  <div>
                    <dt>المرجع</dt>
                    <dd>{reference.trim()}</dd>
                  </div>
                )}
              </dl>
              {preview.blockers.length > 0 && (
                <ul role="alert" className="commercial-error">
                  {preview.blockers.map((b) => (
                    <li key={b}>{blockerCopy[b]}</li>
                  ))}
                </ul>
              )}
              {reasonMissing && (
                <p role="alert" className="commercial-error">
                  {messages.OFF_DAY_REASON_REQUIRED}
                </p>
              )}
              <PayoutError error={reviewing ? mutation.error : null} />
              <div className="dialog-actions">
                <Button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() =>
                    void mutation.submit({
                      brandId: wallet.brandId,
                      payingBranchId: branchId,
                      accountId,
                      method,
                      amountMinor: preview.amountMinor,
                      actualDate: date,
                      expectedReadinessRevision: preview.readinessRevision,
                      ...(reference.trim() ? { externalReference: reference.trim() } : {}),
                      ...(preview.offDay ? { offDayReason: reason.trim() } : {}),
                    })
                  }
                >
                  {mutation.busy ? 'جارٍ التسجيل…' : 'تأكيد التحصيل الفعلي'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.busy}
                  onClick={() => setReviewing(false)}
                >
                  تعديل المدخلات
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function BrandPayoutDetailPage() {
  const { payoutId } = useParams(),
    { registry } = useAccess(),
    location = useLocation(),
    company = registry?.context.companyId,
    state = location.state as { confirmed?: boolean; back?: string } | null,
    titleRef = useRef<HTMLDivElement>(null);
  const data = useQuery({
    queryKey: ['payout-detail', company, payoutId, registry?.context.authorizationRevision],
    enabled: !!company && !!payoutId,
    retry: false,
    queryFn: () =>
      payoutApi<BrandPayoutDetail>(`/brand-payouts/${payoutId}?companyId=${company}`, 'detail'),
  });
  useEffect(() => {
    titleRef.current?.focus();
  }, [data.data?.payoutId]);
  const p = data.data;
  if (!p)
    return data.isError ? (
      <PayoutError error={data.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل التحصيل" />
    );
  return (
    <>
      <div ref={titleRef} tabIndex={-1}>
        <PageHeading
          eyebrow={'تحصيل · ' + p.brandName}
          title={'تحصيل ' + p.reference}
          description="سجل ثابت. أي خطأ يُعالج بتسوية مرتبطة، لا بحذف أو دفع عكسي وهمي."
        />
      </div>
      {state?.confirmed && (
        <StatePanel state="ready" title="تم تسجيل التحصيل">
          <p>
            المتبقي المتاح للبراند بعد هذا التحصيل: <Amount value={p.eligibleToPayAfterMinor} />
          </p>
        </StatePanel>
      )}
      <Link className="back-link" to={state?.back ?? '/brand-payouts/brands/' + p.brandId}>
        العودة
      </Link>
      <section className="finance-detail" aria-label="تفاصيل التحصيل">
        <dl>
          <dt>المبلغ</dt>
          <dd>
            <Amount value={p.amountMinor} strong />
          </dd>
          <dt>البراند</dt>
          <dd>
            <Link to={'/brand-payouts/brands/' + p.brandId}>{p.brandName}</Link>
          </dd>
          <dt>تاريخ الدفع</dt>
          <dd>
            {weekdayNames[p.weekday]} <bdi dir="ltr">{p.actualDate}</bdi>
            {p.offDay ? ' — خارج الأيام المتفق عليها' : ' — موعد متفق عليه'}
          </dd>
          {p.offDayReason && (
            <>
              <dt>سبب اليوم</dt>
              <dd>{p.offDayReason}</dd>
            </>
          )}
          <dt>فرع الدفع والحساب</dt>
          <dd>
            {p.payingBranchName} · {p.accountName} · {methodNames[p.method]}
          </dd>
          <dt>المرجع</dt>
          <dd>{p.externalReference || 'بدون مرجع'}</dd>
          <dt>المتاح قبل/بعد</dt>
          <dd>
            <Amount value={p.eligibleToPayBeforeMinor} /> ←{' '}
            <Amount value={p.eligibleToPayAfterMinor} />
          </dd>
          <dt>سجّله</dt>
          <dd>
            {p.actorName} ·{' '}
            {new Date(p.recordedAt).toLocaleString('ar-EG', {
              timeZone: 'Africa/Cairo',
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </dd>
        </dl>
      </section>
      <section className="payout-allocations" aria-label="مصادر المبلغ">
        <h2>من أي مستحقات دُفع المبلغ</h2>
        <ul>
          {p.allocations.map((a) => (
            <li key={a.lotId}>
              <Amount value={a.amountMinor} /> · {movementNames[a.lotKind]} · فرع المصدر{' '}
              {a.sourceBranchName} · {a.effectiveDate}
              {a.shipment && (
                <>
                  {' · '}
                  <Link to={'/tracking/' + a.shipment.id}>الشحنة {a.shipment.reference}</Link>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
      {p.reviews.map((r) => (
        <StatePanel key={r.id} state="pending" title="تصحيح لاحق على مصدر هذا التحصيل">
          <p>
            التحصيل الأصلي محفوظ كما هو. المراجعة {r.state === 'open' ? 'مفتوحة' : 'حُسمت'} وتُحسم
            بتسوية مرتبطة.
          </p>
          <Link to="/execution/reviews">فتح مراجعات التسوية</Link>
        </StatePanel>
      ))}
    </>
  );
}
