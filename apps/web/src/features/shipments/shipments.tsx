import { useEffect, useState, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Input,
  PageHeading,
  FormGroup,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@shahn/ui';
import {
  calculatePrice,
  shipmentPrice,
  validateShipmentInput,
  shipmentGoods,
  correctedPrice,
  normalizeShipmentDigits,
} from '@shahn/domain';
import {
  validateShipmentFields,
  type ShipmentFields,
  type ShipmentDetail,
  type ShipmentPrice,
  type ShipmentPreview,
  type ShipmentCatalog,
} from '@shahn/contracts';
import { Field, displayMinor, inputMinor, serviceNames, CommercialError } from '../brands/api.js';
import { useAccess } from '../access/access.js';
import { shipmentApi, useShipmentCatalog, useShipmentMutation, ShipmentApiError } from './api.js';
import './shipments.css';
export const preparationNames = {
  not_required: 'لا يحتاج تجهيزًا',
  awaiting_preparation: 'بانتظار التجهيز',
  complete: 'تم التجهيز',
};
const messages: Record<string, string> = {
  PRICE_MISSING: 'لا يوجد سعر للمحافظة في شريحة البراند. لن يُسجل الطرد حتى يكتمل السعر.',
  INVALID_RECIPIENT_PHONE: 'راجع رقم الهاتف: رقم محمول مصري أو رقم دولي كامل.',
  UNSAFE_LOCATION_URL: 'استخدم رابط HTTP أو HTTPS آمنًا دون اسم مستخدم أو كلمة مرور.',
  DUPLICATE_BRAND_REFERENCE: 'هذا المرجع مستخدم لهذا البراند. راجع التحذير وأكد أنه طلب مستقل.',
  SOURCE_MONEY_OVERFLOW: 'المبلغ يتجاوز حدود القيمة المدعومة. راجع قيم القطع.',
  INVALID_QUANTITY: 'أدخل عددًا صحيحًا من 1 إلى 1000000.',
  INVALID_SHIPPING_DUE: 'أدخل المستحق المحدد من الشحن كما ورد من البراند.',
  SHIPPING_DUE_EXCEEDS_TARIFF: 'المستحق من الشحن لا يمكن أن يتجاوز التعريفة التجارية.',
  REVISION_CONFLICT: 'تغير السجل. أعد تحميل التفاصيل وراجع النسخة الحالية.',
  PRICING_REVISION_CONFLICT: 'تغير السعر أو اتفاق البراند. حدّث الإعدادات وراجع الملخص مجددًا.',
  SHIPMENT_CANCELLED: 'الطلب ملغى؛ لا يمكن تغييره أو إكمال تجهيزه.',
  HANDED_OVER_PROTECTED: 'تم تسليم الطرد؛ التصحيح المحلي غير متاح.',
  SOURCE_ADAPTER_REQUIRED: 'هذا الطلب مرتبط بتوصل؛ يحتاج إلى مسار التصحيح المعتمد لاحقًا.',
  PREPARATION_NOT_WAITING: 'الطرد ليس بانتظار التجهيز.',
  FORBIDDEN_SCOPE: 'الفرع أو الشاشة غير مسندة لك. حدّث الصلاحيات.',
  SERVICE_UNAVAILABLE: 'هذه الخدمة غير مفعلة للبراند.',
  ACTUAL_BRANCH_ASSERTION_REQUIRED: 'أكد وجود البضاعة فعلًا في الفرع الصحيح.',
  VALIDATION_FAILED: 'راجع الحقول والحدود الموضحة. لم يُسجل أي استلام.',
  CONNECTION_LOST: 'لا يوجد اتصال. احتفظ بالبيانات وحاول عند عودة الاتصال.',
  RESULT_UNKNOWN: 'نتيجة الحفظ غير مؤكدة. استرد نتيجة الطلب نفسه.',
};
export function ShipmentError({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  const code = error instanceof Error ? error.message : '';
  return error ? (
    <div ref={ref} role="alert" tabIndex={-1} className="commercial-error">
      {messages[code] ?? 'تعذر تحميل أو حفظ البيانات. حاول مرة أخرى.'}
      {error instanceof ShipmentApiError &&
        Object.entries(error.fieldErrors).map(([field, value]) => (
          <p key={field}>
            <bdi>{field}</bdi> · {messages[value] ?? messages['VALIDATION_FAILED']}
          </p>
        ))}
      {error instanceof CommercialError && error.currentVersion && (
        <p>
          النسخة الحالية: <bdi>{error.currentVersion}</bdi>
        </p>
      )}
    </div>
  ) : null;
}
export function PriceSummary({ price }: { price: ShipmentPrice }) {
  return (
    <dl className="intake-money">
      {[
        ['البضاعة المستحقة', price.goodsDueMinor],
        ['الشحن الأساسي', price.baseShippingMinor],
        ['إضافة التغليف', price.packingUpliftMinor],
        ['التعريفة التجارية', price.tariffMinor],
        ['شحن مستحق على المستلم', price.recipientShippingMinor],
        ['شحن يموله البراند', price.brandShippingMinor],
        ['إجمالي المستلم', price.recipientDueMinor],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            <bdi>{displayMinor(value!)}</bdi> ج.م
          </dd>
        </div>
      ))}
    </dl>
  );
}
function emptyFields(): ShipmentFields {
  return {
    branchId: '',
    brandId: '',
    service: 'brand_packed',
    brandReference: '',
    recipientName: '',
    phoneDisplay: '',
    address: '',
    governorateId: '',
    areaId: null,
    locationUrl: '',
    lines: [
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitDue: { currency: 'EGP', amountMinor: '0' },
      },
    ],
    shippingPayer: 'recipient',
    recipientShippingDue: null,
    inspectionAllowed: false,
    comment: '',
  };
}
export function ShipmentEditor({
  catalog,
  initial,
  oldPrice,
  disabled,
  onChange,
}: {
  catalog: ShipmentCatalog;
  initial?: ShipmentFields;
  oldPrice?: ShipmentPrice;
  disabled: boolean;
  onChange: (fields: ShipmentFields | null, price: ShipmentPrice | null) => void;
}) {
  const [fields, setFields] = useState<ShipmentFields>(
    () =>
      initial ?? {
        ...emptyFields(),
        branchId: catalog.branches.length === 1 ? catalog.branches[0]!.id : '',
      },
  );
  const [rawLines, setLines] = useState(() =>
    fields.lines.map((l) => ({
      ...l,
      quantityText: String(l.quantity),
      amountText: displayMinor(l.unitDue.amountMinor),
    })),
  );
  const [inspection, setInspection] = useState(initial ? String(initial.inspectionAllowed) : '');
  const [shippingText, setShippingText] = useState(
    initial?.recipientShippingDue ? displayMinor(initial.recipientShippingDue.amountMinor) : '0',
  );
  let validFields: ShipmentFields | null = null,
    price: ShipmentPrice | null = null,
    error: unknown = null;
  try {
    const lines = rawLines.map((l) => {
      const quantityText = normalizeShipmentDigits(l.quantityText);
      if (!/^[0-9]+$/.test(quantityText)) throw Error('INVALID_QUANTITY');
      return {
        id: l.id,
        description: l.description,
        quantity: Number(quantityText),
        unitDue: { currency: 'EGP' as const, amountMinor: inputMinor(l.amountText) },
      };
    });
    const value = {
      ...fields,
      lines,
      inspectionAllowed: inspection === 'true',
      recipientShippingDue:
        fields.shippingPayer === 'shared'
          ? { currency: 'EGP' as const, amountMinor: inputMinor(shippingText) }
          : null,
    };
    if (inspection && validateShipmentFields(value)) {
      validateShipmentInput(value);
      validFields = value;
      if (oldPrice) price = correctedPrice(oldPrice, value);
      else {
        const brand = catalog.brands.find((b) => b.id === value.brandId);
        if (brand) {
          const selected = calculatePrice(
              brand,
              { ...value, goodsDueMinor: shipmentGoods(lines), recipientShippingMinor: '0' },
              catalog.tariffs,
            ),
            reference = (id: string) => catalog.references.find((r) => r.id === id)?.name ?? '';
          price = shipmentPrice(
            {
              schemaVersion: 1,
              currency: 'EGP',
              companyId: catalog.companyId,
              brandId: brand.id,
              brandName: brand.name,
              policyVersion: brand.version,
              branchId: value.branchId,
              service: value.service,
              partialDelivery: brand.partialDelivery,
              tierId: brand.tierId,
              tierName: reference(brand.tierId),
              governorateId: value.governorateId,
              governorateName: reference(value.governorateId),
              areaId: value.areaId,
              areaName: value.areaId ? reference(value.areaId) : null,
              capturedAt: new Date().toISOString(),
              ...selected,
            },
            brand.packingUpliftMinor,
            value,
          );
        }
      }
    }
  } catch (e) {
    error = e;
  }
  const signature = JSON.stringify([validFields, price && { ...price, capturedAt: '' }]);
  useEffect(() => {
    onChange(validFields, price);
  }, [signature]);
  const update = <K extends keyof ShipmentFields>(key: K, value: ShipmentFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));
  const brand = catalog.brands.find((b) => b.id === fields.brandId);
  const input = (
    key:
      'brandReference' | 'recipientName' | 'phoneDisplay' | 'address' | 'locationUrl' | 'comment',
    label: string,
    max: number,
    required = false,
    multi = false,
  ) => (
    <Field label={label}>
      {multi ? (
        <textarea
          value={fields[key]}
          onChange={(e) => update(key, e.target.value)}
          required={required}
          maxLength={max}
          rows={3}
        />
      ) : (
        <Input
          value={fields[key]}
          onChange={(e) => update(key, e.target.value)}
          required={required}
          maxLength={max}
          dir={key === 'phoneDisplay' ? 'ltr' : undefined}
        />
      )}
    </Field>
  );
  return (
    <fieldset className="intake-editor" disabled={disabled}>
      <FormGroup title="الاستلام والخدمة" description="سجّل الفرع الذي توجد فيه البضاعة بالفعل.">
        <Field label="فرع الاستلام">
          {catalog.branches.length === 1 ? (
            <Input readOnly value={catalog.branches[0]!.name} />
          ) : (
            <select
              required
              value={fields.branchId}
              onChange={(e) => update('branchId', e.target.value)}
            >
              <option value="">اختر الفرع</option>
              {catalog.branches.map((b) => (
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
            value={fields.brandId}
            disabled={!!initial}
            onChange={(e) => {
              const next = catalog.brands.find((b) => b.id === e.target.value);
              setFields((f) => ({
                ...f,
                brandId: e.target.value,
                service:
                  next?.defaultService === 'company_packed' ||
                  (!next?.services.includes('brand_packed') &&
                    next?.services.includes('company_packed'))
                    ? 'company_packed'
                    : 'brand_packed',
              }));
            }}
          >
            <option value="">اختر البراند</option>
            {catalog.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الخدمة">
          <select
            value={fields.service}
            onChange={(e) => update('service', e.target.value as ShipmentFields['service'])}
          >
            {(['brand_packed', 'company_packed'] as const)
              .filter((s) => brand?.services.includes(s))
              .map((s) => (
                <option key={s} value={s}>
                  {serviceNames[s]}
                </option>
              ))}
          </select>
        </Field>
        {input('brandReference', 'مرجع البراند (اختياري)', 256)}
        {brand && (
          <p className="muted">
            التسليم الجزئي حسب الاتفاق: {brand.partialDelivery ? 'مسموح' : 'غير مسموح'}
          </p>
        )}
      </FormGroup>
      <FormGroup
        title="بيانات المستلم"
        description="انقل البيانات من بوليصة البراند؛ رابط الموقع اختياري."
      >
        {input('recipientName', 'اسم المستلم', 200, true)}
        {input('phoneDisplay', 'رقم الهاتف', 100, true)}
        <Field label="المحافظة">
          <select
            required
            value={fields.governorateId}
            onChange={(e) =>
              setFields((f) => ({ ...f, governorateId: e.target.value, areaId: null }))
            }
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
        <Field label="المنطقة (اختياري)">
          <select
            value={fields.areaId ?? ''}
            onChange={(e) => update('areaId', e.target.value || null)}
          >
            <option value="">سعر المحافظة</option>
            {catalog.references
              .filter((r) => r.kind === 'area' && r.active && r.parentId === fields.governorateId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </Field>
        {input('address', 'العنوان المكتوب', 500, true, true)}
        {input('locationUrl', 'رابط الموقع (اختياري)', 2048)}
      </FormGroup>
      <FormGroup
        title="القطع والمبالغ المستحقة"
        description="أدخل المبلغ المتبقي للقطعة الواحدة. للبضاعة المدفوعة للبراند أدخل صفرًا؛ القطع ذات القيم المختلفة توضع في سطور مستقلة."
      >
        <div className="intake-lines">
          {rawLines.map((l, i) => (
            <div key={l.id} className="intake-line">
              <Field label={`وصف القطعة ${i + 1}`}>
                <Input
                  required
                  maxLength={200}
                  value={l.description}
                  onChange={(e) =>
                    setLines((a) =>
                      a.map((x, n) => (n === i ? { ...x, description: e.target.value } : x)),
                    )
                  }
                />
              </Field>
              <Field label={`الكمية ${i + 1}`}>
                <Input
                  required
                  inputMode="numeric"
                  value={l.quantityText}
                  onChange={(e) =>
                    setLines((a) =>
                      a.map((x, n) => (n === i ? { ...x, quantityText: e.target.value } : x)),
                    )
                  }
                />
              </Field>
              <Field label={`المستحق للقطعة ${i + 1} (ج.م)`}>
                <Input
                  required
                  inputMode="decimal"
                  value={l.amountText}
                  onChange={(e) =>
                    setLines((a) =>
                      a.map((x, n) => (n === i ? { ...x, amountText: e.target.value } : x)),
                    )
                  }
                />
              </Field>
              {rawLines.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`حذف القطعة ${i + 1}`}
                  onClick={() => setLines((a) => a.filter((_, n) => n !== i))}
                >
                  حذف
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={rawLines.length >= 100}
          onClick={() =>
            setLines((a) => [
              ...a,
              {
                id: crypto.randomUUID(),
                description: '',
                quantity: 1,
                unitDue: { currency: 'EGP', amountMinor: '0' },
                quantityText: '1',
                amountText: '0',
              },
            ])
          }
        >
          إضافة قطعة
        </Button>
        <Field label="سداد الشحن">
          <select
            value={fields.shippingPayer}
            onChange={(e) =>
              update('shippingPayer', e.target.value as ShipmentFields['shippingPayer'])
            }
          >
            <option value="recipient">مستحق على المستلم</option>
            <option value="brand">مدفوع إلى البراند — يموله البراند</option>
            <option value="shared">مستحق شحن محدد من البراند</option>
          </select>
        </Field>
        {fields.shippingPayer === 'shared' && (
          <Field label="المتبقي من الشحن على المستلم (ج.م)">
            <Input
              required
              inputMode="decimal"
              value={shippingText}
              onChange={(e) => setShippingText(e.target.value)}
            />
          </Field>
        )}
      </FormGroup>
      <FormGroup title="الفحص والملاحظات" description="إذن الفحص مستقل عن سياسة التسليم الجزئي.">
        <Field label="السماح بالفحص">
          <select required value={inspection} onChange={(e) => setInspection(e.target.value)}>
            <option value="">اختر صراحةً</option>
            <option value="true">مسموح</option>
            <option value="false">غير مسموح</option>
          </select>
        </Field>
        {input('comment', 'ملاحظات (اختياري)', 1000, false, true)}
      </FormGroup>
      <ShipmentError error={error} />
      {price && <PriceSummary price={price} />}
    </fieldset>
  );
}
export function ShipmentNewPage() {
  const catalog = useShipmentCatalog(),
    navigate = useNavigate(),
    [fields, setFields] = useState<ShipmentFields | null>(null),
    [price, setPrice] = useState<ShipmentPrice | null>(null),
    [review, setReview] = useState(false),
    [actual, setActual] = useState(false),
    [duplicate, setDuplicate] = useState(false);
  const mutation = useShipmentMutation('new', (result) =>
    navigate('/shipments/' + result.reference),
  );
  const duplicateWarning =
    mutation.error instanceof CommercialError &&
    mutation.error.code === 'DUPLICATE_BRAND_REFERENCE';
  return (
    <>
      <PageHeading
        eyebrow="استلام الطرود"
        title="تسجيل طرد مستلم"
        description="البوليصة، المبالغ المتبقية، والاستلام الفعلي في خطوة واحدة."
      />
      <Link className="back-link" to="/preparation">
        قائمة التجهيز
      </Link>
      <ShipmentError error={catalog.error} />
      <ShipmentError error={mutation.error} />
      {mutation.recovery}
      {catalog.isLoading && <p role="status">جارٍ تحميل الإعدادات…</p>}
      {catalog.data && (
        <form
          className="intake-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (fields && price) setReview(true);
          }}
        >
          <ShipmentEditor
            catalog={catalog.data}
            disabled={mutation.busy || !!mutation.pending}
            onChange={(f, p) => {
              setFields(f);
              setPrice(p);
              setActual(false);
              setDuplicate(false);
            }}
          />
          {duplicateWarning && (
            <div role="alert" className="commercial-warning">
              <p>مرجع البراند مكرر. هذا ليس استردادًا لمحاولة تسجيل سابقة.</p>
              <Field label="هذا طلب مستقل رغم تكرار المرجع">
                <input
                  type="checkbox"
                  checked={duplicate}
                  onChange={(e) => setDuplicate(e.target.checked)}
                />
              </Field>
            </div>
          )}
          <Button
            disabled={
              !fields ||
              !price ||
              mutation.busy ||
              !!mutation.pending ||
              (duplicateWarning && !duplicate)
            }
          >
            تسجيل طرد مستلم
          </Button>
          {catalog.data && (
            <Button type="button" variant="outline" onClick={() => void catalog.refetch()}>
              تحديث الإعدادات
            </Button>
          )}
        </form>
      )}
      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent dir="rtl" className="intake-dialog">
          <DialogTitle>تأكيد الاستلام والتسجيل</DialogTitle>
          <DialogDescription>
            راجع المبالغ والفرع ثم أكد وجود الطرد أو بضاعته بالفعل.
          </DialogDescription>
          {price && <PriceSummary price={price} />}
          <p>فرع الاستلام: {catalog.data?.branches.find((b) => b.id === fields?.branchId)?.name}</p>
          <Field label="استلمت الطرد أو بضاعته بالفعل في هذا الفرع">
            <input type="checkbox" checked={actual} onChange={(e) => setActual(e.target.checked)} />
          </Field>
          <Button
            disabled={!actual || !fields || !price || mutation.busy}
            onClick={() => {
              setReview(false);
              if (fields && price)
                void mutation.submit({
                  type: 'shipment.confirm',
                  fields,
                  actualReceipt: true,
                  duplicateAcknowledged: duplicate,
                  expectedPolicyVersion: price.policyVersion,
                  expectedTariffVersion: price.tariffVersion,
                  expectedTariffId: price.tariffId,
                });
            }}
          >
            تأكيد تسجيل الطرد
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
function DetailActions({ detail, onSaved }: { detail: ShipmentDetail; onSaved: () => void }) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(''),
    mutation = useShipmentMutation('cancel:' + detail.id, () => {
      setOpen(false);
      onSaved();
    });
  return (
    <>
      {detail.state === 'active' && !detail.handedOver && detail.sourceState === 'local' && (
        <>
          <Link className="back-link" to={`/shipments/${detail.reference}/correction`}>
            تصحيح قبل التسليم
          </Link>
          <Button variant="outline" onClick={() => setOpen(true)}>
            إلغاء الطلب
          </Button>
        </>
      )}
      <ShipmentError error={mutation.error} />
      {mutation.recovery}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="intake-dialog">
          <DialogTitle>إلغاء الطلب قبل التسليم</DialogTitle>
          <DialogDescription>
            يبقى الطرد في عهدة الفرع حتى تسليم فعلي للبراند في مسار الإرجاع.
          </DialogDescription>
          <Field label="سبب الإلغاء">
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Button
            disabled={!reason.trim() || mutation.busy || !!mutation.pending}
            onClick={() =>
              void mutation.submit({
                type: 'shipment.cancel',
                shipmentId: detail.id,
                expectedVersion: detail.version,
                reason,
              })
            }
          >
            تأكيد الإلغاء
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ShipmentDetailPage() {
  const { reference } = useParams(),
    access = useAccess(),
    company = access.registry?.context.companyId;
  const query = useQuery({
    queryKey: [
      'shipment-detail',
      company,
      reference,
      access.registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      shipmentApi<ShipmentDetail>(`/shipments/${reference}?companyId=${company}`, 'detail'),
    enabled: !!company && !access.authorityError,
    retry: false,
  });
  const d = query.data;
  useEffect(() => {
    if (d) document.querySelector<HTMLHeadingElement>('h1')?.focus();
  }, [d?.id]);
  return (
    <>
      <PageHeading
        eyebrow="تفاصيل الطرد"
        title={d ? 'طرد ' + d.reference : 'تفاصيل الطرد'}
        description="العهدة الحالية والتاريخ المحلي المسجل."
      />
      <ShipmentError error={query.error} />
      {query.isLoading && <p role="status">جارٍ تحميل الطرد…</p>}
      {d && !access.authorityError && (
        <>
          <section className="parcel-current">
            <p className="eyebrow">
              {d.state === 'cancelled'
                ? 'طلب ملغى · الطرد ما زال بعهدة الفرع'
                : preparationNames[d.preparation]}
            </p>
            <h2>{d.fields.recipientName}</h2>
            <p>
              {d.price.brandName} · {serviceNames[d.fields.service]}
            </p>
            <p>
              عهدة الفرع: <strong>{d.branchName}</strong>
            </p>
            <p>
              <bdi dir="ltr">{d.fields.phoneDisplay}</bdi>
            </p>
            <p>{d.fields.address}</p>
            {d.fields.locationUrl && (
              <a href={d.fields.locationUrl} target="_blank" rel="noopener noreferrer">
                رابط الموقع المدخل
              </a>
            )}
            <p>مرجع البراند: {d.fields.brandReference || 'غير مدخل'}</p>
            <p>
              الفحص: {d.fields.inspectionAllowed ? 'مسموح' : 'غير مسموح'} · التسليم الجزئي:{' '}
              {d.price.partialDelivery ? 'مسموح' : 'غير مسموح'}
            </p>
            {d.fields.comment && <p>{d.fields.comment}</p>}
          </section>
          <PriceSummary price={d.price} />
          <section className="parcel-contents">
            <h2>القطع والمستحق للقطعة</h2>
            {d.fields.lines.map((l) => (
              <p key={l.id}>
                {l.description} · <bdi>{l.quantity}</bdi> ×{' '}
                <bdi>{displayMinor(l.unitDue.amountMinor)}</bdi> ج.م
              </p>
            ))}
          </section>
          <section className="parcel-timeline">
            <h2>الخط الزمني</h2>
            <ol>
              {d.timeline.map((e, i) => (
                <li key={e.version} className={i === d.timeline.length - 1 ? 'current' : ''}>
                  <strong>
                    {
                      {
                        received: 'تأكيد الاستلام في الفرع',
                        corrected: 'تصحيح مسجل',
                        prepared: 'اكتمال التجهيز',
                        cancelled: 'إلغاء تجاري — العهدة محفوظة',
                      }[e.kind]
                    }
                  </strong>
                  <p>
                    {e.actor} ·{' '}
                    <bdi>
                      {new Date(e.at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                    </bdi>
                  </p>
                  {e.reason && <p>{e.reason}</p>}
                </li>
              ))}
            </ol>
          </section>
          <div className="intake-next">
            {d.preparation === 'awaiting_preparation' &&
            d.state === 'active' &&
            access.registry?.context.grants.includes('intake') ? (
              <Link to="/preparation">الخطوة التالية: تجهيز الطرد</Link>
            ) : (
              <Link to="/inventory?view=parcels">عرض الطرد في المخزون</Link>
            )}
          </div>
          {access.registry?.context.grants.includes('intake') && (
            <details className="intake-other">
              <summary>إجراءات قبل التسليم ونتيجة آخر طلب</summary>
              <DetailActions detail={d} onSaved={() => void query.refetch()} />
            </details>
          )}
          <details className="intake-other">
            <summary>مراجعة نسخ التسجيل والتصحيح</summary>
            {d.revisions.map((r) => (
              <section key={r.revision}>
                <h3>
                  نسخة <bdi>{r.revision}</bdi>
                </h3>
                <p>
                  {r.fields.recipientName} · {serviceNames[r.fields.service]}
                </p>
                <PriceSummary price={r.price} />
              </section>
            ))}
          </details>
        </>
      )}
    </>
  );
}
export function ShipmentCorrectionPage() {
  const { reference } = useParams(),
    catalog = useShipmentCatalog(),
    [fields, setFields] = useState<ShipmentFields | null>(null),
    [preview, setPreview] = useState<ShipmentPreview | null>(null),
    [reason, setReason] = useState(''),
    [actual, setActual] = useState(false),
    [duplicate, setDuplicate] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    navigate = useNavigate();
  const query = useQuery({
      queryKey: [
        'shipment-correct',
        catalog.company,
        reference,
        catalog.access.registry?.context.authorizationRevision,
      ],
      queryFn: () =>
        shipmentApi<ShipmentDetail>(
          `/shipments/${reference}?companyId=${catalog.company}`,
          'detail',
        ),
      enabled: !!catalog.company && !catalog.access.authorityError,
      retry: false,
    }),
    d = query.data;
  const mutation = useShipmentMutation('correct:' + reference, (result) =>
    navigate('/shipments/' + result.reference),
  );
  return (
    <>
      <PageHeading
        eyebrow="تصحيح قبل التسليم"
        title="مراجعة تصحيح الطرد"
        description="يبقى السعر الأساسي والإضافة المتفق عليها محفوظين. تغيير الفرع يصحح تسجيلًا خاطئًا فقط."
      />
      <ShipmentError error={query.error ?? catalog.error ?? error ?? mutation.error} />
      {mutation.recovery}
      {d && catalog.data && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!fields) return;
            setBusy(true);
            setError(null);
            try {
              setPreview(
                await shipmentApi<ShipmentPreview>(
                  `/shipments/${d.id}/corrections/preview`,
                  'preview',
                  {
                    companyId: catalog.company,
                    shipmentId: d.id,
                    expectedVersion: d.version,
                    fields,
                    actualAtCorrectedBranch: actual,
                  },
                  catalog.access.session?.csrfToken,
                ),
              );
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <ShipmentEditor
            key={d.id + ':' + d.version}
            initial={d.fields}
            oldPrice={d.price}
            catalog={catalog.data}
            disabled={mutation.busy || !!mutation.pending}
            onChange={(f) => {
              setFields(f);
              setPreview(null);
              setDuplicate(false);
            }}
          />
          <Field label="سبب التصحيح">
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setPreview(null);
              }}
            />
          </Field>
          {fields?.branchId !== d.fields.branchId && (
            <Field label="البضاعة موجودة فعلًا في الفرع المصحح؛ لم أنقلها بهذه العملية">
              <input
                type="checkbox"
                checked={actual}
                onChange={(e) => {
                  setActual(e.target.checked);
                  setPreview(null);
                }}
              />
            </Field>
          )}
          <Button
            disabled={!fields || !reason.trim() || busy || mutation.busy || !!mutation.pending}
          >
            معاينة التصحيح
          </Button>
          {preview && (
            <section className="correction-preview">
              <h2>قبل التصحيح</h2>
              <p>
                الفرع: {catalog.data.branches.find((b) => b.id === preview.beforeBranchId)?.name}
              </p>
              <PriceSummary price={preview.before} />
              <h2>بعد التصحيح</h2>
              <p>
                الفرع: {catalog.data.branches.find((b) => b.id === preview.afterBranchId)?.name}
              </p>
              <PriceSummary price={preview.after} />
              <p>
                التجهيز: {preparationNames[preview.beforePreparation]} ←{' '}
                {preparationNames[preview.afterPreparation]}
              </p>
              <p>
                العهدة:{' '}
                {preview.custodyEffect === 'unchanged'
                  ? 'نفس الفرع'
                  : 'تصحيح الفرع المسجل مع حفظ الاستلام الأصلي'}
              </p>
              {preview.duplicateReference && (
                <Field label="هذا طلب مستقل رغم تكرار مرجع البراند">
                  <input
                    type="checkbox"
                    checked={duplicate}
                    onChange={(e) => setDuplicate(e.target.checked)}
                  />
                </Field>
              )}
              <Button
                type="button"
                disabled={
                  !fields ||
                  mutation.busy ||
                  !!mutation.pending ||
                  (preview.duplicateReference && !duplicate)
                }
                onClick={() => {
                  if (fields)
                    void mutation.submit({
                      type: 'shipment.correct',
                      shipmentId: d.id,
                      expectedVersion: preview.expectedVersion,
                      fields,
                      reason,
                      actualAtCorrectedBranch: actual,
                      duplicateAcknowledged: duplicate,
                    });
                }}
              >
                تأكيد التصحيح
              </Button>
            </section>
          )}
        </form>
      )}
      <Button
        variant="outline"
        onClick={() => {
          setPreview(null);
          void query.refetch();
          void catalog.refetch();
        }}
      >
        تحميل النسخة الحالية
      </Button>
    </>
  );
}
export function ParcelCards({ children }: { children: ReactNode }) {
  return <div className="parcel-cards">{children}</div>;
}
