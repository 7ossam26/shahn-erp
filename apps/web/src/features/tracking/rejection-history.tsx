import { useQuery } from '@tanstack/react-query';
import type { TrackingDetail } from '@shahn/contracts/execution';
import { useAccess } from '../access/access.js';
/** Read-only accepted source history, using the existing authorized operational API. */
export function ShipmentRejectionHistory({ shipmentId }: { shipmentId: string }) {
  const access = useAccess(),
    company = access.registry?.context.companyId;
  const q = useQuery<TrackingDetail>({
    queryKey: [
      'shipment-execution-history',
      company,
      shipmentId,
      access.registry?.context.authorizationRevision,
    ],
    enabled: !!company && !!access.registry?.context.grants.includes('tracking'),
    retry: false,
    queryFn: async () => {
      const r = await fetch('/api/v1/tracking/' + shipmentId + '?companyId=' + company, {
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw Error('EXECUTION_HISTORY_UNAVAILABLE');
      return r.json();
    },
  });
  if (!access.registry?.context.grants.includes('tracking')) return null;
  return (
    <section className="parcel-history">
      <h2>نتائج التنفيذ وأسباب الرفض</h2>
      {q.isError ? (
        <p role="status">تعذر تحميل سجل التنفيذ المصرح به.</p>
      ) : q.data?.attempts.length ? (
        q.data.attempts.map((x) => (
          <article key={x.attemptId}>
            <p>{x.reason}</p>
            {x.reasonDetail && <p>{x.reasonDetail}</p>}
            <p>{x.visitKnown ? 'دليل وصول معتمد متاح' : 'بانتظار دليل الوصول'}</p>
            {x.history.length > 1 && (
              <details>
                <summary>السبب الأصلي والتصحيحات</summary>
                {x.history.map((h) => (
                  <p key={h.outcomeId + ':' + h.revision}>
                    {h.revision}: {h.reason} {h.reasonDetail ?? ''}
                  </p>
                ))}
              </details>
            )}
          </article>
        ))
      ) : (
        <p>لا توجد نتيجة محاولة متاحة.</p>
      )}
    </section>
  );
}
