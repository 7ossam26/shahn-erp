import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading, Button, FormGroup, StatePanel } from '@shahn/ui';
import type {
  FinanceCatalog,
  RemittanceCommand,
  RemittanceDetail,
  RemittanceResult,
  RemittanceWitness,
  PaymentMethod,
} from '@shahn/contracts';
import { useAccess } from '../../access/access.js';
import { Field, displayMinor, inputMinor } from '../../brands/api.js';
import '../finance.css';
import './remittances.css';
const base = '/api/v1/finance/remittances';
async function request<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  let r: Response;
  try {
    r = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw Error(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST');
  }
  const result = await r.json();
  if (!r.ok)
    throw Error(r.status >= 500 && body ? 'RESULT_UNKNOWN' : (result.code ?? 'REQUEST_FAILED'));
  return result as T;
}
const messages: Record<string, string> = {
  REMITTANCE_WITNESS_CHANGED:
    'تغيّرت أدلة الجولة. المبالغ التي أدخلتها محفوظة؛ حدّث الأدلة وراجعها قبل التأكيد.',
  ROUND_BASIS_CHANGED_OR_INCOMPLETE: 'الأدلة تغيّرت أو بها فجوة. يلزم تحديث ومراجعة جديدة.',
  EXACT_REMITTANCE_REQUIRED:
    'يجب أن يساوي المستلم كامل مبلغ أموال المستلمين المبلّغ. لم تتحرك أموال أو مستحقات.',
  ROUND_ALREADY_REMITTED: 'سُجلت هذه الجولة بالفعل. افتح سجل الاستلام.',
  RESULT_UNKNOWN: 'لم تصل نتيجة الطلب. تحقّق بنفس هوية الطلب قبل أي تسجيل جديد.',
  SOURCE_AUTHORIZATION_REQUIRED:
    'اتصال توصيل المصرح به غير متاح. لا يمكن تأكيد الاستلام حتى تحديث الأدلة.',
  SOURCE_NOT_READY: 'مصدر توصيل غير جاهز لتحديث الأدلة.',
  CONNECTION_LOST: 'تعذر الاتصال. البيانات الظاهرة قديمة؛ حاول تحديثها.',
  FORBIDDEN_SCOPE: 'هذا الإجراء خارج صلاحياتك أو فروعك الحالية.',
  NOT_FOUND: 'السجل غير متاح ضمن صلاحياتك.',
  METHOD_ACCOUNT_MISMATCH: 'اختر حسابًا نقديًا للنقد، وحسابًا بنكيًا للإيداع أو إنستا باي.',
  ACCOUNT_INACTIVE: 'الحساب موقوف. اختر حسابًا نشطًا.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح لفرع الاستلام.',
  FUTURE_PAYMENT_DATE: 'اختر تاريخ الاستلام الفعلي اليوم أو قبله.',
  VALIDATION_FAILED: 'راجع المبلغ والتاريخ والحقول المطلوبة.',
};
const blockers: Record<string, string> = {
  TRIP_EVIDENCE_UNAVAILABLE: 'تعذر تحديث أدلة الجولة',
  WORKDAY_EVIDENCE_UNAVAILABLE: 'تعذر تحديث سجل يوم العمل',
  TASK_HISTORY_INCOMPLETE: 'سجل إحدى الشحنات غير مكتمل',
  ACCEPTED_CLOSURE_REQUIRED: 'لم يصل انتهاء الجولة المعتمد',
  KNOWN_STREAM_GAP: 'توجد رسائل أو حقائق سابقة لم تُطبق',
  HISTORY_PROJECTION_DIFFERENCE: 'سجل توصيل لا يطابق النتائج المطبقة',
  WORKDAY_HISTORY_DIFFERENCE: 'سجل يوم العمل لا يطابق النتائج المطبقة',
  TRIP_OUTCOME_DIFFERENCE: 'نتائج الجولة لا تطابق سجل الشحنات',
  SETTLEMENT_REVIEW_REQUIRED: 'توجد مراجعة تسوية لهذه الجولة',
  ROUND_END_EVIDENCE_CONFLICT: 'أدلة انتهاء الجولة أو هوية المندوب غير متطابقة',
  VISIT_EVIDENCE_REQUIRED: 'أدلة الزيارة غير مكتملة',
  GOODS_CREDIT_BASIS_REQUIRED: 'ربط مستحقات البضاعة غير مكتمل',
  PAYMENT_COMPONENT_CONFLICT: 'تفصيل المبلغ المبلّغ غير متطابق',
};
const methods: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bank_deposit: 'إيداع بنكي',
  instapay: 'إنستا باي',
};
function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="commercial-error">
      {messages[error] ?? 'تعذر إكمال الطلب. راجع البيانات والاتصال.'}
    </p>
  ) : null;
}
function useCatalog() {
  const { registry } = useAccess();
  return useQuery({
    queryKey: [
      'remittance-catalog',
      registry?.context.companyId,
      registry?.context.authorizationRevision,
    ],
    enabled: !!registry,
    retry: false,
    queryFn: () => request<FinanceCatalog>('/catalog?companyId=' + registry!.context.companyId),
  });
}
type Round = {
  roundId: string;
  driverId: string;
  driverName: string;
  startedAt: string;
  endedAt: string | null;
  remittanceId: string | null;
  reference: string | null;
  state: string | null;
  receivedMinor: string | null;
};
export function RemittanceListPage() {
  const { registry } = useAccess(),
    [params, setParams] = useSearchParams(),
    catalog = useCatalog();
  const query = useQuery({
    queryKey: [
      'remittance-rounds',
      registry?.context.companyId,
      registry?.context.authorizationRevision,
      params.toString(),
    ],
    enabled: !!registry,
    retry: false,
    queryFn: () =>
      request<{ items: Round[]; page: number; limit: number }>(
        '/rounds?companyId=' + registry!.context.companyId + '&' + params.toString(),
      ),
  });
  const change = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page');
    setParams(next);
  };
  return (
    <main className="remittance-page">
      <PageHeading
        eyebrow="المالية"
        title="استلام أموال المندوبين"
        description="راجع أموال المستلمين المبلّغ عنها بعد انتهاء الجولة، ثم سجل كامل الاستلام الفعلي."
      />
      <Link to="/">الرئيسية</Link>
      <FormGroup title="الجولات" description="اختر فرع استلام الأموال ثم الجولة التي ستراجعها.">
        <div className="remittance-fields">
          <Field label="فرع الاستلام">
            <select
              value={params.get('branchId') ?? ''}
              onChange={(e) => change('branchId', e.target.value)}
            >
              <option value="">اختر الفرع</option>
              {catalog.data?.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الحالة">
            <select
              value={params.get('state') ?? 'all'}
              onChange={(e) => change('state', e.target.value)}
            >
              <option value="all">كل الجولات</option>
              <option value="unremitted">لم يُسجل الاستلام</option>
              <option value="received">تم الاستلام</option>
              <option value="checked">تم التحقق دون أموال</option>
            </select>
          </Field>
        </div>
        <details>
          <summary>فلاتر متقدمة — تاريخ انتهاء الجولة</summary>
          <div className="remittance-fields">
            {[
              ['driverId', 'هوية المندوب'],
              ['roundId', 'هوية الجولة'],
              ['from', 'انتهاء الجولة من'],
              ['to', 'انتهاء الجولة إلى'],
            ].map(([key, label]) => (
              <Field key={key} label={label!}>
                <input
                  type={key === 'from' || key === 'to' ? 'date' : 'text'}
                  value={params.get(key!) ?? ''}
                  onChange={(e) => change(key!, e.target.value)}
                />
              </Field>
            ))}
          </div>
          <Button variant="outline" onClick={() => setParams({})}>
            مسح الفلاتر
          </Button>
        </details>
      </FormGroup>
      {query.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل الجولات" />
      ) : query.isError ? (
        <ErrorMessage error={query.error.message} />
      ) : query.data.items.length ? (
        query.data.items.map((r) => (
          <article className="remittance-card" key={r.roundId}>
            <strong>{r.driverName}</strong>
            <small>الجولة {r.roundId}</small>
            <p>
              {r.endedAt
                ? 'انتهت الجولة ' + new Date(r.endedAt).toLocaleString('ar-EG')
                : 'لم يصل انتهاء الجولة'}
            </p>
            <p>
              {r.state === 'checked'
                ? 'تم التحقق دون حركة أموال'
                : r.receivedMinor
                  ? 'استلمت الشركة ' + displayMinor(r.receivedMinor) + ' ج.م'
                  : 'لم يُسجل استلام الشركة'}
            </p>
            {r.remittanceId ? (
              <Link
                to={
                  '/remittances/' +
                  r.remittanceId +
                  '?back=' +
                  encodeURIComponent(params.toString())
                }
              >
                فتح سجل {r.reference}
              </Link>
            ) : params.get('branchId') ? (
              <Link
                to={
                  '/remittances/review?roundId=' +
                  r.roundId +
                  '&driverId=' +
                  r.driverId +
                  '&branchId=' +
                  params.get('branchId') +
                  '&back=' +
                  encodeURIComponent(params.toString())
                }
              >
                مراجعة أدلة الجولة
              </Link>
            ) : (
              <p>اختر فرع الاستلام لفتح المراجعة.</p>
            )}
          </article>
        ))
      ) : (
        <StatePanel state="empty" title="لا توجد جولات تطابق الفلاتر" />
      )}
      <div className="remittance-fields">
        <Button
          variant="outline"
          disabled={Number(params.get('page') ?? 1) <= 1}
          onClick={() => {
            const n = new URLSearchParams(params);
            n.set('page', String(Number(n.get('page') ?? 1) - 1));
            setParams(n);
          }}
        >
          السابق
        </Button>
        <Button
          variant="outline"
          disabled={(query.data?.items.length ?? 0) < 25}
          onClick={() => {
            const n = new URLSearchParams(params);
            n.set('page', String(Number(n.get('page') ?? 1) + 1));
            setParams(n);
          }}
        >
          التالي
        </Button>
      </div>
    </main>
  );
}
export function RemittanceReviewPage() {
  const { registry, session } = useAccess(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    catalog = useCatalog();
  const [witness, setWitness] = useState<RemittanceWitness | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [date, setDate] = useState(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date()),
    );
  const [components, setComponents] = useState([
    { method: 'cash' as PaymentMethod, accountId: '', amount: '', reference: '' },
  ]);
  const key = registry
    ? 'remittance-pending:' + registry.context.companyId + ':' + registry.context.principalId
    : null;
  const [pending, setPending] = useState<RemittanceCommand | null>(null);
  useEffect(() => {
    if (key) {
      try {
        setPending(JSON.parse(localStorage.getItem(key) ?? 'null') as RemittanceCommand | null);
      } catch {
        setError('RESULT_UNKNOWN');
      }
    }
  }, [key]);
  const scope = {
    companyId: registry?.context.companyId ?? '',
    roundId: params.get('roundId') ?? '',
    driverId: params.get('driverId') ?? '',
    branchId: params.get('branchId') ?? '',
  };
  async function refresh() {
    setBusy(true);
    setError('');
    setReviewed(false);
    try {
      setWitness(await request<RemittanceWitness>('/review', scope, session?.csrfToken));
    } catch (e) {
      setError((e as Error).message);
      setWitness(null);
    } finally {
      setBusy(false);
    }
  }
  let sum = 0n,
    valid = true;
  try {
    for (const c of components) if (c.amount) sum += BigInt(inputMinor(c.amount));
  } catch {
    valid = false;
  }
  const remaining = BigInt(witness?.expectedMinor ?? '0') - sum;
  function clearPending() {
    if (key) localStorage.removeItem(key);
    setPending(null);
    setReviewed(false);
  }
  async function recover() {
    if (!pending) return;
    setBusy(true);
    try {
      let r: RemittanceResult;
      try {
        r = await request<RemittanceResult>(
          '/commands/' + pending.commandId + '?companyId=' + pending.companyId,
        );
      } catch (e) {
        if ((e as Error).message !== 'NOT_FOUND') throw e;
        // No retained result: retry the saved immutable payload, never create a new identity.
        r = await request<RemittanceResult>('/commands', pending, session?.csrfToken);
      }
      clearPending();
      navigate('/remittances/' + r.id);
    } catch (e) {
      const code = (e as Error).message;
      setError(code);
      if (
        [
          'REMITTANCE_WITNESS_CHANGED',
          'ROUND_BASIS_CHANGED_OR_INCOMPLETE',
          'EXACT_REMITTANCE_REQUIRED',
          'ROUND_ALREADY_REMITTED',
          'ACCOUNT_INACTIVE',
          'METHOD_ACCOUNT_MISMATCH',
          'ACCOUNT_USAGE_FORBIDDEN',
          'FUTURE_PAYMENT_DATE',
          'VALIDATION_FAILED',
        ].includes(code)
      )
        clearPending();
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!witness || !key) return;
    setBusy(true);
    setError('');
    const commandId = crypto.randomUUID();
    try {
      const input: RemittanceCommand = {
        ...scope,
        schemaVersion: 1,
        type: 'remittance.confirm',
        commandId,
        witnessId: witness.id,
        expectedRevision: witness.revision,
        expectedDigest: witness.digest,
        actualDate: date,
        components:
          witness.expectedMinor === '0'
            ? []
            : components.map((c) => ({
                method: c.method,
                accountId: c.accountId,
                amountMinor: inputMinor(c.amount),
                reference: c.reference,
              })),
      };
      localStorage.setItem(key, JSON.stringify(input));
      setPending(input);
      const r = await request<RemittanceResult>('/commands', input, session?.csrfToken);
      localStorage.removeItem(key);
      setPending(null);
      navigate('/remittances/' + r.id);
    } catch (e) {
      const code = (e as Error).message;
      setError(code);
      if (code !== 'RESULT_UNKNOWN') {
        localStorage.removeItem(key);
        setPending(null);
        setReviewed(false);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="remittance-page">
      <PageHeading
        eyebrow="المالية"
        title="مراجعة واستلام أموال الجولة"
        description="استلام الشركة منفصل عن استحقاق البراند وصرف أمواله."
      />
      <Link to={'/remittances?' + (params.get('back') ?? '')}>العودة للجولات</Link>
      <ErrorMessage error={error} />
      {pending ? (
        <StatePanel state="pending" title="نتيجة الاستلام قيد التحقق">
          <p>احتُفظ بهوية الطلب بعد إعادة تحميل الصفحة.</p>
          <Button disabled={busy} onClick={() => void recover()}>
            استرداد نتيجة الطلب
          </Button>
        </StatePanel>
      ) : (
        <Button variant="outline" disabled={busy} onClick={() => void refresh()}>
          {busy ? 'جارٍ تحديث الأدلة…' : 'تحديث أدلة الجولة'}
        </Button>
      )}
      {witness && (
        <>
          <FormGroup
            title="الأموال المبلّغ عنها"
            description="تفصيل المصادر التي استلمها النظام ومبالغها الفعلية."
          >
            <p className="remittance-total">{displayMinor(witness.expectedMinor)} ج.م</p>
            <p>
              أدلة مستلمة فقط، راجعتها الشركة في{' '}
              {new Date(witness.createdAt).toLocaleString('ar-EG')}. قد تصل حقائق أو تصحيحات لاحقة
              وتحتاج مراجعة.
            </p>
            {witness.blockers.length ? (
              <div role="alert">
                {witness.blockers.map((b) => (
                  <p key={b}>{blockers[b] ?? 'تحتاج أدلة الجولة إلى مراجعة'}</p>
                ))}
              </div>
            ) : (
              <p>الأدلة المستلمة متطابقة؛ راجع الاستلام الفعلي قبل التأكيد.</p>
            )}
            <div className="remittance-sources">
              {witness.sources.map((s) => (
                <article key={s.attemptId}>
                  <Link to={'/tracking/' + s.shipmentId}>الشحنة {s.shipmentReference}</Link>
                  <p>
                    أموال المستلم:{' '}
                    {s.reportedMinor === null
                      ? 'لم يُبلّغ عن مبلغ'
                      : displayMinor(s.reportedMinor) + ' ج.م'}
                    {s.covered ? ' — مغطاة باستلام سابق' : ''}
                  </p>
                  <small>
                    بضاعة {displayMinor(s.goodsMinor)} · شحن {displayMinor(s.shippingMinor)} ·
                    مراجعة المصدر {s.outcomeRevision}
                  </small>
                </article>
              ))}
            </div>
          </FormGroup>
          <FormGroup
            description="المجموع يجب أن يطابق كامل أموال المستلمين المبلّغ عنها."
            title={
              witness.expectedMinor === '0' ? 'تحقق دون حركة أموال' : 'ما استلمته الشركة فعليًا'
            }
          >
            <Field label="تاريخ الاستلام الفعلي">
              <input
                type="date"
                value={date}
                disabled={busy || !!pending}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            {witness.expectedMinor !== '0' && (
              <>
                {components.map((c, i) => (
                  <fieldset key={i} disabled={busy || !!pending} className="remittance-component">
                    <legend>مكوّن الاستلام {i + 1}</legend>
                    <div className="remittance-fields">
                      <Field label="طريقة الاستلام">
                        <select
                          value={c.method}
                          onChange={(e) =>
                            setComponents((old) =>
                              old.map((x, j) =>
                                j === i
                                  ? { ...x, method: e.target.value as PaymentMethod, accountId: '' }
                                  : x,
                              ),
                            )
                          }
                        >
                          {Object.entries(methods).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="الحساب المستلم">
                        <select
                          value={c.accountId}
                          onChange={(e) =>
                            setComponents((old) =>
                              old.map((x, j) =>
                                j === i ? { ...x, accountId: e.target.value } : x,
                              ),
                            )
                          }
                        >
                          <option value="">اختر الحساب</option>
                          {catalog.data?.accounts
                            .filter(
                              (a) =>
                                a.active &&
                                a.branchIds.includes(scope.branchId) &&
                                (a.type === 'cash') === (c.method === 'cash'),
                            )
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field label="المبلغ بالجنيه">
                        <input
                          inputMode="decimal"
                          value={c.amount}
                          onChange={(e) =>
                            setComponents((old) =>
                              old.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)),
                            )
                          }
                        />
                      </Field>
                      <Field label="المرجع — اختياري">
                        <input
                          value={c.reference}
                          onChange={(e) =>
                            setComponents((old) =>
                              old.map((x, j) =>
                                j === i ? { ...x, reference: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </Field>
                    </div>
                    {components.length > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => setComponents((old) => old.filter((_, j) => i !== j))}
                      >
                        حذف هذا المكوّن
                      </Button>
                    )}
                  </fieldset>
                ))}
                <Button
                  variant="outline"
                  disabled={busy || !!pending || components.length >= 100}
                  onClick={() =>
                    setComponents((old) => [
                      ...old,
                      { method: 'cash', accountId: '', amount: '', reference: '' },
                    ])
                  }
                >
                  إضافة طريقة أو حساب
                </Button>
                <p aria-live="polite">
                  مجموع المستلم: {displayMinor(sum.toString())} ج.م · المتبقي:{' '}
                  {displayMinor(remaining.toString())} ج.م
                </p>
              </>
            )}
            <label>
              <input
                type="checkbox"
                checked={reviewed}
                disabled={busy || !!pending || witness.blockers.length > 0}
                onChange={(e) => setReviewed(e.target.checked)}
              />{' '}
              راجعت الأدلة وأؤكد{' '}
              {witness.expectedMinor === '0'
                ? 'عدم وجود أموال مبلّغ عنها لهذه الجولة'
                : 'استلام الشركة كامل المبلغ فعليًا'}
            </label>
            <Button
              disabled={
                busy ||
                !!pending ||
                !reviewed ||
                !valid ||
                witness.blockers.length > 0 ||
                (witness.expectedMinor !== '0' &&
                  (remaining !== 0n ||
                    components.some(
                      (c) => !c.accountId || !c.amount || inputMinor(c.amount) === '0',
                    )))
              }
              onClick={() => void confirm()}
            >
              {witness.expectedMinor === '0'
                ? 'تسجيل التحقق دون أموال'
                : 'تأكيد استلام كامل أموال الجولة'}
            </Button>
          </FormGroup>
        </>
      )}
    </main>
  );
}
export function RemittanceDetailPage() {
  const { id } = useParams(),
    { registry } = useAccess(),
    [params] = useSearchParams();
  const q = useQuery({
    queryKey: ['remittance', id, registry?.context.authorizationRevision],
    enabled: !!registry,
    retry: false,
    queryFn: () =>
      request<RemittanceDetail>('/' + id + '?companyId=' + registry!.context.companyId),
  });
  return (
    <main className="remittance-page">
      <PageHeading
        title="سجل استلام أموال الجولة"
        eyebrow="المالية"
        description="استلام محفوظ بأدلة المصدر والحسابات الفعلية."
      />
      <Link to={'/remittances?' + (params.get('back') ?? '')}>العودة للجولات</Link>
      {q.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل السجل" />
      ) : q.isError ? (
        <ErrorMessage error={q.error.message} />
      ) : (
        <>
          <FormGroup
            title={'السجل ' + q.data.reference}
            description="لا يؤدي فتح السجل أو إعادة تحميله إلى أي حركة مالية إضافية."
          >
            <p className="remittance-total">
              {q.data.kind === 'checked'
                ? 'تم التحقق دون حركة أموال'
                : displayMinor(q.data.amountMinor) + ' ج.م استلمتها الشركة'}
            </p>
            <p>
              {q.data.actualDate} · {q.data.actorName}
            </p>
            {q.data.components.map((c, i) => (
              <p key={i}>
                {methods[c.method]} · {c.accountName} · {displayMinor(c.amountMinor)} ج.م{' '}
                {c.reference}
              </p>
            ))}
            <p>
              نسخة الأدلة {q.data.witness.revision} محفوظة مع مصادرها. مستحقات البضاعة المرتبطة:{' '}
              {displayMinor(
                q.data.witness.sources
                  .filter((s) => !s.covered)
                  .reduce((n, s) => n + BigInt(s.goodsMinor), 0n)
                  .toString(),
              )}{' '}
              ج.م.
            </p>
          </FormGroup>
          {q.data.reviews.map((r) => (
            <StatePanel key={r.id} state="pending" title="وصلت حقائق لاحقة تحتاج مراجعة">
              <p>
                الاستلام الفعلي محفوظ. المراجعة {r.state === 'open' ? 'مفتوحة' : 'حُسمت'} والمستحقات
                المتأثرة موقوفة حسب حالتها.
              </p>
              <Link to="/execution/reviews">فتح مراجعات التسوية</Link>
            </StatePanel>
          ))}
        </>
      )}
    </main>
  );
}
