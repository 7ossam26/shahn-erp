import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { PageHeading, Button } from '@shahn/ui';
import { OperationalReportLink } from '../reports/reports.js';
import {
  type ReturnCommand,
  type ReturnDesk,
  type ReturnResult,
  type ReturnLineView,
  type ReturnRequestView,
  validateReturnDesk,
  validateReturnResult,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import './returns.css';
const words: Record<string, string> = {
  sound: 'سليم',
  damaged: 'تالف — غير متاح',
  uncertain: 'يحتاج فحصاً — غير متاح',
  pending: 'وصول فعلي مسجل — تأكيد توصيل معلق، والكمية غير متاحة',
  accepted: 'استلام مؤكد',
  rejected: 'رُفض التأكيد — الوصول المسجل محفوظ للمراجعة',
  'review-required': 'يحتاج إلى مراجعة',
  STALE_RETURN_REVISION: 'تغيّرت كمية الطلب. حدّث البيانات وراجعها قبل إنشاء طلب جديد.',
  WRONG_RETURN_BRANCH: 'الاستلام مسموح فقط في فرع خروج الشحنة الأصلي.',
  EXCESS_RETURN_QUANTITY: 'الكمية أكبر من المتبقي مع المندوب.',
  PENDING_RETURN_CONFIRMATION: 'يوجد تأكيد معلق لهذه القطعة. انتظر نتيجة الطلب الأصلي.',
  RECEIPT_ALLOCATION_CONFLICT: 'سبق استخدام الكمية أو تغيّرت حالتها. حدّث البيانات.',
  RETURN_ALREADY_ALLOCATED: 'هذه الكمية مستخدمة بالفعل.',
  RETURN_CONDITION_UNAVAILABLE: 'الحالة لا تسمح بإعادة الإرسال.',
  TAWSEL_CHECK_003: 'إعادة الإرسال من فرع آخر غير متاحة حالياً.',
  SOURCE_NOT_READY: 'لم يكتمل إعداد اتصال توصيل.',
  FORBIDDEN_SCOPE: 'ليس لديك صلاحية لهذا الفرع أو الإجراء.',
  RESULT_UNKNOWN: 'لم تصل النتيجة. احتفظنا بالطلب الأصلي للتحقق منه.',
  CONNECTION_LOST: 'تعذر تحديث البيانات. حاول مرة أخرى.',
};
const label = (s: string) => words[s] ?? 'تعذر إتمام الإجراء. حدّث الحالة وراجع بيانات الطلب.';
class ApiError extends Error {
  constructor(
    code: string,
    readonly status = 0,
  ) {
    super(code);
  }
}
async function api<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  try {
    const r = await fetch('/api/v1/returns' + path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
      }),
      d = await r.json();
    if (!r.ok) throw new ApiError(body && r.status >= 500 ? 'RESULT_UNKNOWN' : d.code, r.status);
    if (
      path !== '/refresh' &&
      !(path.startsWith('/commands') ? validateReturnResult(d) : validateReturnDesk(d))
    )
      throw new ApiError('CONNECTION_LOST');
    return d as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST');
  }
}
export function ReturnsPage() {
  const a = useAccess(),
    company = a.registry?.context.companyId,
    { id } = useParams(),
    disposal = useLocation().pathname.endsWith('/disposition'),
    [params, setParams] = useSearchParams(),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [nextDispatch, setNextDispatch] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<ReturnCommand | null>(null);
  const storage = `P14:${a.session?.principalId}:${company}`;
  useEffect(() => {
    try {
      setPending(JSON.parse(sessionStorage.getItem(storage) ?? 'null') as ReturnCommand | null);
    } catch {
      setPending(null);
    }
  }, [storage]);
  const retain = (v: ReturnCommand | null) => {
    setPending(v);
    try {
      if (v) sessionStorage.setItem(storage, JSON.stringify(v));
      else sessionStorage.removeItem(storage);
    } catch {
      /* Immutable mounted request remains available. */
    }
  };
  const query = useQuery({
    queryKey: ['returns', company, id, params.toString()],
    enabled: !!company,
    queryFn: () =>
      api<ReturnDesk>(
        (id ? '/requests/' + id : '') +
          '?' +
          new URLSearchParams({
            companyId: company!,
            ...(!id && params.get('branchId') && params.get('driverId')
              ? Object.fromEntries(params)
              : {}),
          }).toString(),
      ),
    refetchInterval: 5000,
  });
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };
  const done = (r: ReturnResult) => {
    retain(null);
    setNextDispatch(r.dispatchIntentId);
    setNotice(
      r.dispatchIntentId
        ? 'حُجزت الكمية لدورة جديدة. أكمل تسليم المندوب من شاشة التسليم.'
        : r.actionId
          ? 'سُجل الطلب. راجع حالة التأكيد أدناه قبل استخدام الكمية.'
          : 'سُجل التسليم الفعلي للبراند.',
    );
    void query.refetch();
  };
  const submit = async (x: ReturnCommand) => {
    if (busy || pending) return;
    retain(x);
    setBusy(true);
    setError('');
    try {
      done(await api<ReturnResult>('/commands', x, a.session?.csrfToken));
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) retain(null);
    } finally {
      setBusy(false);
      void query.refetch();
    }
  };
  const recover = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    try {
      let r: ReturnResult;
      try {
        r = await api<ReturnResult>(
          `/commands/${pending.commandId}?companyId=${pending.companyId}`,
        );
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 404) throw e;
        r = await api<ReturnResult>('/commands', pending, a.session?.csrfToken);
      }
      done(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      await api(
        '/refresh',
        { companyId: company, branchId: params.get('branchId'), driverId: params.get('driverId') },
        a.session?.csrfToken,
      );
      await query.refetch();
      setNotice('تمت قراءة صفحات الطلبات والحالة الحالية من توصيل.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const data = query.data,
    canDispatch = a.registry?.context.grants.includes('dispatch') ?? false;
  return (
    <div className="returns-page">
      <OperationalReportLink reportId="REP-07" params={params} />
      <PageHeading
        eyebrow="العهدة الفعلية"
        title={
          disposal ? 'تنفيذ قرار عهدة معتمد' : id ? 'فحص واستلام المرتجع' : 'استلام مرتجعات العملاء'
        }
        description="استلم الكمية التي وصلت فعلياً إلى فرع خروج الشحنة. طلب المندوب وحده لا يضيف مخزوناً."
      />
      {id && <Link to={'/returns?' + params.toString()}>العودة إلى الطلبات بنفس المرشحات</Link>}
      {(error || query.error) && (
        <p role="alert" className="returns-error">
          {label(error || (query.error as Error).message)}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {nextDispatch && canDispatch && (
        <Link to={'/dispatch/' + nextDispatch}>متابعة تجهيز الدورة الجديدة وتسليم المندوب</Link>
      )}
      {pending && (
        <section className="return-card">
          <p>يوجد طلب محفوظ لم تصل نتيجته. لا تُنشئ استلاماً آخر لنفس الكمية.</p>
          <Button disabled={busy} onClick={() => void recover()}>
            تحقق من الطلب الأصلي
          </Button>
        </section>
      )}
      {!data ? (
        <p role="status">جارٍ قراءة الطلبات…</p>
      ) : (
        <>
          {!id && (
            <>
              <section className="return-filters">
                <label>
                  فرع المصدر
                  <select
                    aria-label="فرع المصدر"
                    value={params.get('branchId') ?? ''}
                    onChange={(e) => change('branchId', e.target.value)}
                  >
                    <option value="">اختر الفرع</option>
                    {data.branches.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  المندوب
                  <select
                    aria-label="المندوب"
                    value={params.get('driverId') ?? ''}
                    onChange={(e) => change('driverId', e.target.value)}
                  >
                    <option value="">اختر المندوب</option>
                    {data.drivers.map((b) => (
                      <option value={b.id} key={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              {params.get('branchId') && params.get('driverId') ? (
                <>
                  <Button disabled={busy} onClick={() => void refresh()}>
                    تحديث من توصيل
                  </Button>
                  <details>
                    <summary>مرشحات الطلبات</summary>
                    <div className="return-filters">
                      <label>
                        البراند
                        <select
                          value={params.get('brands') ?? ''}
                          onChange={(e) => change('brands', e.target.value)}
                        >
                          <option value="">كل البراندات</option>
                          {data.brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        رقم الشحنة
                        <input
                          value={params.get('search') ?? ''}
                          onChange={(e) => change('search', e.target.value)}
                        />
                      </label>
                      <label>
                        حالة الطلب
                        <select
                          value={params.get('state') ?? 'all'}
                          onChange={(e) => change('state', e.target.value)}
                        >
                          {[
                            ['all', 'الكل'],
                            ['unresolved', 'متبقي مع المندوب'],
                            ['received', 'استُلمت منه كمية'],
                            ['pending', 'تأكيد معلق'],
                            ['settled', 'حُسمت كل الكمية'],
                          ].map(([v, t]) => (
                            <option value={v} key={v}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        حالة البضاعة
                        <select
                          value={params.get('condition') ?? 'all'}
                          onChange={(e) => change('condition', e.target.value)}
                        >
                          <option value="all">الكل</option>
                          {['sound', 'damaged', 'uncertain'].map((c) => (
                            <option key={c} value={c}>
                              {label(c)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        التاريخ المستخدم
                        <select
                          value={params.get('dateBasis') ?? 'request'}
                          onChange={(e) => change('dateBasis', e.target.value)}
                        >
                          <option value="request">تاريخ الطلب</option>
                          <option value="receipt">تاريخ الاستلام</option>
                        </select>
                      </label>
                      {[
                        ['from', 'من تاريخ'],
                        ['to', 'إلى تاريخ'],
                      ].map(([v, t]) => (
                        <label key={v}>
                          {t}
                          <input
                            type="date"
                            value={params.get(v!) ?? ''}
                            onChange={(e) => change(v!, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                </>
              ) : (
                <p>اختر فرع المصدر والمندوب لعرض طلباتهما.</p>
              )}
            </>
          )}
          {disposal
            ? data.items.map((r) => (
                <DispositionForm
                  key={r.id}
                  r={r}
                  company={company!}
                  disabled={busy || !!pending}
                  submit={submit}
                />
              ))
            : data.items.map((r) => (
                <section className="return-card" key={r.id}>
                  <h2>
                    {r.driverName} · {r.branchName}
                  </h2>
                  <p>
                    الطلب:{' '}
                    {new Date(r.requestedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}{' '}
                    · آخر قراءة:{' '}
                    {new Date(r.checkedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                  </p>
                  {r.items.map((i) => (
                    <article key={i.id} className="return-line">
                      <h3>
                        {i.reference} · {i.brandName}
                      </h3>
                      <p>{i.description}</p>
                      <dl className="return-balances">
                        {[
                          ['مطلوب', i.current.requested],
                          ['مستلم', i.current.received],
                          ['متبقي مع المندوب', i.current.unresolved],
                          ['مفقود بقرار', i.current.lost],
                          ['تالف بقرار', i.current.damaged],
                        ].map(([t, n]) => (
                          <div key={t}>
                            <dt>{t}</dt>
                            <dd>{n}</dd>
                          </div>
                        ))}
                      </dl>
                      {!id ? (
                        <Link to={'/returns/' + r.id + '?' + params.toString()}>
                          فحص الكمية واستلامها
                        </Link>
                      ) : (
                        <>
                          <Link to={'/tracking/' + i.shipmentId}>تاريخ الشحنة</Link>
                          <ul className="return-timeline">
                            {i.observations.map((o) => (
                              <li key={o.id}>
                                {o.condition === null
                                  ? o.state === 'accepted'
                                    ? 'قرار عهدة مؤكد — ليس استلاماً'
                                    : o.state === 'pending'
                                      ? 'قرار عهدة بانتظار التأكيد — لا يضيف مخزوناً'
                                      : label(o.state)
                                  : label(o.state)}{' '}
                                · الكمية {o.quantity} ·{' '}
                                {o.condition ? label(o.condition) : 'قرار عهدة'} ·{' '}
                                {new Date(o.observedAt).toLocaleString('ar-EG', {
                                  timeZone: 'Africa/Cairo',
                                })}
                              </li>
                            ))}
                            {i.receipts.map((p) => (
                              <li key={p.id}>
                                استلام مؤكد: {p.quantity} · {label(p.condition)} · مستخدم{' '}
                                {p.consumed} ·{' '}
                                {new Date(p.receivedAt).toLocaleString('ar-EG', {
                                  timeZone: 'Africa/Cairo',
                                })}
                              </li>
                            ))}
                          </ul>
                          <Link to={'/returns/' + r.id + '/disposition?' + params.toString()}>
                            قرارات العهدة المعتمدة
                          </Link>
                          <ReceiptForm
                            key={i.id + ':' + i.current.revision}
                            r={r}
                            i={i}
                            company={company!}
                            submit={submit}
                            disabled={busy || !!pending}
                          />
                          {i.receipts
                            .filter((p) => p.condition === 'sound' && p.consumed < p.quantity)
                            .map((p) => (
                              <UseReceipt
                                key={p.id + ':' + p.version}
                                r={r}
                                i={i}
                                p={p}
                                company={company!}
                                drivers={data.drivers}
                                canDispatch={canDispatch}
                                submit={submit}
                                disabled={busy || !!pending}
                              />
                            ))}
                          <p className="muted">
                            قرار الفقد أو التلف يحتاج إلى قرار عهدة معتمد منفصل. لا ينشئ الاستلام أو
                            القرار تعويضاً مالياً.
                          </p>
                        </>
                      )}
                    </article>
                  ))}
                </section>
              ))}
          {!id && params.get('branchId') && params.get('driverId') && !data.items.length && (
            <p>لا توجد طلبات ضمن المرشحات. نتيجة البحث وحدها لا تثبت خلو عهدة المندوب.</p>
          )}
          {!id && data.total > 25 && (
            <nav aria-label="صفحات الطلبات">
              <Button
                disabled={data.page === 1}
                onClick={() => {
                  const p = new URLSearchParams(params);
                  p.set('page', String(data.page - 1));
                  setParams(p);
                }}
              >
                السابق
              </Button>
              <span>صفحة {data.page}</span>
              <Button
                disabled={data.page * 25 >= data.total}
                onClick={() => {
                  const p = new URLSearchParams(params);
                  p.set('page', String(data.page + 1));
                  setParams(p);
                }}
              >
                التالي
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
function DispositionForm({
  r,
  company,
  submit,
  disabled,
}: {
  r: ReturnRequestView;
  company: string;
  submit: (x: ReturnCommand) => Promise<void>;
  disabled: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="return-card">
      <h2>قرارات العهدة المعتمدة</h2>
      <p>
        تنفيذ قرار فقد أو تلف مسجل مسبقاً. هذا الإجراء لا يثبت وصول بضاعة ولا يضيف مخزوناً ولا يصرف
        تعويضاً.
      </p>
      <Link to={'/returns/' + r.id}>العودة إلى فحص المرتجع</Link>
      {!r.dispositions.length ? (
        <p>لا يوجد قرار عهدة معتمد لهذا الطلب. سجّل القرار عبر مسار الحادث المصرح به أولاً.</p>
      ) : (
        r.dispositions.map((d) => {
          const eligible = d.items.every((x) =>
            r.items.some(
              (i) =>
                i.id === x.itemId &&
                i.current.revision === x.expectedRevision &&
                i.current.unresolved >= x.quantity &&
                !i.observations.some((o) => o.state === 'pending'),
            ),
          );
          return (
            <form
              key={d.id}
              className="return-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submit({
                  schemaVersion: 1,
                  commandId: crypto.randomUUID(),
                  companyId: company,
                  branchId: r.branchId,
                  type: 'return.dispose',
                  requestId: r.id,
                  decisionId: d.id,
                });
              }}
            >
              <h3>{d.kind === 'lost' ? 'قرار فقد معتمد' : 'قرار تلف معتمد'}</h3>
              <ul>
                {d.items.map((x) => (
                  <li key={x.itemId}>
                    {r.items.find((i) => i.id === x.itemId)?.description ?? 'قطعة بالطلب'} · الكمية{' '}
                    {x.quantity}
                  </li>
                ))}
              </ul>
              <label className="return-check">
                <input
                  type="checkbox"
                  required
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                راجعت القرار المسجل والكميات المحددة
              </label>
              <Button disabled={disabled || !confirm || !eligible}>
                إرسال القرار المعتمد إلى توصيل
              </Button>
              {!eligible && <p>تغيّرت الكميات أو يوجد تأكيد معلق؛ راجع الحالة قبل تنفيذ القرار.</p>}
            </form>
          );
        })
      )}
    </section>
  );
}
function ReceiptForm({
  r,
  i,
  company,
  submit,
  disabled,
}: {
  r: ReturnRequestView;
  i: ReturnLineView;
  company: string;
  submit: (x: ReturnCommand) => Promise<void>;
  disabled: boolean;
}) {
  const [qty, setQty] = useState(''),
    [condition, setCondition] = useState<'sound' | 'damaged' | 'uncertain'>('uncertain'),
    [actual, setActual] = useState(false),
    [shortage, setShortage] = useState(false);
  if (!i.current.unresolved || i.current.eligibility !== 'pending')
    return <p>لا توجد كمية مؤهلة للاستلام في هذه النسخة.</p>;
  const pending = i.observations.some((o) => o.state === 'pending');
  return (
    <form
      className="return-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({
          schemaVersion: 1,
          commandId: crypto.randomUUID(),
          companyId: company,
          branchId: r.branchId,
          type: 'return.receive',
          requestId: r.id,
          actualReceipt: true,
          observedAt: new Date().toISOString(),
          items: [
            {
              itemId: i.id,
              expectedRevision: i.current.revision,
              quantity: Number(qty),
              condition,
              inspection: i.inspection,
              suspectedShortage: shortage,
            },
          ],
        });
      }}
    >
      <h4>الكمية التي وصلت فعلياً</h4>
      <label>
        الكمية المستلمة
        <input
          type="number"
          min="1"
          max={i.current.unresolved}
          step="1"
          value={qty}
          required
          onChange={(e) => setQty(e.target.value)}
        />
      </label>
      <label>
        نتيجة الفحص
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as typeof condition)}
        >
          {['uncertain', 'sound', 'damaged'].map((c) => (
            <option key={c} value={c}>
              {label(c)}
            </option>
          ))}
        </select>
      </label>
      {i.inspection === 'parcel-exterior' && (
        <>
          <p>فحص هوية الطرد وغلافه الخارجي؛ لا يؤكد محتوياته غير المرئية.</p>
          <label className="return-check">
            <input
              type="checkbox"
              checked={shortage}
              onChange={(e) => setShortage(e.target.checked)}
            />
            اشتباه نقص داخلي — يحتاج مراجعة منفصلة
          </label>
        </>
      )}
      <label className="return-check">
        <input
          type="checkbox"
          required
          checked={actual}
          onChange={(e) => setActual(e.target.checked)}
        />
        أؤكد وصول هذه الكمية فعلياً إلى {r.branchName}
      </label>
      <Button disabled={disabled || pending || !actual || !qty}>تأكيد استلام الكمية الفعلية</Button>
      {pending && <p>التأكيد السابق معلق. البضاعة المسجلة غير متاحة للاستخدام.</p>}
      <p>إن لم تصل بضاعة فعلية، اترك الطلب دون تأكيد.</p>
    </form>
  );
}
function UseReceipt({
  r,
  i,
  p,
  company,
  drivers,
  canDispatch,
  submit,
  disabled,
}: {
  r: ReturnRequestView;
  i: ReturnLineView;
  p: ReturnLineView['receipts'][number];
  company: string;
  drivers: ReturnDesk['drivers'];
  canDispatch: boolean;
  submit: (x: ReturnCommand) => Promise<void>;
  disabled: boolean;
}) {
  const [mode, setMode] = useState(''),
    [quantity, setQuantity] = useState('1'),
    [driver, setDriver] = useState(r.driverId),
    [recipient, setRecipient] = useState(''),
    [actual, setActual] = useState(false);
  return (
    <section className="return-form">
      <h4>كمية سليمة متاحة: {p.quantity - p.consumed}</h4>
      <label>
        الإجراء التالي
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setActual(false);
          }}
        >
          <option value="">اختر الإجراء</option>
          {canDispatch && <option value="redispatch">إعادة إرسال من نفس الفرع</option>}
          <option value="brand">تسليم فعلي للبراند</option>
        </select>
      </label>
      {mode && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const common = {
              schemaVersion: 1 as const,
              commandId: crypto.randomUUID(),
              companyId: company,
              branchId: r.branchId,
              allocations: [
                { receiptLineId: p.id, expectedVersion: p.version, quantity: Number(quantity) },
              ],
            };
            void submit(
              mode === 'redispatch'
                ? {
                    ...common,
                    type: 'return.redispatch',
                    previousCycleId: i.cycleId,
                    driverId: driver,
                  }
                : {
                    ...common,
                    type: 'return.brandHandover',
                    brandId: i.brandId,
                    recipientName: recipient,
                    actualHandover: true,
                    actualAt: new Date().toISOString(),
                  },
            );
          }}
        >
          <label>
            الكمية المختارة
            <input
              required
              type="number"
              min="1"
              max={p.quantity - p.consumed}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          {mode === 'redispatch' ? (
            <>
              <label>
                مندوب الدورة الجديدة
                <select required value={driver} onChange={(e) => setDriver(e.target.value)}>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>دورة جديدة لنفس الشحنة من {r.branchName}. يبقى تاريخ التسليم السابق محفوظاً.</p>
            </>
          ) : (
            <>
              <p>البراند المستلم: {i.brandName}</p>
              <label>
                اسم مستلم البراند
                <input
                  required
                  maxLength={200}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </label>
              <label className="return-check">
                <input
                  type="checkbox"
                  checked={actual}
                  required
                  onChange={(e) => setActual(e.target.checked)}
                />
                تم التسليم الفعلي لهذه الكمية إلى مستلم البراند
              </label>
            </>
          )}
          <Button disabled={disabled || (mode === 'brand' && !actual)}>
            {mode === 'redispatch'
              ? 'حجز الكمية وإعداد دورة جديدة'
              : 'تسجيل التسليم الفعلي للبراند'}
          </Button>
        </form>
      )}
    </section>
  );
}
