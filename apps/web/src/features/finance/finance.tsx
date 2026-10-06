import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading, FormGroup, Button, StatePanel, Input } from '@shahn/ui';
import type {
  Account,
  AccountFields,
  FinanceCatalog,
  FinanceList,
  MoneyMovement,
  PaidExpense,
  PaymentMethod,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { Field, TextField, displayMinor, inputMinor, CommercialError } from '../brands/api.js';
import { financeApi, useFinanceMutation, FinanceApiError, type FinanceDraft } from './api.js';
import './finance.css';
type Screen = 'accounts' | 'expenses' | 'movements';
const titles = {
  accounts: 'الحسابات النقدية والبنكية',
  expenses: 'المصروفات المدفوعة',
  movements: 'الإيداع والسحب',
};
const methods: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bank_deposit: 'إيداع بنكي',
  instapay: 'إنستا باي',
};
const movementName = (m: MoneyMovement) =>
  m.sourceKind === 'treasury_send'
    ? 'إرسال تحويل أموال'
    : m.sourceKind === 'treasury_receive'
      ? 'استلام تحويل أموال'
      : m.sourceKind === 'remittance'
        ? 'استلام أموال مندوب'
        : m.sourceKind === 'brand_payout'
          ? 'تحصيل براند'
          : m.sourceKind === 'storage_receipt'
            ? 'تحصيل اشتراك تخزين'
            : m.sourceKind === 'storage_refund'
              ? 'استرداد رصيد تخزين'
              : m.direction === 'deposit'
                ? 'إيداع'
                : 'سحب';
const cap = (s: Screen) =>
  s === 'expenses' ? 'expenses' : s === 'accounts' ? 'finance.accounts' : 'finance.movements';
const path = (s: Screen) => (s === 'expenses' ? '/expenses' : '/finance/' + s);
function useFinanceCatalog(s: Screen) {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['finance-catalog', company, s, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      financeApi<FinanceCatalog>(
        `/finance/catalog?companyId=${company}&screen=${cap(s)}`,
        'catalog',
      ),
  });
}
const errors: Record<string, string> = {
  INSUFFICIENT_FUNDS:
    'الرصيد المتاح لا يكفي. لم يُسجل المصروف أو السحب. إذا كان الدفع قد حدث فعليًا، يلزم مراجعة فرق الرصيد.',
  ACCOUNT_INACTIVE: 'الحساب موقوف للاستخدام الجديد. اختر حسابًا نشطًا.',
  METHOD_ACCOUNT_MISMATCH:
    'اختر حسابًا نقديًا للدفع النقدي، أو حسابًا بنكيًا للإيداع البنكي وإنستا باي.',
  ACCOUNT_OBLIGATIONS_PENDING: 'يوجد استخدام أو فرق رصيد لم يُحسم. يلزم حسمه قبل إيقاف الحساب.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح لهذا الفرع.',
  INVALID_GEOGRAPHY_OR_TIER: 'التصنيف موقوف أو غير متاح. حدّث الاختيارات.',
  REVISION_CONFLICT: 'حفظ مستخدم آخر نسخة أحدث. مدخلاتك باقية؛ حمّل النسخة الحالية وراجعها.',
  FUTURE_PAYMENT_DATE: 'اختر تاريخ الدفع الفعلي، اليوم أو تاريخًا سابقًا.',
  RESULT_UNKNOWN: 'لم تصل نتيجة التسجيل. استرد النتيجة بنفس الطلب قبل تغيير البيانات.',
  CONNECTION_LOST: 'تعذر الاتصال. احتفظنا بالمدخلات؛ حاول مجددًا عند عودة الاتصال.',
  FORBIDDEN_SCOPE: 'صلاحياتك الحالية لا تسمح بهذا الإجراء.',
  NOT_FOUND: 'السجل غير متاح ضمن صلاحياتك الحالية.',
  VALIDATION_FAILED: 'راجع الحقول المطلوبة والمبلغ الموجب والتاريخ.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجل الدخول لاسترداد النتيجة.',
};
export function FinanceError({ error }: { error: unknown }) {
  const { registry } = useAccess();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div className="commercial-error" role="alert" tabIndex={-1} ref={ref}>
      {errors[error instanceof Error ? error.message : ''] ??
        'تعذر إكمال الطلب. راجع البيانات والاتصال.'}
      {error instanceof CommercialError && error.currentVersion !== undefined && (
        <p>النسخة الحالية: {error.currentVersion}</p>
      )}
      {error instanceof FinanceApiError &&
        error.details?.obligations.map(
          (o) =>
            o.owner === 'treasury_transfer' && (
              <p key={o.sourceIdentity}>
                <Link
                  to={
                    (registry?.context.grants.includes('treasury.receive')
                      ? '/treasury/receipts/'
                      : '/treasury/transfers/') + o.sourceIdentity
                  }
                >
                  فتح التحويل المعلق
                </Link>
              </p>
            ),
        )}
    </div>
  );
}
function Amount({ value }: { value: string }) {
  return <bdi className="finance-amount">{displayMinor(value)} ج.م</bdi>;
}
export function FinanceListPage({ screen }: { screen: Screen }) {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [params, setParams] = useSearchParams(),
    catalog = useFinanceCatalog(screen);
  const query = new URLSearchParams(params);
  query.set('companyId', company ?? '');
  const data = useQuery({
    queryKey: [
      'finance-list',
      screen,
      company,
      params.toString(),
      registry?.context.authorizationRevision,
    ],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      financeApi<FinanceList<Account | PaidExpense | MoneyMovement>>(
        '/finance/' + screen + '?' + query,
        screen,
      ),
  });
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page');
    setParams(next);
  };
  if (!registry) return <StatePanel state="pending" title="جارٍ تحميل الصلاحيات" />;
  return (
    <>
      <PageHeading
        eyebrow="أموال الشركة"
        title={titles[screen]}
        description={
          screen === 'expenses'
            ? 'سجل ما دُفع بالفعل، مع تاريخ الدفع والفرع والتصنيف.'
            : screen === 'accounts'
              ? 'حسابات بالجنيه المصري، مع الرصيد المتاح وتاريخ الحركات.'
              : 'حركة عامة تؤثر على رصيد الحساب. دفعة المصروف لها حركتها تلقائيًا.'
        }
      />
      <Link className="commercial-primary-link" to={path(screen) + '/new'}>
        {screen === 'accounts'
          ? 'إضافة حساب'
          : screen === 'expenses'
            ? 'تسجيل مصروف'
            : 'تسجيل حركة'}
      </Link>
      <div className="commercial-filter-row">
        <TextField
          label="بحث"
          value={params.get('search') ?? ''}
          onChange={(v) => set('search', v)}
        />
        <Field label="الفرع">
          <select
            value={params.get('branchId') ?? ''}
            onChange={(e) => set('branchId', e.target.value)}
          >
            <option value="">كل الفروع المتاحة</option>
            {catalog.data?.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <details className="finance-filters">
        <summary>فلاتر متقدمة {params.size > 0 ? `(${params.size})` : ''}</summary>
        <div className="commercial-fields">
          <Field label="الحساب">
            <select
              value={params.get('accountId') ?? ''}
              onChange={(e) => set('accountId', e.target.value)}
            >
              <option value="">كل الحسابات المتاحة</option>
              {catalog.data?.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {!a.active ? ' · موقوف' : ''}
                </option>
              ))}
            </select>
          </Field>
          {screen === 'accounts' && (
            <Field label="حالة الحساب">
              <select
                value={params.get('active') ?? 'all'}
                onChange={(e) => set('active', e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="true">نشط</option>
                <option value="false">موقوف</option>
              </select>
            </Field>
          )}
          {screen !== 'accounts' && (
            <>
              {screen === 'expenses' && (
                <Field label="التصنيف">
                  <select
                    value={params.get('categoryId') ?? ''}
                    onChange={(e) => set('categoryId', e.target.value)}
                  >
                    <option value="">كل التصنيفات</option>
                    {catalog.data?.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {!c.active ? ' · موقوف' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="طريقة الدفع">
                <select
                  value={params.get('method') ?? 'all'}
                  onChange={(e) => set('method', e.target.value)}
                >
                  <option value="all">كل الطرق</option>
                  {Object.entries(methods).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              {screen === 'movements' && (
                <Field label="الاتجاه">
                  <select
                    value={params.get('direction') ?? 'all'}
                    onChange={(e) => set('direction', e.target.value)}
                  >
                    <option value="all">كل الحركات</option>
                    <option value="deposit">إيداع</option>
                    <option value="withdrawal">سحب</option>
                  </select>
                </Field>
              )}
              <Field label="أساس التاريخ">
                <select
                  value={params.get('dateBasis') ?? 'actual'}
                  onChange={(e) => set('dateBasis', e.target.value)}
                >
                  <option value="actual">تاريخ الدفع الفعلي</option>
                  <option value="recorded">تاريخ التسجيل</option>
                </select>
              </Field>
              <TextField
                label="من تاريخ"
                type="date"
                value={params.get('from') ?? ''}
                onChange={(v) => set('from', v)}
              />
              <TextField
                label="إلى تاريخ"
                type="date"
                value={params.get('to') ?? ''}
                onChange={(v) => set('to', v)}
              />
              <TextField
                label="هوية المسجل"
                value={params.get('actorId') ?? ''}
                onChange={(v) => set('actorId', v)}
              />
            </>
          )}
        </div>
        <Button variant="outline" onClick={() => setParams({})}>
          مسح الفلاتر
        </Button>
      </details>
      <FinanceError error={data.error} />
      {data.isLoading ? (
        <StatePanel state="pending" title="جارٍ تحميل السجلات" />
      ) : (
        data.data && (
          <>
            <p className="muted">{data.data.total} سجل ضمن صلاحياتك</p>
            {!data.data.items.length && (
              <StatePanel state="empty" title="لا توجد سجلات بهذه الفلاتر" />
            )}
            <div className="finance-list">
              {data.data.items.map((r) => (
                <Link
                  key={r.id}
                  to={path(screen) + '/' + r.id}
                  state={{ back: path(screen) + (params.size ? '?' + params : '') }}
                  className="finance-row"
                >
                  <div>
                    <strong>
                      {'name' in r ? r.name : 'description' in r ? r.description : movementName(r)}
                    </strong>
                    <span>
                      {'branchName' in r
                        ? r.branchName
                        : r.type === 'cash'
                          ? 'حساب نقدي'
                          : 'حساب بنكي'}
                      {'actualDate' in r && (
                        <>
                          {' '}
                          · <bdi>{r.actualDate}</bdi>
                        </>
                      )}
                    </span>
                  </div>
                  <div>
                    <Amount value={'balanceMinor' in r ? r.balanceMinor : r.amountMinor} />
                    <span>
                      {'active' in r
                        ? r.active
                          ? 'نشط'
                          : 'موقوف'
                        : 'categoryName' in r
                          ? r.categoryName
                          : methods[r.method]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="finance-pagination">
              <Button
                variant="outline"
                disabled={data.data.page === 1}
                onClick={() => {
                  const n = new URLSearchParams(params);
                  n.set('page', String(data.data!.page - 1));
                  setParams(n);
                }}
              >
                السابق
              </Button>
              <span>صفحة {data.data.page}</span>
              <Button
                variant="outline"
                disabled={data.data.page * data.data.limit >= data.data.total}
                onClick={() => {
                  const n = new URLSearchParams(params);
                  n.set('page', String(data.data!.page + 1));
                  setParams(n);
                }}
              >
                التالي
              </Button>
            </div>
          </>
        )
      )}
    </>
  );
}
export function FinanceNewPage({ screen }: { screen: Screen }) {
  const catalog = useFinanceCatalog(screen);
  if (!catalog.data)
    return catalog.error ? (
      <FinanceError error={catalog.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الاختيارات" />
    );
  return screen === 'accounts' ? (
    <AccountEditor catalog={catalog.data} />
  ) : (
    <PaymentEditor
      key={screen}
      screen={screen}
      catalog={catalog.data}
      refresh={() => void catalog.refetch()}
    />
  );
}
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function PaymentEditor({
  screen,
  catalog,
  refresh,
}: {
  screen: 'expenses' | 'movements';
  catalog: FinanceCatalog;
  refresh: () => void;
}) {
  const navigate = useNavigate(),
    mutation = useFinanceMutation((r) => navigate(path(screen) + '/' + r.entityId), screen);
  const pending = mutation.pending && 'fields' in mutation.pending ? mutation.pending.fields : null;
  const [branchId, setBranch] = useState(
      pending && 'branchId' in pending ? pending.branchId : (catalog.branches[0]?.id ?? ''),
    ),
    [accountId, setAccount] = useState(pending && 'accountId' in pending ? pending.accountId : ''),
    [amount, setAmount] = useState(
      pending && 'amountMinor' in pending ? displayMinor(pending.amountMinor) : '',
    ),
    [date, setDate] = useState(pending && 'actualDate' in pending ? pending.actualDate : today()),
    [method, setMethod] = useState<PaymentMethod>(
      pending && 'method' in pending ? pending.method : 'cash',
    ),
    [categoryId, setCategory] = useState(
      pending && 'categoryId' in pending ? pending.categoryId : '',
    ),
    [description, setDescription] = useState(
      pending && 'description' in pending ? pending.description : '',
    ),
    [reason, setReason] = useState(pending && 'reason' in pending ? pending.reason : ''),
    [direction, setDirection] = useState<'deposit' | 'withdrawal'>(
      pending && 'direction' in pending ? pending.direction : 'deposit',
    ),
    [review, setReview] = useState<FinanceDraft | null>(null);
  const account = catalog.accounts.find((a) => a.id === accountId),
    branches = catalog.branches;
  const prepare = () => {
    try {
      const amountMinor = inputMinor(amount);
      if (
        BigInt(amountMinor) <= 0n ||
        !accountId ||
        !branchId ||
        !date ||
        (screen === 'expenses' && (!categoryId || !description.trim()))
      )
        throw Error('VALIDATION_FAILED');
      const f = {
        accountId,
        branchId,
        currency: 'EGP' as const,
        amountMinor,
        actualDate: date,
        method,
      };
      setReview(
        screen === 'expenses'
          ? { type: 'expense.create', fields: { ...f, categoryId, description } }
          : { type: 'movement.create', fields: { ...f, direction, reason } },
      );
      mutation.setError(null);
    } catch (e) {
      mutation.setError(e);
    }
  };
  const disabled = mutation.busy || !!mutation.pending;
  return (
    <>
      <PageHeading
        eyebrow="أموال الشركة"
        title={screen === 'expenses' ? 'تسجيل مصروف مدفوع' : 'تسجيل إيداع أو سحب'}
        description="أدخل الحركة التي حدثت بالفعل وتاريخها. الرصيد يُراجع عند الحفظ."
      />
      <form
        className="access-form finance-form"
        onSubmit={(e) => {
          e.preventDefault();
          prepare();
        }}
      >
        <fieldset disabled={disabled || !!review}>
          <FormGroup description="" title="المال والتاريخ">
            <div className="commercial-fields">
              <Field label="فرع العملية">
                <select
                  required
                  value={branchId}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setAccount('');
                  }}
                  disabled={branches.length === 1}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
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
                    setMethod(
                      catalog.accounts.find((a) => a.id === e.target.value)?.type === 'cash'
                        ? 'cash'
                        : 'bank_deposit',
                    );
                  }}
                >
                  <option value="">اختر الحساب</option>
                  {catalog.accounts
                    .filter((a) => a.active && a.branchIds.includes(branchId))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="المبلغ بالجنيه">
                <Input
                  inputMode="decimal"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  dir="ltr"
                />
              </Field>
              <TextField
                label="تاريخ الدفع الفعلي"
                type="date"
                required
                value={date}
                onChange={setDate}
              />
              <Field label="طريقة الدفع">
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {Object.entries(methods)
                    .filter(([id]) =>
                      account?.type === 'cash'
                        ? id === 'cash'
                        : account?.type === 'bank'
                          ? id !== 'cash'
                          : true,
                    )
                    .map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                </select>
              </Field>
              {screen === 'movements' && (
                <Field label="اتجاه الحركة">
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'deposit' | 'withdrawal')}
                  >
                    <option value="deposit">إيداع</option>
                    <option value="withdrawal">سحب</option>
                  </select>
                </Field>
              )}
            </div>
            {account && (
              <p>
                الرصيد المتاح عند التحميل: <Amount value={account.balanceMinor} />
              </p>
            )}
          </FormGroup>
          <FormGroup description="" title={screen === 'expenses' ? 'تفاصيل المصروف' : 'سبب الحركة'}>
            {screen === 'expenses' ? (
              <>
                <Field label="تصنيف المصروف">
                  <select required value={categoryId} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">اختر التصنيف</option>
                    {catalog.categories
                      .filter((c) => c.active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="وصف المصروف">
                  <textarea
                    required
                    maxLength={1000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <Field label="السبب (اختياري)">
                <textarea
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            )}
          </FormGroup>
        </fieldset>
        {screen === 'expenses' && (
          <p>
            <Link to="/settings/reference-data/expense_category">إدارة تصنيفات المصروفات</Link>
          </p>
        )}
        <FinanceError error={mutation.error} />
        {mutation.recovery}
        {review && 'fields' in review && 'amountMinor' in review.fields ? (
          <section className="finance-confirm" aria-label="مراجعة التسجيل">
            <h2>مراجعة التسجيل</h2>
            <p>
              {screen === 'expenses' ? 'مصروف مدفوع' : direction === 'deposit' ? 'إيداع' : 'سحب'} ·{' '}
              <Amount value={review.fields.amountMinor} />
            </p>
            <p>
              {catalog.branches.find((b) => b.id === branchId)?.name} · {account?.name} ·{' '}
              <bdi>{date}</bdi>
            </p>
            <Button type="button" disabled={disabled} onClick={() => void mutation.submit(review)}>
              تأكيد التسجيل
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setReview(null)}
            >
              تعديل البيانات
            </Button>
          </section>
        ) : (
          <Button disabled={disabled} type="submit">
            مراجعة التسجيل
          </Button>
        )}
        <Button variant="outline" type="button" disabled={disabled} onClick={refresh}>
          تحديث الاختيارات والرصيد
        </Button>
      </form>
    </>
  );
}
function AccountEditor({ catalog, existing }: { catalog: FinanceCatalog; existing?: Account }) {
  const navigate = useNavigate(),
    mutation = useFinanceMutation(
      (r) => navigate('/finance/accounts/' + r.entityId),
      'account-' + (existing?.id ?? 'new'),
    );
  const restored =
    mutation.pending && 'fields' in mutation.pending && 'branchIds' in mutation.pending.fields
      ? mutation.pending.fields
      : null;
  const [fields, setFields] = useState<AccountFields>(
    restored ??
      (existing
        ? {
            name: existing.name,
            type: existing.type,
            currency: 'EGP',
            active: existing.active,
            branchIds: existing.branchIds,
            bankDescription: existing.bankDescription,
          }
        : {
            name: '',
            type: 'cash',
            currency: 'EGP',
            active: true,
            branchIds: catalog.branches[0] ? [catalog.branches[0].id] : [],
            bankDescription: '',
          }),
  );
  const set = (patch: Partial<AccountFields>) => setFields((f) => ({ ...f, ...patch }));
  return (
    <>
      <PageHeading
        eyebrow="أموال الشركة"
        title={existing ? 'تعديل الحساب' : 'إضافة حساب'}
        description="الحساب الجديد يبدأ برصيد صفر. العملة جنيه مصري."
      />
      <form
        className="access-form finance-form"
        onSubmit={(e) => {
          e.preventDefault();
          void mutation.submit(
            existing
              ? {
                  type: 'account.update',
                  accountId: existing.id,
                  expectedVersion: existing.version,
                  fields,
                }
              : { type: 'account.create', fields },
          );
        }}
      >
        <fieldset disabled={mutation.busy || !!mutation.pending}>
          <FormGroup description="" title="بيانات الحساب">
            <TextField
              label="اسم الحساب"
              required
              value={fields.name}
              onChange={(name) => set({ name })}
            />
            <Field label="نوع الحساب">
              <select
                disabled={!!existing}
                value={fields.type}
                onChange={(e) =>
                  set({
                    type: e.target.value as 'cash' | 'bank',
                    branchIds: catalog.branches[0] ? [catalog.branches[0].id] : [],
                    bankDescription: '',
                  })
                }
              >
                <option value="cash">نقدي</option>
                <option value="bank">بنكي</option>
              </select>
            </Field>
            <div className="finance-branches" role="group" aria-label="الفروع المسموح لها">
              <p>الفروع المسموح لها</p>
              {catalog.branches.map((b) => (
                <label key={b.id}>
                  <input
                    type={fields.type === 'cash' ? 'radio' : 'checkbox'}
                    name="account-branch"
                    checked={fields.branchIds.includes(b.id)}
                    disabled={!!existing && fields.type === 'cash'}
                    onChange={(e) =>
                      set({
                        branchIds:
                          fields.type === 'cash'
                            ? [b.id]
                            : e.target.checked
                              ? [...fields.branchIds, b.id]
                              : fields.branchIds.filter((id) => id !== b.id),
                      })
                    }
                  />
                  {b.name}
                </label>
              ))}
            </div>
            {fields.type === 'bank' && (
              <Field label="وصف البنك (اختياري)">
                <textarea
                  maxLength={1000}
                  value={fields.bankDescription}
                  onChange={(e) => set({ bankDescription: e.target.value })}
                />
              </Field>
            )}
            <label className="finance-check">
              <input
                type="checkbox"
                checked={fields.active}
                onChange={(e) => set({ active: e.target.checked })}
              />
              نشط للاستخدام الجديد
            </label>
          </FormGroup>
        </fieldset>
        <FinanceError error={mutation.error} />
        {mutation.recovery}
        <Button disabled={mutation.busy || !!mutation.pending || !fields.branchIds.length}>
          حفظ الحساب
        </Button>
      </form>
    </>
  );
}
export function FinanceDetailPage({ screen }: { screen: Screen }) {
  const location = useLocation(),
    { id } = useParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    catalog = useFinanceCatalog(screen),
    [editing, setEditing] = useState(false),
    [historyPage, setHistoryPage] = useState(1);
  const query = useQuery({
    queryKey: ['finance-detail', screen, id, company],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      financeApi<Account | PaidExpense | MoneyMovement>(
        `/finance/${screen}/${id}?companyId=${company}`,
        screen === 'accounts' ? 'account' : screen === 'expenses' ? 'expense' : 'movement',
      ),
  });
  const deactivate = useFinanceMutation(() => void query.refetch(), 'deactivate-' + id);
  const history = useQuery({
    queryKey: ['account-movements', id, company, historyPage],
    enabled: screen === 'accounts' && !!query.data,
    retry: false,
    queryFn: () =>
      financeApi<FinanceList<MoneyMovement>>(
        `/finance/accounts/${id}/movements?companyId=${company}&page=${historyPage}`,
        'movements',
      ),
  });
  if (!query.data)
    return query.error ? (
      <FinanceError error={query.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل السجل" />
    );
  const r = query.data;
  if (editing && 'balanceMinor' in r && catalog.data)
    return (
      <>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(false);
            void query.refetch();
          }}
        >
          تحميل النسخة الحالية وإغلاق التعديل
        </Button>
        <AccountEditor key={r.version} existing={r} catalog={catalog.data} />
      </>
    );
  return (
    <>
      <Link
        className="back-link"
        to={(location.state as { back?: string } | null)?.back ?? path(screen)}
      >
        العودة للقائمة
      </Link>
      <PageHeading
        eyebrow="أموال الشركة"
        title={'name' in r ? r.name : screen === 'expenses' ? 'المصروف المسجل' : 'الحركة المسجلة'}
        description="سجل محفوظ مع تاريخ العملية والمسجل."
      />
      <article className="finance-detail">
        <Amount value={'balanceMinor' in r ? r.balanceMinor : r.amountMinor} />
        {'active' in r ? (
          <>
            <p>
              {r.active ? 'نشط' : 'موقوف'} · {r.type === 'cash' ? 'نقدي' : 'بنكي'} · النسخة{' '}
              {r.version}
            </p>
            <p>{r.bankDescription}</p>
            <Button variant="outline" onClick={() => setEditing(true)}>
              تعديل الحساب
            </Button>
            {r.active && (
              <Button
                variant="outline"
                disabled={deactivate.busy || !!deactivate.pending}
                onClick={() =>
                  void deactivate.submit({
                    type: 'account.deactivate',
                    accountId: r.id,
                    expectedVersion: r.version,
                  })
                }
              >
                إيقاف الحساب
              </Button>
            )}
            <FinanceError error={deactivate.error} />
            {deactivate.recovery}
          </>
        ) : (
          <>
            <dl>
              <dt>الفرع</dt>
              <dd>{r.branchName}</dd>
              <dt>الحساب</dt>
              <dd>{r.accountName}</dd>
              <dt>طريقة الدفع</dt>
              <dd>{methods[r.method]}</dd>
              <dt>التاريخ الفعلي</dt>
              <dd>
                <bdi>{r.actualDate}</bdi>
              </dd>
              <dt>وقت التسجيل</dt>
              <dd>
                <bdi>
                  {new Date(r.recordedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                </bdi>
              </dd>
              <dt>المسجل</dt>
              <dd>{r.actorName}</dd>
              {'categoryName' in r ? (
                <>
                  <dt>التصنيف</dt>
                  <dd>{r.categoryName}</dd>
                  <dt>الوصف</dt>
                  <dd>{r.description}</dd>
                </>
              ) : (
                <>
                  <dt>الاتجاه</dt>
                  <dd>{movementName(r)}</dd>
                  <dt>السبب</dt>
                  <dd>{r.reason || '—'}</dd>
                </>
              )}
            </dl>
            {'movementId' in r && registry?.context.grants.includes('finance.movements') && (
              <Link to={'/finance/movements/' + r.movementId}>الحركة المرتبطة بالمصروف</Link>
            )}
          </>
        )}
      </article>
      {screen === 'accounts' && (
        <>
          <h2>حركات الحساب</h2>
          <FinanceError error={history.error} />
          {history.data && (
            <div className="finance-list">
              {history.data.items.map((m) => (
                <div key={m.id} className="finance-row">
                  <div>
                    <strong>
                      {movementName(m)} · {m.branchName}
                    </strong>
                    <span>
                      <bdi>{m.actualDate}</bdi> · {m.actorName}
                    </span>
                    <span>{m.reason || 'بدون سبب إضافي'}</span>
                  </div>
                  <Amount value={m.amountMinor} />
                </div>
              ))}
              {!history.data.total && <p>لم تُسجل حركات على هذا الحساب.</p>}
              {history.data.total > history.data.limit && (
                <div className="finance-pagination">
                  <Button
                    variant="outline"
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                  >
                    السابق
                  </Button>
                  <span>صفحة {historyPage}</span>
                  <Button
                    variant="outline"
                    disabled={historyPage * history.data.limit >= history.data.total}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
