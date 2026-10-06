import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, PageHeading, FormGroup } from '@shahn/ui';
import type {
  IncidentCandidate,
  IncidentCatalog,
  IncidentConfirmation,
  IncidentDetail,
  IncidentPreview,
  IncidentReport,
} from '@shahn/contracts';
import { normalizeShipmentDigits } from '@shahn/domain';
import { useAccess } from '../access/access.js';
import { Field, displayMinor, inputMinor } from '../brands/api.js';
import { incidentApi, IncidentError, incidentMessage, useIncidentMutation } from './api.js';
import './incidents.css';
const states = {
  reported: 'بلاغ بانتظار المراجعة',
  confirmed: 'تعويض مؤكد',
  dismissed: 'بلاغ مرفوض بسبب مسجل',
};
const dispositions = {
  not_confirmed: 'لم يُؤكد التصرف في العهدة',
  native_recorded: 'سُجلت حالة البضاعة المتأثرة',
  awaiting_request: 'بانتظار طلب تصرف مسموح في عهدة المندوب',
  awaiting_dependency: 'التصرف في العهدة ينتظر إتاحة العملية المسموحة من نظام التوصيل',
  pending: 'التصرف في عهدة المندوب قيد التحقق',
  accepted: 'قُبل التصرف في الكمية المحددة',
  review: 'التصرف يحتاج مراجعة',
};
function useCatalog() {
  const access = useAccess(),
    company = access.registry?.context.companyId;
  return {
    ...useQuery({
      queryKey: ['incident-catalog', company, access.registry?.context.authorizationRevision],
      queryFn: () => incidentApi<IncidentCatalog>('/catalog?companyId=' + company, 'catalog'),
      enabled: !!company,
    }),
    access,
    company,
  };
}
export function IncidentListPage() {
  const catalog = useCatalog(),
    [params, setParams] = useSearchParams();
  const query = useQuery({
    queryKey: [
      'incidents',
      catalog.company,
      params.toString(),
      catalog.access.registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      incidentApi<{ items: IncidentDetail[]; total: number }>(
        '?' + new URLSearchParams({ companyId: catalog.company!, ...Object.fromEntries(params) }),
        'list',
      ),
    enabled: !!catalog.company,
  });
  const filter = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete('page');
    setParams(p);
  };
  return (
    <>
      <PageHeading
        eyebrow="العهدة والتعويض"
        title="التلف والفقد"
        description="سجّل الوقائع، ثم راجع قيمة البضاعة والمسؤولية قبل تأكيد أي تعويض."
      />
      <Link className="button" to="/incidents/new">
        تسجيل بلاغ
      </Link>
      <section className="incident-filters">
        <Field label="الحالة">
          <select
            value={params.get('state') ?? ''}
            onChange={(e) => filter('state', e.target.value)}
          >
            <option value="">كل الحالات</option>
            {Object.entries(states).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
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
        <details>
          <summary>فلاتر إضافية</summary>
          <div className="incident-filters">
            <Field label="البراند">
              <select
                value={params.get('brandId') ?? ''}
                onChange={(e) => filter('brandId', e.target.value)}
              >
                <option value="">كل البراندات</option>
                {catalog.data?.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="نوع الواقعة">
              <select
                value={params.get('kind') ?? ''}
                onChange={(e) => filter('kind', e.target.value)}
              >
                <option value="">الكل</option>
                <option value="loss">فقد</option>
                <option value="damage">تلف</option>
              </select>
            </Field>
            <Field label="الموظف">
              <select
                value={params.get('employeeId') ?? ''}
                onChange={(e) => filter('employeeId', e.target.value)}
              >
                <option value="">الكل</option>
                {catalog.data?.employees.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="أساس التاريخ">
              <select
                value={params.get('dateBasis') ?? 'observed'}
                onChange={(e) => filter('dateBasis', e.target.value)}
              >
                <option value="observed">الملاحظة الفعلية</option>
                <option value="confirmed">تأكيد التعويض</option>
              </select>
            </Field>
            {['from', 'to'].map((k) => (
              <Field key={k} label={k === 'from' ? 'من تاريخ' : 'إلى تاريخ'}>
                <Input
                  type="date"
                  value={params.get(k) ?? ''}
                  onChange={(e) => filter(k, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </details>
        <Button variant="outline" onClick={() => setParams({})}>
          مسح الفلاتر
        </Button>
      </section>
      <IncidentError error={query.error ?? catalog.error} />
      {query.isLoading && <p role="status">جارٍ التحميل…</p>}
      {query.data?.items.length === 0 && <p>لا توجد بلاغات تطابق الفلاتر الحالية.</p>}
      <div className="incident-cards">
        {query.data?.items.map((i) => (
          <Link key={i.id} to={'/incidents/' + i.id} className="incident-card">
            <strong>
              بلاغ <bdi>{i.reference}</bdi> · {i.brandName}
            </strong>
            <span>
              {states[i.state]} · {i.branchName}
            </span>
            <span>
              {i.report.kind === 'loss' ? 'فقد' : 'تلف'} ·{' '}
              {new Date(i.report.observedAt).toLocaleDateString('ar-EG')}
            </span>
            {i.confirmation && (
              <span>تعويض {displayMinor(i.confirmation.compensationMinor)} ج.م</span>
            )}
          </Link>
        ))}
      </div>
      {query.data && query.data.total > 25 && (
        <nav className="incident-filters">
          <Button
            disabled={Number(params.get('page') ?? 1) <= 1}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set('page', String(Number(p.get('page') ?? 1) - 1));
              setParams(p);
            }}
          >
            السابق
          </Button>
          <Button
            disabled={Number(params.get('page') ?? 1) * 25 >= query.data.total}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set('page', String(Number(p.get('page') ?? 1) + 1));
              setParams(p);
            }}
          >
            التالي
          </Button>
        </nav>
      )}
    </>
  );
}
export function IncidentReportPage() {
  const catalog = useCatalog(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    mutation = useIncidentMutation('report', (r) => navigate('/incidents/' + r.incidentId));
  const [brand, setBrand] = useState(params.get('brandId') ?? ''),
    [kind, setKind] = useState<'loss' | 'damage'>('damage'),
    [cause, setCause] = useState(''),
    [comment, setComment] = useState(''),
    [evidence, setEvidence] = useState(''),
    [observed, setObserved] = useState(() => new Date().toISOString().slice(0, 16)),
    [selected, setSelected] = useState<Record<string, string>>({}),
    [error, setError] = useState<unknown>(null);
  const candidates = useQuery({
    queryKey: ['incident-candidates', catalog.company, brand, params.get('shipmentId')],
    queryFn: () =>
      incidentApi<{ items: IncidentCandidate[] }>(
        '/candidates?' +
          new URLSearchParams({
            companyId: catalog.company!,
            brandId: brand,
            ...(params.get('shipmentId') ? { shipmentId: params.get('shipmentId')! } : {}),
          }),
        'candidates',
      ),
    enabled: !!catalog.company && !!brand,
  });
  const submit = () => {
    try {
      const items = (candidates.data?.items ?? [])
        .filter((v) => selected[v.key] && Number(normalizeShipmentDigits(selected[v.key]!)) > 0)
        .map((v) => {
          const quantity = Number(normalizeShipmentDigits(selected[v.key]!));
          let offset = 0;
          for (const a of v.claimed) {
            if (offset + quantity <= a.offset) break;
            offset = Math.max(offset, a.offset + a.quantity);
          }
          return { kind: v.kind, sourceId: v.sourceId, lineId: v.lineId, offset, quantity };
        });
      const report: IncidentReport = {
        brandId: brand,
        kind,
        cause,
        comment,
        evidence: evidence.trim() ? [evidence] : [],
        observedAt: new Date(observed + 'Z').toISOString(),
        items,
      };
      if (!items.length) throw Error('EMPTY');
      void mutation.submit({ type: 'incident.report', report });
    } catch (e) {
      setError(e);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="بلاغ جديد"
        title="تسجيل تلف أو فقد"
        description="التسجيل يحفظ الوقائع ويمنع استخدام البضاعة المتأثرة. لا يضيف تعويضًا أو خصمًا أو حركة نقدية."
      />
      <Link to="/incidents">العودة للبلاغات</Link>
      <IncidentError error={error ?? mutation.error ?? candidates.error ?? catalog.error} />
      {mutation.recovery}
      <form
        className="incident-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset disabled={mutation.busy || !!mutation.pending}>
          <FormGroup title="الواقعة" description="اختر البراند والكمية المتأثرة من العهدة المسجلة.">
            <Field label="البراند">
              <select
                required
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setSelected({});
                }}
              >
                <option value="">اختر البراند</option>
                {catalog.data?.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="نوع الواقعة">
              <select value={kind} onChange={(e) => setKind(e.target.value as 'loss' | 'damage')}>
                <option value="damage">تلف</option>
                <option value="loss">فقد</option>
              </select>
            </Field>
            <Field label="وقت الملاحظة الفعلي (UTC)">
              <Input
                required
                type="datetime-local"
                value={observed}
                onChange={(e) => setObserved(e.target.value)}
              />
            </Field>
            <Field label="الحالة والسبب">
              <textarea
                required
                maxLength={2000}
                value={cause}
                onChange={(e) => setCause(e.target.value)}
              />
            </Field>
          </FormGroup>
          <FormGroup
            title="البضاعة المتأثرة"
            description="أدخل الكمية المتأثرة فقط. الكميات المحجوزة لبلاغ سابق لا يمكن المطالبة بها مجددًا."
          >
            {candidates.isLoading && <p role="status">جارٍ قراءة العهدة…</p>}
            {candidates.data?.items.length === 0 && <p>لا توجد عهدة متاحة لهذا الاختيار.</p>}
            {candidates.data?.items.map((v) => (
              <div className="incident-card" key={v.key}>
                <strong>{v.label}</strong>
                <span>
                  {v.holder === 'driver' ? 'بعهدة المندوب' : 'بعهدة الفرع'} ·{' '}
                  {catalog.data?.branches.find((b) => b.id === v.branchId)?.name}
                </span>
                <span>
                  إجمالي {v.capacity} · مطالب به {v.claimed.reduce((n, a) => n + a.quantity, 0)}
                </span>
                <Field label={'الكمية المتأثرة · ' + v.label}>
                  <Input
                    inputMode="numeric"
                    value={selected[v.key] ?? ''}
                    onChange={(e) => setSelected({ ...selected, [v.key]: e.target.value })}
                  />
                </Field>
              </div>
            ))}
          </FormGroup>
          <FormGroup
            title="الملاحظات والأدلة"
            description="وصف الفحص أو مرجع الدليل، دون استنتاج مسؤولية مالية."
          >
            <Field label="الدليل أو مرجعه">
              <textarea
                maxLength={2000}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </Field>
            <Field label="ملاحظات">
              <textarea
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
          </FormGroup>
          <Button
            disabled={
              !brand ||
              !cause.trim() ||
              !Object.values(selected).some((x) => Number(normalizeShipmentDigits(x)) > 0)
            }
          >
            تسجيل البلاغ دون تعويض
          </Button>
        </fieldset>
      </form>
    </>
  );
}
export function IncidentConfirmationForm({
  detail,
  catalog,
  onSaved,
}: {
  detail: IncidentDetail;
  catalog: IncidentCatalog;
  onSaved: () => void;
}) {
  const access = useAccess(),
    mutation = useIncidentMutation('confirmation:' + detail.id, onSaved);
  const [goods, setGoods] = useState(''),
    [amount, setAmount] = useState(''),
    [companyShare, setCompanyShare] = useState(''),
    [employeeShare, setEmployeeShare] = useState('0'),
    [employee, setEmployee] = useState(''),
    [month, setMonth] = useState(catalog.currentMonth),
    [branch, setBranch] = useState(detail.responsibleBranchId),
    [branchReason, setBranchReason] = useState(''),
    [reason, setReason] = useState(''),
    [preview, setPreview] = useState<IncidentPreview | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const confirmation = (): IncidentConfirmation => ({
    expectedVersion: detail.version,
    goodsValueMinor: inputMinor(goods),
    compensationMinor: inputMinor(amount),
    companyShareMinor: inputMinor(companyShare),
    employeeShareMinor: inputMinor(employeeShare),
    responsibleBranchId: branch,
    branchReason,
    employeeId: inputMinor(employeeShare) === '0' ? null : employee,
    payrollMonth: inputMinor(employeeShare) === '0' ? null : month,
    agreementReason: reason,
  });
  let shareProblem = false;
  try {
    shareProblem =
      BigInt(inputMinor(companyShare)) + BigInt(inputMinor(employeeShare)) !==
      BigInt(inputMinor(amount));
  } catch {
    shareProblem = true;
  }
  const review = async () => {
    setBusy(true);
    setError(null);
    try {
      setPreview(
        await incidentApi<IncidentPreview>(
          '/' + detail.id + '/confirmation-preview',
          'preview',
          { companyId: access.registry!.context.companyId, confirmation: confirmation() },
          access.session?.csrfToken,
        ),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const money = (label: string, value: string, set: (v: string) => void) => (
    <Field label={label}>
      <Input
        required
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setPreview(null);
        }}
      />
    </Field>
  );
  return (
    <section>
      <h2>مراجعة المسؤولية والتعويض</h2>
      <p>
        أدخل قيمة القطع المتأثرة والاتفاق. لا تشمل التعويضات الشحن، ولا تعتمد القيمة على المبلغ
        المتبقي على المستلم.
      </p>
      <IncidentError error={error ?? mutation.error} />
      {mutation.recovery}
      <form
        className="incident-form"
        onSubmit={(e) => {
          e.preventDefault();
          void review();
        }}
        onChange={() => setPreview(null)}
      >
        <fieldset disabled={busy || mutation.busy || !!mutation.pending}>
          {money('قيمة البضاعة المتأثرة (ج.م)', goods, setGoods)}
          {money('التعويض المتفق عليه (ج.م)', amount, setAmount)}
          {money('حصة الشركة (ج.م)', companyShare, setCompanyShare)}
          {money('حصة الموظف (ج.م)', employeeShare, setEmployeeShare)}
          {shareProblem && <p role="status">يجب أن يساوي مجموع الحصتين مبلغ التعويض.</p>}
          {employeeShare !== '0' && (
            <>
              <Field label="الموظف المسؤول">
                <select required value={employee} onChange={(e) => setEmployee(e.target.value)}>
                  <option value="">اختر الموظف المرتبط بصاحب العهدة</option>
                  {catalog.employees.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="فترة الالتزام">
                <Input
                  required
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="فرع المسؤولية">
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              {catalog.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          {branch !== detail.custodyBranchId && (
            <Field label="سبب تصحيح فرع المسؤولية">
              <textarea
                required
                maxLength={2000}
                value={branchReason}
                onChange={(e) => setBranchReason(e.target.value)}
              />
            </Field>
          )}
          <Field label="أساس القيمة واتفاق المسؤولية">
            <textarea
              required
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Button disabled={shareProblem}>معاينة آثار التأكيد</Button>
        </fieldset>
      </form>
      {preview && (
        <section className="incident-review" aria-label="آثار تأكيد التعويض">
          <h3>سيُسجل عند التأكيد</h3>
          <dl>
            <dt>رصيد مؤهل للبراند</dt>
            <dd>{displayMinor(preview.walletCreditMinor)} ج.م</dd>
            <dt>التزام الموظف</dt>
            <dd>{displayMinor(preview.employeeObligationMinor)} ج.م</dd>
            <dt>تكلفة التعويض / حصة الموظف في النتيجة</dt>
            <dd>
              {displayMinor(preview.compensationCostMinor)} /{' '}
              {displayMinor(preview.employeeCompensationShareMinor)} ج.م
            </dd>
            <dt>الفرع المسؤول</dt>
            <dd>
              {
                catalog.branches.find((b) => b.id === preview.confirmation.responsibleBranchId)
                  ?.name
              }
            </dd>
            <dt>حركة الحسابات النقدية</dt>
            <dd>0 ج.م</dd>
          </dl>
          <p>
            رصيد البراند مؤهل الآن، مستقل عن تحصيل الالتزام من الموظف. معالجة العهدة قد تبقى قيد
            التحقق.
          </p>
          {preview.blockers.map((b) => (
            <p role="alert" key={b}>
              {incidentMessage(b)}
            </p>
          ))}
          {preview.allowedPayrollMonth && preview.blockers.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setMonth(preview.allowedPayrollMonth!);
                setPreview(null);
              }}
            >
              استخدام الفترة المسموحة {preview.allowedPayrollMonth}
            </Button>
          )}
          <Button
            disabled={preview.blockers.length > 0 || mutation.busy || !!mutation.pending}
            onClick={() =>
              void mutation.submit({
                type: 'incident.confirm',
                incidentId: detail.id,
                confirmation: preview.confirmation,
              })
            }
          >
            تأكيد التعويض والمسؤولية
          </Button>
        </section>
      )}
    </section>
  );
}
export function IncidentDetailPage() {
  const { id } = useParams(),
    catalog = useCatalog(),
    query = useQuery({
      queryKey: [
        'incident',
        catalog.company,
        id,
        catalog.access.registry?.context.authorizationRevision,
      ],
      queryFn: () =>
        incidentApi<IncidentDetail>('/' + id + '?companyId=' + catalog.company, 'detail'),
      enabled: !!catalog.company && !!id,
    });
  const [reason, setReason] = useState(''),
    mutation = useIncidentMutation('resolution:' + id, () => void query.refetch()),
    d = query.data;
  useEffect(() => {
    if (d) document.querySelector<HTMLHeadingElement>('h1')?.focus();
  }, [d?.id]);
  return (
    <>
      <PageHeading
        eyebrow="مراجعة البلاغ"
        title={d ? 'بلاغ ' + d.reference : 'تفاصيل البلاغ'}
        description={d ? states[d.state] : 'جارٍ تحميل الوقائع…'}
      />
      <Link to="/incidents">كل البلاغات</Link>
      <IncidentError error={query.error ?? catalog.error ?? mutation.error} />
      {mutation.recovery}
      {d && (
        <>
          <section className="incident-card">
            <strong>
              {d.brandName} · {d.branchName}
            </strong>
            <span>الحيازة: {d.holder === 'driver' ? 'المندوب' : 'الفرع'}</span>
            <span>
              وقت الملاحظة: <bdi>{new Date(d.report.observedAt).toLocaleString('ar-EG')}</bdi>
            </span>
            <p>{d.report.cause}</p>
            <p>{d.report.comment}</p>
            {d.report.evidence.map((e, n) => (
              <p key={n}>{e}</p>
            ))}
            <ul>
              {d.items.map((i, n) => (
                <li key={n}>
                  {i.snapshot.label} · المتأثر {i.quantity} قطعة{' '}
                  {i.snapshot.shipmentId && (
                    <Link to={'/tracking/' + i.snapshot.shipmentId}>تتبع الشحنة الأصلية</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="incident-card" role="status">
            <strong>التصرف في البضاعة</strong>
            <p>{dispositions[d.disposition.state]}</p>
            <p>تأكيد التعويض لا يعني استلام مرتجع أو إضافة مخزون صالح.</p>
            {d.confirmation &&
              ['awaiting_request', 'awaiting_dependency'].includes(d.disposition.state) && (
                <Button
                  disabled={mutation.busy || !!mutation.pending}
                  onClick={() =>
                    void mutation.submit({
                      type: 'incident.disposition',
                      incidentId: d.id,
                      expectedVersion: d.version,
                      reason: 'متابعة التصرف المعتمد بعد توفر الطلب أو صلاحية التكامل',
                    })
                  }
                >
                  متابعة التصرف في البضاعة
                </Button>
              )}
            {d.disposition.actionIds.map((a) => (
              <Link key={a} to={'/integration/commands/' + a}>
                حالة طلب التصرف
              </Link>
            ))}
          </section>
          {d.state === 'reported' && catalog.data && (
            <IncidentConfirmationForm
              key={d.id + ':' + d.version}
              detail={d}
              catalog={catalog.data}
              onSaved={() => void query.refetch()}
            />
          )}{' '}
          {d.confirmation && (
            <section className="incident-card">
              <h2>الآثار المؤكدة</h2>
              <p>
                تعويض {displayMinor(d.confirmation.compensationMinor)} ج.م · حصة الشركة{' '}
                {displayMinor(d.confirmation.companyShareMinor)} · حصة الموظف{' '}
                {displayMinor(d.confirmation.employeeShareMinor)}
              </p>
              <p>
                فرع المسؤولية {d.branchName} · تأكيد {d.confirmation.actorName}
              </p>
              <p>التاريخ الأصلي محفوظ، وأي تصحيح يحتاج أثرًا مرتبطًا في التسويات.</p>
              <Link to={'/brand-payouts/brands/' + d.brandId}>رصيد البراند والتعويض المؤهل</Link>
              {d.confirmation.employeeId && (
                <Link to={'/employees/' + d.confirmation.employeeId}>
                  الموظف · التزام {displayMinor(d.recovery.amountMinor)} ج.م في{' '}
                  {d.confirmation.payrollMonth}
                </Link>
              )}
              <details>
                <summary>مصادر الآثار المحفوظة</summary>
                {d.confirmation.effects.map((e) => (
                  <p key={e.id}>
                    {e.family} · {e.kind} · {displayMinor(e.amountMinor)} ج.م <bdi>{e.id}</bdi>
                  </p>
                ))}
              </details>
              {d.payouts.map((p) => (
                <Link key={p.id} to={'/brand-payouts/payouts/' + p.id}>
                  تحصيل مرتبط {p.reference} · {displayMinor(p.amountMinor)} ج.م
                </Link>
              ))}
              <Link
                className="button"
                to={'/shipments/new?incidentId=' + d.id + '&brandId=' + d.brandId}
              >
                تسجيل شحنة بديلة جديدة
              </Link>
              <Link to={'/preparation/orders/new?incidentId=' + d.id + '&brandId=' + d.brandId}>
                بديل من المخزون المتاح
              </Link>
            </section>
          )}
          {d.replacements.map((r) => (
            <Link className="incident-card" key={r.id} to={'/shipments/' + r.reference}>
              الشحنة البديلة {r.reference} · الشحن{' '}
              {r.payer === 'company'
                ? 'تتحمله الشركة'
                : r.payer === 'brand'
                  ? 'يموله البراند'
                  : 'على المستلم'}
            </Link>
          ))}
          {d.review ? (
            <section className="incident-card">
              <h2>مراجعة تصحيح مرتبطة</h2>
              <p>{d.review.reason}</p>
              <p>
                رصيد معلق {displayMinor(d.review.holdMinor)} ج.م. الأصل والتحصيلات محفوظة؛ استكمال
                التصحيح عبر خدمة التسويات عند إتاحتها.
              </p>
            </section>
          ) : (
            d.state !== 'dismissed' && (
              <form
                className="incident-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutation.submit({
                    type: d.state === 'reported' ? 'incident.dismiss' : 'incident.review',
                    incidentId: d.id,
                    expectedVersion: d.version,
                    reason,
                  });
                }}
              >
                <Field label={d.state === 'reported' ? 'سبب رفض البلاغ' : 'سبب طلب مراجعة التصحيح'}>
                  <textarea
                    required
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
                <Button
                  variant="outline"
                  disabled={mutation.busy || !!mutation.pending || !reason.trim()}
                >
                  {d.state === 'reported' ? 'رفض البلاغ دون حركة مالية' : 'فتح مراجعة وحفظ الأصل'}
                </Button>
              </form>
            )
          )}
          {d.dismissalReason && (
            <p>
              سبب الرفض: {d.dismissalReason}. سلامة المخزون تحتاج فحصًا مستقلًا قبل إعادة استخدامه.
            </p>
          )}
        </>
      )}
    </>
  );
}
