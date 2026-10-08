import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, PageHeading } from '@shahn/ui';
import type {
  RecoveryCommand,
  RecoveryView,
  RecoveryDetail,
  RecoveryReply,
  RecoveryJob,
} from '@shahn/contracts';
import { useAccess, Reauthenticate } from '../../access/access.js';
import { cairoInput, cairoTimestamp } from '../../finance/treasury-transfers/time.js';
const formatTime = (value: string) =>
  new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
import './recovery.css';
export function recoveryNextAction(j: Pick<RecoveryJob, 'state' | 'failureClass'>) {
  if (j.state === 'expired')
    return 'التاريخ المطلوب غير متاح. راجع الدعم؛ المصالحة تعرض الحالة الحالية فقط.';
  if (j.state === 'configuration-blocked')
    return 'أصلح تفويض الخدمة أو إعداد الاتصال ثم أعد نفس المهمة.';
  if (j.state === 'review-required')
    return 'راجع هوية المصدر أو التعارض مع الدعم قبل إعادة نفس المهمة.';
  if (j.state === 'complete')
    return 'اكتمل جلب النطاق. تحقق من التطبيق ومن اكتمال التاريخ بشكل مستقل.';
  return 'المهمة محفوظة. إعادة المحاولة تحتفظ بهوية النطاق ولا تنفذ إجراءً تجارياً جديداً.';
}
const states: Record<string, string> = {
  pending: 'في الانتظار',
  running: 'جارٍ الاسترداد',
  complete: 'اكتمل الجلب',
  retryable: 'تعذر الاتصال',
  expired: 'التاريخ غير متاح',
  'configuration-blocked': 'التفويض يحتاج إلى إصلاح',
  'review-required': 'يحتاج إلى مراجعة',
};
async function api<T>(path: string, body?: RecoveryCommand, csrf?: string): Promise<T> {
  try {
    const r = await fetch('/api/v1/integration/recovery' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    const v = await r.json();
    if (!r.ok)
      throw Error(
        body && r.status >= 500
          ? 'RESULT_UNKNOWN'
          : body && [400, 422].includes(r.status)
            ? 'REQUEST_REJECTED'
            : body &&
                r.status === 409 &&
                ![
                  'CHECKPOINT_REBUILD_REQUIRED',
                  'HISTORY_EXPIRED_REQUIRES_SUPPORT',
                  'WORK_IN_PROGRESS',
                ].includes(v.code)
              ? 'INPUT_CONFLICT'
              : v.code,
      );
    return v;
  } catch (e) {
    if (
      e instanceof Error &&
      [
        'RESULT_UNKNOWN',
        'AUTHENTICATION_REQUIRED',
        'FORBIDDEN_SCOPE',
        'KNOWN_STREAM_REQUIRED',
        'CHECKPOINT_REBUILD_REQUIRED',
        'HISTORY_EXPIRED_REQUIRES_SUPPORT',
        'WORK_IN_PROGRESS',
        'REQUEST_REJECTED',
        'INPUT_CONFLICT',
      ].includes(e.message)
    )
      throw e;
    throw Error(body ? 'RESULT_UNKNOWN' : 'CONNECTION_UNAVAILABLE');
  }
}
function useRecoveryIntent() {
  const { registry, session } = useAccess(),
    company = registry?.context.companyId;
  const key = company && session ? 'p22:' + company + ':' + session.principalId : null;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [stored, setStored] = useState<RecoveryCommand | null>(null);
  let pending = stored;
  if (!pending && key)
    try {
      pending = JSON.parse(sessionStorage.getItem(key) ?? 'null') as RecoveryCommand | null;
    } catch {
      /* no saved intent */
    }
  if (pending && pending.companyId !== company) pending = null;
  const send = async (value: Partial<RecoveryCommand>, resume = false) => {
    if (!company || !session || busy || (!resume && pending)) return null;
    const intent = resume
      ? pending
      : ({
          ...value,
          schemaVersion: 1,
          companyId: company,
          commandId: crypto.randomUUID(),
        } as RecoveryCommand);
    if (!intent) return null;
    setStored(intent);
    if (key) sessionStorage.setItem(key, JSON.stringify(intent));
    setBusy(true);
    setError(null);
    try {
      const result = await api<RecoveryReply>('/commands', intent, session.csrfToken);
      setStored(null);
      if (key) sessionStorage.removeItem(key);
      return result;
    } catch (e) {
      const code = e instanceof Error ? e.message : 'RESULT_UNKNOWN';
      setError(code);
      if (!['RESULT_UNKNOWN', 'AUTHENTICATION_REQUIRED'].includes(code)) {
        setStored(null);
        if (key) sessionStorage.removeItem(key);
      }
      return null;
    } finally {
      setBusy(false);
    }
  };
  const notice = (
    <>
      {pending && (
        <div className="integration-notice">
          <p>النتيجة غير محسومة. استرد نفس الطلب المحفوظ.</p>
          <Button disabled={busy} onClick={() => void send({}, true)}>
            استرداد نفس الطلب
          </Button>
        </div>
      )}
      {error && (
        <div role="alert">
          {error === 'FORBIDDEN_SCOPE'
            ? 'صلاحياتك الحالية لا تسمح بهذا الإجراء.'
            : error === 'CHECKPOINT_REBUILD_REQUIRED'
              ? 'بيانات التغطية تحتاج إلى مراجعة وبناء موثق لدى الدعم.'
              : ['REQUEST_REJECTED', 'INPUT_CONFLICT'].includes(error)
                ? 'رُفض الطلب بشكل مؤكد. راجع المدخلات والحالة الحالية قبل إنشاء طلب جديد.'
                : 'تعذر إكمال الطلب؛ الحالة المؤكدة محفوظة.'}
          {error === 'AUTHENTICATION_REQUIRED' && <Reauthenticate />}
        </div>
      )}
    </>
  );
  return { send, busy, pending, notice };
}
export function IntegrationRecoveryPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [search, setSearch] = useSearchParams(),
    intent = useRecoveryIntent();
  const q = useQuery({
    queryKey: [
      'integration-recovery',
      company,
      registry?.context.authorizationRevision,
      search.toString(),
    ],
    enabled: !!company,
    retry: false,
    queryFn: () => api<RecoveryView>('?companyId=' + company + '&' + search),
  });
  const filter = (name: string, value: string) => {
    const n = new URLSearchParams(search);
    if (value) n.set(name, value);
    else n.delete(name);
    n.delete('page');
    setSearch(n);
  };
  const run = async (
    type: RecoveryCommand['type'],
    aggregateType: NonNullable<RecoveryCommand['aggregateType']>,
    aggregateId: string,
  ) => {
    await intent.send({ type, aggregateType, aggregateId });
    await q.refetch();
  };
  return (
    <main className="integration-recovery">
      <PageHeading
        title="استرداد الربط"
        eyebrow="الربط"
        description="الاستلام والتطبيق والحالة الحالية لها تغطية مستقلة."
      />
      <Link to="/integration">العودة إلى الربط</Link>
      <div className="recovery-filters">
        <label>
          الفرع
          <select
            value={search.get('branchId') ?? ''}
            onChange={(e) => filter('branchId', e.target.value)}
          >
            <option value="">كل الفروع المسموحة</option>
            {registry?.context.assignedBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          نوع الكيان
          <select
            value={search.get('aggregateType') ?? ''}
            onChange={(e) => filter('aggregateType', e.target.value)}
          >
            <option value="">الكل</option>
            {['task', 'assignment', 'trip', 'workday', 'return-request', 'integration'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          حالة المهمة
          <select
            value={search.get('state') ?? ''}
            onChange={(e) => filter('state', e.target.value)}
          >
            <option value="">الكل</option>
            {Object.entries(states).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          نوع العطل
          <select
            value={search.get('failureClass') ?? ''}
            onChange={(e) => filter('failureClass', e.target.value)}
          >
            <option value="">الكل</option>
            {[
              'outage',
              'authentication',
              'configuration',
              'semantic-conflict',
              'history-expired',
              'reconstruction-limit',
              'invalid-response',
              'basis-changed',
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <details>
        <summary>تحديد الكيان والوقت</summary>
        <div className="recovery-filters">
          <label>
            هوية الكيان
            <input
              value={search.get('aggregateId') ?? ''}
              onChange={(e) => filter('aggregateId', e.target.value)}
              dir="ltr"
            />
          </label>
          {(['from', 'to'] as const).map((k) => (
            <label key={k}>
              {k === 'from' ? 'من وقت القاهرة' : 'حتى وقت القاهرة — غير شامل'}
              <input
                type="datetime-local"
                value={
                  search.get(k) && Number.isFinite(Date.parse(search.get(k)!))
                    ? cairoInput(new Date(search.get(k)!))
                    : ''
                }
                onChange={(e) => filter(k, e.target.value ? cairoTimestamp(e.target.value) : '')}
              />
            </label>
          ))}
        </div>
      </details>
      <Button onClick={() => void q.refetch()}>تحديث الحالة</Button>
      {intent.notice}
      {q.isLoading && <p role="status">جارٍ التحميل…</p>}
      {q.isError && <p role="alert">تعذر تحميل المهام وفق صلاحياتك الحالية.</p>}
      {q.data && !q.isError && (
        <>
          <h2>التغطية والفجوات المعروفة</h2>
          {!q.data.streams.length && <p>لا توجد مسارات معروفة متاحة ضمن صلاحياتك.</p>}
          {q.data.streams.map((s) => (
            <article key={s.aggregateType + s.aggregateId} className="recovery-card">
              <h3>
                {s.aggregateType} <span dir="ltr">{s.aggregateId}</span>
              </h3>
              <p>
                استلام متصل: {s.receivedThrough} · أعلى استلام: {s.receivedHigh} · تطبيق تاريخي:{' '}
                {s.appliedThrough} · تغطية الحالة الحالية: {s.projectedThrough}
              </p>
              <p>
                {s.historyComplete
                  ? 'التاريخ المتاح مكتمل التطبيق'
                  : 'التاريخ غير مكتمل؛ لا تثبت الحالة الحالية الزيارات أو النقد أو الاستلام المادي المفقود.'}
              </p>
              {s.missingFrom && (
                <p>
                  نطاق يحتاج إلى فحص: {s.missingFrom}–{s.missingTo}
                </p>
              )}
              {s.pendingReason && <p>اعتماد لم يكتمل: {s.pendingReason}</p>}
              {s.rebuildRequired ? (
                <p>تعارض في التغطية يتطلب بناءً موثقاً لدى الدعم.</p>
              ) : (
                <div className="recovery-actions">
                  <Button
                    disabled={intent.busy || !!intent.pending}
                    onClick={() => void run('recovery.replay', s.aggregateType, s.aggregateId)}
                  >
                    استرداد أحداث المسار
                  </Button>
                  <Button
                    disabled={intent.busy || !!intent.pending}
                    onClick={() => void run('recovery.reconcile', s.aggregateType, s.aggregateId)}
                  >
                    مصالحة الحالة الحالية
                  </Button>
                  <Button
                    disabled={intent.busy || !!intent.pending}
                    onClick={() => void run('recovery.report', s.aggregateType, s.aggregateId)}
                  >
                    إبلاغ التغطية الملتزمة
                  </Button>
                </div>
              )}
            </article>
          ))}
          <h2>مهام الاسترداد</h2>
          {q.data.jobs.map((j) => (
            <article key={j.id} className="recovery-card">
              <Link to={'/integration/recovery/jobs/' + j.id}>
                {j.kind === 'replay' ? 'استرداد الأحداث' : 'مصالحة الحالة الحالية'} —{' '}
                {states[j.state]}
              </Link>
              <p>{recoveryNextAction(j)}</p>
              <p>
                آخر محاولة: {j.lastAttemptAt ? formatTime(j.lastAttemptAt) : 'لم تبدأ'} · محاولات:{' '}
                {j.attempts}
              </p>
            </article>
          ))}
          <div className="recovery-actions">
            <Button
              disabled={q.data.page === 1}
              onClick={() => {
                const n = new URLSearchParams(search);
                n.set('page', String(q.data!.page - 1));
                setSearch(n);
              }}
            >
              السابق
            </Button>
            <Button
              disabled={!q.data.hasMore}
              onClick={() => {
                const n = new URLSearchParams(search);
                n.set('page', String(q.data!.page + 1));
                setSearch(n);
              }}
            >
              التالي
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
export function IntegrationRecoveryDetailPage() {
  const { id } = useParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    intent = useRecoveryIntent();
  const q = useQuery({
    queryKey: ['integration-recovery-detail', company, id, registry?.context.authorizationRevision],
    enabled: !!company && !!id,
    retry: false,
    queryFn: () => api<RecoveryDetail>('/jobs/' + id + '?companyId=' + company),
  });
  return (
    <main className="integration-recovery">
      <PageHeading
        title="تفاصيل الاسترداد"
        eyebrow="الربط"
        description="النطاق والاعتماد ودليل الحالة الحالية"
      />
      <Link to="/integration/recovery">العودة إلى مهام الاسترداد</Link>
      {intent.notice}
      {q.isError && <p role="alert">تعذر عرض المهمة وفق صلاحياتك الحالية.</p>}
      {q.data && !q.isError && (
        <>
          <h2>{states[q.data.job.state]}</h2>
          <p>{recoveryNextAction(q.data.job)}</p>
          {q.data.relatedShipments.map((s) => (
            <p key={s.cycleId}>
              الشحنة <Link to={'/shipments/' + s.reference}>{s.reference}</Link>
            </p>
          ))}
          {q.data.missingRanges.map((r) => (
            <p key={r.from}>
              تاريخ لم يُستلم: {r.from}–{r.to}
            </p>
          ))}
          {q.data.moreMissingRanges && <p>توجد فجوات إضافية؛ يحتاج النطاق إلى فحص الدعم.</p>}
          {q.data.stream.pendingReason && <p>اعتماد لم يكتمل: {q.data.stream.pendingReason}</p>}
          <p dir="ltr">
            {q.data.job.aggregateType}: {q.data.job.aggregateId}
          </p>
          <p>
            النطاق الأصلي بعد {q.data.job.requestedAfter} · آخر حد آمن {q.data.job.nextAfter} ·
            صفحات {q.data.job.pageCount}
          </p>
          <p>
            التاريخ: {q.data.stream.historyComplete ? 'مكتمل' : 'غير مكتمل'} · تطبيق{' '}
            {q.data.stream.appliedThrough} · مصالحة {q.data.stream.snapshotThrough}
          </p>
          {q.data.current && (
            <section>
              <p>حالة حالية فقط حتى {q.data.current.throughSequence}؛ لا تعوض التاريخ المفقود.</p>
              <p>حالة التكليف: {q.data.current.taskState ?? 'غير متاحة في هذا المسار'}</p>
              {q.data.current.effectiveOutcomes.map((o) => (
                <p key={o.attemptId}>
                  نتيجة حالية: {o.outcome} · نسخة {o.revision} · لا تثبت الزيارة المفقودة.
                </p>
              ))}
              {q.data.current.returnBalances.map((i) => (
                <p key={i.itemId}>
                  بند {i.sourceLineId}: مستلم {i.received} · مفقود {i.lost} · تالف {i.damaged} · غير
                  محسوم {i.unresolved}
                </p>
              ))}
            </section>
          )}
          {!['complete', 'expired'].includes(q.data.job.state) && (
            <Button
              disabled={intent.busy || !!intent.pending}
              onClick={() =>
                void intent.send({ type: 'recovery.retry', jobId: id! }).then(() => q.refetch())
              }
            >
              إعادة نفس المهمة
            </Button>
          )}
          <details>
            <summary>دليل الاسترداد والتشخيص</summary>
            <p>
              نوع العطل: {q.data.job.failureClass ?? '—'} · آخر سبب: {q.data.job.lastError ?? '—'}
            </p>
            {q.data.evidence.map((e) => (
              <article key={e.id} className="recovery-card">
                <p>
                  تغطية {e.throughSequence} · {formatTime(e.retrievedAt)}
                </p>
                <p dir="ltr">SHA-256: {e.bodyHash}</p>
                <p dir="ltr">Baseline: {e.baseline}</p>
              </article>
            ))}
          </details>
        </>
      )}
    </main>
  );
}
