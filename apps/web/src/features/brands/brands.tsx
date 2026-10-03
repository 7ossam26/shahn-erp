import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading, Button, FormGroup, StatePanel, Input } from '@shahn/ui';
import {
  serviceKeys,
  type BrandDetail,
  type BrandFields,
  type BrandList,
  type ReferenceCatalog,
  type ServiceKey,
  type PriceSnapshot,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import {
  commercialApi,
  CommercialError,
  ErrorNotice,
  Field,
  TextField,
  displayMinor,
  inputMinor,
  serviceNames,
  useCommercialMutation,
} from './api.js';
import './brands.css';
export function useCatalog(reference = false) {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['P04-catalog', company, reference],
    queryFn: () =>
      commercialApi<ReferenceCatalog>(
        (reference ? '/reference-data' : '/brands/catalog') + '?companyId=' + company,
        'catalog',
      ),
    enabled: !!company,
    retry: false,
  });
}
export function BrandsPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [params, setParams] = useSearchParams(),
    catalog = useCatalog();
  const filters = params.toString(),
    list = useQuery({
      queryKey: ['P04-brands', company, filters],
      queryFn: () =>
        commercialApi<BrandList>(
          `/brands?companyId=${company}${filters ? '&' + filters : ''}`,
          'list',
        ),
      enabled: !!company,
      retry: false,
    });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'all') next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <>
      <PageHeading
        eyebrow="إعداد الشركة"
        title="البراندات"
        description="اتفاق واحد على مستوى الشركة. الأسعار الجديدة تطبق على الطلبات الجديدة."
      />
      <div className="commercial-actions">
        <Link to="/brands/new" className="button-link">
          إضافة براند
        </Link>
        <Link to="/brands/tariffs">أسعار الشحن</Link>
      </div>
      <div className="commercial-filters">
        <Field label="البحث عن براند">
          <Input
            value={params.get('search') ?? ''}
            onChange={(e) => set('search', e.target.value)}
          />
        </Field>
        <Field label="حالة البراند">
          <select
            value={params.get('active') ?? 'all'}
            onChange={(e) => set('active', e.target.value)}
          >
            <option value="all">كل الحالات</option>
            <option value="true">نشط</option>
            <option value="false">موقوف</option>
          </select>
        </Field>
        <Field label="الخدمة">
          <select
            value={params.get('service') ?? 'all'}
            onChange={(e) => set('service', e.target.value)}
          >
            <option value="all">كل الخدمات</option>
            {serviceKeys.map((k) => (
              <option key={k} value={k}>
                {serviceNames[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <details className="commercial-advanced">
        <summary>
          فلاتر متقدمة · {['tierId', 'partial'].filter((k) => params.has(k)).length}
        </summary>
        <div className="commercial-filters">
          <Field label="شريحة الأسعار">
            <select
              value={params.get('tierId') ?? ''}
              onChange={(e) => set('tierId', e.target.value)}
            >
              <option value="">كل الشرائح</option>
              {catalog.data?.references
                .filter((r) => r.kind === 'tier')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="التسليم الجزئي">
            <select
              value={params.get('partial') ?? 'all'}
              onChange={(e) => set('partial', e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="true">مسموح</option>
              <option value="false">غير مسموح</option>
            </select>
          </Field>
        </div>
      </details>
      {[...params].filter(([k, v]) => k !== 'page' && v !== 'all').length > 0 && (
        <div className="commercial-chips">
          {[...params]
            .filter(([k, v]) => k !== 'page' && v !== 'all')
            .map(([k, v]) => (
              <button key={k} onClick={() => set(k, '')}>
                {(
                  {
                    search: 'البحث',
                    active: 'الحالة',
                    service: 'الخدمة',
                    tierId: 'الشريحة',
                    partial: 'التسليم الجزئي',
                  } as Record<string, string>
                )[k] ?? k}
                :{' '}
                {k === 'tierId'
                  ? catalog.data?.references.find((r) => r.id === v)?.name
                  : k === 'service'
                    ? serviceNames[v as ServiceKey]
                    : v}{' '}
                ×
              </button>
            ))}
          <button onClick={() => setParams({})}>مسح الفلاتر</button>
        </div>
      )}
      <ErrorNotice error={list.error ?? catalog.error} />
      {list.isLoading && <StatePanel state="pending" title="جارٍ تحميل البراندات" />}
      {list.data && (
        <>
          <p className="muted">
            {list.data.total} براند · صفحة {list.data.page}
          </p>
          {list.data.items.length === 0 ? (
            <StatePanel state="empty" title="لا توجد براندات مطابقة" />
          ) : (
            <div className="commercial-list">
              {list.data.items.map((b) => (
                <Link key={b.id} to={'/brands/' + b.id} className="commercial-row">
                  <strong>{b.name}</strong>
                  <span>
                    {b.active ? 'نشط' : 'موقوف'} ·{' '}
                    {b.services.map((k) => serviceNames[k]).join('، ')}
                  </span>
                  <small>
                    {catalog.data?.references.find((r) => r.id === b.tierId)?.name} · النسخة{' '}
                    {b.version}
                  </small>
                </Link>
              ))}
            </div>
          )}
          <div className="commercial-actions">
            <Button
              variant="outline"
              disabled={list.data.page === 1}
              onClick={() => set('page', String(list.data!.page - 1))}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              disabled={list.data.page * list.data.limit >= list.data.total}
              onClick={() => set('page', String(list.data!.page + 1))}
            >
              التالي
            </Button>
          </div>
        </>
      )}
    </>
  );
}
const blank: BrandFields = {
  name: '',
  active: true,
  contact: null,
  externalReference: null,
  services: ['brand_packed'],
  defaultService: 'brand_packed',
  tierId: '',
  packingUpliftMinor: '0',
  partialDelivery: false,
  payoutWeekdays: [0],
  allowNegativeBalance: false,
  storage: null,
};
export function BrandSetupPage() {
  const { id } = useParams(),
    { registry } = useAccess(),
    catalog = useCatalog(),
    company = registry?.context.companyId;
  const detail = useQuery({
    queryKey: ['P04-brand', company, id],
    queryFn: () => commercialApi<BrandDetail>(`/brands/${id}?companyId=${company}`, 'detail'),
    enabled: !!company && !!id,
    retry: false,
  });
  if (catalog.isLoading || (id && detail.isLoading))
    return <StatePanel state="pending" title="جارٍ تحميل إعداد البراند" />;
  if (!catalog.data || (id && !detail.data))
    return (
      <>
        <ErrorNotice error={catalog.error ?? detail.error} />
        <Button
          variant="outline"
          onClick={() => {
            void catalog.refetch();
            void detail.refetch();
          }}
        >
          إعادة التحميل
        </Button>
      </>
    );
  return (
    <BrandEditor
      key={id ?? 'new'}
      catalog={catalog.data}
      initial={detail.data}
      reload={() => detail.refetch()}
    />
  );
}
function BrandEditor({
  catalog,
  initial,
  reload,
}: {
  catalog: ReferenceCatalog;
  initial: BrandDetail | undefined;
  reload: () => Promise<unknown>;
}) {
  const fieldsOnly = (record: BrandFields & { id?: string; version?: number }): BrandFields => {
    const { id: _id, version: _version, ...fields } = record;
    return fields;
  };
  const navigate = useNavigate(),
    [draft, setDraft] = useState<BrandFields>(fieldsOnly(initial?.brand ?? blank)),
    [version, setVersion] = useState(initial?.brand.version ?? 1),
    [uplift, setUplift] = useState(displayMinor(draft.packingUpliftMinor)),
    [fee, setFee] = useState(displayMinor(draft.storage?.monthlyFeeMinor ?? '0'));
  const update = <K extends keyof BrandFields>(key: K, value: BrandFields[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const mutation = useCommercialMutation(
    (result) => {
      setVersion(result.version);
      setSaved(true);
      navigate('/brands/' + result.entityId);
      if (initial) void reload();
    },
    'brand-' + (initial?.brand.id ?? 'new'),
  );
  const [saved, setSaved] = useState(false);
  // Keep local edits mounted when the server query refreshes. The user reviews the new version explicitly.
  const save = async () => {
    setSaved(false);
    try {
      const fields = {
        ...draft,
        packingUpliftMinor: inputMinor(uplift),
        storage: draft.storage
          ? {
              ...draft.storage,
              monthlyFeeMinor: inputMinor(fee),
              anniversaryDay: Number(draft.storage.startDate.slice(8)),
            }
          : null,
      };
      await mutation.submit(
        initial
          ? { type: 'brand.update', entityId: initial.brand.id, expectedVersion: version, fields }
          : { type: 'brand.create', fields },
      );
    } catch (e) {
      mutation.setError(e);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="البراندات"
        title={initial ? 'إعداد البراند' : 'إضافة براند'}
        description="احفظ هوية البراند وخدماته واتفاقه. تعديل الأسعار لا يغيّر لقطات الطلبات السابقة."
      />
      <Link to="/brands">قائمة البراندات</Link>
      <ErrorNotice error={mutation.error} />
      {mutation.recovery}
      {mutation.error instanceof CommercialError && mutation.error.currentVersion !== undefined && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setVersion((mutation.error as CommercialError).currentVersion!);
            void reload();
            mutation.setError(null);
          }}
        >
          احتفظ بمدخلاتي وراجع النسخة الحالية
        </Button>
      )}
      {saved && !mutation.error && !mutation.busy && (
        <p role="status">راجع نتيجة الحفظ والنسخة في سجل الاتفاق.</p>
      )}
      <form
        className="commercial-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={mutation.busy || !!mutation.pending} className="commercial-fieldset">
          <FormGroup
            title="هوية البراند"
            description="براند واحد لجميع فروع الشركة، بهوية داخلية ثابتة."
          >
            <TextField
              label="اسم البراند"
              value={draft.name}
              onChange={(v) => update('name', v)}
              required
            />
            <TextField
              label="بيانات الاتصال (اختياري)"
              value={draft.contact ?? ''}
              onChange={(v) => update('contact', v || null)}
            />
            <TextField
              label="مرجع البراند (اختياري)"
              value={draft.externalReference ?? ''}
              onChange={(v) => update('externalReference', v || null)}
            />
            <label className="commercial-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => update('active', e.target.checked)}
              />
              براند نشط
            </label>
          </FormGroup>
          <FormGroup
            title="الخدمات"
            description="كل طلب يختار خدمة واحدة. التسليم الجزئي مستقل عن اختيار المعاينة قبل الاستلام."
          >
            {serviceKeys.map((k) => (
              <label key={k} className="commercial-check">
                <input
                  type="checkbox"
                  checked={draft.services.includes(k)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...draft.services, k]
                      : draft.services.filter((s) => s !== k);
                    update('services', next);
                    if (k === 'stored_stock' && e.target.checked && !draft.storage)
                      update('storage', {
                        monthlyFeeMinor: '0',
                        startDate: '',
                        anniversaryDay: 1,
                        branchId: '',
                        active: true,
                        stopDate: null,
                      });
                  }}
                />
                {serviceNames[k]}
              </label>
            ))}
            <Field label="الخدمة الافتراضية">
              <select
                value={draft.defaultService}
                onChange={(e) => update('defaultService', e.target.value as ServiceKey)}
              >
                {serviceKeys.map((k) => (
                  <option key={k} value={k} disabled={!draft.services.includes(k)}>
                    {serviceNames[k]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="commercial-check">
              <input
                type="checkbox"
                checked={draft.partialDelivery}
                onChange={(e) => update('partialDelivery', e.target.checked)}
              />
              السماح بالتسليم الجزئي
            </label>
          </FormGroup>
          <FormGroup
            title="الشريحة والأسعار"
            description="الشريحة تُختار يدويًا حسب الاتفاق. عدد الطلبات لا يغيّرها تلقائيًا."
          >
            <Field label="الشريحة المتفق عليها">
              <select
                required
                value={draft.tierId}
                onChange={(e) => update('tierId', e.target.value)}
              >
                <option value="">اختر الشريحة</option>
                {catalog.references
                  .filter((r) => r.kind === 'tier' && (r.active || r.id === draft.tierId))
                  .map((r) => (
                    <option key={r.id} value={r.id} disabled={!r.active}>
                      {r.name}
                      {r.active ? '' : ' · موقوفة'}
                    </option>
                  ))}
              </select>
            </Field>
            <TextField label="زيادة التغليف بالجنيه" value={uplift} onChange={setUplift} required />
            <p className="muted">
              الزيادة ثابتة للتغليف والتجهيز من المخزون. الخدمة الجاهزة تستخدم سعر الشحن فقط. صفر
              قيمة صحيحة.
            </p>
            {draft.services.map((k) => (
              <p key={k} className="commercial-help">
                {serviceNames[k]}:{' '}
                {catalog.tariffs.some(
                  (t) => t.tierId === draft.tierId && t.active && t.areaId === null,
                )
                  ? 'سعر المحافظة متاح؛ راجع المحافظة المطلوبة في المعاينة.'
                  : 'يلزم سعر محافظة في الشريحة قبل تأكيد الطلب.'}
                {k === 'stored_stock' && !draft.storage ? ' أكمل اتفاق التخزين.' : ''}
              </p>
            ))}
          </FormGroup>
          <FormGroup
            title="الصرف والرصيد"
            description="هذه سياسة حالية تُقرأ عند تنفيذ الصرف أو تسليم الشحن للسائق."
          >
            <div className="commercial-weekdays">
              {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(
                (day, i) => (
                  <label className="commercial-check" key={day}>
                    <input
                      type="checkbox"
                      checked={draft.payoutWeekdays.includes(i)}
                      onChange={(e) =>
                        update(
                          'payoutWeekdays',
                          e.target.checked
                            ? [...draft.payoutWeekdays, i]
                            : draft.payoutWeekdays.filter((d) => d !== i),
                        )
                      }
                    />
                    {day}
                  </label>
                ),
              )}
            </div>
            <label className="commercial-check">
              <input
                type="checkbox"
                checked={draft.allowNegativeBalance}
                onChange={(e) => update('allowNegativeBalance', e.target.checked)}
              />
              السماح برصيد سالب
            </label>
            <p className="muted">
              عند عدم السماح، يحتاج تسليم الشحن الجديد إلى غطاء من الرصيد المؤهل وفق سياسة البراند.
            </p>
          </FormGroup>
          {draft.storage && (
            <FormGroup
              title="اتفاق التخزين"
              description="اتفاق شهري واحد حتى مع وجود المخزون في أكثر من فرع. حفظ الإعداد لا يسجل إيرادًا أو تحصيلًا."
            >
              <TextField
                label="رسم التخزين الشهري بالجنيه"
                value={fee}
                onChange={setFee}
                required
              />
              <TextField
                label="بداية الخدمة"
                type="date"
                value={draft.storage.startDate}
                onChange={(v) =>
                  update('storage', {
                    ...draft.storage!,
                    startDate: v,
                    anniversaryDay: Number(v.slice(8)),
                  })
                }
                required
              />
              <Field label="الفرع المسؤول عن الاتفاق">
                <select
                  required
                  value={draft.storage.branchId}
                  onChange={(e) =>
                    update('storage', { ...draft.storage!, branchId: e.target.value })
                  }
                >
                  <option value="">اختر الفرع</option>
                  {catalog.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="commercial-check">
                <input
                  type="checkbox"
                  checked={draft.storage.active}
                  onChange={(e) =>
                    update('storage', {
                      ...draft.storage!,
                      active: e.target.checked,
                      stopDate: e.target.checked ? null : draft.storage!.stopDate,
                    })
                  }
                />
                اتفاق التخزين نشط
              </label>
              {!draft.storage.active && (
                <TextField
                  label="تاريخ إيقاف الاتفاق"
                  type="date"
                  value={draft.storage.stopDate ?? ''}
                  onChange={(v) => update('storage', { ...draft.storage!, stopDate: v || null })}
                  required
                />
              )}
              <p className="muted">
                الفترات والتحصيل الجزئي والمقدم والاسترداد تتاح في مرحلة التخزين لاحقًا.
              </p>
            </FormGroup>
          )}
          <div className="commercial-save">
            <Button type="submit">{mutation.busy ? 'جارٍ الحفظ…' : 'حفظ البراند'}</Button>
            <span>النسخة {version} · الطلبات السابقة تحتفظ بأسعارها</span>
          </div>
        </fieldset>
      </form>
      {initial && (
        <>
          <PricingPreview
            key={initial.brand.version}
            brandId={initial.brand.id}
            catalog={catalog}
            services={initial.brand.services}
            defaultService={initial.brand.defaultService}
          />
          <details className="commercial-history">
            <summary>سجل الاتفاق · {initial.history.length} نسخة</summary>
            {initial.history.map((b) => (
              <div key={b.version}>
                <strong>
                  نسخة {b.version} · {b.name}
                </strong>
                <p>
                  {serviceNames[b.defaultService]} · زيادة {displayMinor(b.packingUpliftMinor)} ج.م
                  · {b.active ? 'نشط' : 'موقوف'}
                </p>
              </div>
            ))}
          </details>
        </>
      )}
    </>
  );
}
function PricingPreview({
  brandId,
  catalog,
  services,
  defaultService,
}: {
  brandId: string;
  catalog: ReferenceCatalog;
  services: ServiceKey[];
  defaultService: ServiceKey;
}) {
  const { registry, session } = useAccess(),
    [governorateId, setGov] = useState(''),
    [areaId, setArea] = useState(''),
    [branchId, setBranch] = useState(registry?.context.assignedBranches[0]?.id ?? ''),
    [service, setService] = useState<ServiceKey>(defaultService),
    [price, setPrice] = useState<PriceSnapshot | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const preview = async () => {
    setBusy(true);
    setError(null);
    setPrice(null);
    try {
      setPrice(
        await commercialApi<PriceSnapshot>(
          '/brands/pricing-preview',
          'preview',
          {
            companyId: registry?.context.companyId,
            input: {
              brandId,
              branchId,
              service,
              governorateId,
              areaId: areaId || null,
              goodsDueMinor: '0',
              recipientShippingMinor: '0',
            },
          },
          session?.csrfToken,
        ),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="commercial-preview">
      <h2>معاينة السعر</h2>
      <p className="muted">
        تستخدم الاتفاق المحفوظ الحالي. تأكيد الطلب لاحقًا يعيد التحقق قبل إنشاء لقطة ثابتة.
      </p>
      <ErrorNotice error={error} />
      <div className="commercial-filters">
        <Field label="فرع المعاينة">
          <select
            value={branchId}
            onChange={(e) => {
              setBranch(e.target.value);
              setPrice(null);
            }}
          >
            {registry?.context.assignedBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="خدمة المعاينة">
          <select
            value={service}
            onChange={(e) => {
              setService(e.target.value as ServiceKey);
              setPrice(null);
            }}
          >
            {services.map((k) => (
              <option key={k} value={k}>
                {serviceNames[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="محافظة المعاينة">
          <select
            value={governorateId}
            onChange={(e) => {
              setGov(e.target.value);
              setArea('');
              setPrice(null);
            }}
          >
            <option value="">اختر المحافظة</option>
            {catalog.references
              .filter((r) => r.kind === 'governorate' && r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="منطقة المعاينة (اختياري)">
          <select
            value={areaId}
            onChange={(e) => {
              setArea(e.target.value);
              setPrice(null);
            }}
          >
            <option value="">بدون منطقة</option>
            {catalog.references
              .filter((r) => r.kind === 'area' && r.parentId === governorateId && r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={busy || !governorateId || !branchId}
        onClick={() => void preview()}
      >
        معاينة السعر الحالي
      </Button>
      {price && (
        <div className="commercial-price" role="status">
          <strong data-testid="tariff-total">{displayMinor(price.tariffMinor)} ج.م</strong>
          <p>
            شحن أساسي {displayMinor(price.baseShippingMinor)} + تغليف{' '}
            {displayMinor(price.packingUpliftMinor)} ج.م
          </p>
          <p>
            {price.source === 'area_override' ? 'سعر المنطقة' : 'سعر المحافظة'} · {price.tierName} ·
            نسخة السعر {price.tariffVersion}
          </p>
          <small>أساس عمولة النسبة: {displayMinor(price.commissionBaseMinor)} ج.م</small>
        </div>
      )}
    </section>
  );
}
