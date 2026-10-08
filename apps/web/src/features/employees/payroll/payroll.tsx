import { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, PageHeading, StatePanel, FormGroup, AmountDisplay } from '@shahn/ui';
import { cairoWorkDate } from '@shahn/domain';
import type {
  PayrollMonth,
  PayrollFunding,
  PayrollCommand,
  PayrollPreview,
  PayrollCatalog,
} from '@shahn/contracts';
import { useAccess } from '../../access/access.js';
import { Field, TextField, inputMinor } from '../../brands/api.js';
import { EmployeeError } from '../api.js';
import { payrollApi, usePayrollCommand } from './api.js';
import './payroll.css';
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const Money = ({ value }: { value: string }) => (
  <AmountDisplay money={{ currency: 'EGP', amountMinor: value }} />
);
const stateNames = {
  editable_unpaid: 'حساب قابل للتعديل',
  frozen_unpaid: 'حساب مجمّد لم يُدفع',
  paid: 'مدفوع بالكامل',
  zero_net_closed: 'مقفل بصافي صفر',
};
const categoryNames = {
  salary: 'الراتب',
  commission: 'عمولة الزيارات',
  bonus: 'مكافأة',
  overtime: 'وقت إضافي',
  earning_correction: 'تصحيح استحقاق مرتبط',
  earning_deduction: 'خصم استحقاق',
  advance: 'سلفة',
  incident: 'مسؤولية حادث',
};
const methodNames = { cash: 'نقدي', bank_deposit: 'إيداع بنكي', instapay: 'إنستا باي' };
function useMonth(id: string, month: string) {
  const { registry } = useAccess();
  const company = registry?.context.companyId;
  return useQuery({
    queryKey: ['payroll', company, id, month],
    queryFn: () =>
      payrollApi<PayrollMonth>(`/employees/${id}/months/${month}?companyId=${company}`, 'month'),
    enabled: !!company && !!id && !!month,
    retry: false,
  });
}
function Summary({ p }: { p: PayrollMonth }) {
  const c = p.calculation;
  return (
    <div className="payroll-summary">
      {[
        ['الراتب', c.salary],
        ['عمولة الزيارات', c.commission],
        ['المكافآت', c.bonus],
        ['الوقت الإضافي', c.overtime],
        ['تصحيحات الاستحقاق', c.positiveEarningAdjustments],
        ['إجمالي الاستحقاق', c.grossEarning],
        ['خصومات الاستحقاق الجديدة', c.newOrdinaryDeductions],
        ['خصومات الاستحقاق المستردة', c.earningDeductionsRecovered],
        ['السلف المستردة', c.advanceRecovered],
        ['مسؤولية الحوادث المستردة', c.incidentRecovered],
        ['التزامات مرحلة سابقة', c.priorCarriedUnrecoveredObligations],
        ['المتبقي للترحيل', c.carryRemaining],
        ['تكلفة الموظف', c.employeeCost],
        ['الصافي الكامل للدفع', c.netPayable],
      ].map(([label, value]) => (
        <section key={label} className={label === 'الصافي الكامل للدفع' ? 'payroll-net' : ''}>
          <span>{label}</span>
          <Money value={value!} />
        </section>
      ))}
    </div>
  );
}
export function PayrollMonthPage() {
  const { id = '', month = '' } = useParams();
  const q = useMonth(id, month);
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const p = q.data;
  if (q.isPending) return <StatePanel state="pending" title="تحميل الحساب الشهري" />;
  if (q.error || !p) return <EmployeeError error={q.error} />;
  const filter = search.get('kind') ?? 'all',
    dateBasis = search.get('dateBasis') ?? 'work',
    from = search.get('from') ?? '',
    to = search.get('to') ?? '';
  const earnings = p.earnings.filter(
    (e) =>
      (filter === 'all' || e.kind === filter) &&
      (!from ||
        (dateBasis === 'work' ? e.workDate : cairoWorkDate(new Date(e.recordedAt))) >= from) &&
      (!to || (dateBasis === 'work' ? e.workDate : cairoWorkDate(new Date(e.recordedAt))) <= to),
  );
  const base = `/employees/${id}/months/${month}`;
  const advanceSearch = new URLSearchParams(search);
  advanceSearch.set('month', month);
  return (
    <div className="payroll-page">
      <Link to={`/employees/${id}?${search}`}>ملف الموظف</Link>
      <PageHeading
        title={p.employeeName}
        eyebrow={`الحساب الشهري · ${month}`}
        description="الاستحقاقات والالتزامات الأصلية والصافي في حساب واحد."
      />
      <div className="payroll-toolbar">
        <Field label="الشهر">
          <Input
            type="month"
            value={month}
            onChange={(e) => navigate(`/employees/${id}/months/${e.target.value}?${search}`)}
          />
        </Field>
        <strong>{stateNames[p.state]}</strong>
      </div>
      {p.frozenAt ? (
        <StatePanel state="ready" title="الحساب محمي">
          <p>القيم التالية محفوظة. الدفع المتأخر يظل بنفس الصافي والحجز الأصلي.</p>
        </StatePanel>
      ) : null}
      {p.blockers.length ? (
        <StatePanel state="error" title="توجد مصادر تحتاج مراجعة قبل الدفع">
          <p>الحساب المتأثر متوقف حتى تتضح مصادره.</p>
        </StatePanel>
      ) : null}
      <Summary p={p} />
      <div className="payroll-actions">
        {p.payment ? (
          <Link className="button" to={`${base}/payment?${search}`}>
            عرض تفاصيل الدفع والإقفال
          </Link>
        ) : !p.blockers.length && month <= p.currentMonth ? (
          <Link className="button" to={`${base}/payout?${search}`}>
            {p.calculation.netPayable === '0' ? 'إقفال صافي صفر' : 'دفع الصافي بالكامل'}
          </Link>
        ) : null}
        <Link to={`/employees/${id}/advances/new?${advanceSearch}`}>صرف سلفة</Link>
        <Link to={`${base}/adjustments/new?${search}`}>إضافة أو خصم</Link>
      </div>
      <details className="payroll-panel">
        <summary>فلاتر الحركات المتقدمة {search.size ? `(${search.size})` : ''}</summary>
        <div className="payroll-fields">
          <Field label="نوع الحركة">
            <select
              value={filter}
              onChange={(e) => {
                search.set('kind', e.target.value);
                setSearch(search);
              }}
            >
              <option value="all">كل الحركات</option>
              {Object.entries(categoryNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="أساس التاريخ">
            <select
              value={dateBasis}
              onChange={(e) => {
                search.set('dateBasis', e.target.value);
                setSearch(search);
              }}
            >
              <option value="work">تاريخ العمل</option>
              <option value="recorded">تاريخ التسجيل</option>
            </select>
          </Field>
          {[
            ['from', 'من تاريخ', from],
            ['to', 'إلى تاريخ', to],
          ].map(([key, label, value]) => (
            <Field key={key} label={label!}>
              <Input
                type="date"
                value={value}
                onChange={(e) => {
                  search.set(key!, e.target.value);
                  setSearch(search);
                }}
              />
            </Field>
          ))}
          <Button variant="outline" onClick={() => setSearch({})}>
            مسح الفلاتر
          </Button>
        </div>
      </details>
      <section className="payroll-panel">
        <h2>مصادر الاستحقاقات</h2>
        {earnings.length ? (
          earnings.map((e) => (
            <article className="payroll-source" key={e.id} id={`source-${e.id}`}>
              <div>
                <strong>{categoryNames[e.kind]}</strong>
                <p>{e.label}</p>
                <small>
                  تاريخ العمل <bdi>{e.workDate}</bdi> · التسجيل{' '}
                  <bdi>{cairoWorkDate(new Date(e.recordedAt))}</bdi>
                </small>
              </div>
              <Money value={e.amountMinor} />
              <details>
                <summary>المصدر والفرع التاريخي</summary>
                <p>
                  المصدر: <bdi>{e.sourceId}</bdi>
                </p>
                <p>
                  الفرع: <bdi>{e.branchId}</bdi>
                </p>
                {e.policyId ? (
                  <p>
                    الشروط المحفوظة: <bdi>{e.policyId}</bdi>
                  </p>
                ) : null}
                {e.visitId ? (
                  <p>
                    الزيارة الفعلية: <bdi>{e.visitId}</bdi>
                  </p>
                ) : null}
                {e.commissionBasis ? (
                  <p>
                    الشحن الأساسي <Money value={e.commissionBasis.baseMinor} /> ·{' '}
                    {e.commissionBasis.terms.enabled ? (
                      e.commissionBasis.terms.formula === 'percentage' ? (
                        `${e.commissionBasis.terms.basisPoints / 100}%`
                      ) : (
                        <>
                          مبلغ ثابت للزيارة{' '}
                          <Money value={e.commissionBasis.terms.perVisit.amountMinor} />
                        </>
                      )
                    ) : (
                      'غير مفعلة'
                    )}
                  </p>
                ) : null}
              </details>
            </article>
          ))
        ) : (
          <StatePanel state="empty" title="لا توجد حركات مطابقة للفلاتر" />
        )}
      </section>
      <section className="payroll-panel">
        <h2>السلف والالتزامات الأصلية</h2>
        <p className="muted">
          المديونية القائمة، المحجوزة للحسابات المجمّدة، والمتاحة لاسترداد جديد قيم مختلفة. المعاينة
          الحالية لا تحجز مبالغ.
        </p>
        {p.obligations
          .filter(
            (o) =>
              (filter === 'all' || o.kind === filter) &&
              (!from ||
                (dateBasis === 'work' ? o.effectiveDate : cairoWorkDate(new Date(o.recordedAt))) >=
                  from) &&
              (!to ||
                (dateBasis === 'work' ? o.effectiveDate : cairoWorkDate(new Date(o.recordedAt))) <=
                  to),
          )
          .map((o) => (
            <article className="payroll-source" key={o.id} id={`obligation-${o.id}`}>
              <strong>
                {categoryNames[o.kind]} · {o.sourceLabel}
              </strong>
              <p>
                الفترة الأصلية <bdi>{o.month}</bdi> · تاريخ <bdi>{o.effectiveDate}</bdi>
              </p>
              <div className="payroll-balances">
                <span>
                  الأصل <Money value={o.amountMinor} />
                </span>
                <span>
                  القائم <Money value={o.outstandingAmount} />
                </span>
                <span>
                  المحجوز <Money value={o.reservedForFrozenPeriods} />
                </span>
                <span>
                  متاح لتخصيص جديد <Money value={o.availableForNewAllocation} />
                </span>
              </div>
              <details>
                <summary>تتبع الالتزام والاسترداد</summary>
                <p>
                  الهوية الأصلية <bdi>{o.id}</bdi>
                </p>
                <p>
                  المصدر <bdi>{o.sourceId}</bdi>
                </p>
                <p>
                  فرع المصدر <bdi>{o.branchId}</bdi>
                </p>
                {o.advancePayment ? (
                  <>
                    <p>
                      صرف فعلي <bdi>{o.advancePayment.actualDate}</bdi> ·{' '}
                      {methodNames[o.advancePayment.method]}
                    </p>
                    <p>
                      حركة الحساب <bdi>{o.advancePayment.movementId}</bdi>
                    </p>
                    <p>
                      الحساب <bdi>{o.advancePayment.accountId}</bdi> ·{' '}
                      {o.advancePayment.reference || '—'}
                    </p>
                  </>
                ) : null}
                {o.recoveries?.map((r) => (
                  <p key={r.month}>
                    حساب <Link to={`/employees/${id}/months/${r.month}?${search}`}>{r.month}</Link>{' '}
                    · {r.state === 'reserved' ? 'محجوز' : 'مسترد'} <Money value={r.amountMinor} />
                  </p>
                ))}
                <p>
                  استرداد هذا الحساب{' '}
                  <Money
                    value={
                      p.calculation.allocations.find((a) => a.obligationId === o.id)?.amountMinor ??
                      '0'
                    }
                  />
                </p>
              </details>
            </article>
          ))}
      </section>
      {p.reviews.length ? (
        <section className="payroll-panel">
          <h2>مراجعات مصادر العمل</h2>
          {p.reviews.map((r) => (
            <article className="payroll-source" key={r.id}>
              <p>{r.reason}</p>
              <p>
                شهر العمل الأصلي <bdi>{r.workMonth}</bdi> · المسجل سابقًا{' '}
                <Money value={r.postedMinor} />
              </p>
              {r.amountMinor ? (
                <p>
                  الإضافة المقترحة <Money value={r.amountMinor} />
                </p>
              ) : (
                <p>تعارض مصدر يحتاج مسار التسويات؛ لا يوجد فرق عمولة معتمد.</p>
              )}
              {r.resolvedMonth ? (
                <p>
                  تمت التسوية في <bdi>{r.resolvedMonth}</bdi>
                </p>
              ) : r.kind === 'late_commission' ? (
                <Link to={`${base}/reviews/${r.id}?${search}`}>مراجعة واعتماد تسوية مرتبطة</Link>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
function FundingFields({
  value,
  onChange,
  catalog,
}: {
  value: PayrollFunding;
  onChange: (v: PayrollFunding) => void;
  catalog: PayrollCatalog;
}) {
  const { registry } = useAccess();
  return (
    <div className="payroll-fields">
      <Field label="طريقة الدفع">
        <select
          value={value.method}
          onChange={(e) =>
            onChange({
              ...value,
              method: e.target.value as PayrollFunding['method'],
              accountId: '',
            })
          }
        >
          <option value="cash">نقدي</option>
          <option value="bank_deposit">إيداع بنكي</option>
          <option value="instapay">إنستا باي</option>
        </select>
      </Field>
      <Field label="الحساب الممول">
        <select
          required
          value={value.accountId}
          onChange={(e) => onChange({ ...value, accountId: e.target.value })}
        >
          <option value="">اختر الحساب</option>
          {catalog.accounts
            .filter(
              (a) =>
                (a.type === 'cash') === (value.method === 'cash') &&
                a.branchIds.includes(value.branchId),
            )
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="فرع الدفع">
        <select
          value={value.branchId}
          onChange={(e) => onChange({ ...value, branchId: e.target.value, accountId: '' })}
        >
          {registry?.context.assignedBranches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <TextField
        label="تاريخ الدفع الفعلي"
        type="date"
        value={value.actualDate}
        onChange={(actualDate) => onChange({ ...value, actualDate })}
      />
      <TextField
        label="مرجع اختياري"
        value={value.reference}
        onChange={(reference) => onChange({ ...value, reference })}
      />
    </div>
  );
}
export function PayrollActionPage({
  mode,
}: {
  mode: 'payout' | 'advance' | 'adjustment' | 'review' | 'payment';
}) {
  const { session, registry } = useAccess(),
    location = useLocation();
  if (!session || !registry) return <StatePanel state="pending" title="تحميل الصلاحيات" />;
  return (
    <PayrollActionContent
      key={session.principalId + registry.context.companyId + location.pathname + location.search}
      mode={mode}
    />
  );
}
function PayrollActionContent({
  mode,
}: {
  mode: 'payout' | 'advance' | 'adjustment' | 'review' | 'payment';
}) {
  const { id = '', month: routeMonth, reviewId } = useParams(),
    [search] = useSearchParams();
  const month = routeMonth ?? search.get('month') ?? today().slice(0, 7),
    q = useMonth(id, month),
    navigate = useNavigate();
  const { session, registry } = useAccess(),
    company = registry?.context.companyId;
  const [settlement, setSettlement] = useState(month),
    [amount, setAmount] = useState(''),
    [reason, setReason] = useState(''),
    [kind, setKind] = useState<'bonus' | 'overtime' | 'earning_deduction'>('bonus'),
    [workDate, setWorkDate] = useState(today());
  const [funding, setFunding] = useState<PayrollFunding>({
    accountId: '',
    branchId: registry?.context.assignedBranches[0]?.id ?? '',
    method: 'cash',
    actualDate: today(),
    reference: '',
  });
  const [preview, setPreview] = useState<PayrollPreview | null>(null),
    [previewBusy, setPreviewBusy] = useState(false);
  const target = useMonth(id, settlement),
    catalog = useQuery({
      queryKey: ['payroll-catalog', company],
      queryFn: () =>
        payrollApi<PayrollCatalog>(`/employees/payroll/catalog?companyId=${company}`, 'catalog'),
      enabled: !!company,
      retry: false,
    });
  const mutation = usePayrollCommand(id + ':' + month + ':' + mode, () =>
    navigate(`/employees/${id}/months/${settlement}?${search}`),
  );
  const p = q.data,
    disabled = mutation.busy || !!mutation.pending || previewBusy;
  if (q.isPending) return <StatePanel state="pending" title="تحميل الحساب" />;
  if (q.error || !p) return <EmployeeError error={q.error} />;
  const review = p.reviews.find((r) => r.id === reviewId),
    t = target.data;
  const confirm = () => {
    if (!t || !company) return;
    try {
      const extra =
        mode === 'advance'
          ? { type: 'payroll.advance', amountMinor: inputMinor(amount), funding }
          : mode === 'adjustment'
            ? {
                type: 'payroll.adjustment',
                amountMinor: inputMinor(amount),
                kind,
                reason,
                workDate,
              }
            : mode === 'review'
              ? { type: 'payroll.resolve', reviewId, reason }
              : p.calculation.netPayable === '0'
                ? { type: 'payroll.zero-close' }
                : { type: 'payroll.payout', funding: preview!.funding };
      const basis = mode === 'payout' ? (preview?.month ?? p) : t;
      void mutation.submit({
        schemaVersion: 1,
        companyId: company,
        commandId: crypto.randomUUID(),
        employeeId: id,
        month: basis.month,
        expectedVersion: basis.version,
        expectedDigest: basis.digest,
        ...extra,
      } as PayrollCommand);
    } catch (e) {
      mutation.setError(e);
    }
  };
  const title =
    mode === 'advance'
      ? 'صرف سلفة فعلية'
      : mode === 'adjustment'
        ? 'إضافة أو خصم للموظف'
        : mode === 'review'
          ? 'اعتماد مصدر عمل قديم'
          : mode === 'payment'
            ? 'تفاصيل الدفع والإقفال'
            : p.calculation.netPayable === '0'
              ? 'إقفال صافي صفر'
              : 'دفع الصافي بالكامل';
  return (
    <div className="payroll-page">
      <Link to={`/employees/${id}/months/${month}?${search}`}>العودة للحساب الشهري</Link>
      <PageHeading
        title={title}
        eyebrow={p.employeeName + ' · ' + month}
        description={
          mode === 'advance'
            ? 'سلفة مدفوعة من حساب الشركة؛ الاسترداد التلقائي مرتبط بالأصل.'
            : 'راجع الحساب الكامل والمصادر قبل التأكيد.'
        }
      />
      <EmployeeError error={mutation.error ?? target.error ?? catalog.error} />
      {mutation.recovery}
      {mode === 'payment' ? (
        p.payment ? (
          <section className="payroll-panel">
            <h2>{stateNames[p.state]}</h2>
            <Money value={p.payment.amountMinor} />
            <p>
              التاريخ الفعلي <bdi>{p.payment.actualDate}</bdi>
            </p>
            <p>المرجع {p.payment.reference || '—'}</p>
            {p.payment.accountId ? (
              <p>
                الحساب <bdi>{p.payment.accountId}</bdi> ·{' '}
                {p.payment.method ? methodNames[p.payment.method] : ''}
              </p>
            ) : null}
            <p>
              رقم العملية <bdi>{p.payment.id}</bdi>
            </p>
            {p.payment.movementId ? (
              <p>
                حركة الحساب <bdi>{p.payment.movementId}</bdi>
              </p>
            ) : (
              <p>إقفال بدون أي حركة نقدية</p>
            )}
            <Summary p={p} />
          </section>
        ) : (
          <StatePanel state="empty" title="لم يتم الدفع أو الإقفال" />
        )
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <fieldset disabled={disabled}>
            {mode === 'payout' ? (
              <Summary p={p} />
            ) : (
              <TextField
                label="شهر الاسترداد أو التسوية"
                type="month"
                value={settlement}
                onChange={setSettlement}
              />
            )}
            {mode === 'advance' || mode === 'adjustment' ? (
              <TextField label="المبلغ بالجنيه" value={amount} onChange={setAmount} />
            ) : null}
            {mode === 'adjustment' ? (
              <>
                <Field label="نوع الإضافة أو الخصم">
                  <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                    <option value="bonus">مكافأة</option>
                    <option value="overtime">وقت إضافي بمبلغ صريح</option>
                    <option value="earning_deduction">خصم استحقاق عادي</option>
                  </select>
                </Field>
                <TextField
                  label="تاريخ العمل أو أساس الخصم"
                  type="date"
                  value={workDate}
                  onChange={setWorkDate}
                />
              </>
            ) : null}
            {mode === 'adjustment' || mode === 'review' ? (
              <TextField label="السبب" value={reason} onChange={setReason} />
            ) : null}
            {mode === 'review' && review ? (
              <section className="payroll-panel">
                <p>
                  شهر العمل <bdi>{review.workMonth}</bdi> محفوظ بشروطه التاريخية.
                </p>
                <p>
                  المسجل سابقًا <Money value={review.postedMinor} />
                </p>
                <p>
                  الفرق المقترح <Money value={review.amountMinor ?? '0'} />
                </p>
                <p>
                  الزيارة <bdi>{review.visitId}</bdi>
                </p>
              </section>
            ) : null}
            {(mode === 'advance' || (mode === 'payout' && p.calculation.netPayable !== '0')) &&
            catalog.data ? (
              <FormGroup
                title="بيانات الدفع الفعلي"
                description="رصيد الحساب وطريقة الدفع وتاريخ الحركة"
              >
                <FundingFields
                  value={funding}
                  onChange={(v) => {
                    setFunding(v);
                    setPreview(null);
                  }}
                  catalog={catalog.data}
                />
              </FormGroup>
            ) : null}
            {mode === 'payout' && p.calculation.netPayable !== '0' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || !funding.accountId}
                  onClick={() => {
                    setPreviewBusy(true);
                    void payrollApi<PayrollPreview>(
                      `/employees/${id}/months/${month}/payout-preview`,
                      'preview',
                      {
                        companyId: company,
                        expectedVersion: p.version,
                        expectedDigest: p.digest,
                        funding,
                      },
                      session?.csrfToken,
                    )
                      .then(setPreview)
                      .catch(mutation.setError)
                      .finally(() => setPreviewBusy(false));
                  }}
                >
                  معاينة الدفع الكامل
                </Button>
                {preview ? (
                  <section className="payroll-panel">
                    <h2>تأكيد دفع الصافي الكامل</h2>
                    <p>
                      {preview.accountName} · المتاح <Money value={preview.availableMinor} />
                    </p>
                    <p>
                      صافي الدفع <Money value={preview.month.calculation.netPayable} />
                    </p>
                    <p>
                      التاريخ الفعلي <bdi>{preview.funding.actualDate}</bdi>
                    </p>
                    {preview.blockers.length ? (
                      <StatePanel
                        state="error"
                        title="تعذر الدفع: راجع الرصيد والحساب وحالة الشهر"
                      />
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : null}
            <Button
              type="submit"
              disabled={
                disabled ||
                !t ||
                !!t.blockers.length ||
                (mode === 'payout' &&
                  p.calculation.netPayable !== '0' &&
                  (!preview || !!preview.blockers.length))
              }
            >
              تأكيد {title}
            </Button>
          </fieldset>
        </form>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => {
          setPreview(null);
          void q.refetch();
          void target.refetch();
        }}
      >
        تحديث الحساب
      </Button>
    </div>
  );
}
