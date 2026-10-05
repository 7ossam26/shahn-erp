import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeading, StatePanel, Button } from '@shahn/ui';
import { useAccess } from '../access/access.js';
import { displayMinor } from '../brands/api.js';
import { validateExecutionRecords } from '@shahn/contracts/execution';
import './tracking.css';
type Earning = {
  id: string;
  reference: string;
  workAt: string;
  amountMinor: string | null;
  status: string;
  reason: string | null;
  employeeName: string | null;
};
type Review = {
  id: string;
  shipmentId: string;
  reference: string;
  state: string;
  createdAt: string;
  reason: string;
};
export function ExecutionRecordsPage({ kind }: { kind: 'earnings' | 'reviews' }) {
  const a = useAccess(),
    [params, setParams] = useSearchParams(),
    company = a.registry?.context.companyId,
    page = Number(params.get('page') ?? 1),
    capability = kind === 'earnings' ? 'employees' : 'integration',
    allowed = a.registry?.context.grants.includes(capability);
  const q = useQuery({
    queryKey: ['execution', kind, company, a.registry?.context.authorizationRevision, page],
    enabled: !!allowed,
    queryFn: async () => {
      const r = await fetch(`/api/v1/execution/${kind}?companyId=${company}&page=${page}`);
      if (!r.ok) throw Error('REQUEST_FAILED');
      const body = await r.json();
      if (!validateExecutionRecords[kind](body)) throw Error('INVALID_EXECUTION_RESPONSE');
      return body as { items: (Earning | Review)[]; page: number };
    },
  });
  const data = q.error || a.authorityError || !allowed ? undefined : q.data;
  return (
    <section className="tracking">
      <Link to={kind === 'earnings' ? '/employees' : '/integration'}>العودة</Link>
      <PageHeading
        eyebrow="دليل التنفيذ"
        title={kind === 'earnings' ? 'عمولات الزيارات' : 'مراجعات تصحيح التنفيذ'}
        description={
          kind === 'earnings'
            ? 'العمولة من الزيارة المثبتة وبالشروط المحفوظة؛ صرف الرواتب مسار مستقل.'
            : 'تصحيح مصدر التنفيذ لا يغيّر الأموال أو الرواتب المحمية تلقائياً.'
        }
      />
      {!allowed ? (
        <StatePanel state="error" title="لا توجد صلاحية لهذه الشاشة" />
      ) : q.error || a.authorityError ? (
        <StatePanel state="error" title="تعذر تحميل البيانات">
          <Button onClick={() => void q.refetch()}>تحديث</Button>
        </StatePanel>
      ) : !data ? (
        <p role="status">جارٍ التحميل…</p>
      ) : (
        <>
          {data.items.map((x) => (
            <article className="tracking-attempt" key={x.id}>
              <strong>
                شحنة <bdi>{x.reference}</bdi>
              </strong>
              {'amountMinor' in x ? (
                <>
                  <span>{x.employeeName ?? 'بانتظار حسم ربط الموظف'}</span>
                  <span>
                    {x.amountMinor === null
                      ? 'أساس استحقاق معلق — المبلغ غير محسوم'
                      : displayMinor(x.amountMinor) + ' ج.م'}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {x.state === 'open' ? 'تحتاج إلى مراجعة مرتبطة بالمصدر' : 'تمت معالجة المراجعة'}
                  </span>
                  <small>سبب التصحيح التفصيلي غير متاح في المصدر الحالي.</small>
                  {a.registry?.context.grants.includes('tracking') && (
                    <Link to={'/tracking/' + x.shipmentId}>رحلة الشحنة</Link>
                  )}
                </>
              )}
            </article>
          ))}
          {!data.items.length && (
            <StatePanel
              state="empty"
              title={
                kind === 'earnings' ? 'لا توجد زيارات مستحقة في نطاقك' : 'لا توجد مراجعات في نطاقك'
              }
            />
          )}
          <nav className="tracking-pages">
            <Button disabled={page === 1} onClick={() => setParams({ page: String(page - 1) })}>
              السابق
            </Button>
            <span>{page.toLocaleString('ar-EG')}</span>
            <Button
              disabled={data.items.length < 25}
              onClick={() => setParams({ page: String(page + 1) })}
            >
              التالي
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
