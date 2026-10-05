import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeading } from '@shahn/ui';
import type {
  GoodsTransferCommand,
  GoodsTransferDesk,
  GoodsTransferResult,
  GoodsTransferView,
  TransferLineInput,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import './goods-transfers.css';

const messages: Record<string, string> = {
  FORBIDDEN_SCOPE: 'ليس لديك صلاحية لهذا الفرع أو الإجراء.',
  REVISION_CONFLICT: 'تغيّر سجل الرحلة. حدّث الصفحة وراجع الكميات قبل التأكيد.',
  STOCK_SHORTAGE: 'لم تعد الكمية السليمة غير المحجوزة كافية.',
  PREPARATION_HELD: 'تحضير الشحنة أو حجزها يحتاج مراجعة.',
  PARCEL_ALREADY_CLAIMED: 'الشحنة مرتبطة بتسليم أو رحلة أخرى.',
  RETURN_RECEIPT_REQUIRED: 'لا يمكن نقل الشحنة المرتجعة قبل تأكيد استلامها كاملة وبحالة سليمة.',
  RETURN_ALREADY_ALLOCATED: 'كميات المرتجع مستخدمة في إجراء آخر.',
  DRIVER_INACTIVE: 'المندوب لم يعد نشطاً. اختر مندوباً آخر.',
  TRANSFER_ALREADY_HANDED_OVER: 'تم تسليم البضائع بالفعل. لا يمكن إلغاء الرحلة بعد التسليم.',
  RECEIPT_QUANTITY_EXCEEDED: 'الكمية أكبر من المتبقي مع الناقل.',
  WRONG_RECEIPT_BRANCH: 'تأكيد الاستلام مسموح فقط في الفرع المقصود.',
  NOT_IN_TRANSIT: 'لم تُسلّم البضائع للناقل أو انتهى رصيد الرحلة.',
  PARCEL_INSPECTION_REQUIRED: 'افحص هوية الطرد المختوم وحالته الخارجية كوحدة كاملة.',
  COMMAND_PAYLOAD_CONFLICT:
    'استُخدم رقم الطلب نفسه لبيانات مختلفة. حدّث الحالة وأنشئ قراراً جديداً.',
  RESULT_UNKNOWN: 'لم تصل النتيجة. احتفظنا برقم الطلب الأصلي للتحقق؛ لا تسجل حركة ثانية.',
  CONNECTION_LOST: 'تعذر تحميل البيانات. أعد المحاولة.',
};
export const say = (code: string) =>
  messages[code] ?? 'تعذر إتمام الإجراء. حدّث البيانات وراجع التفاصيل.';
class ApiError extends Error {
  constructor(
    code: string,
    readonly status = 0,
  ) {
    super(code);
  }
}
export async function transferApi<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  try {
    const r = await fetch('/api/v1/goods-transfers' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    if (!r.ok)
      throw new ApiError(body && r.status >= 500 ? 'RESULT_UNKNOWN' : String(d.code), r.status);
    return d as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST');
  }
}
const api = transferApi;
export async function receiptApi<T>(path: string): Promise<T> {
  try {
    const r = await fetch('/api/v1/goods-receipts' + path, { signal: AbortSignal.timeout(15000) });
    const d = await r.json();
    if (!r.ok) throw new ApiError(String(d.code), r.status);
    return d as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('CONNECTION_LOST');
  }
}
export function useTransferIntent(key: string) {
  const [pending, setPending] = useState<GoodsTransferCommand | null>(null);
  useEffect(() => {
    try {
      setPending(JSON.parse(sessionStorage.getItem(key) ?? 'null') as GoodsTransferCommand | null);
    } catch {
      setPending(null);
    }
  }, [key]);
  const retain = (value: GoodsTransferCommand | null) => {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* The mounted immutable request remains available. */
    }
  };
  return { pending, retain };
}
export async function recoverTransferIntent(
  value: GoodsTransferCommand,
): Promise<GoodsTransferResult> {
  const screen =
    value.type === 'goods.receive' || value.type === 'goods.sourceReturn' ? 'receive' : 'send';
  return transferApi<GoodsTransferResult>(
    '/commands/' +
      value.commandId +
      '?' +
      new URLSearchParams({
        companyId: value.companyId,
        screen,
      }),
  );
}
export function TransferFilters({
  params,
  setParams,
  branches,
  drivers,
  brands,
}: {
  params: URLSearchParams;
  setParams: (next: URLSearchParams) => void;
  branches: GoodsTransferDesk['companyBranches'];
  drivers: GoodsTransferDesk['drivers'];
  brands: { id: string; name: string }[];
}) {
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setParams(next);
  };
  return (
    <div className="goods-filters">
      <label>
        رقم الرحلة أو الشحنة
        <input
          value={params.get('search') ?? ''}
          onChange={(e) => update('search', e.target.value)}
          inputMode="numeric"
        />
      </label>
      <label>
        الحالة
        <select
          value={params.get('state') ?? 'all'}
          onChange={(e) => update('state', e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="prepared">جاهزة للتسليم</option>
          <option value="in_transit">مع الناقل</option>
          <option value="closed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </label>
      <details>
        <summary>مرشحات متقدمة</summary>
        <div className="goods-filter-grid">
          {(['sourceBranchId', 'destinationBranchId'] as const).map((name) => (
            <label key={name}>
              {name === 'sourceBranchId' ? 'الفرع المرسل' : 'الفرع المستقبل'}
              <select value={params.get(name) ?? ''} onChange={(e) => update(name, e.target.value)}>
                <option value="">الكل</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            الناقل
            <select
              value={params.get('driverId') ?? ''}
              onChange={(e) => update('driverId', e.target.value)}
            >
              <option value="">الكل</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            العلامة
            <select
              value={params.get('brandId') ?? ''}
              onChange={(e) => update('brandId', e.target.value)}
            >
              <option value="">الكل</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المحتوى
            <select
              value={params.get('kind') ?? 'all'}
              onChange={(e) => update('kind', e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="parcel">طرود كاملة</option>
              <option value="loose">منتجات مخزنة</option>
            </select>
          </label>
          <label>
            نوع التاريخ
            <select
              value={params.get('dateBasis') ?? 'handover'}
              onChange={(e) => update('dateBasis', e.target.value)}
            >
              <option value="handover">تاريخ التسليم للناقل</option>
              <option value="receipt">تاريخ الاستلام الفعلي</option>
            </select>
          </label>
          <label>
            من
            <input
              type="date"
              value={params.get('from') ?? ''}
              onChange={(e) => update('from', e.target.value)}
            />
          </label>
          <label>
            إلى
            <input
              type="date"
              value={params.get('to') ?? ''}
              onChange={(e) => update('to', e.target.value)}
            />
          </label>
          <label className="goods-inline">
            <input
              type="checkbox"
              checked={params.get('discrepancy') === 'true'}
              onChange={(e) => update('discrepancy', e.target.checked ? 'true' : '')}
            />{' '}
            رصيد مع الناقل يحتاج متابعة
          </label>
        </div>
      </details>
      <button
        type="button"
        className="goods-secondary"
        onClick={() => setParams(new URLSearchParams())}
      >
        مسح المرشحات
      </button>
    </div>
  );
}
export function TransferListPage({ screen = 'send' }: { screen?: 'send' | 'receive' }) {
  const access = useAccess(),
    company = access.registry?.context.companyId;
  const [params, setParams] = useSearchParams();
  const sourceReturn = screen === 'receive' && params.get('sourceReturn') === 'true';
  const query = useQuery({
    queryKey: [
      'goods-transfers',
      screen,
      company,
      params.toString(),
      access.registry?.context.authorizationRevision,
    ],
    enabled: !!company,
    queryFn: () =>
      screen === 'send'
        ? api<GoodsTransferDesk>(
            '?' + new URLSearchParams({ companyId: company!, ...Object.fromEntries(params) }),
          )
        : receiptApi<GoodsTransferDesk>(
            '?' + new URLSearchParams({ companyId: company!, ...Object.fromEntries(params) }),
          ),
  });
  const d = query.data;
  const brands = d?.brands ?? [];
  return (
    <section className="goods-page">
      <PageHeading
        eyebrow="حركة البضائع"
        title={screen === 'send' ? 'إرسال بين الفروع' : 'استلام من فرع'}
        description="كل رحلة لها سجل واحد. الرصيد مع الناقل يبقى ظاهراً حتى الاستلام الفعلي."
      />
      <div className="goods-actions">
        {screen === 'send' ? (
          <Link to="/goods-transfers/new" className="goods-primary">
            إنشاء رحلة نقل
          </Link>
        ) : (
          <>
            <button
              className={!sourceReturn ? 'goods-primary' : 'goods-secondary'}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.delete('sourceReturn');
                setParams(n);
              }}
            >
              وارد الفرع
            </button>
            <button
              className={sourceReturn ? 'goods-primary' : 'goods-secondary'}
              onClick={() => {
                const n = new URLSearchParams(params);
                n.set('sourceReturn', 'true');
                setParams(n);
              }}
            >
              مرتجع فعلي للمصدر
            </button>
          </>
        )}
      </div>
      {d && (
        <TransferFilters
          params={params}
          setParams={setParams}
          branches={d.companyBranches}
          drivers={d.drivers}
          brands={brands}
        />
      )}
      {query.isPending && <p role="status">جارٍ تحميل الرحلات…</p>}
      {query.isError && <p role="alert">{say((query.error as Error).message)}</p>}
      {d && !d.items.length && (
        <p>لا توجد رحلات لهذه المرشحات. يمكن مسح المرشحات للمراجعة من جديد.</p>
      )}
      <div className="goods-list">
        {d?.items.map((m) => (
          <Link
            key={m.id}
            to={`${screen === 'send' ? '/goods-transfers' : '/goods-receipts'}/${m.id}${sourceReturn ? '?sourceReturn=true' : ''}`}
            className="goods-card"
          >
            <strong>
              رحلة <bdi>{m.reference}</bdi>
            </strong>
            <span>
              من {m.sourceBranchName} إلى {m.destinationBranchName}
            </span>
            <span>الناقل: {m.driverName}</span>
            <span>
              طرود: {m.lines.filter((l) => l.kind === 'parcel').length} · قطع مخزنة:{' '}
              {m.lines.filter((l) => l.kind === 'loose').reduce((n, l) => n + l.quantity, 0)}
            </span>
            <span>
              {m.state === 'prepared'
                ? 'جاهزة للتسليم'
                : m.state === 'in_transit'
                  ? 'مع الناقل — المتبقي ظاهر بالتفصيل'
                  : m.state === 'closed'
                    ? 'مكتملة'
                    : 'ملغاة قبل التسليم'}
            </span>
          </Link>
        ))}
      </div>
      {d && d.total > 25 && (
        <nav className="goods-actions" aria-label="الصفحات">
          <button
            disabled={d.page <= 1}
            onClick={() => {
              const n = new URLSearchParams(params);
              n.set('page', String(d.page - 1));
              setParams(n);
            }}
          >
            السابق
          </button>
          <span>صفحة {d.page}</span>
          <button
            disabled={d.page * 25 >= d.total}
            onClick={() => {
              const n = new URLSearchParams(params);
              n.set('page', String(d.page + 1));
              setParams(n);
            }}
          >
            التالي
          </button>
        </nav>
      )}
    </section>
  );
}

type Eligible = {
  stock: {
    brandId: string;
    brandName: string;
    variantId: string;
    variantName: string;
    available: number;
  }[];
  parcels: {
    shipmentId: string;
    reference: string;
    brandId: string;
    brandName: string;
    version: number;
    service: string;
    returned: boolean;
  }[];
};
type Candidate = GoodsTransferDesk['drivers'][number];
export function TransferNewPage() {
  const access = useAccess(),
    company = access.registry?.context.companyId,
    navigate = useNavigate();
  const [source, setSource] = useState(''),
    [destination, setDestination] = useState(''),
    [driver, setDriver] = useState('');
  const [parcels, setParcels] = useState<string[]>([]),
    [loose, setLoose] = useState<Record<string, number>>({});
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const key = `P15:create:${access.session?.principalId}:${company}`;
  const { pending, retain } = useTransferIntent(key);
  const desk = useQuery({
    queryKey: ['goods-new', company],
    enabled: !!company,
    queryFn: () => api<GoodsTransferDesk>('?companyId=' + company),
  });
  const eligible = useQuery({
    queryKey: ['goods-eligible', company, source],
    enabled: !!company && !!source,
    queryFn: () =>
      api<Eligible>(
        '/eligible?' + new URLSearchParams({ companyId: company!, sourceBranchId: source }),
      ),
  });
  const carriers = useQuery({
    queryKey: ['goods-carriers', company, source],
    enabled: !!company && !!source,
    queryFn: () =>
      api<{ items: Candidate[] }>(
        '/carriers?' + new URLSearchParams({ companyId: company!, sourceBranchId: source }),
      ),
  });
  const submit = async (value: GoodsTransferCommand) => {
    setBusy(true);
    setError('');
    retain(value);
    try {
      const r = await api<GoodsTransferResult>('/commands', value, access.session?.csrfToken);
      retain(null);
      navigate('/goods-transfers/' + r.manifestId);
    } catch (e) {
      const x = e as ApiError;
      setError(say(x.message));
      if (x.status > 0 && x.status < 500) retain(null);
    } finally {
      setBusy(false);
    }
  };
  const recover = async (value: GoodsTransferCommand) => {
    setBusy(true);
    setError('');
    try {
      const r = await recoverTransferIntent(value);
      retain(null);
      navigate('/goods-transfers/' + r.manifestId);
    } catch (e) {
      const x = e as ApiError;
      if (x.status === 404) {
        setBusy(false);
        await submit(value);
        return;
      }
      setError(say(x.message));
      if (x.status > 0 && x.status < 500) retain(null);
    } finally {
      setBusy(false);
    }
  };
  const prepare = () => {
    if (!company || !source || !destination || !driver || !eligible.data) return;
    const lines: TransferLineInput[] = [
      ...eligible.data.parcels
        .filter((p) => parcels.includes(p.shipmentId))
        .map((p) => ({
          kind: 'parcel' as const,
          shipmentId: p.shipmentId,
          expectedVersion: p.version,
        })),
      ...eligible.data.stock
        .filter((s) => (loose[s.variantId] ?? 0) > 0)
        .map((s) => ({
          kind: 'loose' as const,
          brandId: s.brandId,
          variantId: s.variantId,
          quantity: loose[s.variantId]!,
        })),
    ];
    if (!lines.length) {
      setError('اختر طرداً أو كمية مخزنة واحدة على الأقل.');
      return;
    }
    void submit({
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
      companyId: company,
      branchId: source,
      type: 'goods.create',
      destinationBranchId: destination,
      driverId: driver,
      plannedAt: new Date().toISOString(),
      lines,
    });
  };
  return (
    <section className="goods-page">
      <PageHeading
        eyebrow="رحلة جديدة"
        title="تجهيز نقل بين الفروع"
        description="التجهيز يحجز البضائع فقط. سجّل التسليم الفعلي للناقل في صفحة الرحلة بعد المعاينة."
      />
      <div className="goods-form-grid">
        <label>
          الفرع المرسل
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setParcels([]);
              setLoose({});
              setDriver('');
            }}
          >
            <option value="">اختر فرعك</option>
            {desk.data?.assignedBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع المستقبل
          <select value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="">اختر الفرع</option>
            {desk.data?.companyBranches
              .filter((b) => b.id !== source)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          الناقل
          <select value={driver} onChange={(e) => setDriver(e.target.value)}>
            <option value="">اختر مندوباً نشطاً</option>
            {(carriers.data?.items ?? desk.data?.drivers ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ·{' '}
                {d.round
                  ? 'في جولة توصيل'
                  : d.status === 'known' && d.atSourceBranch
                    ? 'شوهد بالفرع دون جولة'
                    : 'الموقع غير مؤكد'}{' '}
                ·{' '}
                {d.status === 'unknown'
                  ? 'لا دليل حديث'
                  : d.evidenceAt
                    ? new Date(d.evidenceAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })
                    : 'الدليل غير معروف'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {carriers.isError && (
        <p role="status">
          تعذرت قراءة متابعة توصيل الآن؛ يظل الناقل النشط متاحاً للاختيار. حدّث الصفحة لمعرفة عمر
          الدليل.
        </p>
      )}
      {eligible.isPending && source && <p role="status">جارٍ تحميل البضائع المؤهلة…</p>}
      {eligible.data && (
        <>
          <h2>الطرود الكاملة</h2>
          <div className="goods-picker">
            {eligible.data.parcels.map((p) => (
              <label key={p.shipmentId}>
                <input
                  type="checkbox"
                  checked={parcels.includes(p.shipmentId)}
                  onChange={(e) =>
                    setParcels(
                      e.target.checked
                        ? [...parcels, p.shipmentId]
                        : parcels.filter((id) => id !== p.shipmentId),
                    )
                  }
                />
                <span>
                  شحنة <bdi>{p.reference}</bdi> · {p.brandName}{' '}
                  {p.returned ? '· مرتجع مستلم فعلياً' : ''}
                </span>
              </label>
            ))}
          </div>
          <h2>منتجات مخزنة غير محجوزة</h2>
          <div className="goods-picker">
            {eligible.data.stock.map((s) => (
              <label key={s.variantId}>
                <span>
                  {s.brandName} · {s.variantName} · المتاح {s.available}
                </span>
                <input
                  type="number"
                  min="0"
                  max={s.available}
                  step="1"
                  value={loose[s.variantId] ?? 0}
                  onChange={(e) => setLoose({ ...loose, [s.variantId]: Number(e.target.value) })}
                />
              </label>
            ))}
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {pending && (
        <p role="status">
          طلب تجهيز سابق محفوظ. استعد نتيجته أو أعد إرسال الطلب نفسه قبل قرار جديد.
        </p>
      )}
      <div className="goods-actions">
        <button className="goods-primary" disabled={busy || !!pending} onClick={prepare}>
          تجهيز وحجز محتويات الرحلة
        </button>
        {pending && (
          <button className="goods-secondary" disabled={busy} onClick={() => void recover(pending)}>
            استعادة نتيجة الطلب الأصلي
          </button>
        )}
      </div>
    </section>
  );
}

export function TransferDetailPage() {
  const { id } = useParams(),
    access = useAccess(),
    company = access.registry?.context.companyId;
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const key = `P15:handover:${access.session?.principalId}:${company}:${id}`;
  const { pending, retain } = useTransferIntent(key);
  const query = useQuery({
    queryKey: ['goods-detail', company, id, access.registry?.context.authorizationRevision],
    enabled: !!company && !!id,
    queryFn: () => api<GoodsTransferView>('/' + id + '?companyId=' + company),
    refetchInterval: 5000,
  });
  const d = query.data;
  const submit = async (value: GoodsTransferCommand) => {
    setBusy(true);
    setError('');
    retain(value);
    try {
      await api<GoodsTransferResult>('/commands', value, access.session?.csrfToken);
      retain(null);
      await query.refetch();
    } catch (e) {
      const x = e as ApiError;
      setError(say(x.message));
      if (x.status > 0 && x.status < 500) retain(null);
    } finally {
      setBusy(false);
    }
  };
  const recover = async (value: GoodsTransferCommand) => {
    setBusy(true);
    setError('');
    try {
      await recoverTransferIntent(value);
      retain(null);
      await query.refetch();
    } catch (e) {
      const x = e as ApiError;
      if (x.status === 404) {
        setBusy(false);
        await submit(value);
        return;
      }
      setError(say(x.message));
      if (x.status > 0 && x.status < 500) retain(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="goods-page">
      <PageHeading
        eyebrow="تفاصيل الرحلة"
        title={d ? `رحلة ${d.reference}` : 'الرحلة'}
        description="الحجز والتسليم والاستلام أحداث مختلفة. لا تتغير الكميات الفيزيائية عند التجهيز."
      />
      {query.isPending && <p role="status">جارٍ تحميل السجل…</p>}
      {query.isError && <p role="alert">{say((query.error as Error).message)}</p>}
      {d && (
        <>
          <p>
            من {d.sourceBranchName} إلى {d.destinationBranchName} · الناقل {d.driverName}
          </p>
          <p>
            الحالة:{' '}
            {d.state === 'prepared'
              ? 'جاهزة — لا تزال في المصدر'
              : d.state === 'in_transit'
                ? 'مع الناقل'
                : d.state === 'closed'
                  ? 'استلمت جميع الكميات'
                  : 'ألغيت قبل التسليم'}
          </p>
          <ul className="goods-lines">
            {d.lines.map((l) => (
              <li key={l.id}>
                {l.kind === 'parcel' ? `طرد ${l.shipmentReference}` : l.variantName} · {l.brandName}{' '}
                · الكمية {l.quantity} · المتبقي مع الناقل{' '}
                {d.state === 'prepared' ? 'لم يبدأ النقل' : l.remaining}
              </li>
            ))}
          </ul>
          {d.state === 'prepared' && (
            <>
              <p className="goods-warning">
                تأكيد التسليم يعني أن البضائع خرجت فعلياً من الفرع إلى المندوب. راجع كل الطرود
                والكميات أولاً.
              </p>
              <div className="goods-actions">
                <button
                  className="goods-primary"
                  disabled={busy || !!pending}
                  onClick={() =>
                    void submit({
                      schemaVersion: 1,
                      commandId: crypto.randomUUID(),
                      companyId: company!,
                      branchId: d.sourceBranchId,
                      type: 'goods.handover',
                      manifestId: d.id,
                      expectedVersion: d.version,
                      actualAt: new Date().toISOString(),
                    })
                  }
                >
                  تأكيد التسليم الفعلي للناقل
                </button>
                <button
                  className="goods-secondary"
                  disabled={busy || !!pending}
                  onClick={() =>
                    void submit({
                      schemaVersion: 1,
                      commandId: crypto.randomUUID(),
                      companyId: company!,
                      branchId: d.sourceBranchId,
                      type: 'goods.cancel',
                      manifestId: d.id,
                      expectedVersion: d.version,
                      actualAt: new Date().toISOString(),
                    })
                  }
                >
                  إلغاء التجهيز
                </button>
              </div>
            </>
          )}
          {d.state === 'in_transit' && (
            <p>
              استلام الفرع المقصود أو الرجوع الفعلي للمصدر يُسجل من شاشة{' '}
              <Link to="/goods-receipts">استلام البضائع</Link>.
            </p>
          )}
          <h2>سجل الاستلام</h2>
          {!d.receipts.length && <p>لم يُسجل استلام فعلي بعد.</p>}
          {d.receipts.map((r) => (
            <p key={r.id}>
              {r.kind === 'destination' ? 'استلام الوجهة' : 'رجوع فعلي للمصدر'} · {r.actorName} ·{' '}
              {new Date(r.actualAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} ·{' '}
              {r.lines.reduce((n, l) => n + l.sound + l.damaged + l.uncertain, 0)} وحدة
            </p>
          ))}
        </>
      )}
      {pending && (
        <button className="goods-secondary" disabled={busy} onClick={() => void recover(pending)}>
          التحقق من نتيجة الطلب الأصلي
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
