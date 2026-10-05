import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { PageHeading, Button, StatePanel } from '@shahn/ui';
import {
  validateTrackingList,
  validateTrackingDetail,
  type TrackingList,
  type TrackingDetail,
} from '@shahn/contracts/execution';
import { useAccess } from '../access/access.js';
import './tracking.css';
const labels: Record<string, string> = {
  branch: 'في الفرع',
  driver: 'مع المندوب',
  recipient: 'لدى المستلم',
  unknown: 'غير معروف',
  full: 'تم التسليم',
  partial: 'تسليم جزئي',
  refused: 'رفض الاستلام',
  'no-answer': 'لا يرد',
  complete: 'اكتمل التجهيز',
  not_required: 'جاهزة',
  awaiting_preparation: 'بانتظار التجهيز',
  received: 'تم الاستلام في الفرع',
  prepared: 'اكتمل التجهيز',
  'current.arrivalRecorded': 'سُجل الوصول',
  'current.headingSelected': 'في الطريق',
  'outcome.recorded': 'سُجلت نتيجة المحاولة',
  'outcome.corrected': 'صُححت نتيجة المحاولة',
  'task.deferred': 'تأجيل',
  'task.retryAdmitted': 'محاولة جديدة',
  'round.started': 'بدأت الجولة',
  'round.ended': 'انتهت الجولة',
  'assignment.received': 'تم قبول استلام المندوب',
  'task.snapshotAccepted': 'قُبلت بيانات الشحنة',
  'assignment.prepared': 'تم تحضير التسليم',
  brand_packed: 'طرد جاهز',
  company_packed: 'تجهيز الشركة',
  stored_stock: 'من المخزون',
};
const label = (x: string) => labels[x] ?? 'تحديث التنفيذ';
const at = (x: string | null) =>
  x
    ? new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Cairo',
      }).format(new Date(x))
    : 'غير معروف';
async function read<T>(url: string, validate: (x: unknown) => boolean): Promise<T> {
  const r = await fetch('/api/v1/tracking' + url, {
    credentials: 'same-origin',
    signal: AbortSignal.timeout(15000),
  });
  const b: unknown = await r.json();
  if (!r.ok) throw Error(r.status === 403 ? 'لا توجد صلاحية لعرض التتبع' : 'تعذر تحميل البيانات');
  if (!validate(b)) throw Error('تعذر التحقق من البيانات');
  return b as T;
}
export function HomeTrackingSearch() {
  const a = useAccess();
  if (!a.registry?.context.grants.includes('tracking')) return null;
  return (
    <form action="/tracking" className="p13-tracking-search">
      <label htmlFor="home-tracking">ابحث عن شحنة</label>
      <div>
        <input
          id="home-tracking"
          name="query"
          placeholder="رقم الشحنة، مرجع البراند، الهاتف أو الاسم"
        />
        <Button type="submit">بحث</Button>
      </div>
    </form>
  );
}
export function TrackingPage() {
  const a = useAccess(),
    [params, setParams] = useSearchParams(),
    location = useLocation(),
    [advanced, setAdvanced] = useState(false),
    [draft, setDraft] = useState(params.get('query') ?? '');
  const context = a.registry?.context,
    allowed = context?.grants.includes('tracking');
  const q = useQuery({
    queryKey: ['tracking', context?.companyId, context?.authorizationRevision, params.toString()],
    enabled: !!allowed,
    queryFn: () =>
      read<TrackingList>(
        '?' + new URLSearchParams({ ...Object.fromEntries(params), companyId: context!.companyId }),
        validateTrackingList,
      ),
  });
  const data = a.authorityError || q.error || !allowed ? undefined : q.data;
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };
  return (
    <section className="tracking">
      <PageHeading
        eyebrow="متابعة الشحنات"
        title="تتبع شحنة"
        description="رحلة الشحنة وعهدتها المعروفة في جميع فروع الشركة."
      />
      {!allowed ? (
        <StatePanel state="error" title="لا توجد صلاحية للتتبع">
          تحتاج هذه الشاشة إلى صلاحية التتبع.
        </StatePanel>
      ) : (
        <>
          <form
            className="p13-tracking-search"
            onSubmit={(e) => {
              e.preventDefault();
              change('query', draft);
            }}
          >
            <label htmlFor="tracking-query">رقم الشحنة، مرجع البراند، الهاتف أو الاسم</label>
            <div>
              <input id="tracking-query" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button type="submit">بحث</Button>
              <Button type="button" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>
                فلاتر متقدمة (
                {[...params.keys()].filter((k) => !['query', 'page'].includes(k)).length})
              </Button>
            </div>
          </form>
          {advanced && (
            <section className="tracking-filters" aria-label="فلاتر متقدمة">
              {(
                [
                  ['brands', 'البراند', data?.brands],
                  ['branches', 'الفرع', data?.branches],
                  ['governorates', 'المحافظة', data?.governorates],
                  ['areas', 'المنطقة', data?.areas],
                  [
                    'custodians',
                    'العهدة',
                    ['branch', 'driver', 'recipient', 'unknown'].map((id) => ({
                      id,
                      name: label(id),
                    })),
                  ],
                  [
                    'states',
                    'الحالة',
                    [
                      'full',
                      'partial',
                      'refused',
                      'no-answer',
                      'awaiting_preparation',
                      'current.arrivalRecorded',
                      'task.deferred',
                    ].map((id) => ({ id, name: label(id) })),
                  ],
                  [
                    'services',
                    'نوع الخدمة',
                    ['brand_packed', 'company_packed', 'stored_stock'].map((id) => ({
                      id,
                      name: label(id),
                    })),
                  ],
                ] as const
              ).map(([key, title, options]) => (
                <label key={key}>
                  {title}
                  <select
                    multiple
                    value={(params.get(key) ?? '').split(',')}
                    onChange={(e) =>
                      change(
                        key,
                        [...e.target.selectedOptions]
                          .map((o) => o.value)
                          .filter(Boolean)
                          .join(','),
                      )
                    }
                  >
                    {options?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                أساس التاريخ
                <select
                  value={params.get('dateBasis') ?? 'created'}
                  onChange={(e) => change('dateBasis', e.target.value)}
                >
                  <option value="created">تاريخ التسجيل</option>
                  <option value="last-event">آخر حدث</option>
                </select>
              </label>
              <label>
                من
                <input
                  type="date"
                  value={params.get('from') ?? ''}
                  onChange={(e) => change('from', e.target.value)}
                />
              </label>
              <label>
                إلى
                <input
                  type="date"
                  value={params.get('to') ?? ''}
                  onChange={(e) => change('to', e.target.value)}
                />
              </label>
            </section>
          )}
          {params.size > 0 && (
            <div className="tracking-active">
              {[...params]
                .filter(([k]) => k !== 'page')
                .map(([k, v]) => (
                  <span key={k}>
                    {k === 'query'
                      ? v
                      : k === 'from'
                        ? 'من ' + v
                        : k === 'to'
                          ? 'إلى ' + v
                          : 'فلتر نشط'}{' '}
                    <button aria-label={'إزالة ' + k} onClick={() => change(k, '')}>
                      ×
                    </button>
                  </span>
                ))}
              <Button
                onClick={() => {
                  setParams({});
                  setDraft('');
                }}
              >
                مسح الفلاتر
              </Button>
            </div>
          )}
          {q.error || a.authorityError ? (
            <StatePanel state="error" title="تعذر تحميل نتائج التتبع">
              <Button onClick={() => void q.refetch()}>إعادة المحاولة</Button>
            </StatePanel>
          ) : q.isPending ? (
            <p role="status">جارٍ تحميل الشحنات…</p>
          ) : (
            data && (
              <>
                <p aria-live="polite">{data.total.toLocaleString('ar-EG')} شحنة</p>
                <div className="tracking-results">
                  {data.items.map((s) => (
                    <Link
                      className="tracking-card"
                      key={s.id}
                      to={'/tracking/' + s.id}
                      state={{ back: location.pathname + location.search }}
                    >
                      <div>
                        <bdi className="tracking-reference">{s.reference}</bdi>
                        <strong>{s.recipientName}</strong>
                        <span>{s.brandName}</span>
                      </div>
                      <div>
                        <strong>{label(s.state)}</strong>
                        <span>
                          {label(s.custodian)} {s.driverName ?? s.branchName}
                        </span>
                        <small>آخر دليل: {at(s.lastEventAt)}</small>
                        {s.pending && (
                          <span className="tracking-pending">بانتظار اكتمال المزامنة</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                {!data.total && (
                  <StatePanel state="empty" title="لا توجد نتائج">
                    راجع بيانات البحث أو امسح الفلاتر.
                  </StatePanel>
                )}
                <nav className="tracking-pages" aria-label="صفحات النتائج">
                  <Button
                    disabled={data.page === 1}
                    onClick={() => {
                      const n = new URLSearchParams(params);
                      n.set('page', String(data.page - 1));
                      setParams(n);
                    }}
                  >
                    السابق
                  </Button>
                  <span>{data.page.toLocaleString('ar-EG')}</span>
                  <Button
                    disabled={data.page * 25 >= data.total}
                    onClick={() => {
                      const n = new URLSearchParams(params);
                      n.set('page', String(data.page + 1));
                      setParams(n);
                    }}
                  >
                    التالي
                  </Button>
                </nav>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
export function TrackingDetailPage() {
  const a = useAccess(),
    { id } = useParams(),
    location = useLocation(),
    context = a.registry?.context,
    allowed = context?.grants.includes('tracking');
  const q = useQuery({
    queryKey: ['tracking-detail', context?.companyId, context?.authorizationRevision, id],
    enabled: !!allowed,
    queryFn: () =>
      read<TrackingDetail>('/' + id + '?companyId=' + context!.companyId, validateTrackingDetail),
  });
  const d = q.error || a.authorityError || !allowed ? undefined : q.data;
  const back = (location.state as { back?: string } | null)?.back ?? '/tracking';
  return (
    <section className="tracking">
      <Link className="back-link" to={back}>
        العودة إلى نتائج البحث
      </Link>
      <PageHeading
        eyebrow="رحلة الشحنة"
        title={d ? 'شحنة ' + d.shipment.reference : 'تفاصيل التتبع'}
        description="الأوقات بتوقيت القاهرة. الدليل المتاح لا يثبت اتصال الجهاز حالياً."
      />
      {!allowed ? (
        <p role="alert">لا توجد صلاحية للتتبع</p>
      ) : q.error || a.authorityError ? (
        <StatePanel state="error" title="تعذر تحميل الشحنة">
          <Button onClick={() => void q.refetch()}>تحديث</Button>
        </StatePanel>
      ) : !d ? (
        <p role="status">جارٍ التحميل…</p>
      ) : (
        <>
          <article className="tracking-summary">
            <h2>{d.shipment.recipientName}</h2>
            <p>
              {d.shipment.brandName} · {d.shipment.branchName}
            </p>
            <p>
              <bdi>{d.shipment.phone}</bdi>
            </p>
            <p>{d.address}</p>
            <strong>
              {label(d.shipment.state)} · {label(d.shipment.custodian)} {d.shipment.driverName}
            </strong>
            <p>{d.nextAction}</p>
            {d.detailPath && <Link to={d.detailPath}>تفاصيل الشحنة والإجراء المتاح</Link>}
            <p className="tracking-note">التسليم المبلّغ لا يعني استلام الشركة للأموال.</p>
            {d.pendingReasons.length > 0 && (
              <p role="status" className="tracking-pending">
                الدليل غير مكتمل؛ توجد أحداث أو تبعيات بانتظار المعالجة.
              </p>
            )}
          </article>
          <h2>المحاولات</h2>
          {d.attempts.length === 0 ? (
            <p>لا توجد نتيجة محاولة معروفة.</p>
          ) : (
            d.attempts.map((x) => (
              <article className="tracking-attempt" key={x.attemptId}>
                <strong>{x.outcome ? label(x.outcome) : 'بانتظار النتيجة'}</strong>
                <span>{x.visitKnown ? 'دليل وصول متاح' : 'بانتظار دليل الوصول'}</span>
                <small>سبب الرفض التفصيلي غير متاح في المصدر الحالي.</small>
              </article>
            ))
          )}
          <h2>الخط الزمني</h2>
          <ol className="tracking-timeline">
            {d.timeline.map((e) => (
              <li key={e.id}>
                <span className="tracking-origin">{e.origin === 'ERP' ? 'النظام' : 'توصيل'}</span>
                <strong>{label(e.kind)}</strong>
                <span>سُجل: {at(e.recordedAt)}</span>
                <small>وقت الملاحظة: {at(e.observedAt)}</small>
                {e.receivedAt && <small>وصل الدليل للنظام: {at(e.receivedAt)}</small>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
