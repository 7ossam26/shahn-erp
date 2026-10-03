import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  PageHeading,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shahn/ui';
import type { ParcelList, ParcelItem, ShipmentDetail } from '@shahn/contracts';
import { Field, serviceNames } from '../brands/api.js';
import { useAccess } from '../access/access.js';
import { inventoryApi } from '../inventory/api.js';
import { shipmentApi, useShipmentMutation } from '../shipments/api.js';
import { ShipmentError, ParcelCards, preparationNames } from '../shipments/shipments.js';
function CompleteParcel({
  item,
  mutation,
}: {
  item: ParcelItem;
  mutation: ReturnType<typeof useShipmentMutation>;
}) {
  const access = useAccess(),
    company = access.registry?.context.companyId,
    [detail, setDetail] = useState<ShipmentDetail | null>(null),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            setDetail(
              await shipmentApi<ShipmentDetail>(
                `/shipments/${item.reference}?companyId=${company}`,
                'detail',
              ),
            );
          } catch (e) {
            setError(e);
          } finally {
            setLoading(false);
          }
        }}
      >
        إكمال التجهيز
      </Button>
      <ShipmentError error={error} />
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent dir="rtl" className="intake-dialog">
          <DialogTitle>تأكيد اكتمال تجهيز الطرد</DialogTitle>
          <DialogDescription>أكد اكتمال التعبئة. يبقى الطرد في عهدة الفرع.</DialogDescription>
          <p>
            طرد <bdi>{item.reference}</bdi> · {item.recipientName}
          </p>
          <Button
            disabled={mutation.busy || !!mutation.pending}
            onClick={() => {
              if (detail) {
                void mutation.submit({
                  type: 'shipment.prepare',
                  shipmentId: detail.id,
                  expectedVersion: detail.version,
                });
                setDetail(null);
              }
            }}
          >
            تم التجهيز بالفعل
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ParcelMonitorPage({ inventory = false }: { inventory?: boolean }) {
  const access = useAccess(),
    company = access.registry?.context.companyId,
    branches = access.registry?.context.assignedBranches ?? [],
    [params, setParams] = useSearchParams(),
    [advanced, setAdvanced] = useState(false),
    [filterDraft, setFilterDraft] = useState<URLSearchParams | null>(null);
  const selected = params.get('branches') ?? (branches.length === 1 ? branches[0]!.id : ''),
    valid = !!selected && selected.split(',').every((id) => branches.some((b) => b.id === id));
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  };
  const catalog = useQuery({
    queryKey: [
      'parcel-catalog',
      company,
      inventory,
      access.registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      inventory
        ? inventoryApi<{ brands: { id: string; name: string }[] }>(
            '/inventory/catalog?companyId=' + company,
            'catalog',
          )
        : shipmentApi<{ brands: { id: string; name: string }[] }>(
            '/shipments/catalog?companyId=' + company,
            'catalog',
          ),
    enabled: !!company && !access.authorityError,
    retry: false,
  });
  const query = new URLSearchParams(params);
  query.delete('view');
  query.set('companyId', company ?? '');
  query.set('branches', selected);
  if (!inventory) {
    query.delete('custody');
    query.set('service', 'company_packed');
  }
  const list = useQuery({
    queryKey: [
      'parcel-list',
      company,
      inventory,
      query.toString(),
      access.registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      inventory
        ? inventoryApi<ParcelList>('/inventory/parcels?' + query, 'parcels')
        : shipmentApi<ParcelList>('/preparation?' + query, 'list'),
    enabled: !!company && valid && !access.authorityError,
    retry: false,
  });
  const mutation = useShipmentMutation('preparation', () => {
    void list.refetch();
  });
  const field = (
    name: string,
    label: string,
    children: (value: string, onChange: (v: string) => void) => React.ReactNode,
  ) => (
    <Field label={label}>
      {children(filterDraft?.get(name) ?? '', (v) => {
        const next = new URLSearchParams(filterDraft ?? params);
        if (v) next.set(name, v);
        else next.delete(name);
        setFilterDraft(next);
      })}
    </Field>
  );
  const filters = (
    <div className="shipment-advanced">
      {field('brands', 'البراند', (v, c) => (
        <select value={v} onChange={(e) => c(e.target.value)}>
          <option value="">كل البراندات</option>
          {catalog.data?.brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      ))}
      {inventory &&
        field('service', 'الخدمة', (v, c) => (
          <select value={v} onChange={(e) => c(e.target.value)}>
            <option value="">كل الخدمات</option>
            <option value="brand_packed">طرد جاهز</option>
            <option value="company_packed">تغليف الشركة</option>
          </select>
        ))}
      {field('from', 'تاريخ التسجيل من', (v, c) => (
        <Input type="date" value={v} onChange={(e) => c(e.target.value)} />
      ))}
      {field('to', 'تاريخ التسجيل إلى', (v, c) => (
        <Input type="date" value={v} onChange={(e) => c(e.target.value)} />
      ))}
      {field('state', 'حالة الطلب', (v, c) => (
        <select value={v} onChange={(e) => c(e.target.value)}>
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="cancelled">ملغى وعهدته محفوظة</option>
        </select>
      ))}
    </div>
  );
  const active = [...params.entries()].filter(
    ([key, value]) => !['view', 'branches', 'page'].includes(key) && value,
  );
  const filterLabels: Record<string, string> = {
    brands: 'البراند',
    service: 'الخدمة',
    from: 'من تاريخ',
    to: 'إلى تاريخ',
    state: 'حالة الطلب',
    preparation: 'التجهيز',
    custody: 'العهدة',
    search: 'بحث',
    limit: 'عدد النتائج',
  };
  const filterValue = (key: string, value: string) => {
    if (key === 'brands')
      return value
        .split(',')
        .map((id) => catalog.data?.brands.find((b) => b.id === id)?.name ?? 'براند محدد')
        .join('، ');
    if (key === 'service') return serviceNames[value as keyof typeof serviceNames] ?? value;
    if (key === 'preparation')
      return preparationNames[value as keyof typeof preparationNames] ?? value;
    if (key === 'state') return value === 'active' ? 'نشط' : 'ملغى';
    if (key === 'custody') return value === 'branch' ? 'في الفرع' : 'خارج الفرع';
    return value;
  };
  return (
    <>
      <PageHeading
        eyebrow={inventory ? 'المخزون' : 'تجهيز الطرود'}
        title={inventory ? 'الطرود في العهدة' : 'قائمة التجهيز'}
        description={
          inventory
            ? 'طرود مستلمة فعلًا؛ الإلغاء التجاري لا ينقل العهدة.'
            : 'طلبات تغليف الشركة، مع تسجيل اكتمال التجهيز.'
        }
      />
      {inventory ? (
        <div className="inventory-switch">
          <Link className="back-link" to="/inventory">
            المنتجات
          </Link>
          <Button aria-pressed="true">الطرود</Button>
        </div>
      ) : (
        <Link className="back-link" to="/shipments/new">
          تسجيل طرد مستلم
        </Link>
      )}
      <div className="preparation-filters">
        <Field label="الفرع">
          {branches.length === 1 ? (
            <Input readOnly value={branches[0]!.name} />
          ) : (
            <select value={selected} onChange={(e) => change('branches', e.target.value)}>
              <option value="">اختر الفرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="حالة التجهيز">
          <select
            value={params.get('preparation') ?? ''}
            onChange={(e) => change('preparation', e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="awaiting_preparation">بانتظار التجهيز</option>
            <option value="complete">تم التجهيز</option>
            {inventory && <option value="not_required">لا يحتاج تجهيزًا</option>}
          </select>
        </Field>
        {inventory && (
          <Field label="موقع العهدة">
            <select
              value={params.get('custody') ?? 'branch'}
              onChange={(e) => change('custody', e.target.value)}
            >
              <option value="branch">في الفرع</option>
              <option value="external">خارج الفرع</option>
            </select>
          </Field>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setFilterDraft(new URLSearchParams(params));
            setAdvanced(true);
          }}
        >
          فلاتر متقدمة ({active.length})
        </Button>
      </div>
      <Field label="بحث برقم الطرد أو بيانات المستلم">
        <Input
          value={params.get('search') ?? ''}
          maxLength={256}
          onChange={(e) => change('search', e.target.value)}
        />
      </Field>
      {active.length > 0 && (
        <div className="active-filter-chips">
          {active.map(([key, value]) => (
            <span key={key}>
              <bdi>
                {filterLabels[key] ?? 'فلتر'}: {filterValue(key, value)}
              </bdi>
            </span>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setParams(
                new URLSearchParams({
                  ...(inventory ? { view: 'parcels' } : {}),
                  ...(selected ? { branches: selected } : {}),
                }),
              )
            }
          >
            مسح الفلاتر
          </Button>
        </div>
      )}
      <ShipmentError error={catalog.error ?? list.error} />
      {!inventory && (
        <>
          <ShipmentError error={mutation.error} />
          {mutation.recovery}
        </>
      )}
      {!valid && <p role="status">اختر فرعًا مسندًا لعرض الطرود.</p>}
      {list.isFetching && <p role="status">جارٍ تحميل الطرود…</p>}
      {list.data && !list.error && valid && !access.authorityError && (
        <>
          <p>{list.data.total.toLocaleString('ar-EG')} طرد</p>
          {list.data.items.length === 0 ? (
            <p className="stock-empty">
              {inventory && params.get('custody') === 'external'
                ? 'لا توجد طرود خارج الفرع بهذه الفلاتر. عرض العهدة الخارجية لا يضيف مخزونًا إلى الفرع.'
                : 'لا توجد طرود بهذه الفلاتر. راجع الفرع والفلاتر.'}
            </p>
          ) : (
            <ParcelCards>
              {list.data.items.map((item) => (
                <article key={item.id} className="parcel-card">
                  <div>
                    <Link to={'/shipments/' + item.reference}>
                      طرد <bdi>{item.reference}</bdi>
                    </Link>
                    <h2>{item.recipientName}</h2>
                    <p>
                      {item.brandName} · {serviceNames[item.service]}
                    </p>
                  </div>
                  <div>
                    <p>{item.branchName} · عهدة الفرع</p>
                    <p>
                      {item.state === 'cancelled'
                        ? 'ملغى · العهدة محفوظة'
                        : preparationNames[item.preparation]}
                    </p>
                    <p>
                      في الفرع منذ <bdi>{item.ageDays}</bdi> يوم
                    </p>
                  </div>
                  {!inventory &&
                    item.state === 'active' &&
                    item.preparation === 'awaiting_preparation' && (
                      <CompleteParcel item={item} mutation={mutation} />
                    )}
                </article>
              ))}
            </ParcelCards>
          )}
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={list.data.page === 1}
              onClick={() => change('page', String(list.data!.page - 1))}
            >
              السابق
            </Button>
            <span>
              <bdi>{list.data.page}</bdi>
            </span>
            <Button
              variant="outline"
              disabled={list.data.page * list.data.limit >= list.data.total}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.set('page', String(list.data!.page + 1));
                setParams(next);
              }}
            >
              التالي
            </Button>
          </div>
        </>
      )}
      <Dialog open={advanced} onOpenChange={setAdvanced}>
        <DialogContent dir="rtl" className="intake-dialog">
          <DialogTitle>فلاتر الطرود المتقدمة</DialogTitle>
          <DialogDescription>
            تاريخ التسجيل بتوقيت القاهرة. الفلاتر تتقاطع مع الفرع المسند.
          </DialogDescription>
          {filters}
          <div className="dialog-actions">
            <Button
              onClick={() => {
                const next = new URLSearchParams(filterDraft ?? params);
                next.delete('page');
                setParams(next);
                setAdvanced(false);
              }}
            >
              تطبيق الفلاتر
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setFilterDraft(
                  new URLSearchParams({
                    ...(inventory ? { view: 'parcels' } : {}),
                    branches: selected,
                  }),
                )
              }
            >
              إعادة ضبط
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
