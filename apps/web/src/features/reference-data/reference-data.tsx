import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeading, FormGroup, Button, StatePanel } from '@shahn/ui';
import type {
  ReferenceCatalog,
  ReferenceFields,
  ReferenceKind,
  ReferenceRecord,
  TariffRecord,
  TariffFields,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { useCatalog } from '../brands/brands.js';
import {
  ErrorNotice,
  Field,
  TextField,
  displayMinor,
  inputMinor,
  useCommercialMutation,
  CommercialError,
} from '../brands/api.js';
const names = { governorate: 'المحافظات', area: 'المناطق', tier: 'شرائح الأسعار' };
export function ReferenceHome() {
  return (
    <>
      <PageHeading
        eyebrow="إعداد الشركة"
        title="البيانات المرجعية"
        description="أسماء ثابتة الهوية، مع إيقاف الاستخدام الجديد والحفاظ على التاريخ."
      />
      <div className="module-grid">
        {(['governorate', 'area', 'tier'] as const).map((k) => (
          <Link key={k} to={'/settings/reference-data/' + k} className="commercial-row">
            <strong>{names[k]}</strong>
            <span>إنشاء وتعديل وإيقاف</span>
          </Link>
        ))}
      </div>
    </>
  );
}
export function ReferencePage() {
  const { kind } = useParams(),
    catalog = useCatalog(true);
  if (!kind || !['governorate', 'area', 'tier'].includes(kind))
    return <StatePanel state="error" title="المرجع غير متاح" />;
  if (catalog.isLoading) return <StatePanel state="pending" title="جارٍ تحميل المرجع" />;
  if (!catalog.data) return <ErrorNotice error={catalog.error} />;
  return (
    <ReferenceEditor
      key={kind}
      kind={kind as ReferenceKind}
      catalog={catalog.data}
      reload={() => catalog.refetch()}
    />
  );
}
function ReferenceEditor({
  kind,
  catalog,
  reload,
}: {
  kind: ReferenceKind;
  catalog: ReferenceCatalog;
  reload: () => Promise<unknown>;
}) {
  const [selected, setSelected] = useState<ReferenceRecord | null>(null),
    [draft, setDraft] = useState<ReferenceFields>({
      kind,
      name: '',
      active: true,
      parentId: null,
      volumeRange: null,
    }),
    [version, setVersion] = useState(1),
    [saved, setSaved] = useState(false);
  const mutation = useCommercialMutation((result) => {
    setVersion(result.version);
    setSaved(true);
    void reload();
    setSelected(null);
    setDraft({ kind, name: '', active: true, parentId: null, volumeRange: null });
  }, 'reference-' + kind);
  const change = (id: string) => {
    const row = catalog.references.find((r) => r.id === id) ?? null;
    setSelected(row);
    setVersion(row?.version ?? 1);
    setDraft(
      row
        ? {
            kind: row.kind,
            name: row.name,
            active: row.active,
            parentId: row.parentId,
            volumeRange: row.volumeRange,
          }
        : { kind, name: '', active: true, parentId: null, volumeRange: null },
    );
    setSaved(false);
    mutation.setError(null);
  };
  return (
    <>
      <PageHeading
        eyebrow="البيانات المرجعية"
        title={names[kind]}
        description="التعديل يحتفظ بالهوية. إيقاف المرجع يمنع الاختيار في الطلبات الجديدة."
      />
      <Link to="/settings/reference-data">البيانات المرجعية</Link>
      <ErrorNotice error={mutation.error} />
      {mutation.recovery}
      {saved && <p role="status">تم حفظ المرجع.</p>}
      <form
        className="commercial-form"
        onSubmit={(e) => {
          e.preventDefault();
          void mutation.submit(
            selected
              ? {
                  type: 'reference.update',
                  entityId: selected.id,
                  expectedVersion: version,
                  fields: draft,
                }
              : { type: 'reference.create', fields: draft },
          );
        }}
      >
        <fieldset className="commercial-fieldset" disabled={mutation.busy || !!mutation.pending}>
          <Field label="المرجع المطلوب تعديله">
            <select value={selected?.id ?? ''} onChange={(e) => change(e.target.value)}>
              <option value="">إضافة مرجع جديد</option>
              {catalog.references
                .filter((r) => r.kind === kind)
                .map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name} · {r.active ? 'نشط' : 'موقوف'} · نسخة {r.version}
                  </option>
                ))}
            </select>
          </Field>
          <FormGroup
            title={selected ? 'تعديل المرجع' : 'مرجع جديد'}
            description="الاسم للعرض؛ لا يغيّر الهوية الفنية."
          >
            <TextField
              label="اسم المرجع"
              value={draft.name}
              onChange={(name) => setDraft((d) => ({ ...d, name }))}
              required
            />
            {kind === 'area' && (
              <Field label="المحافظة التابعة">
                <select
                  required
                  value={draft.parentId ?? ''}
                  disabled={!!selected}
                  onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value || null }))}
                >
                  <option value="">اختر المحافظة</option>
                  {catalog.references
                    .filter(
                      (r) => r.kind === 'governorate' && (r.active || r.id === draft.parentId),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {kind === 'tier' && (
              <TextField
                label="وصف حجم الطلبات الشهري (اختياري)"
                value={draft.volumeRange ?? ''}
                onChange={(volumeRange) =>
                  setDraft((d) => ({ ...d, volumeRange: volumeRange || null }))
                }
              />
            )}
            <label className="commercial-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              مرجع نشط
            </label>
          </FormGroup>
          <Button type="submit">حفظ المرجع</Button>
        </fieldset>
      </form>
      {mutation.error instanceof CommercialError && mutation.error.currentVersion && (
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
      <div className="commercial-list">
        {catalog.references
          .filter((r) => r.kind === kind)
          .map((r) => (
            <button
              key={r.id}
              className="commercial-row"
              disabled={!!mutation.pending || mutation.busy}
              onClick={() => change(r.id)}
            >
              <strong>{r.name}</strong>
              <span>{r.active ? 'نشط' : 'موقوف'}</span>
              <small>نسخة {r.version}</small>
            </button>
          ))}
      </div>
    </>
  );
}
export function TariffsPage() {
  const catalog = useCatalog();
  if (catalog.isLoading) return <StatePanel state="pending" title="جارٍ تحميل الأسعار" />;
  if (!catalog.data) return <ErrorNotice error={catalog.error} />;
  return <TariffEditor catalog={catalog.data} reload={() => catalog.refetch()} />;
}
function TariffEditor({
  catalog,
  reload,
}: {
  catalog: ReferenceCatalog;
  reload: () => Promise<unknown>;
}) {
  const { registry } = useAccess(),
    [selected, setSelected] = useState<TariffRecord | null>(null),
    [version, setVersion] = useState(1),
    [draft, setDraft] = useState<TariffFields>({
      tierId: '',
      governorateId: '',
      areaId: null,
      amountMinor: '0',
      active: true,
    }),
    [amount, setAmount] = useState(''),
    [saved, setSaved] = useState(false);
  const mutation = useCommercialMutation((result) => {
    setVersion(result.version);
    setSaved(true);
    setSelected(null);
    setDraft({ tierId: '', governorateId: '', areaId: null, amountMinor: '0', active: true });
    setAmount('');
    void reload();
  }, 'tariff');
  const label = (id: string) => catalog.references.find((r) => r.id === id)?.name ?? id;
  const change = (id: string) => {
    const row = catalog.tariffs.find((t) => t.id === id) ?? null;
    setSelected(row);
    setVersion(row?.version ?? 1);
    setDraft(
      row
        ? {
            tierId: row.tierId,
            governorateId: row.governorateId,
            areaId: row.areaId,
            amountMinor: row.amountMinor,
            active: row.active,
          }
        : { tierId: '', governorateId: '', areaId: null, amountMinor: '0', active: true },
    );
    setAmount(row ? displayMinor(row.amountMinor) : '');
    setSaved(false);
    mutation.setError(null);
  };
  const save = async () => {
    try {
      const fields = { ...draft, amountMinor: inputMinor(amount) };
      await mutation.submit(
        selected
          ? { type: 'tariff.update', entityId: selected.id, expectedVersion: version, fields }
          : { type: 'tariff.create', fields },
      );
    } catch (e) {
      mutation.setError(e);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="البراندات"
        title="أسعار الشحن"
        description="السعر حسب الشريحة والمحافظة. سعر المنطقة اختياري ويحل محل سعر المحافظة عند وجوده."
      />
      <div className="commercial-actions">
        <Link to="/brands">البراندات</Link>
        {registry?.context.grants.includes('reference-data') && (
          <Link to="/settings/reference-data">إدارة المناطق والشرائح</Link>
        )}
      </div>
      <ErrorNotice error={mutation.error} />
      {mutation.recovery}
      {saved && <p role="status">تم حفظ نسخة السعر الجديدة. اللقطات السابقة ثابتة.</p>}
      <form
        className="commercial-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={mutation.busy || !!mutation.pending} className="commercial-fieldset">
          <Field label="السعر المطلوب تعديله">
            <select value={selected?.id ?? ''} onChange={(e) => change(e.target.value)}>
              <option value="">إضافة سعر جديد</option>
              {catalog.tariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {label(t.tierId)} · {label(t.governorateId)} ·{' '}
                  {t.areaId ? label(t.areaId) : 'المحافظة'} · {displayMinor(t.amountMinor)} ج.م
                </option>
              ))}
            </select>
          </Field>
          <FormGroup
            title="اتفاق السعر"
            description="التغيير يسري فور الحفظ على اللقطات الجديدة فقط. صفر سعر صريح؛ الإيقاف يزيل السعر من البحث الجديد."
          >
            <Field label="شريحة السعر">
              <select
                required
                disabled={!!selected}
                value={draft.tierId}
                onChange={(e) => setDraft((d) => ({ ...d, tierId: e.target.value }))}
              >
                <option value="">اختر الشريحة</option>
                {catalog.references
                  .filter((r) => r.kind === 'tier' && (r.active || r.id === draft.tierId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="محافظة السعر">
              <select
                required
                disabled={!!selected}
                value={draft.governorateId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, governorateId: e.target.value, areaId: null }))
                }
              >
                <option value="">اختر المحافظة</option>
                {catalog.references
                  .filter(
                    (r) => r.kind === 'governorate' && (r.active || r.id === draft.governorateId),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="منطقة السعر (اختياري)">
              <select
                disabled={!!selected}
                value={draft.areaId ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, areaId: e.target.value || null }))}
              >
                <option value="">سعر المحافظة</option>
                {catalog.references
                  .filter(
                    (r) =>
                      r.kind === 'area' &&
                      r.parentId === draft.governorateId &&
                      (r.active || r.id === draft.areaId),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </Field>
            <TextField label="سعر الشحن بالجنيه" value={amount} onChange={setAmount} required />
            <label className="commercial-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              سعر نشط
            </label>
          </FormGroup>
          <Button type="submit">حفظ السعر</Button>
        </fieldset>
      </form>
      {mutation.error instanceof CommercialError && mutation.error.currentVersion && (
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
      <div className="commercial-list">
        {catalog.tariffs.map((t) => (
          <button
            className="commercial-row"
            key={t.id}
            disabled={mutation.busy || !!mutation.pending}
            onClick={() => change(t.id)}
          >
            <strong>
              {label(t.tierId)} · {label(t.governorateId)}
            </strong>
            <span>
              {t.areaId ? label(t.areaId) : 'سعر المحافظة'} · {displayMinor(t.amountMinor)} ج.م
            </span>
            <small>
              {t.active ? 'نشط' : 'موقوف'} · نسخة {t.version}
            </small>
          </button>
        ))}
      </div>
    </>
  );
}
