import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  PageHeading,
  FormGroup,
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shahn/ui';
import { cairoDate } from '@shahn/domain';
import type { ReceiptDetail, StockList, StockRow, VariantHistory } from '@shahn/contracts';
import { Field, ErrorNotice, CommercialError } from '../brands/api.js';
import { conditionNames, inventoryApi, useInventoryCatalog, useInventoryMutation } from './api.js';
import './inventory.css';
import { ParcelMonitorPage } from '../preparation/preparation.js';
export function Balances({ row }: { row: StockRow }) {
  return (
    <dl className="stock-balances">
      {[
        ['الموجود فعليًا', row.physicalOnHand],
        ['السليم', row.soundOnHand],
        ['المحجوز', row.reserved],
        ['المتاح', row.available],
        ['غير المتاح', row.unavailableOnHand],
        ['عجز الحجز', row.reservationShortage],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={label === 'عجز الحجز' && Number(value) > 0 ? 'stock-shortage' : ''}>
            <bdi>{Number(value).toLocaleString('ar-EG')}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function InventoryPage() {
  const [params] = useSearchParams();
  return params.get('view') === 'parcels' ? (
    <ParcelMonitorPage inventory />
  ) : (
    <ProductInventoryPage />
  );
}
function ProductInventoryPage() {
  const catalog = useInventoryCatalog(),
    [params, setParams] = useSearchParams(),
    [advanced, setAdvanced] = useState(false),
    company = catalog.company,
    branches = catalog.access.registry?.context.assignedBranches ?? [];
  const selected = params.get('branches') ?? (branches.length === 1 ? branches[0]!.id : ''),
    view = params.get('view') ?? 'products';
  const valid = selected
    .split(',')
    .filter(Boolean)
    .every((id) => branches.some((b) => b.id === id));
  const change = (key: string, value: string) => {
    if (key === 'view' && value === 'parcels') {
      const parcelParams = new URLSearchParams({ view: 'parcels' });
      if (selected) parcelParams.set('branches', selected);
      if (params.get('search')) parcelParams.set('search', params.get('search')!);
      setParams(parcelParams);
      return;
    }
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };
  useEffect(() => {
    if (selected && !valid && catalog.access.registry && !catalog.access.authorityError) {
      const next = new URLSearchParams(params);
      next.delete('branches');
      next.delete('page');
      setParams(next, { replace: true });
    }
  }, [selected, valid, params, setParams, catalog.access.registry, catalog.access.authorityError]);
  const query = new URLSearchParams(params);
  query.delete('view');
  query.set('companyId', company ?? '');
  query.set('branches', selected);
  if (view === 'parcels')
    for (const key of [...query.keys()])
      if (!['companyId', 'branches', 'custody'].includes(key)) query.delete(key);
      else query.delete('custody');
  const list = useQuery({
    queryKey: [
      'inventory',
      company,
      catalog.access.registry?.context.authorizationRevision,
      view,
      query.toString(),
    ],
    queryFn: () =>
      inventoryApi<StockList | { items: []; total: 0; boundary: string; custody: string }>(
        '/inventory/' + view + '?' + query,
        view,
      ),
    enabled: !!company && !!selected && valid && !catalog.access.authorityError,
    retry: false,
  });
  const activeKeys = [
    'search',
    'brands',
    'productId',
    'variantId',
    'categories',
    'noAvailable',
    'movementFrom',
    'movementTo',
  ].filter((k) => params.get(k));
  const back = encodeURIComponent('/inventory?' + params.toString());

  const [draft, setDraft] = useState(() => new URLSearchParams(params));
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const changeDraft = (key: string, value: string) => {
    const next = new URLSearchParams(draft);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setDraft(next);
  };
  const advancedContent = (
    <>
      <div id="stock-advanced" className="stock-filters">
        <Field label="المنتج">
          <select
            value={draft.get('productId') ?? ''}
            onChange={(e) => {
              const next = new URLSearchParams(draft);
              next.set('productId', e.target.value);
              next.delete('variantId');
              next.delete('page');
              setDraft(next);
            }}
          >
            <option value="">كل المنتجات</option>
            {catalog.data?.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="المتغير">
          <select
            value={draft.get('variantId') ?? ''}
            onChange={(e) => changeDraft('variantId', e.target.value)}
          >
            <option value="">كل المتغيرات</option>
            {catalog.data?.products
              .filter((p) => !draft.get('productId') || p.id === draft.get('productId'))
              .flatMap((p) =>
                p.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {p.name} · {v.name} · {v.options}
                  </option>
                )),
              )}
          </select>
        </Field>
        <fieldset className="stock-categories">
          <legend>فئات المخزون — أي فئة مختارة</legend>
          {(['available', 'reserved', 'unavailable', 'shortage'] as const).map((key, i) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={(draft.get('categories') ?? '').split(',').includes(key)}
                onChange={(e) => {
                  const values = new Set(
                    (draft.get('categories') ?? '').split(',').filter(Boolean),
                  );
                  if (e.target.checked) values.add(key);
                  else values.delete(key);
                  changeDraft('categories', [...values].join(','));
                }}
              />
              {['متاح', 'محجوز', 'غير متاح', 'عجز'][i]}
            </label>
          ))}
        </fieldset>
        <label>
          <input
            type="checkbox"
            checked={draft.get('noAvailable') === 'true'}
            onChange={(e) => changeDraft('noAvailable', e.target.checked ? 'true' : '')}
          />
          بدون مخزون متاح
        </label>
        <Field label="حركة مسجلة من">
          <Input
            type="date"
            value={draft.get('movementFrom') ?? ''}
            onChange={(e) => changeDraft('movementFrom', e.target.value)}
          />
        </Field>
        <Field label="حركة مسجلة إلى">
          <Input
            type="date"
            value={draft.get('movementTo') ?? ''}
            onChange={(e) => changeDraft('movementTo', e.target.value)}
          />
        </Field>
        <p>
          التاريخ يختار الأرصدة التي شهدت حركة في الفترة بتوقيت القاهرة؛ الكميات المعروضة تظل حالية.
        </p>
      </div>
      <div className="stock-pagination">
        <Button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(draft);
            next.delete('page');
            setParams(next);
            setAdvanced(false);
          }}
        >
          تطبيق الفلاتر
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const next = new URLSearchParams(draft);
            for (const key of [
              'productId',
              'variantId',
              'categories',
              'noAvailable',
              'movementFrom',
              'movementTo',
            ])
              next.delete(key);
            setDraft(next);
          }}
        >
          إعادة ضبط المتقدمة
        </Button>
      </div>
    </>
  );

  return (
    <div className="inventory-page">
      <PageHeading
        eyebrow="متابعة يومية"
        title="المخزون"
        description="اعرف الموجود في الفرع، وما يمكن وعد العميل به، وما يحتاج مراجعة."
      />
      <Link className="commercial-primary" to="/inventory/receipts/new">
        تسجيل استلام مخزون
      </Link>
      <p className="scope-note">
        المخزون الفعلي داخل فروعك فقط. الحجز مطالبة ضمن الموجود؛ لا يضيف وحدات جديدة.
      </p>
      <ErrorNotice error={catalog.error ?? catalog.access.authorityError} />
      <section className="stock-panel">
        <div className="stock-switch" role="group" aria-label="نوع المخزون">
          <Button
            variant={view === 'products' ? 'default' : 'outline'}
            aria-pressed={view === 'products'}
            onClick={() => change('view', 'products')}
          >
            المنتجات
          </Button>
          <Button
            variant={view === 'parcels' ? 'default' : 'outline'}
            aria-pressed={view === 'parcels'}
            onClick={() => change('view', 'parcels')}
          >
            الطرود
          </Button>
        </div>
        <div className="stock-filters">
          <Field label="الفرع">
            {branches.length === 1 ? (
              <Input readOnly value={branches[0]!.name} />
            ) : (
              <select
                value={valid ? selected : ''}
                onChange={(e) => change('branches', e.target.value)}
              >
                <option value="">اختر الفرع الحالي</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                <option value={branches.map((b) => b.id).join(',')}>كل فروعك المعينة</option>
              </select>
            )}
          </Field>
          {view === 'products' ? (
            <>
              <Field label="بحث">
                <Input
                  value={params.get('search') ?? ''}
                  onChange={(e) => change('search', e.target.value)}
                  placeholder="البراند أو المنتج أو المتغير…"
                  maxLength={180}
                />
              </Field>
              <Field label="البراند">
                <select
                  value={params.get('brands') ?? ''}
                  onChange={(e) => change('brands', e.target.value)}
                >
                  <option value="">كل البراندات</option>
                  {catalog.data?.brands.map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <Field label="موقع العهدة">
              <select
                value={params.get('custody') ?? 'branch'}
                onChange={(e) => change('custody', e.target.value)}
              >
                <option value="branch">داخل الفرع</option>
                <option value="external">خارج مخزون الفرع — السائق أو الناقل</option>
              </select>
            </Field>
          )}
        </div>
        {view === 'products' && (
          <>
            <Button
              variant="ghost"
              aria-expanded={advanced}
              aria-controls="stock-advanced"
              onClick={() => {
                setDraft(new URLSearchParams(params));
                setAdvanced((v) => !v);
              }}
            >
              فلاتر متقدمة ({activeKeys.length})
            </Button>
            {advanced && !mobile && <section>{advancedContent}</section>}
            <Dialog open={advanced && mobile} onOpenChange={setAdvanced}>
              <DialogContent className="stock-filter-dialog">
                <DialogTitle>فلاتر متقدمة</DialogTitle>
                <DialogDescription>حدد الفلاتر ثم طبقها. الأرصدة تظل حالية.</DialogDescription>
                {advancedContent}
              </DialogContent>
            </Dialog>
          </>
        )}
        {activeKeys.length > 0 && (
          <div className="stock-chips" aria-label="الفلاتر النشطة">
            {activeKeys.map((k) => (
              <span key={k}>
                {
                  (
                    {
                      search: 'بحث',
                      brands: 'براند',
                      productId: 'منتج',
                      variantId: 'متغير',
                      categories: 'فئات',
                      noAvailable: 'بدون متاح',
                      movementFrom: 'حركة من',
                      movementTo: 'حركة إلى',
                    } as Record<string, string>
                  )[k]
                }
                :{' '}
                {k === 'categories'
                  ? (params.get(k) ?? '')
                      .split(',')
                      .map(
                        (v) =>
                          (
                            ({
                              available: 'متاح',
                              reserved: 'محجوز',
                              unavailable: 'غير متاح',
                              shortage: 'عجز',
                            }) as Record<string, string>
                          )[v] ?? v,
                      )
                      .join('، ')
                  : k === 'noAvailable'
                    ? 'نعم'
                    : ['productId', 'variantId', 'brands'].includes(k)
                      ? 'محدد'
                      : params.get(k)}
              </span>
            ))}
            <Button
              variant="ghost"
              onClick={() => {
                const next = new URLSearchParams();
                if (selected) next.set('branches', selected);
                next.set('view', view);
                setParams(next);
              }}
            >
              مسح الفلاتر
            </Button>
          </div>
        )}
        <ErrorNotice error={list.error} />
        {!selected && <p role="status">اختر فرعًا لعرض المخزون الحالي.</p>}
        {list.isFetching && <p role="status">جارٍ تحميل المخزون…</p>}
        {selected &&
          valid &&
          !catalog.access.authorityError &&
          !list.error &&
          list.data &&
          (view === 'parcels' ? (
            <div className="stock-empty">
              <h2>لا توجد طرود مسجلة بعد</h2>
              <p>
                تسجيل الطرود وعهدتها يتاح في مرحلة لاحقة. اختيار العهدة هنا يحدد نطاق القراءة فقط؛
                لا يضيف مخزونًا متاحًا للفرع.
              </p>
            </div>
          ) : (
            <>
              <p>{list.data.total.toLocaleString('ar-EG')} نتيجة · أرصدة حالية</p>
              {(list.data as StockList).items.length === 0 ? (
                <p className="stock-empty">
                  لا توجد نتائج بهذه الفلاتر. امسح الفلاتر أو عرّف منتجات البراند أولًا.
                </p>
              ) : (
                <div className="stock-rows">
                  {(list.data as StockList).items.map((row) => (
                    <article className="stock-row" key={row.branchId + row.variantId}>
                      <div>
                        <p className="muted">
                          {row.brandName} · {row.branchName}
                        </p>
                        <h2>
                          <Link
                            to={`/inventory/variants/${row.variantId}?branchId=${row.branchId}&back=${back}`}
                          >
                            {row.productName} · {row.variantName}
                          </Link>
                        </h2>
                        <p>
                          {row.options} {!row.active && '· موقوف للاستخدام الجديد'}
                        </p>
                      </div>
                      <Balances row={row} />
                      <p className="muted">
                        آخر حركة:{' '}
                        {row.lastMovementAt
                          ? new Date(row.lastMovementAt).toLocaleString('ar-EG', {
                              timeZone: 'Africa/Cairo',
                            })
                          : 'لم تسجل حركة'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
              <div className="stock-pagination">
                <Button
                  variant="outline"
                  disabled={Number(params.get('page') ?? 1) <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('page', String(Number(params.get('page') ?? 1) - 1));
                    setParams(next);
                  }}
                >
                  السابق
                </Button>
                <span>صفحة {(list.data as StockList).page.toLocaleString('ar-EG')}</span>
                <Button
                  variant="outline"
                  disabled={
                    (list.data as StockList).page * (list.data as StockList).limit >=
                    list.data.total
                  }
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('page', String(Number(params.get('page') ?? 1) + 1));
                    setParams(next);
                  }}
                >
                  التالي
                </Button>
                <Field label="نتائج الصفحة">
                  <select
                    value={params.get('limit') ?? '25'}
                    onChange={(e) => change('limit', e.target.value)}
                  >
                    {[25, 50, 100].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          ))}
        <div className="stock-setup-links">
          <p>تعريف المنتجات لا يستلم مخزونًا.</p>
          {catalog.data?.brands.map((b) => (
            <Link key={b.id} to={`/brands/${b.id}/products`}>
              منتجات {b.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
export function ReceiptPage() {
  const catalog = useInventoryCatalog(),
    navigate = useNavigate(),
    [branch, setBranch] = useState(''),
    [brand, setBrand] = useState(''),
    [actualDate, setDate] = useState(cairoDate(new Date())),
    [review, setReview] = useState(false),
    [lines, setLines] = useState([
      { variantId: '', quantity: '', condition: 'sound' as 'sound' | 'damaged' | 'uncertain' },
    ]);
  const branches = catalog.access.registry?.context.assignedBranches ?? [],
    branchId = branches.length === 1 ? branches[0]!.id : branch,
    validBranch = branches.some((b) => b.id === branchId);
  const mutation = useInventoryMutation('receipt', (result) =>
      navigate('/inventory/receipts/' + result.entityId),
    ),
    variants =
      catalog.data?.products
        .filter((p) => p.brandId === brand && p.active)
        .flatMap((p) =>
          p.variants.filter((v) => v.active).map((v) => ({ ...v, productName: p.name })),
        ) ?? [];
  const disabled = mutation.busy || !!mutation.pending;
  return (
    <div className="inventory-page">
      <PageHeading
        eyebrow="استلام فعلي"
        title="تسجيل استلام مخزون"
        description="أكد فقط وحدات وصلت بالفعل إلى الفرع. المسودة أو وعد المورد لا يزيدان المخزون."
      />
      <ErrorNotice error={mutation.error ?? catalog.error ?? catalog.access.authorityError} />
      {mutation.recovery}
      <form
        className="commercial-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!validBranch) {
            mutation.setError(new CommercialError('FORBIDDEN_SCOPE', 403));
            return;
          }
          if (!review) {
            const values = lines.map((l) =>
              Number(l.quantity.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))),
            );
            if (
              values.some((n) => !Number.isSafeInteger(n) || n <= 0) ||
              lines.some((l) => !variants.some((v) => v.id === l.variantId))
            ) {
              mutation.setError(new CommercialError('INVALID_QUANTITY', 400));
              return;
            }
            setReview(true);
            return;
          }
          void mutation.submit({
            type: 'stock.receive',
            branchId,
            brandId: brand,
            actualDate,
            lines: lines.map((l) => ({
              ...l,
              quantity: Number(l.quantity.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))),
            })),
          });
        }}
      >
        <fieldset disabled={disabled || review}>
          <FormGroup description="" title="مكان وتاريخ الاستلام">
            <div className="stock-filters">
              <Field label="فرع الاستلام">
                {branches.length === 1 ? (
                  <Input readOnly value={branches[0]!.name} />
                ) : (
                  <select
                    required
                    value={validBranch ? branch : ''}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    <option value="">اختر الفرع</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="البراند">
                <select
                  required
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setLines([{ variantId: '', quantity: '', condition: 'sound' }]);
                  }}
                >
                  <option value="">اختر البراند</option>
                  {catalog.data?.brands
                    .filter((b) => b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="تاريخ الاستلام الفعلي">
                <Input
                  type="date"
                  required
                  max={cairoDate(new Date())}
                  value={actualDate}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </div>
            <p>تاريخ قديم يحتفظ بوقت التسجيل الحالي؛ التاريخ المستقبلي مرفوض.</p>
          </FormGroup>
          <FormGroup description="" title="الكميات والحالة">
            <p>السليم يصبح متاحًا. التالف أو غير المؤكد يبقى ضمن الموجود وغير متاح.</p>
            {lines.map((line, index) => (
              <div className="receipt-line" key={index}>
                <Field label={`المتغير ${index + 1}`}>
                  <select
                    required
                    value={line.variantId}
                    onChange={(e) =>
                      setLines((old) =>
                        old.map((l, i) => (i === index ? { ...l, variantId: e.target.value } : l)),
                      )
                    }
                  >
                    <option value="">اختر المتغير</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.productName} · {v.name} · {v.options}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`الكمية ${index + 1}`}>
                  <Input
                    required
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((old) =>
                        old.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)),
                      )
                    }
                  />
                </Field>
                <Field label={`الحالة ${index + 1}`}>
                  <select
                    value={line.condition}
                    onChange={(e) =>
                      setLines((old) =>
                        old.map((l, i) =>
                          i === index
                            ? { ...l, condition: e.target.value as typeof line.condition }
                            : l,
                        ),
                      )
                    }
                  >
                    {Object.entries(conditionNames).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLines((old) => old.filter((_, i) => i !== index))}
                  >
                    حذف السطر {index + 1}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={lines.length >= 100}
              onClick={() =>
                setLines((old) => [...old, { variantId: '', quantity: '', condition: 'sound' }])
              }
            >
              إضافة سطر
            </Button>
          </FormGroup>
        </fieldset>
        {review && (
          <section className="stock-confirm" aria-label="مراجعة الاستلام">
            <h2>مراجعة الاستلام</h2>
            <p>
              الفرع: {branches.find((b) => b.id === branchId)?.name ?? 'لم يعد متاحًا'} · البراند:{' '}
              {catalog.data?.brands.find((b) => b.id === brand)?.name} ·{' '}
              <bdi className="inventory-date">{actualDate}</bdi>
            </p>
            {lines.map((l, i) => (
              <p key={i}>
                {variants.find((v) => v.id === l.variantId)?.name}: <bdi>{l.quantity}</bdi> وحدة ·{' '}
                {conditionNames[l.condition]}
              </p>
            ))}
            <p>التأكيد يسجل وصول هذه الوحدات فعليًا ويثبت سجلًا لا يمكن تعديل كمياته.</p>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setReview(false)}
            >
              تعديل المراجعة
            </Button>
          </section>
        )}
        <Button
          type="submit"
          disabled={disabled || !validBranch || !!catalog.access.authorityError}
        >
          {mutation.busy ? 'جارٍ التسجيل…' : review ? 'تأكيد الاستلام الفعلي' : 'مراجعة الاستلام'}
        </Button>
      </form>
    </div>
  );
}
export function ReceiptDetailPage() {
  const { id } = useParams(),
    catalog = useInventoryCatalog(),
    company = catalog.company;
  const query = useQuery({
    queryKey: ['receipt', id, company, catalog.access.registry?.context.authorizationRevision],
    queryFn: () =>
      inventoryApi<ReceiptDetail>(`/inventory/receipts/${id}?companyId=${company}`, 'receipt'),
    enabled: !!company && !catalog.access.authorityError,
    retry: false,
  });
  const row = query.data;
  return (
    <div className="inventory-page">
      <PageHeading
        eyebrow="سجل ثابت"
        title={row ? 'استلام مخزون ' + row.reference : 'تفاصيل الاستلام'}
        description="الكميات المثبتة تبقى في التاريخ؛ أي تصحيح لاحق له سجل مرتبط."
      />
      <ErrorNotice error={query.error ?? catalog.access.authorityError} />
      {query.isLoading && <p role="status">جارٍ التحميل…</p>}
      {row && !query.error && !catalog.access.authorityError && (
        <section className="stock-panel">
          <p>
            {row.branchName} · {row.brandName}
          </p>
          <p>
            الاستلام الفعلي: <bdi className="inventory-date">{row.actualDate}</bdi> · وقت التسجيل:{' '}
            {new Date(row.recordedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} ·{' '}
            {row.actorName}
          </p>
          {row.lines.map((l) => (
            <article key={l.id} className="stock-row">
              <h2>
                {l.productName} · {l.variantName}
              </h2>
              <p>
                {l.options} · {l.quantity.toLocaleString('ar-EG')} وحدة ·{' '}
                {conditionNames[l.condition]}
              </p>
              <Link
                to={`/inventory/variants/${l.variantId}?branchId=${row.branchId}&back=${encodeURIComponent('/inventory/receipts/' + row.id)}`}
              >
                عرض تاريخ المتغير
              </Link>
            </article>
          ))}
          <Link to="/inventory/receipts/new">تسجيل استلام جديد مستقل</Link> ·{' '}
          <Link to={'/inventory?branches=' + row.branchId}>العودة للمخزون</Link>
        </section>
      )}
    </div>
  );
}
export function VariantHistoryPage() {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    catalog = useInventoryCatalog(),
    company = catalog.company,
    branch = params.get('branchId') ?? '',
    page = Number(params.get('page') ?? 1),
    back = params.get('back') ?? '/inventory';
  const query = useQuery({
    queryKey: [
      'variant',
      id,
      branch,
      page,
      company,
      catalog.access.registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      inventoryApi<VariantHistory>(
        `/inventory/variants/${id}/history?companyId=${company}&branchId=${branch}&page=${page}`,
        'history',
      ),
    enabled: !!company && !catalog.access.authorityError,
    retry: false,
  });
  const row = query.data;
  return (
    <div className="inventory-page">
      <Link to={back.startsWith('/inventory') && !back.startsWith('//') ? back : '/inventory'}>
        العودة بنفس الفلاتر
      </Link>
      <PageHeading
        eyebrow="حركات المخزون"
        title={row ? row.position.productName + ' · ' + row.position.variantName : 'تاريخ المتغير'}
        description="الأرصدة حالية. كل حركة تحتفظ بالتاريخ الفعلي ووقت التسجيل."
      />
      <ErrorNotice error={query.error ?? catalog.access.authorityError} />
      {query.isLoading && <p role="status">جارٍ التحميل…</p>}
      {row && !query.error && !catalog.access.authorityError && (
        <section className="stock-panel">
          <p>
            {row.position.brandName} · {row.position.branchName} · {row.position.options}
          </p>
          <Balances row={row.position} />
          {row.movements.length === 0 ? (
            <p>لم تسجل حركات لهذا المتغير في هذا الفرع.</p>
          ) : (
            <ol className="stock-timeline">
              {row.movements.map((m) => (
                <li key={m.id}>
                  <h2>
                    <Link to={'/inventory/receipts/' + m.receiptId}>استلام {m.reference}</Link>
                  </h2>
                  <p>
                    {m.quantity.toLocaleString('ar-EG')} وحدة · {conditionNames[m.condition]} ·{' '}
                    {m.productName} · {m.variantName} · {m.options}
                  </p>
                  <p>
                    فعلي: <bdi className="inventory-date">{m.actualDate}</bdi> · تسجيل:{' '}
                    {new Date(m.recordedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <div className="stock-pagination">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(page - 1));
                setParams(next);
              }}
            >
              السابق
            </Button>
            <span>صفحة {page}</span>
            <Button
              variant="outline"
              disabled={page * row.limit >= row.total}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(page + 1));
                setParams(next);
              }}
            >
              التالي
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
