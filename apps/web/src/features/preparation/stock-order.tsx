import { useState } from 'react';
import { Button, Input, FormGroup } from '@shahn/ui';
import type { ShipmentDetail } from '@shahn/contracts';
import { Field } from '../brands/api.js';
import { useAccess } from '../access/access.js';
import { useShipmentMutation } from '../shipments/api.js';
import { ShipmentError } from '../shipments/shipments.js';
export function StockHistory({ detail, onSaved }: { detail: ShipmentDetail; onSaved: () => void }) {
  const access = useAccess(),
    canInspect = access.registry?.context.grants.includes('intake');
  const [reason, setReason] = useState('');
  const [values, setValues] = useState<
    Record<string, { sound: string; damaged: string; uncertain: string }>
  >({});
  const mutation = useShipmentMutation('unpack:' + detail.id, onSaved);
  if (!detail.stock.allocations.length && !detail.stock.unpack.length) return null;
  const pending = detail.stock.unpack.filter((p) => p.remaining > 0);
  return (
    <section className="parcel-contents">
      <h2>حجوزات ومكونات المخزون</h2>
      <p>هذه القطع ضمن مخزون المنتجات نفسه؛ لا تضف عدد الطرود إلى عدد القطع.</p>
      {!detail.stock.eligible && (
        <p role="alert">موقوف: يوجد عجز في المخزون. التجهيز والتسليم غير مؤهلين.</p>
      )}
      {detail.stock.allocations.map((a) => (
        <p key={a.reservationId}>
          {a.variantName} · <bdi>{a.quantity}</bdi> · {a.active ? 'حجز نشط' : 'حجز محرر'}{' '}
          {a.held && (
            <>
              · عجز <bdi>{a.shortage}</bdi>
            </>
          )}
        </p>
      ))}
      {detail.stock.unpack.map((p) => (
        <p key={p.pendingId}>
          {p.variantName} · بانتظار فحص فك التغليف <bdi>{p.remaining}</bdi> · سليم مفحوص{' '}
          <bdi>{p.sound}</bdi> · تالف <bdi>{p.damaged}</bdi> · غير مؤكد <bdi>{p.uncertain}</bdi>
        </p>
      ))}
      {canInspect && pending.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const lines = pending
              .filter((p) => values[p.pendingId])
              .map((p) => ({
                pendingId: p.pendingId,
                expectedRemaining: p.remaining,
                sound: Number(values[p.pendingId]!.sound),
                damaged: Number(values[p.pendingId]!.damaged),
                uncertain: Number(values[p.pendingId]!.uncertain),
              }))
              .filter((l) => l.sound + l.damaged + l.uncertain > 0);
            if (lines.length)
              void mutation.submit({
                type: 'shipment.unpack',
                shipmentId: detail.id,
                expectedVersion: detail.version,
                reason,
                lines,
              });
          }}
        >
          <FormGroup
            title="تأكيد فك التغليف والفحص الفعلي"
            description="أدخل ما فحصته بالفعل؛ السليم فقط يعود متاحًا. يمكنك فحص جزء من المتبقي."
          >
            {pending.map((p) => (
              <div key={p.pendingId}>
                <p>
                  {p.variantName} · المتبقي <bdi>{p.remaining}</bdi>
                </p>
                {(['sound', 'damaged', 'uncertain'] as const).map((k, i) => (
                  <Field key={k} label={`${['سليم', 'تالف', 'غير مؤكد'][i]} — ${p.variantName}`}>
                    <Input
                      type="number"
                      min="0"
                      max={p.remaining}
                      step="1"
                      value={values[p.pendingId]?.[k] ?? '0'}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [p.pendingId]: {
                            ...(v[p.pendingId] ?? { sound: '0', damaged: '0', uncertain: '0' }),
                            [k]: e.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
            ))}
            <Field label="سبب ونتيجة الفحص الفعلي">
              <textarea
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <ShipmentError error={mutation.error} />
            {mutation.recovery}
            <Button disabled={!reason.trim() || mutation.busy || !!mutation.pending}>
              تأكيد الفحص الفعلي
            </Button>
          </FormGroup>
        </form>
      )}
    </section>
  );
}
