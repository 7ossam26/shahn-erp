import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeading, Button } from '@shahn/ui';
import {
  validateDispatchList,
  validateDispatchDetail,
  type DispatchList,
  type DispatchDetail,
  type DispatchCommand,
  type DispatchResult,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { displayMinor } from '../brands/api.js';
import './dispatch.css';
const labels: Record<string, string> = {
  synchronizing: 'جارٍ إرسال بيانات الشحنة',
  preparing: 'بانتظار قبول التحضير',
  prepared: 'مُحضّر للمندوب — لم يُسلّم',
  receiving: 'تسليم فعلي بانتظار تأكيد توصيل',
  accepted: 'تم قبول استلام المندوب',
  rejected: 'رُفض الطلب — راجع السبب',
  withdrawing: 'بانتظار سحب التحضير',
  withdrawn: 'تم سحب التحضير',
  reassigning: 'بانتظار تغيير المندوب',
  'review-required': 'تحتاج الحالة إلى مراجعة',
  local: 'مسجلة محلياً',
  pending: 'بانتظار الإرسال',
  sending: 'جارٍ الإرسال',
  unknown: 'نتيجة غير محسومة',
  retryable: 'تعذر الاتصال',
  'configuration-blocked': 'إعداد الربط يحتاج إلى مراجعة',
  SOURCE_NOT_READY: 'لم يكتمل إعداد الربط مع توصيل',
  BRANCH_NOT_READY: 'الفرع غير جاهز لدى توصيل',
  DRIVER_NOT_READY: 'المندوب موقوف أو غير جاهز',
  DRIVER_ISSUER_NOT_READY: 'هوية دخول المندوب غير جاهزة',
  PREPARATION_REQUIRED: 'التجهيز لم يكتمل',
  STOCK_SHORTAGE: 'عجز في الكمية المحجوزة',
  INSUFFICIENT_SHIPPING_COVER: 'رصيد البراند لا يغطي الشحن أو عليه مديونية',
  ALREADY_HANDED_OVER: 'سُلّمت للمندوب',
  EXISTING_DISPATCH: 'لها طلب تسليم قائم',
  COMPETING_PARCEL_CLAIM: 'محجوزة لعملية أخرى',
  BRAND_UNAVAILABLE: 'البراند موقوف',
  REVISION_CONFLICT: 'تغيّرت البيانات. حدّث الصفحة وراجعها قبل التأكيد.',
  FORBIDDEN_SCOPE: 'صلاحياتك الحالية لا تسمح بهذه العملية.',
  RESULT_UNKNOWN: 'لم تصل النتيجة. احتفظنا بنفس الطلب للتحقق منه.',
  REMOTE_RESULT_UNKNOWN: 'لم تصل نتيجة توصيل. تحقّق باستخدام نفس الطلب.',
  CONNECTION_LOST: 'تعذر الاتصال. البيانات المعروضة لم تُحدّث.',
  capacity_exceeded: 'تجاوزت الدفعة حد ٥٠ محطة متبقية، بما فيها محطات الفروع. رُفضت الدفعة كاملة.',
  stale_revision: 'تغيّرت النسخة لدى توصيل. يلزم استرداد الحالة ومراجعة طلب جديد.',
  TAWSEL_CHECK_003: 'تغيير فرع شحنة سبق قبولها يحتاج إلى تحقق توافق الربط.',
  PENDING_REMOTE_CONFIRMATION: 'يوجد طلب غير محسوم. تحقّق من نتيجته أولاً.',
  ACTUAL_RETURN_LIFECYCLE_REQUIRED: 'الشحنة مع المندوب. يلزم مسار الاستلام الفعلي في الفرع.',
  REVIEW_NEW_INTENT_REQUIRED: 'هذا الرد نهائي. يلزم مراجعة حالة الشحنة قبل طلب جديد.',
  COMMAND_IN_FLIGHT: 'الطلب قيد التنفيذ. حدّث الحالة.',
  PROTECTED_LIFECYCLE: 'حالة الشحنة لا تسمح بهذا التعديل.',
  AUTHORITATIVE_TASK_RECONCILIATION_REQUIRED:
    'حالة توصيل تختلف عن الطلب المحفوظ؛ يلزم مراجعة الربط.',
  brand_packed: 'طرد جاهز',
  company_packed: 'تجهيز الشركة',
  stored_stock: 'من المخزون',
  not_required: 'جاهزة',
  complete: 'اكتمل التجهيز',
  awaiting_preparation: 'بانتظار التجهيز',
  ready: 'جاهزة للاختيار',
};
const label = (s: string) => labels[s] ?? s;
const planningLabel = (s: string) =>
  ({
    pending: 'بانتظار التخطيط',
    failed: 'تعذر التخطيط؛ الاستلام مقبول',
    ready: 'جاهز',
    published: 'نُشرت الخطة',
    'not-requested': 'لم يُطلب التخطيط',
  })[s] ?? 'بانتظار تحديث الحالة';
class DispatchError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}
async function api<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  try {
    const r = await fetch('/api/v1/dispatch' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    if (!r.ok)
      throw new DispatchError(body && r.status >= 500 ? 'RESULT_UNKNOWN' : data.code, r.status);
    if (
      !body &&
      !path.startsWith('/commands/') &&
      !(path.startsWith('?') ? validateDispatchList(data) : validateDispatchDetail(data))
    )
      throw new DispatchError('INVALID_RESPONSE');
    return data as T;
  } catch (e) {
    if (e instanceof DispatchError) throw e;
    throw new DispatchError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST');
  }
}
const money = (x: string) => displayMinor(x) + ' ج.م';
function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <p className="dispatch-error" role="alert">
      {label(error instanceof Error ? error.message : 'CONNECTION_LOST')}
    </p>
  ) : null;
}
type Draft = DispatchCommand extends infer C
  ? C extends DispatchCommand
    ? Omit<C, 'commandId' | 'companyId' | 'schemaVersion'>
    : never
  : never;
function useCommand(channel: string, done: (r: DispatchResult) => void) {
  const a = useAccess(),
    company = a.registry?.context.companyId,
    key = `P12:${a.session?.principalId}:${company}:${channel}`;
  const [pending, setPending] = useState<DispatchCommand | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    try {
      setPending(JSON.parse(sessionStorage.getItem(key) ?? 'null') as DispatchCommand | null);
    } catch {
      setPending(null);
    }
  }, [key]);
  const retain = (x: DispatchCommand | null) => {
    setPending(x);
    try {
      if (x) sessionStorage.setItem(key, JSON.stringify(x));
      else sessionStorage.removeItem(key);
    } catch {
      /* Mounted state keeps its immutable request. */
    }
  };
  const send = async (x: DispatchCommand) => {
    try {
      const r = await api<DispatchResult>('/commands', x, a.session?.csrfToken);
      retain(null);
      done(r);
    } catch (e) {
      setError(e);
      if (e instanceof DispatchError && e.status >= 400 && e.status < 500) retain(null);
    }
  };
  const submit = async (d: Draft) => {
    if (busy || pending || !company || !navigator.onLine) return;
    const x = {
      ...d,
      companyId: company,
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
    } as DispatchCommand;
    retain(x);
    setBusy(true);
    setError(null);
    try {
      await send(x);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<DispatchResult>(
        `/commands/${pending.commandId}?companyId=${pending.companyId}`,
      );
      retain(null);
      done(r);
    } catch (e) {
      if (e instanceof DispatchError && e.status === 404) await send(pending);
      else {
        setError(e);
        if (e instanceof DispatchError && e.status === 409) retain(null);
      }
    } finally {
      setBusy(false);
    }
  };
  return { submit, busy, pending, error, recover };
}
export function DispatchPage() {
  const a = useAccess(),
    company = a.registry?.context.companyId,
    [params, setParams] = useSearchParams(),
    navigate = useNavigate(),
    location = useLocation();
  const [selected, setSelected] = useState<Record<string, number>>({}),
    [driver, setDriver] = useState(''),
    [review, setReview] = useState(false),
    [advanced, setAdvanced] = useState(false);
  const query = useQuery({
    queryKey: ['dispatch', company, a.registry?.context.authorizationRevision, params.toString()],
    enabled: !!company && !a.authorityError,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: () => api<DispatchList>(`?companyId=${company}&${params}`),
  });
  const mutation = useCommand('prepare', (r) =>
    navigate('/dispatch/' + r.intentId, { state: { back: location.pathname + location.search } }),
  );
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
    setSelected({});
    setReview(false);
  };
  const multi = (key: string, value: string) => {
    const values = (params.get(key) ?? '').split(',').filter(Boolean),
      next = values.includes(value) ? values.filter((x) => x !== value) : [...values, value];
    change(key, next.join(','));
  };
  const data = a.authorityError || query.error ? undefined : query.data,
    chosen = data?.items.filter((x) => selected[x.id] !== undefined) ?? [],
    branches = new Set(chosen.map((x) => x.branchId));
  return (
    <div className="dispatch-page">
      <PageHeading
        eyebrow="الشحنات"
        title="تسليم الشحنات للمندوب"
        description="اختر الشحنات الجاهزة، حضّرها للمندوب، ثم أكّد التسليم الفعلي."
      />
      <ErrorBox error={query.error ?? mutation.error} />
      {mutation.pending && (
        <div className="dispatch-notice" role="status">
          لم تُحسم نتيجة الطلب المحفوظ.
          <Button disabled={mutation.busy} onClick={() => void mutation.recover()}>
            التحقق من نفس الطلب
          </Button>
        </div>
      )}
      {!data && query.isPending && <p role="status">جارٍ تحميل الشحنات…</p>}
      {data && (
        <>
          <div className="dispatch-toolbar">
            <label>
              الفرع
              <select
                value={params.get('branches') ?? ''}
                onChange={(e) => change('branches', e.target.value)}
              >
                <option value="">كل فروعك</option>
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
              فلاتر متقدمة ({[...params.keys()].filter((k) => k !== 'page').length})
            </Button>
            <Button onClick={() => void query.refetch()}>تحديث</Button>
          </div>
          {advanced && (
            <section className="dispatch-filters" aria-label="فلاتر متقدمة">
              {[
                ['brands', 'البراند', data.brands],
                ['drivers', 'المندوب المقصود', data.drivers],
                [
                  'preparations',
                  'جاهزية التجهيز',
                  ['not_required', 'complete', 'awaiting_preparation'].map((id) => ({
                    id,
                    name: label(id),
                  })),
                ],
                [
                  'services',
                  'الخدمة',
                  ['brand_packed', 'company_packed', 'stored_stock'].map((id) => ({
                    id,
                    name: label(id),
                  })),
                ],
                [
                  'blockers',
                  'سبب التعطيل',
                  [
                    'ready',
                    'PREPARATION_REQUIRED',
                    'STOCK_SHORTAGE',
                    'INSUFFICIENT_SHIPPING_COVER',
                    'SOURCE_NOT_READY',
                    'EXISTING_DISPATCH',
                  ].map((id) => ({ id, name: label(id) })),
                ],
              ].map(([key, title, options]) => (
                <fieldset key={String(key)}>
                  <legend>{String(title)}</legend>
                  {(options as { id: string; name: string }[]).map((o) => (
                    <label className="dispatch-check" key={o.id}>
                      <input
                        type="checkbox"
                        checked={(params.get(String(key)) ?? '').split(',').includes(o.id)}
                        onChange={() => multi(String(key), o.id)}
                      />
                      {o.name}
                    </label>
                  ))}
                </fieldset>
              ))}
              <label>
                تاريخ التسجيل من
                <input
                  type="date"
                  value={params.get('from') ?? ''}
                  onChange={(e) => change('from', e.target.value)}
                />
              </label>
              <label>
                تاريخ التسجيل إلى
                <input
                  type="date"
                  value={params.get('to') ?? ''}
                  onChange={(e) => change('to', e.target.value)}
                />
              </label>
              <Button
                onClick={() => {
                  setParams({});
                  setSelected({});
                }}
              >
                مسح الفلاتر
              </Button>
            </section>
          )}
          <p className="dispatch-muted">
            {data.total} شحنة · الأرصدة للعرض وتُراجع عند تأكيد التسليم
          </p>
          <div className="dispatch-grid">
            {data.items.map((row) => (
              <article className="dispatch-card" key={row.id}>
                <div className="dispatch-card-top">
                  <label className="dispatch-check">
                    <input
                      type="checkbox"
                      aria-label={'اختيار الشحنة ' + row.reference}
                      disabled={row.blockers.length > 0 || !!mutation.pending || review}
                      checked={selected[row.id] !== undefined}
                      onChange={(e) =>
                        setSelected((s) => {
                          const next = { ...s };
                          if (e.target.checked) next[row.id] = row.version;
                          else delete next[row.id];
                          return next;
                        })
                      }
                    />
                    <strong>
                      <bdi>#{row.reference}</bdi>
                    </strong>
                  </label>
                  <span>{label(row.preparation)}</span>
                </div>
                <h2>{row.recipientName}</h2>
                <p>
                  {row.brandName} · {row.branchName}
                </p>
                <dl>
                  <div>
                    <dt>القطع</dt>
                    <dd>{row.quantity}</dd>
                  </div>
                  <div>
                    <dt>المطلوب من المستلم</dt>
                    <dd>{money(row.recipientDueMinor)}</dd>
                  </div>
                  <div>
                    <dt>الشحن على البراند</dt>
                    <dd>{money(row.brandShippingMinor)}</dd>
                  </div>
                  <div>
                    <dt>متاح للصرف</dt>
                    <dd>{money(row.eligibleToPay)}</dd>
                  </div>
                </dl>
                <p className="dispatch-muted">
                  متحصلات معلقة: {money(row.pendingCredit)} · {label(row.synchronization)}
                </p>
                {row.blockers
                  .filter((b) => b !== 'EXISTING_DISPATCH')
                  .map((b) => (
                    <p className="dispatch-blocker" key={b}>
                      {label(b)}
                    </p>
                  ))}
                {row.intentId && (
                  <Link
                    to={'/dispatch/' + row.intentId}
                    state={{ back: location.pathname + location.search }}
                  >
                    عرض طلب التسليم
                  </Link>
                )}
              </article>
            ))}
          </div>
          {data.items.length === 0 && (
            <p role="status">لا توجد شحنات تطابق الفلاتر. امسح الفلاتر أو حدّث البيانات.</p>
          )}
          <div className="dispatch-toolbar">
            <Button
              disabled={data.page <= 1}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(data.page - 1));
                setParams(next);
                setSelected({});
                setReview(false);
              }}
            >
              السابق
            </Button>
            <span>صفحة {data.page}</span>
            <Button
              disabled={data.page * 25 >= data.total}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(data.page + 1));
                setParams(next);
                setSelected({});
                setReview(false);
              }}
            >
              التالي
            </Button>
          </div>
          <section className="dispatch-selection">
            <h2>{review ? 'مراجعة التحضير' : 'الشحنات المختارة'}</h2>
            <p>
              {chosen.length} شحنة · {chosen.reduce((n, x) => n + x.quantity, 0)} قطعة
            </p>
            <label>
              المندوب
              <select
                aria-label="المندوب"
                value={driver}
                disabled={review || !!mutation.pending}
                onChange={(e) => setDriver(e.target.value)}
              >
                <option value="">اختر المندوب</option>
                {data.drivers.map((d) => (
                  <option key={d.id} value={d.id} disabled={!d.ready}>
                    {d.name}
                    {d.ready ? '' : ' — غير جاهز'}
                  </option>
                ))}
              </select>
            </label>
            {driver && (
              <p className="dispatch-muted">
                جاهزية الهوية:{' '}
                {data.drivers.find((d) => d.id === driver)?.checkedAt
                  ? new Date(data.drivers.find((d) => d.id === driver)!.checkedAt!).toLocaleString(
                      'ar-EG',
                    )
                  : 'غير معروفة'}
              </p>
            )}
            {branches.size > 1 && <p role="alert">اختر شحنات من فرع واحد لكل دفعة.</p>}
            {review ? (
              <>
                <p>
                  التحضير يحدد الشحنات والمندوب. يبقى التسليم الفعلي خطوة مستقلة بعد قبول توصيل.
                </p>
                <Button
                  disabled={mutation.busy || !!mutation.pending}
                  onClick={() =>
                    void mutation.submit({
                      type: 'dispatch.prepare',
                      branchId: chosen[0]!.branchId,
                      driverId: driver,
                      items: chosen.map((x) => ({
                        shipmentId: x.id,
                        expectedVersion: selected[x.id]!,
                      })),
                    })
                  }
                >
                  تأكيد التحضير للمندوب
                </Button>
                <Button disabled={!!mutation.pending} onClick={() => setReview(false)}>
                  تعديل الاختيار
                </Button>
              </>
            ) : (
              <Button
                disabled={!chosen.length || branches.size !== 1 || !driver || !!mutation.pending}
                onClick={() => setReview(true)}
              >
                مراجعة التحضير
              </Button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
export function DispatchDetailPage() {
  const a = useAccess(),
    company = a.registry?.context.companyId,
    { id } = useParams(),
    location = useLocation(),
    [review, setReview] = useState(false),
    [asserted, setAsserted] = useState(false),
    [atBranch, setAtBranch] = useState(false),
    [driver, setDriver] = useState('');
  const query = useQuery({
    queryKey: ['dispatch-detail', company, id, a.registry?.context.authorizationRevision],
    enabled: !!company && !a.authorityError,
    retry: false,
    queryFn: () => api<DispatchDetail>(`/${id}?companyId=${company}`),
  });
  const mutation = useCommand(id ?? '', () => {
    setReview(false);
    setAsserted(false);
    void query.refetch();
  });
  const d = a.authorityError || query.error ? undefined : query.data,
    back = (location.state as { back?: string } | null)?.back ?? '/dispatch';
  const choices = useQuery({
    queryKey: ['dispatch-drivers', company, d?.branchId, a.registry?.context.authorizationRevision],
    enabled: !!d && d.state === 'prepared' && !a.authorityError,
    retry: false,
    queryFn: () => api<DispatchList>(`?companyId=${company}&branches=${d!.branchId}`),
  });
  return (
    <div className="dispatch-page">
      <Link to={back}>العودة لقائمة التسليم</Link>
      <PageHeading
        eyebrow="الشحنات"
        title="تفاصيل دفعة التسليم"
        description="تابع التحضير والتسليم ونتيجة توصيل كلٌ على حدة."
      />
      <ErrorBox error={query.error ?? mutation.error} />
      {mutation.pending && (
        <div className="dispatch-notice" role="status">
          لم تصل نتيجة التأكيد. لا تسلّم الدفعة مرة ثانية.
          <Button disabled={mutation.busy} onClick={() => void mutation.recover()}>
            التحقق من نفس الطلب
          </Button>
        </div>
      )}
      {d && (
        <>
          <div className="dispatch-summary">
            <h2>{label(d.state)}</h2>
            <p>
              {d.branchName} · {d.driverName}
            </p>
            <Button onClick={() => void query.refetch()}>تحديث الحالة</Button>
            {d.lastError && <p role="alert">{label(d.lastError)}</p>}
            {d.state === 'receiving' && (
              <p>
                الدفعة محفوظة لهذا المندوب حتى تتأكد النتيجة. لا تعِدها للمخزون أو تسلّمها لمندوب
                آخر بسبب تأخر الرد.
              </p>
            )}
          </div>
          <div className="dispatch-grid">
            {d.items.map((i) => (
              <article className="dispatch-card" key={i.shipmentId}>
                <h2>
                  <bdi>#{i.reference}</bdi> · {i.recipientName}
                </h2>
                <dl>
                  <div>
                    <dt>القطع</dt>
                    <dd>{i.quantity}</dd>
                  </div>
                  <div>
                    <dt>المطلوب من المستلم</dt>
                    <dd>{money(i.recipientDueMinor)}</dd>
                  </div>
                  <div>
                    <dt>التعريفة المحفوظة</dt>
                    <dd>{money(i.tariffMinor)}</dd>
                  </div>
                  <div>
                    <dt>غطاء الشحن المحجوز</dt>
                    <dd>{money(i.coverMinor)}</dd>
                  </div>
                  {i.waiverMinor !== '0' && (
                    <div>
                      <dt>إعفاء الشحن المعتمد</dt>
                      <dd>{money(i.waiverMinor)}</dd>
                    </div>
                  )}
                </dl>
                <p>
                  نسخة البيانات المقبولة: {i.acceptedRevision} ·{' '}
                  {i.pendingRevision ? 'نسخة معلقة: ' + i.pendingRevision : 'لا توجد نسخة معلقة'}
                </p>
                {d.state === 'accepted' && (
                  <p>قبول الاستلام محفوظ. حالة التخطيط: {planningLabel(i.planningStatus)}</p>
                )}
              </article>
            ))}
          </div>
          {d.state === 'prepared' && (
            <section className="dispatch-selection">
              <h2>التسليم الفعلي</h2>
              {!review ? (
                <Button onClick={() => setReview(true)}>مراجعة التسليم الفعلي</Button>
              ) : (
                <>
                  <p>
                    راجع {d.items.length} شحنة و{d.items.reduce((n, i) => n + i.quantity, 0)} قطعة
                    مع {d.driverName} في {d.branchName}.
                  </p>
                  <label className="dispatch-check">
                    <input
                      type="checkbox"
                      checked={asserted}
                      onChange={(e) => setAsserted(e.target.checked)}
                    />
                    أؤكد أن المندوب استلم هذه الدفعة فعلياً
                  </label>
                  <Button
                    disabled={!asserted || mutation.busy || !!mutation.pending}
                    onClick={() =>
                      void mutation.submit({
                        type: 'dispatch.receive',
                        intentId: d.id,
                        expectedVersion: d.version,
                        receiptAsserted: true,
                      })
                    }
                  >
                    تأكيد استلام المندوب
                  </Button>
                </>
              )}
            </section>
          )}
          {['rejected', 'review-required'].includes(d.state) && (
            <section className="dispatch-selection">
              <p>استرد الحالة الحالية من توصيل وراجعها قبل إنشاء طلب تسليم جديد.</p>
              <Button
                disabled={mutation.busy || !!mutation.pending}
                onClick={() =>
                  void mutation.submit({
                    type: 'dispatch.review',
                    intentId: d.id,
                    expectedVersion: d.version,
                  })
                }
              >
                استرداد الحالة للمراجعة
              </Button>
            </section>
          )}
          {['prepared', 'rejected'].includes(d.state) && (
            <details className="dispatch-correlations">
              <summary>تعديل التحضير قبل المغادرة</summary>
              <label className="dispatch-check">
                <input
                  type="checkbox"
                  checked={atBranch}
                  onChange={(e) => setAtBranch(e.target.checked)}
                />
                أؤكد أن جميع شحنات الدفعة موجودة فعلياً في الفرع
              </label>
              <Button
                disabled={!atBranch || mutation.busy || !!mutation.pending}
                onClick={() =>
                  void mutation.submit({
                    type: 'dispatch.withdraw',
                    intentId: d.id,
                    expectedVersion: d.version,
                    actualAtBranch: true,
                  })
                }
              >
                سحب التحضير
              </Button>
              {d.state === 'prepared' && (
                <>
                  <label>
                    المندوب البديل
                    <select value={driver} onChange={(e) => setDriver(e.target.value)}>
                      <option value="">اختر المندوب</option>
                      {choices.data?.drivers
                        .filter((x) => x.id !== d.driverId)
                        .map((x) => (
                          <option key={x.id} value={x.id} disabled={!x.ready}>
                            {x.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Button
                    disabled={!driver || !atBranch || mutation.busy || !!mutation.pending}
                    onClick={() =>
                      void mutation.submit({
                        type: 'dispatch.reassign',
                        intentId: d.id,
                        expectedVersion: d.version,
                        driverId: driver,
                      })
                    }
                  >
                    تأكيد تغيير المندوب
                  </Button>
                </>
              )}
            </details>
          )}
          <details className="dispatch-correlations">
            <summary>الربط والمتابعة</summary>
            {d.actions.map((action) => (
              <div className="dispatch-action" key={action.actionId}>
                <p>
                  <bdi>{action.operation}</bdi> ·{' '}
                  {action.state === 'accepted' ? 'مقبول لدى توصيل' : label(action.state)}
                </p>
                <code>{action.actionId}</code>
                {action.error && <p>{label(action.error)}</p>}
                {['unknown', 'retryable', 'configuration-blocked', 'pending'].includes(
                  action.state,
                ) && (
                  <Button
                    disabled={mutation.busy || !!mutation.pending}
                    onClick={() =>
                      void mutation.submit({
                        type: 'dispatch.retry',
                        intentId: d.id,
                        actionId: action.actionId,
                        expectedVersion: d.version,
                      })
                    }
                  >
                    إعادة المحاولة بنفس الطلب
                  </Button>
                )}
              </div>
            ))}
          </details>
        </>
      )}
    </div>
  );
}
