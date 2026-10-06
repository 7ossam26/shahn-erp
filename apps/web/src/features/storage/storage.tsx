import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormGroup,
  PageHeading,
  StatePanel,
  Input,
} from '@shahn/ui';
import type {
  PaymentMethod,
  StorageAgreementDetail,
  StorageAgreementList,
  StorageAgreementSummary,
  StorageCatalog,
  StoragePaymentCommand,
  StoragePaymentPreview,
  StoragePaymentResult,
  StoragePeriodView,
  StorageRefundCommand,
  StorageRefundPreview,
  StorageRefundResult,
  StorageRenewalStatus,
  StorageStopCommand,
  StorageStopPreview,
  StorageStopResult,
} from '@shahn/contracts';
import { useAccess, Reauthenticate } from '../access/access.js';
import { CommercialError, Field, displayMinor, inputMinor } from '../brands/api.js';
import { StorageApiError, storageApi, useStorageMutation } from './api.js';
import '../finance/finance.css';
import './storage.css';

const methodNames: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bank_deposit: 'إيداع بنكي',
  instapay: 'إنستا باي',
};
const statusNames = { unpaid: 'غير مدفوعة', partial: 'مدفوعة جزئيًا', paid: 'مدفوعة' } as const;
const messages: Record<string, string> = {
  STORAGE_CREDIT_CHANGED:
    'تغيّر رصيد التخزين أو الفترات المستحقة بعد مراجعتك. لم يُسجل شيء؛ راجع التوزيع الجديد ثم أكّد من جديد.',
  STORAGE_CREDIT_ALLOCATED:
    'جزء من هذا المبلغ مخصص لفترات تخزين مستحقة. لا يُسترد المال المخصص إلا بعد تصحيح مرتبط في التسويات؛ لم يتغير أي رصيد.',
  INSUFFICIENT_STORAGE_CREDIT: 'المبلغ أكبر من رصيد التخزين المقدم غير المخصص. لم يتغير أي رصيد.',
  INSUFFICIENT_FUNDS: 'رصيد الحساب المختار لا يكفي. لم يُسجل شيء ولم يتغير أي رصيد.',
  FUTURE_PAYMENT_DATE: 'اختر التاريخ الفعلي اليوم أو قبله.',
  ACCOUNT_INACTIVE: 'الحساب موقوف. اختر حسابًا نشطًا.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح للفرع المختار. لم يُسجل شيء.',
  METHOD_ACCOUNT_MISMATCH:
    'النقدي يحتاج حسابًا نقديًا، والإيداع البنكي وإنستا باي يحتاجان حسابًا بنكيًا.',
  ACCOUNT_RECONCILIATION_REQUIRED: 'رصيد الحساب يحتاج مراجعة قبل استخدامه.',
  STORAGE_AGREEMENT_REQUIRED: 'لا يوجد اتفاق تخزين لهذا البراند. أضفه من إعداد البراند أولًا.',
  STORAGE_ALREADY_STOPPED: 'تجديد هذا الاتفاق متوقف بالفعل.',
  REVISION_CONFLICT: 'تغيّر الاتفاق بعد فتح الصفحة. راجع البيانات الحالية ثم أكّد من جديد.',
  COMMAND_PAYLOAD_CONFLICT: 'هذا الطلب سُجل سابقًا ببيانات مختلفة. افتح السجل قبل أي إجراء جديد.',
  RESULT_UNKNOWN: 'لم تصل النتيجة. لا تكرر العملية؛ تحقق من النتيجة بنفس الطلب أولًا.',
  CONNECTION_LOST: 'تعذر الاتصال. البيانات الظاهرة قد تكون قديمة؛ المدخلات باقية.',
  FORBIDDEN_SCOPE: 'هذا الإجراء خارج صلاحياتك أو فروعك الحالية. لم يُسجل شيء.',
  CSRF_FAILED: 'انتهت صلاحية الجلسة لهذا الإجراء. حدّث الصفحة ثم حاول.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجّل الدخول؛ المدخلات باقية.',
  NOT_FOUND: 'السجل أو الحساب غير متاح ضمن صلاحياتك الحالية. لم يُسجل شيء.',
  VALIDATION_FAILED: 'راجع المبلغ والتاريخ والحقول المطلوبة.',
  INVALID_RESPONSE: 'وصل رد غير متوقع من الخادم. حدّث الصفحة.',
};
const blockerCopy: Record<string, string> = {
  ...messages,
  INSUFFICIENT_FUNDS: 'رصيد الحساب لا يكفي.',
  FUTURE_PAYMENT_DATE: 'التاريخ في المستقبل.',
};
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }),
  monthFormat = new Intl.DateTimeFormat('ar-EG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
export const arDate = (d: string) => dateFormat.format(new Date(d + 'T00:00:00Z'));
export const arMonth = (month: string) => monthFormat.format(new Date(month + '-01T00:00:00Z'));
function Amount({ value, strong = false }: { value: string; strong?: boolean }) {
  return (
    <bdi dir="ltr" className={strong ? 'finance-amount' : 'storage-amount'}>
      {displayMinor(value)} ج.م
    </bdi>
  );
}
function StorageError({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  const code = error instanceof Error ? error.message : '';
  const details = error instanceof StorageApiError ? error.details : undefined;
  return (
    <div ref={ref} className="commercial-error" role="alert" tabIndex={-1}>
      <p>{messages[code] ?? 'تعذر إكمال الطلب. راجع البيانات والاتصال.'}</p>
      {details?.unallocatedMinor !== undefined && (
        <p>
          الرصيد المقدم غير المخصص: <Amount value={details.unallocatedMinor} />
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
      <DialogContent dir="rtl" className="review-dialog storage-dialog">
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
function useCatalog() {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['storage-catalog', company, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () => storageApi<StorageCatalog>('/catalog?companyId=' + company, 'catalog'),
  });
}
function useAgreement(agreementId: string | undefined) {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['storage-agreement', agreementId, company, registry?.context.authorizationRevision],
    enabled: !!company && !!agreementId,
    retry: false,
    queryFn: () =>
      storageApi<StorageAgreementDetail>(
        `/agreements/${agreementId}?companyId=${company}`,
        'detail',
      ),
  });
}
function RenewalNotice({ renewal }: { renewal: StorageRenewalStatus }) {
  if (!renewal.pending && !renewal.leased && !renewal.failed && !renewal.lastError) return null;
  return (
    <p className="storage-renewal" role="status">
      التجديد الآلي: {renewal.pending + renewal.leased} بانتظار المعالجة
      {renewal.oldestPendingSince && (
        <> منذ {new Date(renewal.oldestPendingSince).toLocaleString('ar-EG')}</>
      )}
      {renewal.failed > 0 && <> · {renewal.failed} متوقف</>}
      {renewal.lastError && <> · آخر خطأ: {renewal.lastError}</>}
    </p>
  );
}
const filterKeys = ['state', 'payment', 'overdue', 'dueFrom', 'dueTo', 'paidFrom', 'paidTo'];
export function StorageListPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [params, setParams] = useSearchParams();
  const set = (name: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value && value !== 'all') p.set(name, value);
    else p.delete(name);
    if (name !== 'page') p.delete('page');
    if (name === 'paidFrom' || name === 'paidTo')
      if (p.get('paidFrom') || p.get('paidTo'))
        p.set('paymentBasis', p.get('paymentBasis') ?? 'actual');
    setParams(p);
  };
  const query = new URLSearchParams(params);
  query.set('companyId', company ?? '');
  const data = useQuery({
    queryKey: ['storage-list', company, params.toString(), registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () => storageApi<StorageAgreementList>('/agreements?' + query, 'list'),
  });
  const branches = registry?.context.companyBranches ?? [],
    active = filterKeys.filter((k) => params.get(k)).length;
  return (
    <>
      <PageHeading
        eyebrow="المالية · اشتراك واحد لكل براند"
        title="اشتراكات التخزين"
        description="الرسم الشهري الثابت يُستحق ويُسجل إيرادًا كاملًا في بداية كل فترة. التحصيل الفعلي والرصيد المقدم منفصلان عن الإيراد وعن رصيد تحصيل البراند."
      />
      <div className="storage-actions">
        <Link className="commercial-primary-link" to="/storage/payments/new">
          تسجيل تحصيل تخزين
        </Link>
      </div>
      <div className="commercial-filter-row">
        <Field label="بحث باسم البراند">
          <Input
            value={params.get('search') ?? ''}
            onChange={(e) => set('search', e.target.value)}
          />
        </Field>
        <Field label="فرع الإيراد (فرع الاتفاق)">
          <select
            value={params.get('branchId') ?? ''}
            onChange={(e) => set('branchId', e.target.value)}
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <AdvancedFilters count={active} onReset={() => setParams({})}>
        <Field label="حالة الاتفاق">
          <select
            value={params.get('state') ?? 'all'}
            onChange={(e) => set('state', e.target.value)}
          >
            <option value="all">كل الاتفاقات</option>
            <option value="active">نشط</option>
            <option value="stopped">متوقف التجديد</option>
          </select>
        </Field>
        <Field label="حالة سداد الفترات">
          <select
            value={params.get('payment') ?? 'all'}
            onChange={(e) => set('payment', e.target.value)}
          >
            <option value="all">كل الفترات</option>
            <option value="unpaid">بها فترة غير مدفوعة</option>
            <option value="partial">بها فترة مدفوعة جزئيًا</option>
            <option value="paid">بها فترة مدفوعة</option>
          </select>
        </Field>
        <Field label="المتأخرات">
          <select
            value={params.get('overdue') ?? 'all'}
            onChange={(e) => set('overdue', e.target.value)}
          >
            <option value="all">الكل</option>
            <option value="true">عليها متأخرات فقط</option>
          </select>
        </Field>
        <Field label="فترات تستحق من (تاريخ بداية الفترة)">
          <Input
            type="date"
            value={params.get('dueFrom') ?? ''}
            onChange={(e) => set('dueFrom', e.target.value)}
          />
        </Field>
        <Field label="فترات تستحق حتى">
          <Input
            type="date"
            value={params.get('dueTo') ?? ''}
            onChange={(e) => set('dueTo', e.target.value)}
          />
        </Field>
        <Field label="أساس تاريخ التحصيل">
          <select
            value={params.get('paymentBasis') ?? 'actual'}
            onChange={(e) => set('paymentBasis', e.target.value)}
          >
            <option value="actual">تاريخ الاستلام الفعلي</option>
            <option value="recorded">تاريخ التسجيل</option>
          </select>
        </Field>
        <Field label="تحصيل من تاريخ">
          <Input
            type="date"
            value={params.get('paidFrom') ?? ''}
            onChange={(e) => set('paidFrom', e.target.value)}
          />
        </Field>
        <Field label="تحصيل حتى تاريخ">
          <Input
            type="date"
            value={params.get('paidTo') ?? ''}
            onChange={(e) => set('paidTo', e.target.value)}
          />
        </Field>
      </AdvancedFilters>
      {data.data && <RenewalNotice renewal={data.data.renewal} />}
      {data.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل اشتراكات التخزين" />
      ) : data.isError ? (
        <StorageError error={data.error} />
      ) : !data.data.items.length ? (
        <StatePanel state="empty" title="لا توجد اتفاقات تخزين تطابق الفلاتر">
          <Button variant="outline" onClick={() => setParams({})}>
            مسح الفلاتر
          </Button>
        </StatePanel>
      ) : (
        <>
          <div className="finance-list">
            {data.data.items.map((a) => (
              <AgreementRow key={a.agreementId} a={a} back={'/storage?' + params.toString()} />
            ))}
          </div>
          <div className="finance-pagination">
            <Button
              variant="outline"
              disabled={data.data.page <= 1}
              onClick={() => set('page', String(data.data.page - 1))}
            >
              السابق
            </Button>
            <span>
              صفحة {data.data.page} من {Math.max(1, Math.ceil(data.data.total / data.data.limit))}
            </span>
            <Button
              variant="outline"
              disabled={data.data.page * data.data.limit >= data.data.total}
              onClick={() => set('page', String(data.data.page + 1))}
            >
              التالي
            </Button>
          </div>
        </>
      )}
    </>
  );
}
function AgreementRow({ a, back }: { a: StorageAgreementSummary; back: string }) {
  return (
    <Link className="finance-row" to={'/storage/' + a.agreementId} state={{ back }}>
      <div>
        <strong>{a.brandName}</strong>
        <span>
          فرع الإيراد: {a.branchName} · الرسم <Amount value={a.currentFeeMinor} /> ·{' '}
          {a.state === 'active' ? 'نشط' : 'متوقف التجديد'}
          {a.nextPeriodStartDate && <> · الفترة القادمة {arDate(a.nextPeriodStartDate)}</>}
        </span>
        <span className="storage-chips">
          {a.overdue && (
            <span className="storage-overdue">
              متأخرات <Amount value={a.charges.overdueMinor} />
            </span>
          )}
          {a.credit.unallocatedMinor !== '0' && (
            <span>
              رصيد مقدم غير مخصص <Amount value={a.credit.unallocatedMinor} />
            </span>
          )}
          {a.nextChange && (
            <span>
              رسم جديد <Amount value={a.nextChange.feeMinor} /> من{' '}
              {arDate(a.nextChange.effectiveStartDate)}
            </span>
          )}
        </span>
      </div>
      <div className="storage-row-amount">
        <span>المتبقي المستحق</span>
        <Amount value={a.charges.outstandingMinor} strong />
      </div>
    </Link>
  );
}
function Summary({ a }: { a: StorageAgreementSummary }) {
  return (
    <dl className="storage-amounts">
      <div className="storage-primary">
        <dt>المتبقي المستحق على الفترات</dt>
        <dd>
          <Amount value={a.charges.outstandingMinor} strong />
        </dd>
      </div>
      <div>
        <dt>منها متأخرات بعد تاريخ الاستحقاق</dt>
        <dd>
          <Amount value={a.charges.overdueMinor} />
        </dd>
      </div>
      <div>
        <dt>إجمالي رسوم الفترات (إيراد عند البداية)</dt>
        <dd>
          <Amount value={a.charges.chargedMinor} />
        </dd>
      </div>
      <div>
        <dt>المخصص من التحصيلات للفترات</dt>
        <dd>
          <Amount value={a.charges.allocatedMinor} />
        </dd>
      </div>
    </dl>
  );
}
function CreditPanel({ a }: { a: StorageAgreementSummary }) {
  return (
    <section className="storage-credit" aria-label="رصيد التخزين المقدم">
      <h2>رصيد التخزين المقدم غير المخصص</h2>
      <p className="finance-amount">
        <Amount value={a.credit.unallocatedMinor} />
      </p>
      <p className="muted">
        حساب تخزين منفصل لهذا البراند. ليس رصيد تحصيل البراند، وليس إيرادًا، ولا يعني أن فترة
        مستقبلية مدفوعة. يُخصص تلقائيًا لأقدم فترة مستحقة عند بدايتها.
      </p>
      <dl className="storage-mini">
        <div>
          <dt>تحصيلات فعلية</dt>
          <dd>
            <Amount value={a.credit.receiptsMinor} />
          </dd>
        </div>
        <div>
          <dt>خُصص للفترات</dt>
          <dd>
            <Amount value={a.credit.allocatedMinor} />
          </dd>
        </div>
        <div>
          <dt>استُرد نقدًا</dt>
          <dd>
            <Amount value={a.credit.refundedMinor} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
function PeriodRow({ p }: { p: StoragePeriodView }) {
  return (
    <li className={'storage-period' + (p.overdue ? ' storage-period-overdue' : '')}>
      <div>
        <strong>
          {arDate(p.startDate)} – {arDate(p.endDate)}
        </strong>
        <span>
          استحقاق {arDate(p.dueDate)} · إيراد {arMonth(p.revenueMonth)} كاملًا · فرع الإيراد:{' '}
          {p.branchName}
        </span>
        <span>
          {statusNames[p.status]}
          {p.overdue && ' · متأخرة'}
        </span>
        {p.allocations.length > 0 && (
          <span>
            من إيصالات:{' '}
            {p.allocations.map((x, i) => (
              <span key={x.receiptId + i}>
                رقم <bdi>{x.receiptReference}</bdi> (<Amount value={x.amountMinor} />
                {x.triggerKind === 'renewal' ? ' عند بداية الفترة' : ''}){' '}
              </span>
            ))}
          </span>
        )}
      </div>
      <dl className="storage-period-amounts">
        <div>
          <dt>الرسم</dt>
          <dd>
            <Amount value={p.feeMinor} />
          </dd>
        </div>
        <div>
          <dt>المخصص</dt>
          <dd>
            <Amount value={p.allocatedMinor} />
          </dd>
        </div>
        <div>
          <dt>المتبقي</dt>
          <dd>
            <Amount value={p.outstandingMinor} strong={p.outstandingMinor !== '0'} />
          </dd>
        </div>
      </dl>
    </li>
  );
}
export function StorageDetailPage() {
  const { agreementId } = useParams(),
    location = useLocation(),
    state = location.state as { back?: string; notice?: string } | null,
    back = state?.back ?? '/storage',
    d = useAgreement(agreementId);
  if (d.isPending) return <StatePanel state="pending" title="جارٍ تحميل اتفاق التخزين" />;
  if (d.isError) return <StorageError error={d.error} />;
  const a = d.data;
  return (
    <>
      <PageHeading
        eyebrow={'اشتراك التخزين · ' + (a.state === 'active' ? 'نشط' : 'متوقف التجديد')}
        title={a.brandName}
        description={`رسم ثابت ${displayMinor(a.currentFeeMinor)} ج.م يتجدد يوم ${a.anchorDay.toLocaleString('ar-EG')} من كل شهر منذ ${arDate(a.startDate)}، وفرع إيراده: ${a.branchName}.`}
      />
      <Link className="back-link" to={back}>
        العودة للقائمة
      </Link>
      {state?.notice && (
        <p className="storage-notice" role="status">
          {state.notice}
        </p>
      )}
      <div className="storage-actions">
        <Link
          className="commercial-primary-link"
          to={'/storage/payments/new?agreementId=' + a.agreementId}
          state={{ back: location.pathname }}
        >
          تسجيل تحصيل
        </Link>
      </div>
      <RenewalNotice renewal={a.renewal} />
      <Summary a={a} />
      {a.nextChange && (
        <p className="storage-notice">
          تغيير متفق عليه يسري من الفترة التي تبدأ {arDate(a.nextChange.effectiveStartDate)}: رسم{' '}
          <Amount value={a.nextChange.feeMinor} /> وفرع الإيراد: {a.nextChange.branchName}. الفترات
          المسجلة تحتفظ بقيمها.
        </p>
      )}
      {a.state === 'stopped' && a.lastServiceDate && (
        <p className="storage-notice">
          التجديد متوقف: آخر يوم خدمة محمي {arDate(a.lastServiceDate)}. المتأخرات والرصيد المقدم
          والسجل باقية؛ الإيقاف ليس استردادًا.
        </p>
      )}
      <section className="storage-section" aria-label="فترات الاشتراك">
        <h2>الفترات</h2>
        <p className="muted">
          أول فترة يحتسبها النظام تبدأ {arDate(a.firstBillableStartDate)}
          {a.nextPeriodStartDate ? ` · الفترة القادمة ${arDate(a.nextPeriodStartDate)}` : ''}.
          {a.origin === 'p04_configuration' &&
            ' هذا الاتفاق منقول من إعداد البراند؛ الفترات السابقة لتاريخ النقل تُسجل كرصيد افتتاحي عند وجود دليل.'}
        </p>
        {a.periods.length ? (
          <ul className="storage-periods">
            {a.periods.map((p) => (
              <PeriodRow key={p.periodId} p={p} />
            ))}
          </ul>
        ) : (
          <StatePanel state="empty" title="لم تبدأ أي فترة بعد">
            لا يُسجل إيراد قبل بداية الفترة، حتى مع وجود رصيد مقدم.
          </StatePanel>
        )}
      </section>
      <CreditPanel a={a} />
      <section className="storage-section" aria-label="التحصيلات الفعلية">
        <h2>التحصيلات الفعلية</h2>
        {a.receipts.length ? (
          <ul className="storage-history">
            {a.receipts.map((r) => (
              <li key={r.receiptId}>
                <div>
                  <strong>
                    إيصال رقم <bdi>{r.reference}</bdi> · <Amount value={r.amountMinor} />
                  </strong>
                  <span>
                    استلام فعلي {arDate(r.actualDate)} · سُجل{' '}
                    {new Date(r.recordedAt).toLocaleString('ar-EG')} · {methodNames[r.method]} ·{' '}
                    {r.accountName} · {r.branchName}
                    {r.externalReference && ' · مرجع ' + r.externalReference}
                  </span>
                  <span>
                    مخصص <Amount value={r.allocatedMinor} /> · مسترد{' '}
                    <Amount value={r.refundedMinor} /> · غير مخصص{' '}
                    <Amount value={r.unallocatedMinor} />
                  </span>
                  {r.allocations.map((x, i) => (
                    <span key={x.periodId + i}>
                      → فترة {arDate(x.startDate)} – {arDate(x.endDate)}:{' '}
                      <Amount value={x.amountMinor} />
                      {x.triggerKind === 'renewal' ? ' (عند بداية الفترة)' : ''}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">لا توجد تحصيلات مسجلة.</p>
        )}
      </section>
      {a.refunds.length > 0 && (
        <section className="storage-section" aria-label="المبالغ المستردة">
          <h2>المبالغ المستردة من الرصيد غير المخصص</h2>
          <ul className="storage-history">
            {a.refunds.map((r) => (
              <li key={r.refundId}>
                <div>
                  <strong>
                    استرداد رقم <bdi>{r.reference}</bdi> · <Amount value={r.amountMinor} />
                  </strong>
                  <span>
                    صرف فعلي {arDate(r.actualDate)} · {methodNames[r.method]} · {r.accountName} ·{' '}
                    {r.branchName}
                  </span>
                  <span>السبب: {r.reason}</span>
                  <span>
                    من إيصالات:{' '}
                    {r.sources.map((s) => (
                      <span key={s.receiptId}>
                        رقم <bdi>{s.receiptReference}</bdi> (<Amount value={s.amountMinor} />){' '}
                      </span>
                    ))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <details className="storage-section storage-terms">
        <summary>سجل شروط الاتفاق · {a.revisions.length.toLocaleString('ar-EG')} نسخة</summary>
        <ul className="storage-history">
          {a.revisions.map((r) => (
            <li key={r.revision}>
              <div>
                <strong>
                  نسخة {r.revision.toLocaleString('ar-EG')} · <Amount value={r.feeMinor} /> · فرع
                  الإيراد: {r.branchName}
                </strong>
                <span>
                  تسري من الفترة التي تبدأ {arDate(r.effectiveStartDate)} ·{' '}
                  {r.origin === 'p04_configuration' ? 'منقولة من إعداد البراند' : r.actorName}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted">
          تعديل الرسم أو فرع الإيراد يتم من <Link to={'/brands/' + a.brandId}>إعداد البراند</Link>{' '}
          ويسري من الفترة التالية فقط.
        </p>
      </details>
      <details className="storage-section storage-secondary">
        <summary>إجراءات أخرى</summary>
        <p className="muted">إجراءات منفصلة تحتاج مراجعة خاصة؛ ليست جزءًا من التحصيل.</p>
        <ul>
          <li>
            <Link to={'/storage/' + a.agreementId + '/refund'} state={{ back: location.pathname }}>
              استرداد رصيد تخزين غير مخصص
            </Link>
          </li>
          {a.state === 'active' && (
            <li>
              <Link to={'/storage/' + a.agreementId + '/stop'} state={{ back: location.pathname }}>
                إيقاف التجديد بعد الفترة الحالية
              </Link>
            </li>
          )}
        </ul>
      </details>
    </>
  );
}
interface MoneyFormProps {
  catalog: StorageCatalog;
  branchId: string;
  setBranch: (v: string) => void;
  method: PaymentMethod;
  setMethod: (v: PaymentMethod) => void;
  accountId: string;
  setAccount: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  reference: string;
  setReference: (v: string) => void;
  invalidate: () => void;
  branchLabel: string;
  dateLabel: string;
}
function MoneyFields(p: MoneyFormProps) {
  const accounts = p.catalog.accounts.filter(
    (a) =>
      a.active && a.branchIds.includes(p.branchId) && (a.type === 'cash') === (p.method === 'cash'),
  );
  return (
    <>
      <div className="commercial-fields">
        <Field label={p.branchLabel}>
          <select
            required
            value={p.branchId}
            onChange={(e) => {
              p.setBranch(e.target.value);
              p.setAccount('');
              p.invalidate();
            }}
          >
            <option value="">اختر الفرع</option>
            {p.catalog.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="طريقة الدفع">
          <select
            value={p.method}
            onChange={(e) => {
              p.setMethod(e.target.value as PaymentMethod);
              p.setAccount('');
              p.invalidate();
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
            value={p.accountId}
            onChange={(e) => {
              p.setAccount(e.target.value);
              p.invalidate();
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
        <Field label="المبلغ بالجنيه">
          <Input
            required
            inputMode="decimal"
            value={p.amount}
            onChange={(e) => {
              p.setAmount(e.target.value);
              p.invalidate();
            }}
          />
        </Field>
        <Field label={p.dateLabel}>
          <Input
            required
            type="date"
            value={p.date}
            max={p.catalog.today}
            onChange={(e) => {
              p.setDate(e.target.value);
              p.invalidate();
            }}
          />
        </Field>
        <Field label="مرجع التحويل — اختياري">
          <Input
            maxLength={120}
            value={p.reference}
            onChange={(e) => {
              p.setReference(e.target.value);
              p.invalidate();
            }}
          />
        </Field>
      </div>
      {p.branchId && !accounts.length && (
        <p className="muted">لا يوجد حساب نشط مناسب لهذا الفرع وطريقة الدفع.</p>
      )}
    </>
  );
}
function useMoneyState(catalog: StorageCatalog) {
  const [branchId, setBranch] = useState(
      catalog.branches.length === 1 ? catalog.branches[0]!.id : '',
    ),
    [method, setMethod] = useState<PaymentMethod>('cash'),
    [accountId, setAccount] = useState(''),
    [amount, setAmount] = useState(''),
    [date, setDate] = useState(catalog.today),
    [reference, setReference] = useState('');
  return {
    branchId,
    setBranch,
    method,
    setMethod,
    accountId,
    setAccount,
    amount,
    setAmount,
    date,
    setDate,
    reference,
    setReference,
  };
}
function scopeOf(company: string, brandId: string, m: ReturnType<typeof useMoneyState>) {
  let amountMinor: string;
  try {
    amountMinor = inputMinor(m.amount);
  } catch {
    throw new CommercialError('VALIDATION_FAILED', 400);
  }
  if (
    !brandId ||
    !m.branchId ||
    !m.accountId ||
    amountMinor === '0' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(m.date)
  )
    throw new CommercialError('VALIDATION_FAILED', 400);
  return {
    companyId: company,
    brandId,
    branchId: m.branchId,
    accountId: m.accountId,
    method: m.method,
    amountMinor,
    actualDate: m.date,
  };
}
function UnknownResult({
  pending,
  busy,
  recover,
  what,
}: {
  pending: object | null;
  busy: boolean;
  recover: () => void;
  what: string;
}) {
  if (!pending) return null;
  const amount = 'amountMinor' in pending ? String(pending.amountMinor) : null;
  return (
    <StatePanel
      state="pending"
      title={`نتيجة ${what} قيد التحقق`}
      action={
        <Button type="button" disabled={busy} onClick={recover}>
          التحقق من النتيجة
        </Button>
      }
    >
      <p>
        احتفظنا بنفس الطلب
        {amount ? ` (${displayMinor(amount)} ج.م)` : ''}. لا تكرر العملية قبل معرفة النتيجة.
      </p>
    </StatePanel>
  );
}
export function StoragePaymentPage() {
  const catalog = useCatalog(),
    [params] = useSearchParams();
  if (!catalog.data)
    return catalog.isError ? (
      <StorageError error={catalog.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الاتفاقات والحسابات" />
    );
  return <PaymentForm catalog={catalog.data} initialAgreement={params.get('agreementId') ?? ''} />;
}
function PaymentForm({
  catalog,
  initialAgreement,
}: {
  catalog: StorageCatalog;
  initialAgreement: string;
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    { registry, session } = useAccess(),
    [agreementId, setAgreementId] = useState(
      catalog.agreements.some((a) => a.agreementId === initialAgreement) ? initialAgreement : '',
    ),
    agreement = useAgreement(agreementId || undefined),
    selected = catalog.agreements.find((a) => a.agreementId === agreementId),
    back =
      (location.state as { back?: string } | null)?.back ??
      (agreementId ? '/storage/' + agreementId : '/storage');
  const m = useMoneyState(catalog);
  const [preview, setPreview] = useState<StoragePaymentPreview | null>(null),
    [reviewing, setReviewing] = useState(false),
    [received, setReceived] = useState(false),
    [notice, setNotice] = useState(''),
    [checking, setChecking] = useState(false),
    [formError, setFormError] = useState<unknown>(null);
  const mutation = useStorageMutation<StoragePaymentCommand, StoragePaymentResult>(
    'payment',
    selected?.brandId ?? 'none',
    (r) =>
      navigate('/storage/' + r.agreementId, {
        state: {
          notice: `تم تسجيل الإيصال رقم ${r.reference} بمبلغ ${displayMinor(r.amountMinor)} ج.م. المتبقي المستحق ${displayMinor(r.outstandingAfterMinor)} ج.م والرصيد المقدم ${displayMinor(r.unallocatedCreditAfterMinor)} ج.م.`,
        },
      }),
  );
  const locked = mutation.busy || !!mutation.pending || checking;
  const invalidate = () => {
    setPreview(null);
    setReviewing(false);
    setReceived(false);
    setNotice('');
  };
  const review = async (message = '') => {
    setChecking(true);
    setFormError(null);
    try {
      const p = await storageApi<StoragePaymentPreview>(
        '/payments/preview',
        'paymentPreview',
        scopeOf(registry!.context.companyId, selected?.brandId ?? '', m),
        session?.csrfToken,
      );
      setPreview(p);
      setNotice(message);
      setReceived(false);
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
    if (e instanceof CommercialError && e.code === 'STORAGE_CREDIT_CHANGED') {
      // Reopen review with the committed allocation; the entered intent is kept as-is.
      mutation.setError(null);
      void agreement.refetch();
      void review(messages[e.code]!);
    }
  }, [mutation.error]);
  const canConfirm = !!preview && !preview.blockers.length && received && !locked;
  return (
    <>
      <PageHeading
        eyebrow="اشتراكات التخزين"
        title="تسجيل تحصيل تخزين"
        description="سجّل مبلغًا استلمته الشركة فعليًا. يُقبل التحصيل الجزئي والمقدم، ويُوزع على أقدم فترة مستحقة أولًا ثم يبقى الفائض رصيدًا مقدمًا."
      />
      <Link className="back-link" to={back}>
        العودة
      </Link>
      <UnknownResult
        pending={mutation.pending}
        busy={mutation.busy}
        recover={() => void mutation.recover()}
        what="التحصيل"
      />
      <StorageError error={formError ?? (reviewing ? null : mutation.error)} />
      {agreement.data && (
        <section className="storage-before" aria-label="الوضع قبل التحصيل">
          <Summary a={agreement.data} />
          <p className="muted">
            رصيد مقدم غير مخصص حاليًا <Amount value={agreement.data.credit.unallocatedMinor} /> ·
            فرع الإيراد: {agreement.data.branchName}؛ فرع الاستلام لا يغيّر فرع الإيراد.
          </p>
        </section>
      )}
      <form
        className="finance-form"
        onSubmit={(e) => {
          e.preventDefault();
          void review();
        }}
      >
        <fieldset disabled={locked}>
          <FormGroup
            title="البراند"
            description="اشتراك تخزين واحد لكل براند مهما تعددت فروع المخزون."
          >
            <div className="commercial-fields">
              <Field label="اتفاق التخزين">
                <select
                  required
                  value={agreementId}
                  onChange={(e) => {
                    setAgreementId(e.target.value);
                    invalidate();
                  }}
                >
                  <option value="">اختر البراند</option>
                  {catalog.agreements.map((a) => (
                    <option key={a.agreementId} value={a.agreementId}>
                      {a.brandName}
                      {a.state === 'stopped' ? ' — متوقف التجديد' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormGroup>
          <FormGroup
            title="الاستلام الفعلي"
            description="المبلغ بالجنيه حتى قرشين. لا تُطلب صور أو تحقق من مزود الدفع؛ المرجع للتتبع فقط."
          >
            <MoneyFields
              {...m}
              catalog={catalog}
              invalidate={invalidate}
              branchLabel="فرع الاستلام"
              dateLabel="تاريخ الاستلام الفعلي"
            />
          </FormGroup>
        </fieldset>
        <Button type="submit" disabled={locked}>
          {checking ? 'جارٍ المراجعة…' : 'مراجعة التوزيع'}
        </Button>
      </form>
      <Dialog
        open={reviewing && !!preview}
        onOpenChange={(open) => !mutation.busy && setReviewing(open)}
      >
        <DialogContent dir="rtl" className="review-dialog storage-dialog">
          <DialogTitle>مراجعة تحصيل التخزين</DialogTitle>
          <DialogDescription>
            أكّد فقط بعد استلام المبلغ فعليًا. التوزيع: أقدم فترة مستحقة أولًا، والفائض رصيد مقدم.
          </DialogDescription>
          {preview && (
            <section aria-label="توزيع التحصيل">
              {notice && (
                <p role="alert" className="commercial-error">
                  {notice}
                </p>
              )}
              <dl className="storage-review">
                <div>
                  <dt>البراند</dt>
                  <dd>{preview.agreement.brandName}</dd>
                </div>
                <div>
                  <dt>المبلغ المستلم</dt>
                  <dd>
                    <Amount value={preview.amountMinor} strong />
                  </dd>
                </div>
                <div>
                  <dt>إلى</dt>
                  <dd>
                    {catalog.branches.find((b) => b.id === m.branchId)?.name} ·{' '}
                    {preview.account.name} · {methodNames[m.method]} · {arDate(m.date)}
                  </dd>
                </div>
              </dl>
              <h3>التوزيع على الفترات</h3>
              {preview.allocations.length ? (
                <ul className="storage-plan">
                  {preview.allocations.map((x) => (
                    <li key={x.periodId}>
                      فترة {arDate(x.startDate)} – {arDate(x.endDate)}: يُخصص{' '}
                      <Amount value={x.amountMinor} /> · كان المتبقي{' '}
                      <Amount value={x.outstandingBeforeMinor} /> ويصبح{' '}
                      <Amount value={x.outstandingAfterMinor} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">
                  لا توجد فترات مستحقة الآن؛ يبقى المبلغ كاملًا رصيدًا مقدمًا.
                </p>
              )}
              <dl className="storage-review">
                <div>
                  <dt>المتبقي المستحق بعد التحصيل</dt>
                  <dd>
                    <Amount value={preview.outstandingAfterMinor} />
                  </dd>
                </div>
                <div>
                  <dt>الرصيد المقدم غير المخصص بعد التحصيل</dt>
                  <dd>
                    <Amount value={preview.unallocatedAfterMinor} />
                  </dd>
                </div>
              </dl>
              <p className="muted">التحصيل لا يضيف إيرادًا ولا يغيّر رصيد تحصيل البراند.</p>
              {preview.blockers.length > 0 && (
                <ul role="alert" className="commercial-error">
                  {preview.blockers.map((b) => (
                    <li key={b}>{blockerCopy[b]}</li>
                  ))}
                </ul>
              )}
              <label className="finance-check">
                <input
                  type="checkbox"
                  checked={received}
                  onChange={(e) => setReceived(e.target.checked)}
                />
                استلمت الشركة هذا المبلغ فعليًا
              </label>
              <StorageError error={reviewing ? mutation.error : null} />
              <div className="dialog-actions">
                <Button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() =>
                    void mutation.submit({
                      schemaVersion: 1,
                      type: 'storage.payment.record',
                      brandId: preview.agreement.brandId,
                      branchId: m.branchId,
                      accountId: m.accountId,
                      method: m.method,
                      amountMinor: preview.amountMinor,
                      actualDate: m.date,
                      expectedCreditVersion: preview.creditVersion,
                      confirmReceived: true,
                      ...(m.reference.trim() ? { externalReference: m.reference.trim() } : {}),
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
            </section>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function StorageRefundPage() {
  const { agreementId } = useParams(),
    catalog = useCatalog(),
    agreement = useAgreement(agreementId);
  if (!catalog.data || !agreement.data)
    return catalog.isError || agreement.isError ? (
      <StorageError error={catalog.error ?? agreement.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الرصيد والحسابات" />
    );
  return (
    <RefundForm
      catalog={catalog.data}
      agreement={agreement.data}
      refresh={() => agreement.refetch()}
    />
  );
}
function RefundForm({
  catalog,
  agreement,
  refresh,
}: {
  catalog: StorageCatalog;
  agreement: StorageAgreementDetail;
  refresh: () => Promise<unknown>;
}) {
  const navigate = useNavigate(),
    location = useLocation(),
    { registry, session } = useAccess(),
    back =
      (location.state as { back?: string } | null)?.back ?? '/storage/' + agreement.agreementId;
  const m = useMoneyState(catalog);
  const [reason, setReason] = useState(''),
    [preview, setPreview] = useState<StorageRefundPreview | null>(null),
    [reviewing, setReviewing] = useState(false),
    [paidOut, setPaidOut] = useState(false),
    [notice, setNotice] = useState(''),
    [checking, setChecking] = useState(false),
    [formError, setFormError] = useState<unknown>(null);
  const mutation = useStorageMutation<StorageRefundCommand, StorageRefundResult>(
    'refund',
    agreement.brandId,
    (r) =>
      navigate('/storage/' + r.agreementId, {
        state: {
          notice: `تم تسجيل استرداد رقم ${r.reference} بمبلغ ${displayMinor(r.amountMinor)} ج.م. الرصيد المقدم المتبقي ${displayMinor(r.unallocatedCreditAfterMinor)} ج.م.`,
        },
      }),
  );
  const locked = mutation.busy || !!mutation.pending || checking;
  const invalidate = () => {
    setPreview(null);
    setReviewing(false);
    setPaidOut(false);
    setNotice('');
  };
  const review = async (message = '') => {
    setChecking(true);
    setFormError(null);
    try {
      if (!reason.trim()) throw new CommercialError('VALIDATION_FAILED', 400);
      const p = await storageApi<StorageRefundPreview>(
        '/credit-refunds/preview',
        'refundPreview',
        scopeOf(registry!.context.companyId, agreement.brandId, m),
        session?.csrfToken,
      );
      setPreview(p);
      setNotice(message);
      setPaidOut(false);
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
      [
        'STORAGE_CREDIT_CHANGED',
        'INSUFFICIENT_FUNDS',
        'INSUFFICIENT_STORAGE_CREDIT',
        'STORAGE_CREDIT_ALLOCATED',
      ].includes(e.code)
    ) {
      mutation.setError(null);
      void refresh();
      void review(messages[e.code]!);
    }
  }, [mutation.error]);
  const canConfirm = !!preview && !preview.blockers.length && paidOut && !locked;
  return (
    <>
      <PageHeading
        eyebrow={'اشتراك التخزين · ' + agreement.brandName}
        title="استرداد رصيد تخزين غير مخصص"
        description="إجراء منفصل لصرف مبلغ فعلي من الرصيد المقدم غير المخصص فقط. لا يلغي إيرادًا ولا يمس رصيد تحصيل البراند. المبالغ المخصصة لفترات تحتاج تصحيحًا مرتبطًا في التسويات."
      />
      <Link className="back-link" to={back}>
        العودة للاتفاق
      </Link>
      <CreditPanel a={agreement} />
      <UnknownResult
        pending={mutation.pending}
        busy={mutation.busy}
        recover={() => void mutation.recover()}
        what="الاسترداد"
      />
      <StorageError error={formError ?? (reviewing ? null : mutation.error)} />
      <form
        className="finance-form"
        onSubmit={(e) => {
          e.preventDefault();
          void review();
        }}
      >
        <fieldset disabled={locked}>
          <FormGroup
            title="الصرف الفعلي"
            description="يمكن الصرف من أي حساب مسموح لفرعك وبه رصيد كافٍ."
          >
            <MoneyFields
              {...m}
              catalog={catalog}
              invalidate={invalidate}
              branchLabel="فرع الصرف"
              dateLabel="تاريخ الصرف الفعلي"
            />
            <Field label="سبب الاسترداد">
              <textarea
                required
                maxLength={500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  invalidate();
                }}
              />
            </Field>
          </FormGroup>
        </fieldset>
        <Button type="submit" disabled={locked}>
          {checking ? 'جارٍ المراجعة…' : 'مراجعة الاسترداد'}
        </Button>
      </form>
      <Dialog
        open={reviewing && !!preview}
        onOpenChange={(open) => !mutation.busy && setReviewing(open)}
      >
        <DialogContent dir="rtl" className="review-dialog storage-dialog">
          <DialogTitle>مراجعة استرداد الرصيد</DialogTitle>
          <DialogDescription>
            أكّد فقط بعد صرف المبلغ للبراند فعليًا. لا يمكن حذف الاسترداد بعد تسجيله.
          </DialogDescription>
          {preview && (
            <section aria-label="آثار الاسترداد">
              {notice && (
                <p role="alert" className="commercial-error">
                  {notice}
                </p>
              )}
              <dl className="storage-review">
                <div>
                  <dt>المبلغ</dt>
                  <dd>
                    <Amount value={preview.amountMinor} strong />
                  </dd>
                </div>
                <div>
                  <dt>من</dt>
                  <dd>
                    {catalog.branches.find((b) => b.id === m.branchId)?.name} ·{' '}
                    {preview.account.name} · {methodNames[m.method]} · {arDate(m.date)}
                  </dd>
                </div>
                <div>
                  <dt>رصيد الحساب المتاح</dt>
                  <dd>
                    <Amount value={preview.account.availableMinor} />
                  </dd>
                </div>
                <div>
                  <dt>الرصيد المقدم غير المخصص قبل/بعد</dt>
                  <dd>
                    <Amount value={preview.unallocatedBeforeMinor} /> ←{' '}
                    {preview.unallocatedAfterMinor === null ? (
                      '—'
                    ) : (
                      <Amount value={preview.unallocatedAfterMinor} />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>مخصص لفترات (لا يُسترد هنا)</dt>
                  <dd>
                    <Amount value={preview.allocatedMinor} />
                  </dd>
                </div>
                <div>
                  <dt>السبب</dt>
                  <dd>{reason.trim()}</dd>
                </div>
              </dl>
              {preview.sources.length > 0 && (
                <>
                  <h3>من إيصالات التحصيل الأصلية</h3>
                  <ul className="storage-plan">
                    {preview.sources.map((s) => (
                      <li key={s.receiptId}>
                        إيصال رقم <bdi>{s.receiptReference}</bdi> بتاريخ{' '}
                        {arDate(s.receiptActualDate)}: <Amount value={s.amountMinor} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {preview.blockers.length > 0 && (
                <ul role="alert" className="commercial-error">
                  {preview.blockers.map((b) => (
                    <li key={b}>{blockerCopy[b]}</li>
                  ))}
                </ul>
              )}
              <label className="finance-check">
                <input
                  type="checkbox"
                  checked={paidOut}
                  onChange={(e) => setPaidOut(e.target.checked)}
                />
                صُرف هذا المبلغ فعليًا من الحساب المختار
              </label>
              <StorageError error={reviewing ? mutation.error : null} />
              <div className="dialog-actions">
                <Button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() =>
                    void mutation.submit({
                      schemaVersion: 1,
                      type: 'storage.credit.refund',
                      brandId: agreement.brandId,
                      branchId: m.branchId,
                      accountId: m.accountId,
                      method: m.method,
                      amountMinor: preview.amountMinor,
                      actualDate: m.date,
                      reason: reason.trim(),
                      expectedCreditVersion: preview.creditVersion,
                      confirmCashOut: true,
                      ...(m.reference.trim() ? { externalReference: m.reference.trim() } : {}),
                    })
                  }
                >
                  {mutation.busy ? 'جارٍ التسجيل…' : 'تأكيد الصرف الفعلي'}
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
            </section>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function StorageStopPage() {
  const { agreementId } = useParams(),
    navigate = useNavigate(),
    location = useLocation(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    back = (location.state as { back?: string } | null)?.back ?? '/storage/' + agreementId;
  const preview = useQuery({
    queryKey: ['storage-stop', agreementId, company, registry?.context.authorizationRevision],
    enabled: !!company && !!agreementId,
    retry: false,
    queryFn: () =>
      storageApi<StorageStopPreview>(
        `/agreements/${agreementId}/stop/preview?companyId=${company}`,
        'stopPreview',
      ),
  });
  const [reason, setReason] = useState(''),
    [understood, setUnderstood] = useState(false);
  const mutation = useStorageMutation<
    StorageStopCommand & { agreementId: string },
    StorageStopResult
  >('stop', agreementId ?? 'none', (r) =>
    navigate('/storage/' + r.agreementId, {
      state: {
        notice: `تم إيقاف التجديد. آخر يوم خدمة محمي ${arDate(r.lastServiceDate)}. المتأخرات ${displayMinor(r.outstandingMinor)} ج.م والرصيد المقدم ${displayMinor(r.unallocatedCreditMinor)} ج.م باقيان.`,
      },
    }),
  );
  useEffect(() => {
    const e = mutation.error;
    if (e instanceof CommercialError && e.code === 'REVISION_CONFLICT') void preview.refetch();
  }, [mutation.error]);
  if (preview.isPending)
    return <StatePanel state="pending" title="جارٍ حساب نهاية الفترة الحالية" />;
  if (preview.isError) return <StorageError error={preview.error} />;
  const p = preview.data,
    stopped = p.agreement.state === 'stopped';
  return (
    <>
      <PageHeading
        eyebrow={'اشتراك التخزين · ' + p.agreement.brandName}
        title="إيقاف التجديد بعد الفترة الحالية"
        description="الإيقاف يمنع أي فترة جديدة تبدأ في تاريخ النهاية أو بعده. لا يحذف المتأخرات أو السجل، ولا يرد أي مبلغ، ولا يوزع الرسم على الأيام."
      />
      <Link className="back-link" to={back}>
        العودة للاتفاق
      </Link>
      <UnknownResult
        pending={mutation.pending}
        busy={mutation.busy}
        recover={() => void mutation.recover()}
        what="الإيقاف"
      />
      <section className="finance-detail storage-stop" aria-label="أثر الإيقاف">
        <dl>
          <dt>آخر يوم خدمة محمي</dt>
          <dd>{arDate(p.lastServiceDate)}</dd>
          <dt>لن تبدأ فترة جديدة من</dt>
          <dd>{arDate(p.stopBoundary)}</dd>
          <dt>المتأخرات الباقية</dt>
          <dd>
            <Amount value={p.agreement.charges.outstandingMinor} />
          </dd>
          <dt>الرصيد المقدم الباقي</dt>
          <dd>
            <Amount value={p.agreement.credit.unallocatedMinor} />
          </dd>
        </dl>
        {p.generatesNoPeriod && (
          <p className="muted">لم تبدأ أي فترة؛ لن يُسجل أي رسم لهذا الاتفاق.</p>
        )}
        <p className="muted">
          استرداد أي رصيد مقدم إجراء منفصل من صفحة الاتفاق، وليس جزءًا من الإيقاف.
        </p>
      </section>
      <StorageError error={mutation.error} />
      {stopped ? (
        <p className="storage-notice">التجديد متوقف بالفعل.</p>
      ) : (
        <form
          className="finance-form"
          onSubmit={(e) => {
            e.preventDefault();
            void mutation.submit({
              schemaVersion: 1,
              type: 'storage.agreement.stop',
              agreementId: p.agreement.agreementId,
              expectedVersion: p.agreement.version,
              confirmStop: true,
              ...(reason.trim() ? { reason: reason.trim() } : {}),
            });
          }}
        >
          <fieldset disabled={mutation.busy || !!mutation.pending}>
            <Field label="ملاحظة الإيقاف — اختياري">
              <textarea
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <label className="finance-check">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
              />
              أفهم أن الإيقاف ليس استردادًا وأن المتأخرات والرصيد يبقيان
            </label>
          </fieldset>
          <Button
            type="submit"
            variant="outline"
            disabled={!understood || mutation.busy || !!mutation.pending}
          >
            {mutation.busy ? 'جارٍ التسجيل…' : 'إيقاف التجديد'}
          </Button>
        </form>
      )}
    </>
  );
}
