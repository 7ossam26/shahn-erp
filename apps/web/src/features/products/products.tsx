import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, PageHeading, FormGroup, Input } from '@shahn/ui';
import type { ProductFields, ProductRecord } from '@shahn/contracts';
import { Field, ErrorNotice, CommercialError } from '../brands/api.js';
import { inventoryApi, useInventoryCatalog, useInventoryMutation } from '../inventory/api.js';
interface Detail {
  product: ProductRecord;
  history: { version: number; recordedAt: string; fields: ProductFields }[];
}
export function ProductsPage() {
  const { id } = useParams(),
    catalog = useInventoryCatalog(),
    brand = catalog.data?.brands.find((b) => b.id === id);
  return (
    <div className="inventory-page">
      <PageHeading
        eyebrow="تعريف منتجات البراند"
        title={brand ? 'منتجات ' + brand.name : 'منتجات البراند'}
        description="أسماء ثابتة بهويات مستقلة. التعريف لا يستلم مخزونًا ولا يحدد قيمة مالية."
      />
      <ErrorNotice error={catalog.error ?? catalog.access.authorityError} />
      {catalog.isLoading && <p role="status">جارٍ التحميل…</p>}
      {brand && !catalog.access.authorityError && (
        <>
          <ProductEditor brandId={brand.id} onSaved={() => void catalog.refetch()} />
          <section className="stock-panel">
            <h2>المنتجات المعرفة</h2>
            {catalog.data?.products
              .filter((p) => p.brandId === brand.id)
              .map((p) => (
                <article className="stock-row" key={p.id}>
                  <div>
                    <h2>
                      <Link to={'/products/' + p.id + '/edit'}>{p.name}</Link>
                    </h2>
                    <p>
                      {p.active ? 'نشط' : 'موقوف'} · النسخة {p.version}
                    </p>
                  </div>
                  <div>
                    {p.variants.map((v) => (
                      <p key={v.id}>
                        {v.name} · {v.options} · {v.active ? 'نشط' : 'موقوف'}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            <Link to="/inventory/receipts/new">تسجيل استلام فعلي لهذه المنتجات</Link>
          </section>
        </>
      )}
    </div>
  );
}
function ProductEditor({
  brandId,
  existing,
  onSaved,
}: {
  brandId: string;
  existing?: ProductRecord;
  onSaved: () => void;
}) {
  const catalog = useInventoryCatalog(),
    [fields, setFields] = useState<ProductFields>(() =>
      existing
        ? { name: existing.name, active: existing.active, variants: existing.variants }
        : { name: '', active: true, variants: [{ name: 'افتراضي', options: '', active: true }] },
    ),
    [expectedVersion, setVersion] = useState(existing?.version ?? 1),
    [saved, setSaved] = useState(''),
    [warnings, setWarnings] = useState<string[]>([]),
    [latest, setLatest] = useState<ProductRecord | null>(null);
  const mutation = useInventoryMutation(
    existing ? 'product:' + existing.id : 'create:' + brandId,
    (result) => {
      setSaved(result.entityId);
      setWarnings(result.warnings);
      onSaved();
    },
  );
  const duplicates =
    catalog.data?.products.some(
      (p) =>
        p.id !== existing?.id &&
        p.brandId === brandId &&
        p.name.trim() === fields.name.trim() &&
        p.variants.some((v) =>
          fields.variants.some(
            (n) => n.name.trim() === v.name.trim() && n.options.trim() === v.options.trim(),
          ),
        ),
    ) ||
    fields.variants.some((v, i) =>
      fields.variants.some(
        (o, j) =>
          i !== j && v.name.trim() === o.name.trim() && v.options.trim() === o.options.trim(),
      ),
    );
  const disabled = mutation.busy || !!mutation.pending || !!saved;
  return (
    <>
      <ErrorNotice error={mutation.error} />
      {mutation.recovery}
      {saved ? (
        <section className="stock-confirm" role="status">
          <h2>تم حفظ المنتج</h2>
          <p>لم تزد أي كمية. استلام المخزون عملية مستقلة.</p>
          {warnings.length > 0 && (
            <p>هناك أسماء عرض متكررة. راجع المتغيرات قبل الاستلام؛ كل هوية مستقلة.</p>
          )}
          <Link to={'/products/' + saved + '/edit'}>فتح المنتج وتاريخه</Link>
          {existing && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void inventoryApi<Detail>(
                  `/products/${existing.id}?companyId=${catalog.company}`,
                  'product',
                )
                  .then(({ product }) => {
                    setVersion(product.version);
                    setFields({
                      name: product.name,
                      active: product.active,
                      variants: product.variants,
                    });
                    setSaved('');
                  })
                  .catch(mutation.setError)
              }
            >
              تعديل جديد بعد مراجعة النسخة المحفوظة
            </Button>
          )}
          {!existing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaved('');
                setFields({
                  name: '',
                  active: true,
                  variants: [{ name: 'افتراضي', options: '', active: true }],
                });
              }}
            >
              تعريف منتج جديد
            </Button>
          )}
        </section>
      ) : (
        <form
          className="commercial-form"
          onSubmit={(e) => {
            e.preventDefault();
            void mutation.submit(
              existing
                ? { type: 'product.update', productId: existing.id, expectedVersion, fields }
                : { type: 'product.create', brandId, fields },
            );
          }}
        >
          <fieldset disabled={disabled}>
            <FormGroup description="" title={existing ? 'تعديل المنتج — هوية ثابتة' : 'منتج جديد'}>
              <Field label="اسم المنتج">
                <Input
                  required
                  maxLength={180}
                  value={fields.name}
                  onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <label>
                <input
                  type="checkbox"
                  checked={fields.active}
                  onChange={(e) => setFields((f) => ({ ...f, active: e.target.checked }))}
                />
                نشط للاستخدام الجديد
              </label>
              <p>الإيقاف يحفظ الكميات والتاريخ وأعمال الاستكمال المقبولة سابقًا.</p>
            </FormGroup>
            <FormGroup description="" title="المتغيرات">
              <p>عرّف اسمًا لكل متغير أو اترك متغيرًا افتراضيًا. المقاس واللون وصف اختياري.</p>
              {fields.variants.map((v, i) => (
                <div className="receipt-line" key={v.id ?? i}>
                  <Field label={`اسم المتغير ${i + 1}`}>
                    <Input
                      required
                      maxLength={180}
                      value={v.name}
                      onChange={(e) =>
                        setFields((f) => ({
                          ...f,
                          variants: f.variants.map((o, j) =>
                            j === i ? { ...o, name: e.target.value } : o,
                          ),
                        }))
                      }
                    />
                  </Field>
                  <Field label={`وصف الخيارات ${i + 1}`}>
                    <Input
                      maxLength={180}
                      value={v.options}
                      onChange={(e) =>
                        setFields((f) => ({
                          ...f,
                          variants: f.variants.map((o, j) =>
                            j === i ? { ...o, options: e.target.value } : o,
                          ),
                        }))
                      }
                    />
                  </Field>
                  <label>
                    <input
                      type="checkbox"
                      checked={v.active}
                      onChange={(e) =>
                        setFields((f) => ({
                          ...f,
                          variants: f.variants.map((o, j) =>
                            j === i ? { ...o, active: e.target.checked } : o,
                          ),
                        }))
                      }
                    />
                    متغير نشط
                  </label>
                  {!v.id && fields.variants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setFields((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))
                      }
                    >
                      حذف المتغير {i + 1}
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={fields.variants.length >= 100}
                onClick={() =>
                  setFields((f) => ({
                    ...f,
                    variants: [...f.variants, { name: '', options: '', active: true }],
                  }))
                }
              >
                إضافة متغير
              </Button>
            </FormGroup>
          </fieldset>
          {duplicates && (
            <p role="status" className="stock-confirm">
              اسم المنتج والمتغير والخيارات يتكرر. افحص المنتجات القائمة قبل الحفظ؛ لن ندمج المخزون.
            </p>
          )}
          {existing && <p>نسخة المراجعة: {expectedVersion}</p>}
          {mutation.error instanceof CommercialError &&
            mutation.error.code === 'REVISION_CONFLICT' &&
            existing && (
              <div className="stock-confirm">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void inventoryApi<Detail>(
                      `/products/${existing.id}?companyId=${catalog.company}`,
                      'product',
                    )
                      .then((d) => setLatest(d.product))
                      .catch(mutation.setError)
                  }
                >
                  تحميل النسخة الحالية للمراجعة
                </Button>
                {latest && (
                  <>
                    <p>
                      حاليًا: {latest.name} · {latest.active ? 'نشط' : 'موقوف'} · نسخة{' '}
                      {latest.version}
                    </p>
                    {latest.variants.map((v) => (
                      <p key={v.id}>
                        {v.name} · {v.options}
                      </p>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setVersion(latest.version);
                        setFields((f) => ({
                          ...f,
                          variants: [
                            ...f.variants,
                            ...latest.variants.filter(
                              (v) => !f.variants.some((o) => o.id === v.id),
                            ),
                          ],
                        }));
                        setLatest(null);
                        mutation.setError(null);
                      }}
                    >
                      راجعت النسخة الحالية — الاحتفاظ بتعديلي
                    </Button>
                  </>
                )}
              </div>
            )}
          <Button type="submit" disabled={disabled || !!catalog.access.authorityError}>
            {mutation.busy ? 'جارٍ الحفظ…' : existing ? 'حفظ التعديل' : 'تعريف المنتج'}
          </Button>
        </form>
      )}
    </>
  );
}
export function ProductEditPage() {
  const { id } = useParams(),
    catalog = useInventoryCatalog(),
    company = catalog.company;
  const query = useQuery({
    queryKey: [
      'product-detail',
      id,
      company,
      catalog.access.registry?.context.authorizationRevision,
    ],
    queryFn: () => inventoryApi<Detail>(`/products/${id}?companyId=${company}`, 'product'),
    enabled: !!company && !catalog.access.authorityError,
    retry: false,
  });
  useEffect(() => {
    document.querySelector<HTMLHeadingElement>('h1')?.focus();
  }, [query.data?.product.id]);
  const data = query.data;
  return (
    <div className="inventory-page">
      <PageHeading
        eyebrow="تعريف وتاريخ"
        title={data ? 'تعديل ' + data.product.name : 'تعديل المنتج'}
        description="إعادة التسمية تحفظ هوية كل متغير وكمياته. أوقف المتغير بدل حذف تاريخه."
      />
      <ErrorNotice error={query.error ?? catalog.access.authorityError} />
      {query.isLoading && <p role="status">جارٍ التحميل…</p>}
      {data && !query.error && !catalog.access.authorityError && (
        <>
          <Link to={`/brands/${data.product.brandId}/products`}>منتجات البراند</Link>
          <ProductEditor
            key={data.product.id}
            brandId={data.product.brandId}
            existing={data.product}
            onSaved={() => void query.refetch()}
          />
          <section className="stock-panel">
            <h2>تاريخ تعريف المنتج</h2>
            <ol className="stock-timeline">
              {data.history.map((h) => (
                <li key={h.version}>
                  <p>
                    نسخة {h.version} · {h.fields.name} · {h.fields.active ? 'نشط' : 'موقوف'}
                  </p>
                  <p>
                    {new Date(h.recordedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                  </p>
                  {h.fields.variants.map((v) => (
                    <p key={v.id}>
                      {v.name} · {v.options}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
