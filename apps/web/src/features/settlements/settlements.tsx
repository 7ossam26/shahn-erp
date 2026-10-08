import { useEffect, useState, type ReactNode } from 'react';
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
} from '@shahn/ui';
import {
  validateBrandWalletViews,
  validateShipmentViews,
  type PaymentMethod,
  type SettlementCaseDetail,
  type SettlementCaseList,
  type SettlementCatalog,
  type SettlementCommand,
  type SettlementOperation,
  type SettlementPreview,
  type SettlementResult,
  type SettlementTargetKind,
  type ShipmentDetail,
  type WalletStatement,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError, Field, displayMinor, inputMinor } from '../brands/api.js';
import { messageFor, settlementApi, useSettlementMutation } from './api.js';
import '../finance/finance.css';
import './settlements.css';

const number = new Intl.NumberFormat('ar-EG');
export const targetNames: Record<SettlementTargetKind, string> = {
  product: 'كمية منتج',
  account: 'حساب نقدي أو بنكي',
  brand: 'رصيد براند',
  employee: 'استحقاق موظف',
  parcel: 'شحنة محددة',
  source: 'فرق مصدر التوصيل',
  storage: 'رصيد تخزين',
};
const targetHelp: Record<SettlementTargetKind, string> = {
  product: 'الكمية الفعلية بعد جرد خارج النظام؛ يُحسب الفرق ويُحجز العمل المتأثر.',
  account: 'الرصيد الفعلي المعدود مقابل الدفتر، ثم تسوية الفرق بحركة مشروعة.',
  brand: 'تصحيح مرتبط لحركة براند أو اتفاق تجاري موثق.',
  employee: 'إضافة أو خصم في شهر حالي غير مدفوع أو قادم فقط.',
  parcel: 'تسجيل مكرر/خاطئ قبل التسليم، أو تحويل للفقد والتلف.',
  source: 'فرق بين الحقائق السابقة والفعالة من نظام التوصيل بعد ترحيل أموال.',
  storage: 'استرداد من رصيد التخزين المقدم غير المخصص بصرف فعلي.',
};
const targetGrants: Record<SettlementTargetKind, string[]> = {
  product: ['inventory'],
  account: ['finance.accounts'],
  brand: ['brand.payout'],
  employee: ['employees'],
  parcel: ['intake'],
  source: ['brand.payout'],
  storage: ['storage'],
};
const operationNames: Record<string, string> = {
  'product.observe': 'ملاحظة كمية فعلية',
  'account.observe': 'ملاحظة رصيد فعلي',
  'account.resolve': 'تسوية فرق حساب',
  'brand.correct': 'تصحيح حركة براند',
  'brand.adjust': 'اتفاق تجاري مع براند',
  'employee.adjust': 'تعديل شهر موظف',
  'source.resolve': 'تسوية فرق مصدر',
  'incident.resolve': 'تسوية مراجعة حادث',
  'storage.refund': 'استرداد رصيد تخزين',
  'parcel.incident': 'بلاغ فقد أو تلف',
  'parcel.cancel': 'إلغاء تسجيل خاطئ',
};
const factNames: Record<string, string> = {
  soundOnHand: 'الكمية السليمة',
  unavailableOnHand: 'الكمية غير الصالحة',
  delta: 'الفرق المحسوب',
  physicalOnHand: 'الموجود فعليًا',
  reserved: 'المحجوز',
  available: 'المتاح',
  reservationShortage: 'عجز الحجز',
  bookBalance: 'رصيد الدفتر',
  observedActual: 'الرصيد الفعلي الملاحظ',
  difference: 'الفرق (الفعلي − الدفتر)',
  discrepancyHold: 'حجز العجز',
  availableFunds: 'المتاح للصرف',
  unexplainedRemaining: 'الفرق غير المفسر المتبقي',
  originalMovement: 'قيمة الحركة الأصلية',
  eligibleCredit: 'مستحق مؤهل',
  pendingCredit: 'مستحق معلق لدى المناديب',
  brandDebits: 'مديونيات على البراند',
  heldCredit: 'مستحق موقوف للمراجعة',
  signedEntitlement: 'صافي المستحق',
  eligibleToPay: 'المتاح للتحصيل',
  paidToBrand: 'محصل للبراند سابقًا',
  grossEarning: 'إجمالي الاستحقاق',
  payrollRecovery: 'استرداد الالتزامات',
  netPayable: 'صافي الراتب',
  carryRemaining: 'التزام مرحل',
  employeeCost: 'تكلفة الموظف',
  sourceGoods: 'مستحقات البضاعة حسب المصدر',
  sourceBrandFee: 'رسوم الشحن على البراند',
  compensation: 'التعويض',
  employeeShare: 'حصة الموظف',
  unallocatedStorageCredit: 'رصيد تخزين غير مخصص',
  allocatedStorageCredit: 'رصيد تخزين مخصص لفترات',
  earnedStorageRevenue: 'إيراد التخزين المكتسب',
  incidentKind: 'نوع الواقعة',
  affectedQuantity: 'الكمية المتأثرة',
  custodyHolder: 'صاحب العهدة',
  shipmentState: 'حالة الشحنة',
  preparation: 'التجهيز',
  reservedUnits: 'وحدات محجوزة',
};
const ledgerNames: Record<string, string> = {
  stock: 'المخزون',
  money: 'الحساب',
  brand: 'رصيد البراند',
  employee: 'الموظف',
  operating: 'نتيجة التشغيل',
  storage: 'رصيد التخزين',
  hold: 'حجز',
  review: 'المراجعة',
  incident: 'الحادث',
  shipment: 'الشحنة',
};
const textValues: Record<string, string> = {
  unchanged: 'بدون تغيير',
  loss: 'فقد',
  damage: 'تلف',
  branch: 'الفرع',
  driver: 'المندوب',
  active: 'نشطة',
  cancelled: 'ملغاة',
  awaiting_preparation: 'بانتظار التجهيز',
  complete: 'مجهزة',
  not_required: 'لا تحتاج تجهيز',
};
const stateNames = { open: 'مفتوحة', resolved: 'مسواة' } as const;
const dependentStates: Record<string, string> = {
  held: 'ستُوقف',
  released: 'يُفرج عنها',
  unaffected: 'لا تتأثر',
  retained: 'تبقى كما هي',
  held_for_incident: 'تُحجز لبلاغ الحادث',
  refund_source: 'مصدر الاسترداد',
};
const methodNames: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bank_deposit: 'إيداع بنكي',
  instapay: 'إنستا باي',
};
function Money({ value }: { value: string | null }) {
  if (value === null) return <span className="muted">—</span>;
  return (
    <bdi dir="ltr" className="settlement-money">
      {displayMinor(value)} <small>ج.م</small>
    </bdi>
  );
}
function factValue(unit: string, v: string | null) {
  if (v === null) return <span className="muted">—</span>;
  if (unit === 'minor') return <Money value={v} />;
  if (unit === 'quantity') return <bdi>{number.format(Number(v))}</bdi>;
  return <span>{textValues[v] ?? v}</span>;
}
export function SettlementError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="commercial-error">
      {error instanceof CommercialError ? messageFor(error.code) : 'راجع المدخلات وحاول مجددًا.'}
    </p>
  );
}
function useCatalog(path = '/catalog') {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['settlement-catalog', path, company, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () => settlementApi<SettlementCatalog>(`${path}?companyId=${company}`, 'catalog'),
  });
}
export { useCatalog as useSettlementCatalog };
export function SettlementsPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [params, setParams] = useSearchParams(),
    location = useLocation(),
    notice = (location.state as { notice?: string } | null)?.notice;
  const catalog = useCatalog();
  const list = useQuery({
    queryKey: ['settlements', company, params.toString(), registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      settlementApi<SettlementCaseList>(
        '/cases?' + new URLSearchParams({ companyId: company!, ...Object.fromEntries(params) }),
        'list',
      ),
  });
  const filter = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete('page');
    setParams(p);
  };
  const active = ['branchId', 'search', 'from', 'to'].filter((k) => params.get(k)).length;
  return (
    <>
      <PageHeading
        eyebrow="التشغيل اليومي"
        title="التسويات والتصحيحات"
        description="ابدأ بالهدف والحالة الفعلية، راجع الأثر المحدد قبل التأكيد. لا يوجد تعديل حر للأرصدة؛ كل تصحيح يبقى مرتبطًا بأصله."
      />
      {notice && (
        <p role="status" className="commercial-notice">
          {notice}
        </p>
      )}
      <Link
        className="settlement-action"
        to="/settlements/new"
        state={{ back: '/settlements?' + params }}
      >
        بدء تسوية جديدة
      </Link>
      {!!list.data?.pendingReviews.length && (
        <section className="settlement-panel" aria-labelledby="pending-title">
          <h2 id="pending-title">مراجعات بانتظار تسوية مرتبطة</h2>
          <ul className="settlement-rows">
            {list.data.pendingReviews.map((r) => (
              <li key={r.kind + r.id}>
                <div>
                  <strong>{r.kind === 'source' ? 'فرق مصدر' : 'مراجعة حادث'}</strong>
                  <span>{r.label}</span>
                  {r.heldMinor !== '0' && (
                    <span className="muted">
                      موقوف: <Money value={r.heldMinor} />
                    </span>
                  )}
                </div>
                <Link
                  className="secondary-link"
                  to={`/settlements/new?target=${r.kind === 'source' ? 'source' : 'brand'}&${r.kind === 'source' ? 'reviewId' : 'incidentId'}=${r.id}`}
                >
                  مراجعة الأثر
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="settlement-filters" aria-label="تصفية الحالات">
        <Field label="نوع الهدف">
          <select
            value={params.get('targetKind') ?? 'all'}
            onChange={(e) => filter('targetKind', e.target.value === 'all' ? '' : e.target.value)}
          >
            <option value="all">كل الأهداف</option>
            {Object.entries(targetNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الحالة">
          <select
            value={params.get('state') ?? 'all'}
            onChange={(e) => filter('state', e.target.value === 'all' ? '' : e.target.value)}
          >
            <option value="all">الكل</option>
            <option value="open">مفتوحة</option>
            <option value="resolved">مسواة</option>
          </select>
        </Field>
        <details open={active > 0}>
          <summary>فلاتر إضافية{active ? ` (${number.format(active)})` : ''}</summary>
          <div className="settlement-filters">
            <Field label="الفرع">
              <select
                value={params.get('branchId') ?? ''}
                onChange={(e) => filter('branchId', e.target.value)}
              >
                <option value="">الفروع المسندة</option>
                {catalog.data?.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رقم الحالة">
              <input
                inputMode="numeric"
                value={params.get('search') ?? ''}
                onChange={(e) => filter('search', e.target.value.replace(/[^0-9٠-٩]/g, ''))}
              />
            </Field>
            <Field label="من تاريخ التسجيل">
              <input
                type="date"
                value={params.get('from') ?? ''}
                onChange={(e) => filter('from', e.target.value)}
              />
            </Field>
            <Field label="إلى تاريخ التسجيل">
              <input
                type="date"
                value={params.get('to') ?? ''}
                onChange={(e) => filter('to', e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setParams(new URLSearchParams())}
            >
              إعادة الضبط
            </Button>
          </div>
        </details>
      </section>
      {list.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل الحالات" />
      ) : list.isError ? (
        <SettlementError error={list.error} />
      ) : !list.data.items.length ? (
        <StatePanel state="empty" title="لا توجد حالات مطابقة">
          {params.toString() ? 'لا نتائج لهذه الفلاتر داخل فروعك.' : 'لم تُسجل تسويات بعد.'}
        </StatePanel>
      ) : (
        <ul className="settlement-cards">
          {list.data.items.map((c) => (
            <li key={c.id}>
              <Link to={'/settlements/' + c.id} state={{ back: '/settlements?' + params }}>
                <span className={'settlement-state state-' + c.state}>{stateNames[c.state]}</span>
                <strong>
                  {operationNames[c.operation]} · رقم <bdi>{c.reference}</bdi>
                </strong>
                <span>
                  {targetNames[c.targetKind]} · {c.branchName}
                </span>
                <span className="muted">{c.reason}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function TargetPicker({ catalog }: { catalog: SettlementCatalog }) {
  const granted = (Object.keys(targetNames) as SettlementTargetKind[]).filter((t) =>
    targetGrants[t]!.every((g) => catalog.grants.includes(g)),
  );
  return (
    <ul className="settlement-targets" aria-label="اختر هدف التسوية">
      {granted.map((t) => (
        <li key={t}>
          <Link to={'/settlements/new?target=' + t}>
            <strong>{targetNames[t]}</strong>
            <span>{targetHelp[t]}</span>
          </Link>
        </li>
      ))}
      {!granted.length && <li>لا توجد أهداف مسموحة لصلاحياتك الحالية.</li>}
    </ul>
  );
}
type Draft = SettlementOperation | null;
function OptionList({ items }: { items: { id: string; name: string }[] }) {
  return (
    <>
      <option value="">اختر</option>
      {items.map((x) => (
        <option key={x.id} value={x.id}>
          {x.name}
        </option>
      ))}
    </>
  );
}
function money(v: string): string | null {
  try {
    const m = inputMinor(v);
    return m === '0' ? null : m;
  } catch {
    return null;
  }
}
function ProductForm({ c, onDraft }: { c: SettlementCatalog; onDraft: (d: Draft) => void }) {
  const [branchId, setBranch] = useState(c.branches[0]?.id ?? ''),
    [variantId, setVariant] = useState(''),
    [condition, setCondition] = useState<'sound' | 'unavailable'>('sound'),
    [observed, setObserved] = useState(''),
    [date, setDate] = useState(c.today);
  useEffect(() => {
    const v = c.variants.find((x) => x.variantId === variantId),
      q = Number(observed.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
    onDraft(
      v && branchId && observed !== '' && Number.isSafeInteger(q) && q >= 0
        ? {
            operation: 'product.observe',
            branchId,
            brandId: v.brandId,
            variantId,
            condition,
            observedQuantity: q,
            actualDate: date,
          }
        : null,
    );
  }, [branchId, variantId, condition, observed, date]);
  return (
    <FormGroup
      title="الجرد الفعلي"
      description="أدخل ما وُجد فعليًا لحالة واحدة؛ يحسب النظام الفرق مقابل النسخة الحالية."
    >
      <Field label="الفرع">
        <select value={branchId} onChange={(e) => setBranch(e.target.value)}>
          <OptionList items={c.branches} />
        </select>
      </Field>
      <Field label="المنتج والصنف">
        <select value={variantId} onChange={(e) => setVariant(e.target.value)}>
          <OptionList
            items={c.variants.map((v) => ({
              id: v.variantId,
              name: (c.brands.find((b) => b.id === v.brandId)?.name ?? '') + ' · ' + v.label,
            }))}
          />
        </select>
      </Field>
      <Field label="الحالة">
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as 'sound' | 'unavailable')}
        >
          <option value="sound">سليم</option>
          <option value="unavailable">تالف أو غير مؤكد</option>
        </select>
      </Field>
      <Field label="الكمية الفعلية">
        <input inputMode="numeric" value={observed} onChange={(e) => setObserved(e.target.value)} />
      </Field>
      <Field label="تاريخ الملاحظة الفعلي">
        <input type="date" max={c.today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </FormGroup>
  );
}
function AccountForm({
  c,
  caseId,
  onDraft,
}: {
  c: SettlementCatalog;
  caseId: string | null;
  onDraft: (d: Draft) => void;
}) {
  const [accountId, setAccount] = useState(''),
    [branchId, setBranch] = useState(c.branches[0]?.id ?? ''),
    [amount, setAmount] = useState(''),
    [date, setDate] = useState(c.today),
    [kind, setKind] = useState<
      'missed_expense' | 'missed_movement' | 'company_loss' | 'employee_liability'
    >('missed_expense'),
    [categoryId, setCategory] = useState(''),
    [description, setDescription] = useState(''),
    [method, setMethod] = useState<PaymentMethod>('cash'),
    [employeeId, setEmployee] = useState(''),
    [month, setMonth] = useState(c.today.slice(0, 7));
  useEffect(() => {
    let observed: string | null = null;
    try {
      observed = amount.trim() === '' ? null : inputMinor(amount);
    } catch {
      observed = null;
    }
    if (!caseId) {
      onDraft(
        accountId && branchId && observed !== null
          ? {
              operation: 'account.observe',
              accountId,
              branchId,
              observedMinor: observed,
              actualDate: date,
            }
          : null,
      );
      return;
    }
    const m = money(amount);
    if (!m || !branchId) return onDraft(null);
    const base = { amountMinor: m, branchId, actualDate: date };
    const resolution =
      kind === 'missed_expense'
        ? categoryId && description.trim()
          ? { kind, ...base, categoryId, description: description.trim(), method }
          : null
        : kind === 'missed_movement'
          ? { kind, ...base, method }
          : kind === 'company_loss'
            ? { kind, ...base }
            : employeeId
              ? { kind, ...base, employeeId, month }
              : null;
    onDraft(
      resolution
        ? ({ operation: 'account.resolve', caseId, resolution } as SettlementOperation)
        : null,
    );
  }, [
    accountId,
    branchId,
    amount,
    date,
    kind,
    categoryId,
    description,
    method,
    employeeId,
    month,
    caseId,
  ]);
  return (
    <FormGroup
      title={caseId ? 'تسوية الفرق بمسار مشروع واحد' : 'الرصيد الفعلي المعدود'}
      description={
        caseId
          ? 'المبلغ يستبدل جزءًا من حجز العجز بحركة محددة؛ لا يُخصم مرتين.'
          : 'العجز يُحجز من المتاح حتى يُفسر. الفائض لا يصبح قابلًا للصرف.'
      }
    >
      {!caseId && (
        <Field label="الحساب">
          <select value={accountId} onChange={(e) => setAccount(e.target.value)}>
            <OptionList items={c.accounts} />
          </select>
        </Field>
      )}
      {caseId && (
        <Field label="نوع التسوية">
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="missed_expense">مصروف مدفوع فعلًا ولم يسجل</option>
            <option value="missed_movement">حركة إيداع أو سحب فعلية فائتة</option>
            <option value="company_loss">خسارة شركة مؤكدة (خارج ربح التشغيل حتى التصنيف)</option>
            <option value="employee_liability">التزام موظف معتمد يسترد من راتب غير مدفوع</option>
          </select>
        </Field>
      )}
      <Field label="الفرع">
        <select value={branchId} onChange={(e) => setBranch(e.target.value)}>
          <OptionList items={c.branches} />
        </select>
      </Field>
      <Field label={caseId ? 'المبلغ (ج.م)' : 'الرصيد الفعلي الملاحظ (ج.م)'}>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {caseId && kind === 'missed_expense' && (
        <>
          <Field label="فئة المصروف">
            <select value={categoryId} onChange={(e) => setCategory(e.target.value)}>
              <OptionList items={c.categories} />
            </select>
          </Field>
          <Field label="وصف المصروف">
            <input
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </>
      )}
      {caseId && (kind === 'missed_expense' || kind === 'missed_movement') && (
        <Field label="الطريقة">
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {Object.entries(methodNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      )}
      {caseId && kind === 'employee_liability' && (
        <>
          <Field label="الموظف">
            <select value={employeeId} onChange={(e) => setEmployee(e.target.value)}>
              <OptionList items={c.employees} />
            </select>
          </Field>
          <Field label="شهر الاسترداد (حالي غير مدفوع أو قادم)">
            <input
              type="month"
              min={c.today.slice(0, 7)}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </Field>
        </>
      )}
      <Field label="التاريخ الفعلي">
        <input type="date" max={c.today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </FormGroup>
  );
}
function useStatement(brandId: string) {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['settlement-statement', company, brandId],
    enabled: !!company && !!brandId,
    retry: false,
    queryFn: async () => {
      const r = await fetch(
        `/api/v1/finance/brand-wallets/${brandId}/statement?companyId=${company}&limit=100`,
        {
          credentials: 'same-origin',
        },
      );
      const body = await r.json();
      if (!r.ok) throw new CommercialError(body.code ?? 'REQUEST_FAILED', r.status);
      if (!validateBrandWalletViews.statement(body))
        throw new CommercialError('INVALID_RESPONSE', 0);
      return body as WalletStatement;
    },
  });
}
function BrandForm({
  c,
  incidentId,
  onDraft,
}: {
  c: SettlementCatalog;
  incidentId: string | null;
  onDraft: (d: Draft) => void;
}) {
  const [mode, setMode] = useState<'adjust' | 'correct'>('adjust'),
    [brandId, setBrand] = useState(''),
    [branchId, setBranch] = useState(c.branches[0]?.id ?? ''),
    [direction, setDirection] = useState<'credit' | 'debit'>('credit'),
    [amount, setAmount] = useState(''),
    [reference, setReference] = useState(''),
    [effectId, setEffect] = useState(''),
    [decision, setDecision] = useState<'retain_original' | 'correct_compensation'>(
      'retain_original',
    ),
    [date, setDate] = useState(c.today);
  const statement = useStatement(mode === 'correct' ? brandId : '');
  useEffect(() => {
    const m = money(amount);
    if (incidentId) {
      onDraft(
        decision === 'retain_original'
          ? { operation: 'incident.resolve', incidentId, decision, actualDate: date }
          : m
            ? {
                operation: 'incident.resolve',
                incidentId,
                decision,
                compensationDeltaMinor: (direction === 'debit' ? '-' : '') + m,
                actualDate: date,
              }
            : null,
      );
      return;
    }
    if (mode === 'adjust')
      onDraft(
        brandId && branchId && m && reference.trim()
          ? {
              operation: 'brand.adjust',
              brandId,
              branchId,
              direction,
              amountMinor: m,
              agreementReference: reference.trim(),
              actualDate: date,
            }
          : null,
      );
    else
      onDraft(
        brandId && effectId && m
          ? {
              operation: 'brand.correct',
              brandId,
              effectId,
              amountMinor: (direction === 'debit' ? '-' : '') + m,
              actualDate: date,
            }
          : null,
      );
  }, [mode, brandId, branchId, direction, amount, reference, effectId, decision, date, incidentId]);
  if (incidentId)
    return (
      <FormGroup
        title="نتيجة مراجعة الحادث"
        description="الإبقاء على التعويض المؤكد أو تصحيحه بحركة مرتبطة؛ حصة الموظف والتحصيلات المدفوعة لا تتغير."
      >
        <Field label="القرار">
          <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
            <option value="retain_original">الإبقاء على التعويض الأصلي</option>
            <option value="correct_compensation">تصحيح مبلغ التعويض</option>
          </select>
        </Field>
        {decision === 'correct_compensation' && (
          <>
            <Field label="الاتجاه">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as typeof direction)}
              >
                <option value="debit">تخفيض التعويض</option>
                <option value="credit">زيادة التعويض</option>
              </select>
            </Field>
            <Field label="مقدار التصحيح (ج.م)">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          </>
        )}
        <Field label="التاريخ الفعلي">
          <input type="date" max={c.today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </FormGroup>
    );
  return (
    <FormGroup
      title="رصيد البراند"
      description="الحركة الأصلية وتخصيصاتها تبقى؛ لا نقدية ولا استرداد ولا تحصيل وهمي."
    >
      <Field label="العملية">
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="adjust">اتفاق تجاري مستقل موثق</option>
          <option value="correct">تصحيح حركة براند خاطئة</option>
        </select>
      </Field>
      <Field label="البراند">
        <select value={brandId} onChange={(e) => setBrand(e.target.value)}>
          <OptionList items={c.brands} />
        </select>
      </Field>
      {mode === 'correct' && (
        <Field label="الحركة الأصلية">
          <select value={effectId} onChange={(e) => setEffect(e.target.value)}>
            <option value="">{statement.isPending && brandId ? 'جارٍ التحميل…' : 'اختر'}</option>
            {statement.data?.items
              .filter((m) => ['goods', 'fee', 'opening', 'adjustment'].includes(m.kind))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.effectiveDate} · {m.kind} · {displayMinor(m.amountMinor)}
                </option>
              ))}
          </select>
        </Field>
      )}
      {mode === 'adjust' && (
        <Field label="فرع التسجيل">
          <select value={branchId} onChange={(e) => setBranch(e.target.value)}>
            <OptionList items={c.branches} />
          </select>
        </Field>
      )}
      <Field label="الاتجاه">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as typeof direction)}
        >
          <option value="credit">لصالح البراند</option>
          <option value="debit">على البراند</option>
        </select>
      </Field>
      <Field label="المبلغ (ج.م)">
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {mode === 'adjust' && (
        <Field label="مرجع الاتفاق">
          <input value={reference} maxLength={300} onChange={(e) => setReference(e.target.value)} />
        </Field>
      )}
      <Field label="التاريخ الفعلي">
        <input type="date" max={c.today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </FormGroup>
  );
}
function EmployeeForm({ c, onDraft }: { c: SettlementCatalog; onDraft: (d: Draft) => void }) {
  const [employeeId, setEmployee] = useState(''),
    [month, setMonth] = useState(c.today.slice(0, 7)),
    [kind, setKind] = useState<'bonus' | 'overtime' | 'earning_deduction'>('bonus'),
    [amount, setAmount] = useState(''),
    [workDate, setWorkDate] = useState(c.today);
  useEffect(() => {
    const m = money(amount);
    onDraft(
      employeeId && m
        ? { operation: 'employee.adjust', employeeId, month, kind, amountMinor: m, workDate }
        : null,
    );
  }, [employeeId, month, kind, amount, workDate]);
  return (
    <FormGroup
      title="شهر الموظف"
      description="الشهور السابقة والمدفوعة محمية بالكامل. الخصم يخفض التكلفة، والسلفة مسار منفصل."
    >
      <Field label="الموظف">
        <select value={employeeId} onChange={(e) => setEmployee(e.target.value)}>
          <OptionList items={c.employees} />
        </select>
      </Field>
      <Field label="الشهر">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </Field>
      <Field label="النوع">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="bonus">مكافأة</option>
          <option value="overtime">وقت إضافي</option>
          <option value="earning_deduction">خصم استحقاق</option>
        </select>
      </Field>
      <Field label="المبلغ (ج.م)">
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="تاريخ العمل داخل الشهر">
        <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
      </Field>
    </FormGroup>
  );
}
function ParcelForm({ onDraft }: { onDraft: (d: Draft) => void }) {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [reference, setReference] = useState(''),
    [shipment, setShipment] = useState<ShipmentDetail | null>(null),
    [error, setError] = useState<unknown>(null);
  useEffect(
    () => onDraft(shipment ? { operation: 'parcel.cancel', shipmentId: shipment.id } : null),
    [shipment],
  );
  const find = async () => {
    setError(null);
    setShipment(null);
    try {
      const r = await fetch(
        `/api/v1/shipments/${encodeURIComponent(reference)}?companyId=${company}`,
        { credentials: 'same-origin' },
      );
      const body = await r.json();
      if (!r.ok) throw new CommercialError(body.code ?? 'NOT_FOUND', r.status);
      if (!validateShipmentViews.detail!(body)) throw new CommercialError('INVALID_RESPONSE', 0);
      setShipment(body as ShipmentDetail);
    } catch (e) {
      setError(e);
    }
  };
  return (
    <FormGroup
      title="الشحنة المحددة"
      description="اختر الحالة الفعلية؛ لا حذف ولا نقل عهدة بالقيد."
    >
      <ul className="settlement-routes">
        <li>
          فقد أو تلف: <Link to="/incidents/new">بلاغ في صفحة الحوادث</Link> (حجز العهدة بلا أموال
          حتى التأكيد).
        </li>
        <li>
          استلام فعلي فائت لتحويل: <Link to="/goods-receipts">صفحة استلام البضائع</Link>.
        </li>
        <li>تسجيل مكرر أو خاطئ قبل التسليم للمندوب: أدخل رقم الشحنة هنا.</li>
      </ul>
      <Field label="رقم الشحنة">
        <input
          inputMode="numeric"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>
      <Button type="button" variant="secondary" onClick={() => void find()} disabled={!reference}>
        عرض الشحنة
      </Button>
      <SettlementError error={error} />
      {shipment && (
        <p className="muted">
          شحنة <bdi>{shipment.reference}</bdi> · {shipment.branchName} ·{' '}
          {textValues[shipment.state]}
        </p>
      )}
    </FormGroup>
  );
}
function SourceForm({
  reviewId,
  c,
  onDraft,
}: {
  reviewId: string | null;
  c: SettlementCatalog;
  onDraft: (d: Draft) => void;
}) {
  const [decision, setDecision] = useState<'apply_effective' | 'retain_original'>(
      'apply_effective',
    ),
    [date, setDate] = useState(c.today);
  useEffect(
    () =>
      onDraft(
        reviewId ? { operation: 'source.resolve', reviewId, decision, actualDate: date } : null,
      ),
    [reviewId, decision, date],
  );
  if (!reviewId)
    return (
      <StatePanel state="empty" title="اختر مراجعة من قائمة التسويات">
        فروق المصدر تبدأ من مراجعة مرتبطة أنشأها التصحيح المقبول؛ لا تُنشأ يدويًا.
      </StatePanel>
    );
  return (
    <FormGroup
      title="قرار فرق المصدر"
      description="لا استرداد تلقائي ولا تعديل لتحصيل أو راتب مدفوع ولا أمر لنظام التوصيل."
    >
      <Field label="القرار">
        <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
          <option value="apply_effective">ترحيل الفرق المرتبط حسب الحقيقة الفعالة</option>
          <option value="retain_original">الإبقاء على الأصل المرحل</option>
        </select>
      </Field>
      <Field label="التاريخ الفعلي">
        <input type="date" max={c.today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </FormGroup>
  );
}
function StorageForm({ c, onDraft }: { c: SettlementCatalog; onDraft: (d: Draft) => void }) {
  const [brandId, setBrand] = useState(''),
    [branchId, setBranch] = useState(c.branches[0]?.id ?? ''),
    [accountId, setAccount] = useState(''),
    [method, setMethod] = useState<PaymentMethod>('cash'),
    [amount, setAmount] = useState(''),
    [date, setDate] = useState(c.today),
    [external, setExternal] = useState(''),
    [paid, setPaid] = useState(false);
  useEffect(() => {
    const m = money(amount);
    onDraft(
      brandId && branchId && accountId && m && paid
        ? {
            operation: 'storage.refund',
            brandId,
            branchId,
            accountId,
            method,
            amountMinor: m,
            actualDate: date,
            externalReference: external,
            confirmCashOut: true,
          }
        : null,
    );
  }, [brandId, branchId, accountId, method, amount, date, external, paid]);
  return (
    <FormGroup
      title="استرداد رصيد التخزين"
      description="من الرصيد المقدم غير المخصص فقط، بصرف فعلي. الإيراد المكتسب لا يتغير."
    >
      <Field label="البراند">
        <select value={brandId} onChange={(e) => setBrand(e.target.value)}>
          <OptionList items={c.brands} />
        </select>
      </Field>
      <Field label="فرع الصرف">
        <select value={branchId} onChange={(e) => setBranch(e.target.value)}>
          <OptionList items={c.branches} />
        </select>
      </Field>
      <Field label="الحساب">
        <select value={accountId} onChange={(e) => setAccount(e.target.value)}>
          <OptionList items={c.accounts} />
        </select>
      </Field>
      <Field label="الطريقة">
        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {Object.entries(methodNames).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="المبلغ (ج.م)">
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="مرجع اختياري">
        <input value={external} maxLength={120} onChange={(e) => setExternal(e.target.value)} />
      </Field>
      <Field label="تاريخ الصرف الفعلي">
        <input type="date" max={c.today} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <label className="settlement-check">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> تم صرف
        المبلغ فعليًا من الحساب
      </label>
    </FormGroup>
  );
}
export function PreviewPanel({ preview }: { preview: SettlementPreview }) {
  return (
    <section className="settlement-preview" aria-labelledby="preview-title" tabIndex={-1}>
      <h2 id="preview-title">الأثر الذي سيُؤكد · {preview.target.label}</h2>
      <p className="muted">
        {targetNames[preview.target.kind]} · {preview.target.branchName}
      </p>
      <table className="settlement-facts">
        <thead>
          <tr>
            <th scope="col">البند</th>
            <th scope="col">قبل</th>
            <th scope="col">بعد</th>
          </tr>
        </thead>
        <tbody>
          {preview.facts.map((x) => (
            <tr key={x.key}>
              <th scope="row">{factNames[x.key] ?? x.key}</th>
              <td>{factValue(x.unit, x.before)}</td>
              <td>{factValue(x.unit, x.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>الحركات المحددة</h3>
      <ul className="settlement-rows">
        {preview.effects.map((e, i) => (
          <li key={i}>
            <div>
              <strong>{ledgerNames[e.ledger]}</strong>
              <span>{e.label}</span>
            </div>
            <span>
              {e.amountMinor !== null ? <Money value={e.amountMinor} /> : null}
              {e.quantity !== null ? (
                <bdi dir="ltr">
                  {e.quantity > 0 ? '+' : ''}
                  {number.format(e.quantity)}
                </bdi>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {!!preview.dependents.length && (
        <>
          <h3>سجلات مرتبطة ستبقى أو تتأثر</h3>
          <ul className="settlement-rows">
            {preview.dependents.map((d) => (
              <li key={d.kind + d.id}>
                <span>{d.label}</span>
                <span className="muted">{dependentStates[d.state] ?? d.state}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!!preview.warnings.length && (
        <ul className="settlement-warnings" role="note">
          {preview.warnings.map((w) => (
            <li key={w}>{messageFor(w)}</li>
          ))}
        </ul>
      )}
      {!!preview.blockers.length && (
        <ul className="settlement-blockers" role="alert">
          {preview.blockers.map((b) => (
            <li key={b}>{messageFor(b)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
function UnknownResult({
  pending,
  busy,
  recover,
  discard,
}: {
  pending: unknown;
  busy: boolean;
  recover: () => void;
  discard: () => void;
}) {
  if (!pending) return null;
  return (
    <section role="status" className="commercial-warning">
      <p>نتيجة التأكيد السابق غير معروفة. احتفظنا بنفس الطلب؛ لا تسجّل تسوية جديدة قبل التحقق.</p>
      <Button type="button" disabled={busy} onClick={recover}>
        التحقق من النتيجة
      </Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={discard}>
        تجاهل بعد التأكد من عدم التسجيل
      </Button>
    </section>
  );
}
export function SettlementNewPage() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    { registry, session } = useAccess(),
    catalog = useCatalog(),
    target = params.get('target') as SettlementTargetKind | null,
    caseId = params.get('caseId'),
    reviewId = params.get('reviewId'),
    incidentId = params.get('incidentId');
  const [draft, setDraft] = useState<Draft>(null),
    [preview, setPreview] = useState<SettlementPreview | null>(null),
    [reason, setReason] = useState(''),
    [reviewing, setReviewing] = useState(false),
    [checking, setChecking] = useState(false),
    [formError, setFormError] = useState<unknown>(null),
    [notice, setNotice] = useState('');
  const mutation = useSettlementMutation<SettlementCommand, SettlementResult>(
    'settlement',
    `${target}:${caseId ?? reviewId ?? incidentId ?? ''}`,
    (r) =>
      navigate('/settlements/' + r.caseId, {
        state: { notice: `تم تأكيد ${operationNames[r.operation]} برقم حالة ${r.caseReference}.` },
      }),
  );
  const locked = mutation.busy || !!mutation.pending || checking;
  const onDraft = (d: Draft) => {
    setDraft(d);
    setPreview(null);
    setReviewing(false);
  };
  const review = async (message = '') => {
    if (!draft) return;
    setChecking(true);
    setFormError(null);
    try {
      const p = await settlementApi<SettlementPreview>(
        '/prepare',
        'preview',
        { companyId: registry!.context.companyId, operation: draft },
        session?.csrfToken,
      );
      setPreview(p);
      setNotice(message);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.settlement-preview')?.focus(),
      );
    } catch (e) {
      setFormError(e);
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    const e = mutation.error;
    if (e instanceof CommercialError && e.code === 'SETTLEMENT_PREVIEW_STALE') {
      mutation.setError(null);
      setReviewing(false);
      void review(messageFor('SETTLEMENT_PREVIEW_STALE'));
    }
  }, [mutation.error]);
  if (!catalog.data)
    return catalog.isError ? (
      <SettlementError error={catalog.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الأهداف المسموحة" />
    );
  const forms: Record<SettlementTargetKind, ReactNode> = {
    product: <ProductForm c={catalog.data} onDraft={onDraft} />,
    account: <AccountForm c={catalog.data} caseId={caseId} onDraft={onDraft} />,
    brand: <BrandForm c={catalog.data} incidentId={incidentId} onDraft={onDraft} />,
    employee: <EmployeeForm c={catalog.data} onDraft={onDraft} />,
    parcel: <ParcelForm onDraft={onDraft} />,
    source: <SourceForm c={catalog.data} reviewId={reviewId} onDraft={onDraft} />,
    storage: <StorageForm c={catalog.data} onDraft={onDraft} />,
  };
  return (
    <>
      <PageHeading
        eyebrow="التسويات"
        title={target ? targetNames[target] : 'اختر هدف التسوية'}
        description={
          target
            ? targetHelp[target]
            : 'ابدأ بالهدف الفعلي. كل هدف له نموذج محدد وأثر محسوب قبل التأكيد.'
        }
      />
      <Link className="back-link" to={target ? '/settlements/new' : '/settlements'}>
        {target ? 'تغيير الهدف' : 'العودة للتسويات'}
      </Link>
      <UnknownResult
        pending={mutation.pending}
        busy={mutation.busy}
        recover={() => void mutation.recover()}
        discard={mutation.discard}
      />
      {!target ? (
        <TargetPicker catalog={catalog.data} />
      ) : (
        <>
          <form
            className="finance-form settlement-form"
            onSubmit={(e) => {
              e.preventDefault();
              void review();
            }}
          >
            <fieldset disabled={locked}>{forms[target]}</fieldset>
            <Button type="submit" disabled={locked || !draft}>
              {checking ? 'جارٍ الحساب…' : 'مراجعة الأثر'}
            </Button>
          </form>
          <SettlementError error={formError ?? (reviewing ? null : mutation.error)} />
          {notice && (
            <p role="status" className="commercial-warning">
              {notice}
            </p>
          )}
          {preview && (
            <>
              <PreviewPanel preview={preview} />
              <Field label="سبب التسوية (مطلوب)">
                <textarea
                  required
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={locked}
                />
              </Field>
              <Button
                type="button"
                disabled={locked || !!preview.blockers.length || !reason.trim()}
                onClick={() => setReviewing(true)}
              >
                تأكيد التسوية
              </Button>
            </>
          )}
          <Dialog
            open={reviewing && !!preview}
            onOpenChange={(o) => !mutation.busy && setReviewing(o)}
          >
            <DialogContent>
              <DialogTitle>تأكيد {preview ? operationNames[preview.operation] : ''}</DialogTitle>
              <DialogDescription>
                سيُعاد الحساب تحت نفس الأقفال. إن تغير أي رقم لن يُسجل شيء وستظهر المراجعة الجديدة.
              </DialogDescription>
              <SettlementError error={mutation.error} />
              {mutation.pending && !mutation.busy && (
                <Button type="button" onClick={() => void mutation.recover()}>
                  التحقق من النتيجة
                </Button>
              )}
              <Button
                type="button"
                disabled={locked}
                onClick={() =>
                  preview &&
                  draft &&
                  void mutation.submit({
                    schemaVersion: 1,
                    type: 'settlement.confirm',
                    reason: reason.trim(),
                    operation: draft,
                    expectedVersions: preview.versions,
                    expectedDigest: preview.digest,
                  })
                }
              >
                {mutation.busy ? 'جارٍ التأكيد…' : 'تأكيد نهائي'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.busy}
                onClick={() => setReviewing(false)}
              >
                رجوع للمراجعة
              </Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
export function SettlementCasePage() {
  const { caseId } = useParams(),
    location = useLocation(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    notice = (location.state as { notice?: string } | null)?.notice,
    back = (location.state as { back?: string } | null)?.back ?? '/settlements';
  const detail = useQuery({
    queryKey: ['settlement', company, caseId],
    enabled: !!company && !!caseId,
    retry: false,
    queryFn: () =>
      settlementApi<SettlementCaseDetail>(`/cases/${caseId}?companyId=${company}`, 'detail'),
  });
  if (!detail.data)
    return detail.isError ? (
      <SettlementError error={detail.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الحالة" />
    );
  const d = detail.data,
    o = d.observation;
  return (
    <>
      <PageHeading
        eyebrow={'حالة رقم ' + d.case.reference}
        title={operationNames[d.case.operation] ?? d.case.operation}
        description={`${targetNames[d.case.targetKind]} · ${d.case.branchName} · ${stateNames[d.case.state]}`}
      />
      {notice && (
        <p role="status" className="commercial-notice">
          {notice}
        </p>
      )}
      <Link className="back-link" to={back}>
        العودة للتسويات
      </Link>
      <section className="settlement-panel">
        <dl className="settlement-summary">
          <div>
            <dt>السبب</dt>
            <dd>{d.case.reason}</dd>
          </div>
          <div>
            <dt>التاريخ الفعلي</dt>
            <dd>{d.case.actualDate}</dd>
          </div>
          <div>
            <dt>سجلها</dt>
            <dd>{d.case.actorName}</dd>
          </div>
        </dl>
      </section>
      {o?.kind === 'account' && (
        <section className="settlement-panel" aria-labelledby="account-title">
          <h2 id="account-title">الدفتر والفعلي · {o.accountName}</h2>
          <dl className="settlement-summary">
            <div>
              <dt>الدفتر وقت الملاحظة</dt>
              <dd>
                <Money value={o.bookAtObservationMinor} />
              </dd>
            </div>
            <div>
              <dt>الفعلي الملاحظ</dt>
              <dd>
                <Money value={o.observedMinor} />
              </dd>
            </div>
            <div>
              <dt>الفرق</dt>
              <dd>
                <Money value={o.differenceMinor} />
              </dd>
            </div>
            <div>
              <dt>الدفتر الآن</dt>
              <dd>
                <Money value={o.bookNowMinor} />
              </dd>
            </div>
            <div>
              <dt>حجز العجز النشط</dt>
              <dd>
                <Money value={o.holdActiveMinor} />
              </dd>
            </div>
            <div>
              <dt>المتاح للصرف الآن</dt>
              <dd>
                <Money value={o.availableNowMinor} />
              </dd>
            </div>
            <div>
              <dt>غير مفسر متبقي</dt>
              <dd>
                <Money value={o.remainingMinor} />
              </dd>
            </div>
          </dl>
          {d.case.state === 'open' && (
            <Link
              className="settlement-action"
              to={`/settlements/new?target=account&caseId=${d.case.id}`}
            >
              تسوية الفرق
            </Link>
          )}
        </section>
      )}
      {o?.kind === 'stock' && (
        <section className="settlement-panel" aria-labelledby="stock-title">
          <h2 id="stock-title">{o.variantLabel}</h2>
          <dl className="settlement-summary">
            <div>
              <dt>المسجل</dt>
              <dd>{number.format(o.recordedQuantity)}</dd>
            </div>
            <div>
              <dt>الفعلي</dt>
              <dd>{number.format(o.observedQuantity)}</dd>
            </div>
            <div>
              <dt>الفرق</dt>
              <dd>
                <bdi dir="ltr">{number.format(o.delta)}</bdi>
              </dd>
            </div>
            <div>
              <dt>العجز الحالي</dt>
              <dd>{number.format(o.currentShortage)}</dd>
            </div>
            <div>
              <dt>حجوزات موقوفة الآن</dt>
              <dd>{number.format(o.heldReservations)}</dd>
            </div>
          </dl>
        </section>
      )}
      <section className="settlement-panel" aria-labelledby="history-title">
        <h2 id="history-title">السجل المؤكد</h2>
        <ol className="settlement-history">
          {d.resolutions.map((r) => (
            <li key={r.id}>
              <strong>{operationNames[r.operation] ?? r.operation}</strong>
              <span>
                {r.actualDate} · {r.actorName}
              </span>
              <span className="muted">{r.reason}</span>
              {r.amountMinor && <Money value={r.amountMinor} />}
            </li>
          ))}
        </ol>
        <h3>الروابط الدائمة</h3>
        <ul className="settlement-rows">
          {d.links.map((l) => (
            <li key={l.role + l.entityKind + l.entityId}>
              <span>
                {l.role === 'original' ? 'الأصل' : l.role === 'dependent' ? 'سجل مرتبط' : 'النتيجة'}
              </span>
              <span>{l.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
