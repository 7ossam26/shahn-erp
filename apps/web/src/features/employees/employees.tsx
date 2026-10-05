import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Input,
  PageHeading,
  StatePanel,
  FormGroup,
  ResponsiveList,
  AmountDisplay,
} from '@shahn/ui';
import type {
  EmployeeCatalog,
  EmployeeList,
  EmployeeDetail,
  EmployeeFields,
  EmployeeTerms,
  SalaryTerms,
  CommissionTerms,
  TermsPreview,
  TermChange,
} from '@shahn/contracts';
import { employeeExamples } from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { Field, TextField, inputMinor, displayMinor, CommercialError } from '../brands/api.js';
import { employeeApi, EmployeeError, useEmployeeMutation } from './api.js';
import './employees.css';
const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function useCatalog() {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['employees-catalog', company],
    queryFn: () =>
      employeeApi<EmployeeCatalog>(`/employees/catalog?companyId=${company}`, 'catalog'),
    enabled: !!company,
    retry: false,
  });
}
const commissionLabel = (c: CommissionTerms) =>
  !c.enabled
    ? 'العمولة غير مفعلة'
    : c.formula === 'fixed'
      ? `${displayMinor(c.perVisit.amountMinor)} ج.م لكل زيارة فعلية مؤهلة`
      : `${(c.basisPoints / 100).toLocaleString('ar-EG')}٪ من الشحن الأساسي لكل زيارة فعلية مؤهلة`;
function TermsSummary({ terms }: { terms: EmployeeTerms }) {
  return (
    <div className="employee-summary">
      <section>
        <h2>الراتب الثابت</h2>
        {terms.salary.enabled ? (
          <AmountDisplay money={terms.salary.monthly} />
        ) : (
          <p>الراتب غير مفعل</p>
        )}
        <p className="muted">مبلغ شهري كامل؛ لا احتساب حضور أو تجزئة تلقائية.</p>
      </section>
      <section>
        <h2>العمولة</h2>
        <strong>{commissionLabel(terms.commission)}</strong>
        <p className="muted">الشحن الأساسي فقط؛ التغليف وسداد البراند لا يغيران العمولة.</p>
      </section>
      {!terms.salary.enabled && !terms.commission.enabled ? (
        <p className="employee-note">القسمان غير مفعلين: لا تنشأ أرباح راتب أو عمولة تلقائيًا.</p>
      ) : null}
    </div>
  );
}
function ProfileEditor({
  value,
  onChange,
  catalog,
  disabled = false,
}: {
  value: EmployeeFields;
  onChange: (v: EmployeeFields) => void;
  catalog: EmployeeCatalog;
  disabled?: boolean;
}) {
  const set = <K extends keyof EmployeeFields>(k: K, v: EmployeeFields[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <fieldset disabled={disabled} className="employee-fields">
      <FormGroup
        title="البيانات الشخصية والعمل"
        description="ملف الموظف مستقل عن حساب الدخول وهوية المندوب."
      >
        <TextField
          label="اسم الموظف"
          value={value.name}
          onChange={(v) => set('name', v)}
          required
        />
        <TextField
          label="وسيلة التواصل"
          value={value.contact}
          onChange={(v) => set('contact', v)}
        />
        <Field label="فرع العمل">
          <select value={value.branchId} onChange={(e) => set('branchId', e.target.value)} required>
            <option value="">اختر الفرع</option>
            {catalog.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <TextField
          label="تاريخ بداية العمل"
          type="date"
          value={value.employmentStart}
          onChange={(v) => set('employmentStart', v)}
          required
        />
        <TextField
          label="تاريخ نهاية العمل (اختياري)"
          type="date"
          value={value.employmentEnd ?? ''}
          onChange={(v) => set('employmentEnd', v || null)}
        />
        <label className="employee-switch">
          <input
            type="checkbox"
            role="switch"
            checked={value.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          الموظف نشط
        </label>
      </FormGroup>
      <FormGroup
        title="جدول العمل"
        description="بيانات وصفية؛ لا تسجل حضورًا أو إضافيًا أو خصمًا تلقائيًا. التخفيض لأول أو آخر شهر جزئي يُدخل لاحقًا كخصم عادي."
      >
        <div className="employee-days" role="group" aria-label="أيام العمل">
          {days.map((d, i) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={value.workDays.includes(i)}
                onChange={(e) =>
                  set(
                    'workDays',
                    e.target.checked
                      ? [...value.workDays, i].sort()
                      : value.workDays.filter((x) => x !== i),
                  )
                }
              />
              {d}
            </label>
          ))}
        </div>
        <Field label="ساعات العمل اليومية">
          <Input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={value.hoursPerDay}
            onChange={(e) => set('hoursPerDay', Number(e.target.value))}
          />
        </Field>
        <Field label="يوم الراحة الأسبوعية">
          <select
            value={value.weeklyDayOff ?? ''}
            onChange={(e) =>
              set('weeklyDayOff', e.target.value === '' ? null : Number(e.target.value))
            }
          >
            <option value="">غير محدد</option>
            {days.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </FormGroup>
    </fieldset>
  );
}
interface CompensationInput {
  salaryEnabled: boolean;
  salaryAmount: string;
  commissionEnabled: boolean;
  formula: 'percentage' | 'fixed';
  percentage: string;
  fixedAmount: string;
}
const compensationInput = (terms: EmployeeTerms): CompensationInput => ({
  salaryEnabled: terms.salary.enabled,
  salaryAmount: terms.salary.enabled ? displayMinor(terms.salary.monthly.amountMinor) : '',
  commissionEnabled: terms.commission.enabled,
  formula: terms.commission.enabled ? terms.commission.formula : 'percentage',
  percentage:
    terms.commission.enabled && terms.commission.formula === 'percentage'
      ? String(terms.commission.basisPoints / 100)
      : '',
  fixedAmount:
    terms.commission.enabled && terms.commission.formula === 'fixed'
      ? displayMinor(terms.commission.perVisit.amountMinor)
      : '',
});
function parseCompensation(v: CompensationInput): EmployeeTerms {
  const salary: SalaryTerms = v.salaryEnabled
    ? { enabled: true, monthly: { currency: 'EGP', amountMinor: inputMinor(v.salaryAmount) } }
    : employeeExamples.off.salary;
  let commission: CommissionTerms = employeeExamples.off.commission;
  if (v.commissionEnabled)
    commission =
      v.formula === 'fixed'
        ? {
            enabled: true,
            formula: 'fixed',
            basisPoints: null,
            perVisit: { currency: 'EGP', amountMinor: inputMinor(v.fixedAmount) },
          }
        : {
            enabled: true,
            formula: 'percentage',
            basisPoints: Number(inputMinor(v.percentage)),
            perVisit: null,
          };
  if (commission.enabled && commission.formula === 'percentage' && commission.basisPoints > 10000)
    throw Error('INVALID_COMPENSATION');
  return { salary, commission };
}
function CompensationEditor({
  value,
  onChange,
  salary = true,
  commission = true,
  disabled = false,
}: {
  value: CompensationInput;
  onChange: (v: CompensationInput) => void;
  salary?: boolean;
  commission?: boolean;
  disabled?: boolean;
}) {
  const set = <K extends keyof CompensationInput>(k: K, v: CompensationInput[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <fieldset disabled={disabled} className="employee-fields">
      {salary ? (
        <FormGroup
          title="الراتب الثابت"
          description="مستقل عن العمولة. الصفر مبلغ صريح؛ الحقل الفارغ ليس صفرًا."
        >
          <label className="employee-switch">
            <input
              type="checkbox"
              role="switch"
              checked={value.salaryEnabled}
              onChange={(e) => set('salaryEnabled', e.target.checked)}
            />
            تفعيل الراتب
          </label>
          {value.salaryEnabled ? (
            <TextField
              label="الراتب الشهري (ج.م)"
              value={value.salaryAmount}
              onChange={(v) => set('salaryAmount', v)}
              required
            />
          ) : (
            <p className="muted">لا راتب تلقائي ما دام هذا القسم غير مفعل.</p>
          )}
        </FormGroup>
      ) : null}
      {commission ? (
        <FormGroup
          title="العمولة"
          description="لكل زيارة فعلية مؤهلة. النقل الداخلي والتعيين والتجهيز لا ينشئون عمولة."
        >
          <label className="employee-switch">
            <input
              type="checkbox"
              role="switch"
              checked={value.commissionEnabled}
              onChange={(e) => set('commissionEnabled', e.target.checked)}
            />
            تفعيل العمولة
          </label>
          {value.commissionEnabled ? (
            <>
              <Field label="صيغة العمولة">
                <select
                  value={value.formula}
                  onChange={(e) => set('formula', e.target.value as 'percentage' | 'fixed')}
                >
                  <option value="percentage">نسبة من الشحن الأساسي</option>
                  <option value="fixed">مبلغ ثابت لكل زيارة</option>
                </select>
              </Field>
              {value.formula === 'percentage' ? (
                <TextField
                  label="نسبة العمولة (٪)"
                  value={value.percentage}
                  onChange={(v) => set('percentage', v)}
                  required
                />
              ) : (
                <TextField
                  label="العمولة لكل زيارة (ج.م)"
                  value={value.fixedAmount}
                  onChange={(v) => set('fixedAmount', v)}
                  required
                />
              )}
              <p className="muted">
                مثال: شحن أساسي ٥٠ + تغليف ٥ عند ١٠٪ يعطي عمولة ٥ ج.م. لا تعتمد على سداد البراند أو
                إعفاء شحن الاستبدال.
              </p>
            </>
          ) : (
            <p className="muted">لا عمولة تلقائية ما دام هذا القسم غير مفعل.</p>
          )}
        </FormGroup>
      ) : null}
    </fieldset>
  );
}
export function EmployeesPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [query, setQuery] = useSearchParams(),
    catalog = useCatalog();
  const search = query.get('search') ?? '',
    branch = query.get('branchId') ?? '',
    active = query.get('active') ?? 'all',
    salary = query.get('salary') ?? 'all',
    commission = query.get('commission') ?? 'all',
    date = query.get('effectiveDate') ?? '',
    page = Number(query.get('page') ?? 1);
  const [advanced, setAdvanced] = useState(false);
  const args = new URLSearchParams({
    companyId: company ?? '',
    search,
    branchId: branch,
    active,
    salary,
    commission,
    effectiveDate: date,
    page: String(page),
  });
  const list = useQuery({
    queryKey: ['employees', company, args.toString()],
    queryFn: () => employeeApi<EmployeeList>('/employees?' + args, 'list'),
    enabled: !!company,
    retry: false,
  });
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(query);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page');
    setQuery(next);
  };
  const card = (r: EmployeeList['items'][number]) => (
    <>
      <Link to={`/employees/${r.id}`}>{r.fields.name}</Link>
      <p>
        مرجع {r.reference} · {r.currentBranchName} · {r.fields.active ? 'نشط' : 'موقوف'}
      </p>
      <p>
        {r.terms.salary.enabled
          ? `راتب ${displayMinor(r.terms.salary.monthly.amountMinor)} ج.م`
          : 'بدون راتب'}{' '}
        · {commissionLabel(r.terms.commission)}
      </p>
    </>
  );
  return (
    <div className="employees-page">
      <PageHeading
        title="الموظفون"
        eyebrow="إعداد الفريق"
        description="ملفات مستقلة ورواتب وعمولات مؤرخة في نطاق فروعك."
      />
      <div className="commercial-toolbar">
        <Link className="primary-link" to="/employees/new">
          موظف جديد
        </Link>
        <Link to="/execution/earnings">عمولات الزيارات</Link>
      </div>
      <div className="employee-filters">
        <TextField label="بحث بالاسم أو المرجع" value={search} onChange={(v) => set('search', v)} />
        <Field label="الفرع">
          <select value={branch} onChange={(e) => set('branchId', e.target.value)}>
            <option value="">كل الفروع المسموحة</option>
            {catalog.data?.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="حالة الموظف">
          <select value={active} onChange={(e) => set('active', e.target.value)}>
            <option value="all">الكل</option>
            <option value="true">نشط</option>
            <option value="false">موقوف</option>
          </select>
        </Field>
        <Button variant="outline" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
          فلاتر متقدمة ({[salary !== 'all', commission !== 'all', !!date].filter(Boolean).length})
        </Button>
      </div>
      {advanced ? (
        <div className="employee-filters employee-advanced">
          <Field label="نمط الراتب">
            <select value={salary} onChange={(e) => set('salary', e.target.value)}>
              <option value="all">الكل</option>
              <option value="enabled">مفعل</option>
              <option value="disabled">غير مفعل</option>
            </select>
          </Field>
          <Field label="نمط العمولة">
            <select value={commission} onChange={(e) => set('commission', e.target.value)}>
              <option value="all">الكل</option>
              <option value="disabled">غير مفعلة</option>
              <option value="percentage">نسبة</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </Field>
          <TextField
            label="تاريخ الشروط الفعالة"
            type="date"
            value={date}
            onChange={(v) => set('effectiveDate', v)}
          />
          <p className="muted">فلاتر الدفع الشهري تتاح عند تنفيذ حساب ودفع الرواتب.</p>
        </div>
      ) : null}
      {query.size ? (
        <div className="employee-filter-chips">
          <span>
            {search || 'كل الأسماء'} ·{' '}
            {salary === 'all' ? 'كل الرواتب' : salary === 'enabled' ? 'راتب مفعل' : 'بدون راتب'} ·{' '}
            {commission === 'all'
              ? 'كل العمولات'
              : commission === 'disabled'
                ? 'بدون عمولة'
                : commission === 'fixed'
                  ? 'عمولة ثابتة'
                  : 'عمولة نسبة'}{' '}
            <bdi dir="ltr">{date}</bdi>
          </span>
          <Button variant="outline" onClick={() => setQuery({})}>
            مسح الفلاتر
          </Button>
        </div>
      ) : null}
      <EmployeeError error={list.error || catalog.error} />
      {list.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل الموظفين" />
      ) : list.data?.items.length ? (
        <>
          <ResponsiveList
            items={list.data.items}
            rowKey={(r) => r.id}
            caption="الموظفون في الفروع المسموحة"
            columns={[
              {
                label: 'الموظف',
                render: (r) => <Link to={`/employees/${r.id}`}>{r.fields.name}</Link>,
              },
              { label: 'الفرع', render: (r) => r.currentBranchName },
              {
                label: 'الراتب',
                render: (r) =>
                  r.terms.salary.enabled
                    ? displayMinor(r.terms.salary.monthly.amountMinor) + ' ج.م'
                    : 'غير مفعل',
              },
              { label: 'العمولة', render: (r) => commissionLabel(r.terms.commission) },
              { label: 'الحالة', render: (r) => (r.fields.active ? 'نشط' : 'موقوف') },
            ]}
            card={card}
          />
          <div className="commercial-toolbar">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(query);
                next.set('page', String(page - 1));
                setQuery(next);
              }}
            >
              السابق
            </Button>
            <span>
              الصفحة {page} · {list.data.total} موظف
            </span>
            <Button
              variant="outline"
              disabled={page * list.data.limit >= list.data.total}
              onClick={() => {
                const next = new URLSearchParams(query);
                next.set('page', String(page + 1));
                setQuery(next);
              }}
            >
              التالي
            </Button>
          </div>
        </>
      ) : !list.error ? (
        <StatePanel state="empty" title="لا توجد نتائج لهذه الفلاتر" />
      ) : null}
    </div>
  );
}
export function EmployeeNewPage() {
  const c = useCatalog();
  return c.data ? (
    <NewForm catalog={c.data} />
  ) : (
    <>
      <EmployeeError error={c.error} />
      {!c.error ? <StatePanel state="pending" title="جارٍ تحميل إعداد الموظف" /> : null}
    </>
  );
}
function NewForm({ catalog }: { catalog: EmployeeCatalog }) {
  const navigate = useNavigate(),
    mutation = useEmployeeMutation((r) => navigate(`/employees/${r.employeeId}?saved=1`), 'new');
  const initial = mutation.pending?.type === 'employee.create' ? mutation.pending : null;
  const [fields, setFields] = useState<EmployeeFields>(
      initial?.fields ?? {
        name: '',
        contact: '',
        active: true,
        employmentStart: catalog.today,
        employmentEnd: null,
        branchId: catalog.branches[0]?.id ?? '',
        workDays: [0, 1, 2, 3, 4],
        hoursPerDay: 8,
        weeklyDayOff: 5,
      },
    ),
    [compensation, setCompensation] = useState(() =>
      compensationInput(initial?.terms ?? employeeExamples.off),
    );
  return (
    <div className="employees-page">
      <PageHeading
        title="موظف جديد"
        eyebrow="ملف وإعداد"
        description="احفظ البيانات والشروط أولًا؛ ربط المندوب اختياري ومستقل عن الدخول."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            void mutation.submit({
              type: 'employee.create',
              fields,
              terms: parseCompensation(compensation),
            });
          } catch (err) {
            mutation.setError(err);
          }
        }}
      >
        <ProfileEditor
          value={fields}
          onChange={setFields}
          catalog={catalog}
          disabled={mutation.busy || !!mutation.pending}
        />
        <CompensationEditor
          value={compensation}
          onChange={setCompensation}
          disabled={mutation.busy || !!mutation.pending}
        />
        {!compensation.salaryEnabled && !compensation.commissionEnabled ? (
          <p className="employee-note">
            القسمان غير مفعلين: لن ينشأ راتب أو عمولة تلقائيًا حتى تفعيل الشروط.
          </p>
        ) : null}
        <EmployeeError error={mutation.error} />
        {mutation.recovery}
        <Button type="submit" disabled={mutation.busy || !!mutation.pending}>
          {mutation.busy ? 'جارٍ الحفظ…' : 'حفظ الموظف'}
        </Button>
      </form>
    </div>
  );
}
export function EmployeeDetailPage() {
  const { id } = useParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    c = useCatalog();
  const d = useQuery({
    queryKey: ['employee', company, id],
    queryFn: () => employeeApi<EmployeeDetail>(`/employees/${id}?companyId=${company}`, 'detail'),
    enabled: !!company && !!id,
    retry: false,
  });
  return d.data && c.data ? (
    <DetailForm key={id} detail={d.data} catalog={c.data} reload={() => void d.refetch()} />
  ) : (
    <>
      <EmployeeError error={d.error || c.error} />
      {!d.error && !c.error ? (
        <StatePanel state="pending" title="جارٍ تحميل الملف والشروط" />
      ) : null}
    </>
  );
}
function DetailForm({
  detail,
  catalog,
  reload,
}: {
  detail: EmployeeDetail;
  catalog: EmployeeCatalog;
  reload: () => void;
}) {
  const mutation = useEmployeeMutation(() => {
    setSaved(true);
    setPanel('none');
    reload();
  }, detail.id);
  const initial = mutation.pending;
  const initialTerms = initial?.type === 'employee.terms' ? initial.change : null;
  const [panel, setPanel] = useState<'none' | 'profile' | 'terms' | 'link' | 'deactivate'>(() =>
      initial?.type === 'employee.update'
        ? 'profile'
        : initial?.type === 'employee.terms'
          ? 'terms'
          : initial?.type === 'employee.link'
            ? 'link'
            : initial?.type === 'employee.deactivate'
              ? 'deactivate'
              : 'none',
    ),
    [saved, setSaved] = useState(new URLSearchParams(window.location.search).has('saved')),
    [version, setVersion] = useState(
      initial && 'expectedVersion' in initial ? initial.expectedVersion : detail.version,
    );
  const [profile, setProfile] = useState(
      initial?.type === 'employee.update' ? initial.fields : detail.fields,
    ),
    [branchDate, setBranchDate] = useState(
      initial?.type === 'employee.update'
        ? (initial.branchEffectiveDate ?? catalog.today)
        : catalog.today,
    ),
    [reason, setReason] = useState(
      initialTerms?.reason ?? (initial && 'reason' in initial ? initial.reason : ''),
    );
  const [comp, setComp] = useState(
      compensationInput({
        salary: initialTerms?.salary?.terms ?? detail.terms.salary,
        commission: initialTerms?.commission?.terms ?? detail.terms.commission,
      }),
    ),
    [salaryChange, setSalaryChange] = useState(initialTerms ? !!initialTerms.salary : true),
    [commissionChange, setCommissionChange] = useState(
      initialTerms ? !!initialTerms.commission : false,
    ),
    [salaryMonth, setSalaryMonth] = useState(initialTerms?.salary?.month ?? catalog.currentMonth),
    [commissionDate, setCommissionDate] = useState(
      initialTerms?.commission?.effectiveDate ?? detail.boundaries.earliestCommissionDate,
    ),
    [base, setBase] = useState('50'),
    [uplift, setUplift] = useState('5'),
    [preview, setPreview] = useState<TermsPreview | null>(null),
    [previewKey, setPreviewKey] = useState(''),
    [previewBusy, setPreviewBusy] = useState(false);
  const [driverId, setDriverId] = useState(
      initial?.type === 'employee.link' ? (initial.driverId ?? '') : '',
    ),
    [localName, setLocalName] = useState(
      initial?.type === 'employee.link' ? (initial.localDriver?.name ?? '') : '',
    ),
    [linkDate, setLinkDate] = useState(
      initial?.type === 'employee.link'
        ? initial.effectiveDate
        : detail.boundaries.earliestCommissionDate,
    ),
    [endDate, setEndDate] = useState(
      initial?.type === 'employee.link' ? (initial.endDate ?? '') : '',
    );
  const { session, registry } = useAccess(),
    company = registry?.context.companyId;
  const intentSignature = JSON.stringify({
    comp,
    salaryChange,
    commissionChange,
    salaryMonth,
    commissionDate,
    reason,
    base,
    uplift,
    version,
  });
  const termChange = (): TermChange => {
    const terms = parseCompensation(comp);
    return {
      salary: salaryChange ? { month: salaryMonth, terms: terms.salary } : null,
      commission: commissionChange
        ? { effectiveDate: commissionDate, terms: terms.commission }
        : null,
      reason,
    };
  };
  const loadVersion = async () => {
    try {
      const current = await employeeApi<EmployeeDetail>(
        `/employees/${detail.id}?companyId=${company}`,
        'detail',
      );
      setVersion(current.version);
      setPreview(null);
      reload();
      mutation.setError(null);
    } catch (e) {
      mutation.setError(e);
    }
  };
  const show = (p: typeof panel) => {
    setPanel(p);
    setVersion(detail.version);
    setReason('');
    setPreview(null);
    mutation.setError(null);
    if (p === 'terms') {
      setComp(compensationInput(detail.terms));
      setSalaryChange(true);
      setCommissionChange(false);
      setSalaryMonth(catalog.currentMonth);
      setCommissionDate(detail.boundaries.earliestCommissionDate);
    }
    if (p === 'profile') setProfile(detail.fields);
  };
  const disabled = mutation.busy || !!mutation.pending;
  return (
    <div className="employees-page">
      <div className="commercial-toolbar">
        <Link to="/employees">الموظفون</Link>
        <span>
          مرجع {detail.reference} · نسخة {detail.version} · {detail.fields.active ? 'نشط' : 'موقوف'}
        </span>
      </div>
      <PageHeading
        title={detail.fields.name}
        eyebrow={detail.currentBranchName}
        description="الشروط المحفوظة وتاريخ الملف؛ لا يتطلب حساب دخول."
      />
      {saved ? <StatePanel state="ready" title="تم حفظ الموظف وشروطه" /> : null}
      <TermsSummary terms={detail.terms} />
      <section className="employee-note">
        <h2>ربط هوية المندوب</h2>
        <p>
          {detail.association === 'none'
            ? 'لا يوجد ربط مندوب فعال. لا تنسب الزيارات تلقائيًا بالاسم أو الهاتف.'
            : detail.association === 'pending_external_mapping'
              ? 'الربط المحلي محفوظ. مطابقة هوية توصيل الخارجية معلقة حتى تنفيذ التكامل.'
              : 'يوجد ربط صريح بهوية مندوب خارجية.'}
        </p>
      </section>
      <p className="muted">
        الحساب الشهري والسلف والدفع لم تُنفذ بعد في بيئة التطوير. لا توجد أرصدة أو مدفوعات ناتجة عن
        هذا الملف.
      </p>
      {panel === 'none' ? (
        <div className="employee-actions">
          <Button variant="outline" disabled={disabled} onClick={() => show('profile')}>
            تعديل الملف
          </Button>
          {detail.fields.active ? (
            <>
              <Button variant="outline" disabled={disabled} onClick={() => show('terms')}>
                تغيير الشروط
              </Button>
              <Button variant="outline" disabled={disabled} onClick={() => show('link')}>
                ربط مندوب
              </Button>
              <Button variant="outline" disabled={disabled} onClick={() => show('deactivate')}>
                إيقاف الموظف
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      <EmployeeError error={mutation.error} />
      {mutation.error instanceof CommercialError && mutation.error.code === 'REVISION_CONFLICT' ? (
        <Button type="button" variant="outline" onClick={() => void loadVersion()}>
          تحميل النسخة الحالية للمراجعة
        </Button>
      ) : null}
      {mutation.recovery}
      {panel !== 'none' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const common = { employeeId: detail.id, expectedVersion: version };
              if (panel === 'profile')
                void mutation.submit({
                  ...common,
                  type: 'employee.update',
                  fields: profile,
                  branchEffectiveDate:
                    profile.branchId !== detail.fields.branchId ? branchDate : null,
                  reason,
                });
              else if (panel === 'terms') {
                if (!preview?.allowed || previewKey !== intentSignature) return;
                void mutation.submit({ ...common, type: 'employee.terms', change: termChange() });
              } else if (panel === 'link')
                void mutation.submit({
                  ...common,
                  type: 'employee.link',
                  effectiveDate: linkDate,
                  endDate: endDate || null,
                  driverId: driverId || null,
                  localDriver: driverId
                    ? null
                    : { name: localName, branchId: detail.fields.branchId },
                  reason,
                });
              else void mutation.submit({ ...common, type: 'employee.deactivate', reason });
            } catch (err) {
              mutation.setError(err);
            }
          }}
        >
          {panel === 'profile' ? (
            <>
              <ProfileEditor
                value={profile}
                onChange={setProfile}
                catalog={catalog}
                disabled={disabled}
              />
              {profile.branchId !== detail.fields.branchId ? (
                <TextField
                  label="تاريخ نقل الفرع"
                  type="date"
                  value={branchDate}
                  onChange={setBranchDate}
                  required
                />
              ) : null}
            </>
          ) : null}
          {panel === 'terms' ? (
            <>
              <h2>معاينة تغيير الشروط</h2>
              <label className="employee-switch">
                <input
                  type="checkbox"
                  checked={salaryChange}
                  onChange={(e) => setSalaryChange(e.target.checked)}
                  disabled={disabled}
                />
                تعديل الراتب
              </label>
              {salaryChange ? (
                <TextField
                  label="شهر الراتب"
                  type="month"
                  value={salaryMonth}
                  onChange={setSalaryMonth}
                  required
                />
              ) : null}
              <label className="employee-switch">
                <input
                  type="checkbox"
                  checked={commissionChange}
                  onChange={(e) => setCommissionChange(e.target.checked)}
                  disabled={disabled}
                />
                تعديل العمولة
              </label>
              {commissionChange ? (
                <TextField
                  label="تاريخ سريان العمولة"
                  type="date"
                  value={commissionDate}
                  onChange={setCommissionDate}
                  required
                />
              ) : null}
              <CompensationEditor
                value={comp}
                onChange={setComp}
                salary={salaryChange}
                commission={commissionChange}
                disabled={disabled}
              />
              <FormGroup title="مثال للزيارة" description="معاينة فقط؛ لا تسجل زيارة أو ربحًا.">
                <TextField label="الشحن الأساسي (ج.م)" value={base} onChange={setBase} />
                <TextField label="زيادة التغليف (ج.م)" value={uplift} onChange={setUplift} />
              </FormGroup>
              <p className="muted">
                الراتب للشهر الكامل الحالي غير المدفوع أو لشهر قادم؛ الشهور السابقة والمجمدة
                والمدفوعة محمية. العمولة تحفظ الشروط قبل تاريخ السريان.
              </p>
            </>
          ) : null}
          {panel === 'link' ? (
            <FormGroup
              title="ربط هوية مستقلة"
              description="سجل هوية محلية أو اختر معرفًا موجودًا. لا تنشئ حساب توصيل أو بيانات دخول."
            >
              <Field label="المندوب المحلي">
                <select
                  value={driverId}
                  disabled={disabled}
                  onChange={(e) => setDriverId(e.target.value)}
                >
                  <option value="">تسجيل هوية محلية جديدة (الربط الخارجي معلق)</option>
                  {catalog.drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.id.slice(0, 8)} ·{' '}
                      {d.externalMapping === 'pending' ? 'المطابقة الخارجية معلقة' : 'مطابق'}
                    </option>
                  ))}
                </select>
              </Field>
              {!driverId ? (
                <TextField
                  label="اسم مرجع المندوب المحلي"
                  value={localName}
                  onChange={setLocalName}
                  required
                />
              ) : null}
              <TextField
                label="تاريخ بداية الربط"
                type="date"
                value={linkDate}
                onChange={setLinkDate}
                required
              />
              <TextField
                label="تاريخ نهاية الربط (اختياري وغير شامل)"
                type="date"
                value={endDate}
                onChange={setEndDate}
              />
            </FormGroup>
          ) : null}
          {panel === 'deactivate' ? (
            <p className="employee-note">سيُوقف الموظف مع الاحتفاظ بكل الشروط والروابط والتاريخ.</p>
          ) : null}
          <TextField label="سبب التغيير" value={reason} onChange={setReason} required />
          {panel === 'terms' ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={disabled || previewBusy}
                onClick={() =>
                  void (async () => {
                    setPreviewBusy(true);
                    mutation.setError(null);
                    try {
                      const value = await employeeApi<TermsPreview>(
                        `/employees/${detail.id}/terms/preview`,
                        'preview',
                        {
                          companyId: company,
                          expectedVersion: version,
                          change: termChange(),
                          base: { currency: 'EGP', amountMinor: inputMinor(base) },
                          packingUplift: { currency: 'EGP', amountMinor: inputMinor(uplift) },
                        },
                        session?.csrfToken,
                      );
                      setPreview(value);
                      setPreviewKey(intentSignature);
                    } catch (e) {
                      mutation.setError(e);
                    } finally {
                      setPreviewBusy(false);
                    }
                  })()
                }
              >
                معاينة الأثر
              </Button>
              {preview && previewKey === intentSignature ? (
                <section className="employee-preview" role="status">
                  <h3>{preview.allowed ? 'يمكن حفظ هذه الشروط' : 'التعديل محمي'}</h3>
                  {preview.protectedReason ? (
                    <EmployeeError error={new Error(preview.protectedReason)} />
                  ) : null}
                  <p>
                    عمولة المثال: <AmountDisplay money={preview.commission} />
                  </p>
                  <p>
                    الراتب قبل التعديل:{' '}
                    {preview.before.salary.enabled
                      ? displayMinor(preview.before.salary.monthly.amountMinor) + ' ج.م'
                      : 'غير مفعل'}{' '}
                    · بعد التعديل:{' '}
                    {preview.after.salary.enabled
                      ? displayMinor(preview.after.salary.monthly.amountMinor) + ' ج.م'
                      : 'غير مفعل'}
                  </p>
                  <p>العمولة قبل: {commissionLabel(preview.before.commission)}</p>
                  <p>بعد: {commissionLabel(preview.after.commission)}</p>
                  <p>يبقى العمل السابق والمدفوع وتاريخ الفرع محفوظًا.</p>
                </section>
              ) : null}
            </>
          ) : null}
          <div className="employee-actions">
            <Button
              type="submit"
              disabled={
                disabled ||
                (panel === 'terms' && (!preview?.allowed || previewKey !== intentSignature))
              }
            >
              {mutation.busy ? 'جارٍ الحفظ…' : 'حفظ التغيير'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setPanel('none')}
            >
              رجوع للملف
            </Button>
          </div>
        </form>
      ) : null}
      <section className="employee-history">
        <h2>تاريخ الشروط الفعالة</h2>
        {detail.policies.map((p) => (
          <article key={p.id}>
            <strong>
              {p.axis === 'salary' ? 'راتب' : 'عمولة'} · <bdi dir="ltr">{p.from}</bdi> ←{' '}
              {p.to ? <bdi dir="ltr">{p.to}</bdi> : 'مستمر'}{' '}
              {p.superseded ? '· نسخة مصححة محفوظة' : ''}
            </strong>
            <p>
              {p.axis === 'salary'
                ? (p.terms as SalaryTerms).enabled
                  ? displayMinor(
                      (p.terms as { monthly: { amountMinor: string } }).monthly.amountMinor,
                    ) + ' ج.م شهريًا'
                  : 'غير مفعل'
                : commissionLabel(p.terms as CommissionTerms)}
            </p>
            <p className="muted">
              {p.reason === 'Initial employee setup' ? 'إعداد الموظف لأول مرة' : p.reason}
            </p>
          </article>
        ))}
      </section>
      <details className="employee-history">
        <summary>تاريخ الملف والفرع والربط</summary>
        {detail.revisions.map((r) => (
          <article key={r.version}>
            <strong>
              نسخة {r.version} · {r.fields.name}
            </strong>
            <p>
              {r.reason === 'Initial employee setup' ? 'إعداد الموظف لأول مرة' : r.reason} ·{' '}
              {r.actor}
            </p>
            <time>
              {new Intl.DateTimeFormat('ar-EG', {
                timeZone: 'Africa/Cairo',
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(r.at))}
            </time>
          </article>
        ))}
        {detail.branches.map((b) => (
          <p key={b.id}>
            {b.branchName} · <bdi dir="ltr">{b.from}</bdi> ←{' '}
            {b.to ? <bdi dir="ltr">{b.to}</bdi> : 'مستمر'}
          </p>
        ))}
        {detail.links.map((l) => (
          <p key={l.id}>
            {l.driverName} · هوية <bdi dir="ltr">{l.driverId.slice(0, 8)}</bdi> ·{' '}
            <bdi dir="ltr">{l.from}</bdi> ← {l.to ? <bdi dir="ltr">{l.to}</bdi> : 'مستمر'} ·{' '}
            {l.externalMapping === 'pending' ? 'المطابقة الخارجية معلقة' : 'مطابق'}
          </p>
        ))}
      </details>
    </div>
  );
}
export const employeeDefaultDate = todayLocal;
