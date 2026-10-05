import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeading } from '@shahn/ui';
import type {
  GoodsTransferCommand,
  GoodsTransferResult,
  GoodsTransferView,
  TransferReceiptInput,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import {
  TransferListPage,
  receiptApi,
  transferApi,
  recoverTransferIntent,
  useTransferIntent,
  say,
} from '../goods-transfers/goods-transfers.js';
export const GoodsReceiptsPage = () => <TransferListPage screen="receive" />;
export function GoodsReceiptDetailPage() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    sourceReturn = params.get('sourceReturn') === 'true';
  const access = useAccess(),
    company = access.registry?.context.companyId;
  const [amounts, setAmounts] = useState<
    Record<string, { sound: number; damaged: number; uncertain: number; suspected: boolean }>
  >({});
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const key =
    'P15:receipt:' + access.session?.principalId + ':' + company + ':' + id + ':' + sourceReturn;
  const { pending, retain } = useTransferIntent(key);
  const query = useQuery({
    queryKey: [
      'goods-receipt-detail',
      company,
      id,
      sourceReturn,
      access.registry?.context.authorizationRevision,
    ],
    enabled: !!company && !!id,
    queryFn: () =>
      receiptApi<GoodsTransferView>(
        '/' +
          id +
          '?' +
          new URLSearchParams({
            companyId: company!,
            ...(sourceReturn ? { sourceReturn: 'true' } : {}),
          }),
      ),
    refetchInterval: 5000,
  });
  const d = query.data;
  const set = (
    lineId: string,
    field: 'sound' | 'damaged' | 'uncertain' | 'suspected',
    value: number | boolean,
  ) => {
    setAmounts((old) => ({
      ...old,
      [lineId]: {
        sound: old[lineId]?.sound ?? 0,
        damaged: old[lineId]?.damaged ?? 0,
        uncertain: old[lineId]?.uncertain ?? 0,
        suspected: old[lineId]?.suspected ?? false,
        [field]: value,
      },
    }));
  };
  const submit = async (value: GoodsTransferCommand) => {
    setBusy(true);
    setError('');
    retain(value);
    try {
      const r = await transferApi<GoodsTransferResult>(
        '/commands',
        value,
        access.session?.csrfToken,
      );
      retain(null);
      setAmounts({});
      setNotice(
        r.state === 'closed'
          ? 'سُجل استلام كل الرصيد.'
          : 'سُجل الاستلام. الكمية الباقية مع الناقل تحتاج متابعة.',
      );
      await query.refetch();
    } catch (e) {
      const x = e as Error & { status?: number };
      setError(say(x.message));
      if (x.status && x.status < 500) retain(null);
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
      setAmounts({});
      setNotice(
        r.state === 'closed'
          ? 'سُجل استلام كل الرصيد.'
          : 'سُجل الاستلام. الكمية الباقية مع الناقل تحتاج متابعة.',
      );
      await query.refetch();
    } catch (e) {
      const x = e as Error & { status?: number };
      if (x.status === 404) {
        setBusy(false);
        await submit(value);
        return;
      }
      setError(say(x.message));
      if (x.status && x.status < 500) retain(null);
    } finally {
      setBusy(false);
    }
  };
  const prepare = () => {
    if (!d || !company) return;
    const lines: TransferReceiptInput[] = d.lines.flatMap((l) => {
      const v = amounts[l.id];
      if (!v) return [];
      const total = v.sound + v.damaged + v.uncertain;
      return total > 0
        ? [
            {
              lineId: l.id,
              sound: v.sound,
              damaged: v.damaged,
              uncertain: v.uncertain,
              inspection:
                l.kind === 'parcel' ? ('parcel-exterior' as const) : ('counted-pieces' as const),
              suspectedInternalIssue: v.suspected,
            },
          ]
        : [];
    });
    if (!lines.length) {
      setError('سجّل ما استلمته فعلياً في سطر واحد على الأقل. لا توجد كمية افتراضية.');
      return;
    }
    void submit({
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
      companyId: company,
      branchId: sourceReturn ? d.sourceBranchId : d.destinationBranchId,
      type: sourceReturn ? 'goods.sourceReturn' : 'goods.receive',
      manifestId: d.id,
      expectedVersion: d.version,
      actualAt: new Date().toISOString(),
      lines,
    });
  };
  return (
    <section className="goods-page">
      <PageHeading
        eyebrow={sourceReturn ? 'رجوع فعلي للمصدر' : 'وارد الفرع'}
        title={d ? 'فحص رحلة ' + d.reference : 'فحص البضائع'}
        description="افحص الطرد المختوم من الخارج وتأكد من هويته. عدّ القطع المخزنة؛ الكمية غير المستلمة تبقى مع الناقل."
      />
      {query.isPending && <p role="status">جارٍ تحميل الرصيد…</p>}
      {query.isError && <p role="alert">{say((query.error as Error).message)}</p>}
      {d && (
        <>
          <p>
            من {d.sourceBranchName} إلى {d.destinationBranchName} · الناقل {d.driverName}
          </p>
          <p>
            استلام في: {sourceReturn ? d.sourceBranchName : d.destinationBranchName} · حالة الرحلة:{' '}
            {d.state === 'in_transit'
              ? 'مع الناقل'
              : d.state === 'closed'
                ? 'مكتملة'
                : 'لم تبدأ أو ألغيت'}
          </p>
          {d.state === 'in_transit' && (
            <div className="goods-receipt-lines">
              {d.lines.map((l) => (
                <fieldset key={l.id} disabled={l.remaining === 0}>
                  <legend>
                    {l.kind === 'parcel' ? 'طرد ' + l.shipmentReference : l.variantName} ·{' '}
                    {l.brandName} · المتبقي {l.remaining}
                  </legend>
                  {l.kind === 'parcel' ? (
                    <>
                      <p>تحقق من رقم الطرد وحالته الخارجية. لا تؤكد المحتوى الداخلي غير المرئي.</p>
                      <label>
                        ما وصل؟
                        <select
                          value={
                            amounts[l.id]?.sound
                              ? 'sound'
                              : amounts[l.id]?.damaged
                                ? 'damaged'
                                : amounts[l.id]?.uncertain
                                  ? 'uncertain'
                                  : ''
                          }
                          onChange={(e) =>
                            setAmounts({
                              ...amounts,
                              [l.id]: {
                                sound: e.target.value === 'sound' ? 1 : 0,
                                damaged: e.target.value === 'damaged' ? 1 : 0,
                                uncertain: e.target.value === 'uncertain' ? 1 : 0,
                                suspected: amounts[l.id]?.suspected ?? false,
                              },
                            })
                          }
                        >
                          <option value="">لم يُستلم</option>
                          <option value="sound">طرد سليم خارجياً</option>
                          <option value="damaged">طرد تالف خارجياً — غير متاح</option>
                          <option value="uncertain">الحالة غير مؤكدة — غير متاح</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <div className="goods-form-grid">
                      {(['sound', 'damaged', 'uncertain'] as const).map((name) => (
                        <label key={name}>
                          {name === 'sound'
                            ? 'سليم'
                            : name === 'damaged'
                              ? 'تالف — غير متاح'
                              : 'غير مؤكد — غير متاح'}
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max={l.remaining}
                            step="1"
                            value={amounts[l.id]?.[name] ?? 0}
                            onChange={(e) => set(l.id, name, Number(e.target.value))}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                  {l.kind === 'parcel' && (
                    <label className="goods-inline">
                      <input
                        type="checkbox"
                        checked={amounts[l.id]?.suspected ?? false}
                        onChange={(e) => set(l.id, 'suspected', e.target.checked)}
                      />{' '}
                      توجد شبهة نقص أو تلف داخلي — للمراجعة، دون تعويض تلقائي
                    </label>
                  )}
                  <p>
                    غير المستلم بعد هذا القرار:{' '}
                    {Math.max(
                      l.remaining -
                        (amounts[l.id]?.sound ?? 0) -
                        (amounts[l.id]?.damaged ?? 0) -
                        (amounts[l.id]?.uncertain ?? 0),
                      0,
                    )}
                  </p>
                </fieldset>
              ))}
            </div>
          )}
          <h2>سجل الرحلة</h2>
          {d.receipts.map((r) => (
            <p key={r.id}>
              {r.kind === 'destination' ? 'استلام الوجهة' : 'رجوع للمصدر'} · {r.actorName} ·{' '}
              {new Date(r.actualAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
            </p>
          ))}
          {d.lines.find((l) => l.shipmentId)?.shipmentId && (
            <p>
              <Link to={'/tracking/' + d.lines.find((l) => l.shipmentId)!.shipmentId}>
                تتبّع الشحنة المرتبطة
              </Link>
            </p>
          )}
        </>
      )}
      {d?.state === 'in_transit' && (
        <div className="goods-actions">
          <button className="goods-primary" disabled={busy || !!pending} onClick={prepare}>
            {sourceReturn ? 'تأكيد الرجوع الفعلي للمصدر' : 'تأكيد ما استُلم فعلياً'}
          </button>
        </div>
      )}
      {pending && (
        <button className="goods-secondary" disabled={busy} onClick={() => void recover(pending)}>
          التحقق من الطلب الأصلي
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
