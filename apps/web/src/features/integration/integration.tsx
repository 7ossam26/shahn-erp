import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading, Button, FormGroup } from '@shahn/ui';
import type {
  IntegrationView,
  IntegrationCommand,
  IntegrationNativeChoice,
} from '@shahn/contracts';
import { useAccess, Reauthenticate } from '../access/access.js';
import { Field } from '../brands/api.js';
import { cairoInput, cairoTimestamp } from '../finance/treasury-transfers/time.js';
import './integration.css';
const labels: Record<string, string> = {
  service: 'تفويض خدمة الربط',
  operator: 'تفويض مسؤول الربط',
  full: 'نتيجة كاملة محفوظة',
  compacted: 'هوية النتيجة محفوظة',
  pending: 'في انتظار الإرسال',
  sending: 'جارٍ الإرسال',
  accepted: 'مقبول لدى توصيل',
  rejected: 'مرفوض — راجع السبب',
  'review-required': 'يحتاج إلى مراجعة',
  unknown: 'النتيجة غير معروفة',
  retryable: 'تعذر الاتصال — ستتم المحاولة',
  'configuration-blocked': 'الإعداد أو التفويض يحتاج إلى إصلاح',
  unbound: 'لم تُربط الهوية',
  ready: 'اكتملت مطابقة الهوية',
  retry: 'بانتظار خدمة الهوية',
  running: 'جارٍ مطابقة الهوية',
  'not-required': 'لا تتطلب مطابقة هوية',
  applied: 'تم التطبيق',
  source: 'المصدر',
  branch: 'الفرع',
  role: 'الدور',
  user: 'المستخدم',
  driver: 'السائق',
};
const errors: Record<string, string> = {
  UNSUPPORTED_SENDER_EVENT:
    'وصل حدث بإصدار أو نوع غير مدعوم. رُفض الاستلام؛ يلزم مراجعة توافق الربط قبل طلب إعادة الإرسال.',
  KEY_ROTATION_RECONCILIATION_REQUIRED:
    'قُبل تغيير المفتاح، لكن مدة قبول المفتاح السابق غير متاحة. أُوقف قبوله لحين مراجعة الحالة المؤكدة.',
  validation_failed: 'رفض توصيل حقول الطلب. راجع البيانات قبل إنشاء طلب جديد.',
  stale_revision: 'نسخة الهوية لدى توصيل تغيّرت. حدّث الحالة وراجع النسخة المطلوبة.',
  idempotency_conflict: 'معرّف الطلب مرتبط ببيانات مختلفة. يلزم مراجعة الطلب المحفوظ.',
  unauthorized: 'انتهى تفويض الخدمة أو لم يعد صالحاً. راجع الإعداد لدى المسؤول.',
  forbidden_resource: 'تفويض الخدمة لا يسمح بهذه الهوية أو العملية.',
  dependency_missing: 'لم يؤكد توصيل جاهزية أحد السجلات المرتبطة بعد.',
  dependency_unavailable: 'السجل المرتبط غير متاح حالياً لدى توصيل.',
  unsupported_schema_version: 'إصدار الطلب غير مدعوم لدى توصيل. يلزم مراجعة توافق الربط.',
  RESULT_UNKNOWN: 'لم تصل نتيجة الطلب. احتفظنا بمعرّفه؛ استرد النتيجة بنفس الطلب قبل أي تغيير.',
  AUTHORIZATION_EXPIRED:
    'انتهى تفويض الربط. يلزم تحديث بيانات الخدمة ثم إعادة المحاولة بنفس الطلب.',
  AUTHENTICATION_REQUIRED: 'انتهت جلسة الدخول. سجّل الدخول لاستكمال الطلب المحفوظ.',
  FORBIDDEN_SCOPE: 'صلاحياتك الحالية لا تسمح بعرض هذه البيانات أو تنفيذ العملية.',
  REVISION_CONFLICT: 'تغيّرت النسخة. حدّث الصفحة وراجع البيانات قبل إعادة الإرسال.',
  SYNC_REQUIRED: 'يوجد طلب سابق غير محسوم لهذه الهوية. استرد نتيجته أولاً.',
  REFERENCE_NOT_READY: 'الفرع أو الدور أو المستخدم المرتبط لم يكتمل إعداده بعد.',
  ISSUER_NOT_READY: 'قُبلت الهوية، لكن خدمة تسجيل الدخول لم تؤكد جاهزيتها بعد.',
  CONNECTION_CONFIGURATION_REQUIRED:
    'إعداد الاتصال غير متاح. يلزم توفير ملف إعداد محلي آمن بواسطة المسؤول.',
  SIGNING_KEY_NOT_PROVISIONED: 'مفتاح التحقق المختار غير مُجهّز لدى المسؤول.',
  CALLBACK_NOT_ALLOWLISTED: 'عنوان الاستقبال غير مدرج ضمن العناوين المعتمدة.',
  VALIDATION_FAILED: 'راجع الحقول المطلوبة واختيارات الهوية.',
  NATIVE_REFERENCE_MISMATCH: 'تغيّرت بيانات السجل المحلي. حدّث الصفحة ثم راجع الطلب.',
  REFERENCE_DISABLED: 'السجل المرتبط موقوف. راجع حالته المحلية قبل إرسال الطلب.',
  NATIVE_DISABLE_REQUIRED: 'أوقف السجل محلياً أولاً قبل إرسال طلب الإيقاف.',
  ISSUER_BINDING_REQUIRED: 'يلزم ربط المستخدم بهوية الدخول المسجلة أولاً.',
  REMOTE_RESULT_UNKNOWN: 'لم يُحسم الرد من توصيل. إعادة المحاولة تحفظ نفس الطلب دون تكرار الأثر.',
};
class IntegrationApiError extends Error {}
async function api<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  try {
    const r = await fetch('/api/v1/integration' + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const result = await r.json();
    if (!r.ok)
      throw new IntegrationApiError(
        body && r.status >= 500 ? 'RESULT_UNKNOWN' : (result.code ?? 'CONNECTION_LOST'),
      );
    return result as T;
  } catch (e) {
    if (e instanceof IntegrationApiError) throw e;
    throw new Error(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST');
  }
}
function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const code = error instanceof Error ? error.message : '';
  return (
    <div className="commercial-error" role="alert">
      {errors[code] ?? 'تعذر تحميل الاتصال. البيانات المؤكدة السابقة محفوظة؛ حاول التحديث.'}
      {code === 'AUTHENTICATION_REQUIRED' && <Reauthenticate />}
    </div>
  );
}
function useIntegrationQuery(search = '') {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['integration', company, search, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () => api<IntegrationView>('?companyId=' + company + (search ? '&' + search : '')),
  });
}
function useIntent() {
  const { registry, session } = useAccess(),
    company = registry?.context.companyId,
    key = company && session ? 'p11:' + company + ':' + session.principalId : null;
  const readPending = () => {
    try {
      return key
        ? (JSON.parse(sessionStorage.getItem(key) ?? 'null') as IntegrationCommand | null)
        : null;
    } catch {
      return null;
    }
  };
  const [saved, setSaved] = useState(() => ({ key, pending: readPending() })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  // Access may finish loading after this page mounts. Scope the saved intent to the current account.
  const pending = saved.key === key ? saved.pending : readPending();
  if (saved.key !== key) setSaved({ key, pending });
  const remember = (v: IntegrationCommand | null) => {
    setSaved({ key, pending: v });
    if (key) {
      if (v) sessionStorage.setItem(key, JSON.stringify(v));
      else sessionStorage.removeItem(key);
    }
  };
  const submit = async (
    value: Partial<IntegrationCommand>,
    resume = false,
  ): Promise<{ actionId: string | null } | null> => {
    if (!company || !session || busy) return null;
    const intent = resume
      ? pending
      : ({
          ...value,
          schemaVersion: 1,
          commandId: crypto.randomUUID(),
          companyId: company,
        } as IntegrationCommand);
    if (!intent || (!resume && pending)) return null;
    remember(intent);
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ actionId: string | null }>('/commands', intent, session.csrfToken);
      remember(null);
      return result;
    } catch (e) {
      setError(e);
      if (e instanceof Error && !['RESULT_UNKNOWN', 'AUTHENTICATION_REQUIRED'].includes(e.message))
        remember(null);
      return null;
    } finally {
      setBusy(false);
    }
  };
  return {
    submit,
    busy,
    pending,
    error,
    recovery: (
      <>
        {pending && !busy && (
          <div className="integration-notice">
            <p>طلب محفوظ يحتاج إلى استرداد النتيجة.</p>
            <Button onClick={() => void submit({}, true)}>استرداد نفس الطلب</Button>
          </div>
        )}
        <ErrorBox error={error} />
      </>
    ),
  };
}
export function IntegrationPage() {
  const [params, setParams] = useSearchParams(),
    q = useIntegrationQuery(params.toString()),
    { registry, session } = useAccess(),
    intent = useIntent(),
    [error, setError] = useState<unknown>(null),
    [refreshing, setRefreshing] = useState(false);
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  };
  const data = q.data,
    returnTo = '/integration' + (params.size ? '?' + params.toString() : ''),
    activeFilters = Array.from(params.entries()).filter(
      ([k, v]) => k !== 'page' && v && v !== 'all',
    );
  return (
    <div className="integration-page">
      <PageHeading
        eyebrow="الإدارة · الربط مع توصيل"
        title="حالة الربط"
        description="تابع تأكيد الطلبات وجاهزية الهويات واستلام الأحداث كلّاً على حدة."
      />
      {q.isPending && <p role="status">جارٍ تحميل حالة الاتصال…</p>}
      <ErrorBox error={q.error ?? error} />
      {intent.recovery}
      {data && !data.source && (
        <section className="integration-card">
          <h2>لم يُجهّز الاتصال بعد</h2>
          <p>يلزم عنوان توصيل وخدمة هوية وبيانات اتصال محفوظة لدى المسؤول.</p>
          {data.connections.length ? (
            data.connections.map((c) => (
              <Button
                key={c.selector}
                disabled={intent.busy || !!intent.pending}
                onClick={async () => {
                  if (await intent.submit({ type: 'integration.setup', selector: c.selector }))
                    await q.refetch();
                }}
              >
                بدء إعداد الاتصال
              </Button>
            ))
          ) : (
            <p>لا توجد إعدادات اتصال محلية متاحة لهذه الشركة.</p>
          )}
        </section>
      )}
      {data?.source && (
        <>
          <section className="integration-card">
            <div className="integration-card-head">
              <div>
                <h2>
                  {!data.source.enabled
                    ? 'المصدر موقوف'
                    : data.source.configuration
                      ? 'تم التحقق من الاتصال'
                      : 'بانتظار التحقق من الاتصال'}
                </h2>
                <p>
                  {data.source.lastError
                    ? (errors[data.source.lastError] ??
                      'تعذر التحقق من الخدمة؛ الحالة الأخيرة محفوظة.')
                    : 'قبول الطلب لا يعني اكتمال جاهزية المستخدم للدخول.'}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  setError(null);
                  try {
                    await api(
                      '/refresh',
                      { companyId: registry!.context.companyId },
                      session!.csrfToken,
                    );
                    await q.refetch();
                  } catch (e) {
                    setError(e);
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                {refreshing ? 'جارٍ التحقق…' : 'تحديث حالة الاتصال'}
              </Button>
            </div>
            <dl>
              <dt>عنوان توصيل</dt>
              <dd>
                <bdi>{data.source.baseUrl}</bdi>
              </dd>
              <dt>خدمة الهوية</dt>
              <dd>
                <bdi>{data.source.issuer}</bdi>
              </dd>
            </dl>
            <Link className="commercial-primary-link" to="/integration/provision">
              إعداد هوية للربط
            </Link>
          </section>
          <details className="integration-filters">
            <summary>
              فلاتر المتابعة
              {activeFilters.length > 0 && <span> · {activeFilters.length} مفعّلة</span>}
            </summary>
            <div className="commercial-fields">
              <Field label="نوع الهوية">
                <select
                  value={params.get('entity') ?? 'all'}
                  onChange={(e) => set('entity', e.target.value)}
                >
                  {['all', 'source', 'branch', 'role', 'user', 'driver'].map((k) => (
                    <option key={k} value={k}>
                      {labels[k] ?? 'الكل'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الحالة">
                <select
                  value={params.get('state') ?? 'all'}
                  onChange={(e) => set('state', e.target.value)}
                >
                  {[
                    'all',
                    'pending',
                    'sending',
                    'accepted',
                    'rejected',
                    'review-required',
                    'unknown',
                    'retryable',
                    'configuration-blocked',
                    'applied',
                  ].map((k) => (
                    <option key={k} value={k}>
                      {labels[k] ?? 'الكل'}
                    </option>
                  ))}
                </select>
              </Field>
              {(['from', 'to'] as const).map((k) => (
                <Field
                  key={k}
                  label={k === 'from' ? 'من وقت القاهرة' : 'حتى وقت القاهرة — غير شامل'}
                >
                  <input
                    type="datetime-local"
                    value={
                      params.get(k) && Number.isFinite(Date.parse(params.get(k)!))
                        ? cairoInput(new Date(params.get(k)!))
                        : ''
                    }
                    onChange={(e) => set(k, e.target.value ? cairoTimestamp(e.target.value) : '')}
                  />
                </Field>
              ))}
            </div>
          </details>
          {activeFilters.length > 0 && (
            <div className="integration-active-filters">
              {activeFilters.map(([k, v]) => (
                <span key={k}>
                  {(
                    { entity: 'الهوية', state: 'الحالة', from: 'من', to: 'إلى' } as Record<
                      string,
                      string
                    >
                  )[k] ?? k}
                  : {labels[v] ?? v}
                </span>
              ))}
              <Button variant="outline" onClick={() => setParams({})}>
                مسح الفلاتر
              </Button>
            </div>
          )}
          <section className="integration-card">
            <h2>جاهزية الهويات</h2>
            {!data.bindings.length && (
              <p>لم تُربط أي هوية بعد. ابدأ بالفرع والدور ثم المستخدم والسائق.</p>
            )}
            <div className="integration-list">
              {data.bindings.map((b) => (
                <article key={b.entity + b.nativeId}>
                  <strong>{labels[b.entity]}</strong>
                  <bdi>{b.externalId}</bdi>
                  <span>
                    {b.issuerStatus === 'pending'
                      ? 'بانتظار خدمة الهوية'
                      : (labels[b.issuerStatus] ?? b.issuerStatus)}
                    {b.enabled === false ? ' · موقوف' : ''}
                  </span>
                  <small>
                    النسخة المقبولة {b.acceptedRevision} / المطلوبة {b.submittedRevision}
                  </small>
                </article>
              ))}
            </div>
          </section>
          <section className="integration-card">
            <h2>الطلبات الصادرة</h2>
            {!data.commands.length && <p>لا توجد طلبات مطابقة.</p>}
            <div className="integration-list">
              {data.commands.map((c) => (
                <Link
                  key={c.actionId}
                  to={'/integration/commands/' + c.actionId}
                  state={{ returnTo }}
                >
                  <strong>{labels[c.entity ?? 'source'] ?? 'طلب ربط'}</strong>
                  <bdi>{c.operationId}</bdi>
                  <span className={'integration-state state-' + c.state}>{labels[c.state]}</span>
                  <small>المحاولات: {c.attempts}</small>
                </Link>
              ))}
            </div>
          </section>
          <section className="integration-card">
            <h2>الأحداث المستلمة</h2>
            <p>الاستلام محفوظ قبل الرد. أحداث التشغيل تنتظر معالجتها في مراحلها المخصصة.</p>
            {!data.events.length && <p>لم تصل أحداث مطابقة بعد.</p>}
            <div className="integration-list">
              {data.events.map((e) => (
                <Link key={e.eventId} to={'/integration/events/' + e.eventId} state={{ returnTo }}>
                  <bdi>{e.eventType}</bdi>
                  <strong>
                    تم الاستلام ·{' '}
                    {e.applicationState === 'applied' ? 'تم التطبيق' : 'بانتظار التطبيق'}
                  </strong>
                  <small>التسلسل {e.sequence}</small>
                </Link>
              ))}
            </div>
          </section>
          {data.checkpoints.some((c) => c.receivedHigh !== c.receivedThrough) && (
            <div className="integration-notice">
              يوجد تسلسل غير مكتمل. لم تُعتبر الأحداث المفقودة مطبقة.
            </div>
          )}
          <section className="integration-card">
            <h2>مفاتيح التحقق</h2>
            {data.keys.map((k) => (
              <p key={k.keyId}>
                <bdi>{k.keyId}</bdi> ·{' '}
                {k.verifyUntil
                  ? 'صالح حتى ' +
                    new Date(k.verifyUntil).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })
                  : 'مفتاح مُجهّز'}
              </p>
            ))}
            <Link to="/integration/delivery">إعداد استقبال الأحداث</Link>
          </section>
          <div className="integration-pagination">
            <Button
              variant="outline"
              disabled={data.page === 1}
              onClick={() => set('page', String(data.page - 1))}
            >
              السابق
            </Button>
            <span>الصفحة {data.page}</span>
            <Button
              variant="outline"
              disabled={data.commands.length < 25 && data.events.length < 25}
              onClick={() => set('page', String(data.page + 1))}
            >
              التالي
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
export function IntegrationProvisionPage() {
  const q = useIntegrationQuery(),
    navigate = useNavigate(),
    intent = useIntent(),
    [entity, setEntity] = useState('branch'),
    [id, setId] = useState(''),
    [userId, setUserId] = useState(''),
    [profile, setProfile] = useState('car'),
    [capabilities, setCapabilities] = useState(['execution.own', 'monitor.read']);
  const choices =
      q.data?.catalog[
        ({ branch: 'branches', role: 'roles', user: 'users', driver: 'drivers' } as const)[
          entity as 'branch' | 'role' | 'user' | 'driver'
        ]
      ] ?? [],
    record = choices.find((c) => c.id === id);
  const submit = async () => {
    if (!record) return;
    const binding = q.data?.bindings.find((b) => b.entity === entity && b.nativeId === id);
    let payload: Record<string, unknown> = {},
      operationId = '';
    if (entity === 'branch') {
      operationId = 'branch.provision';
      payload = { name: record.name, enabled: record.active, location: null };
    }
    if (entity === 'role') {
      operationId = 'role.defineCapabilities';
      payload = { name: record.name, capabilities };
    }
    if (entity === 'user') {
      operationId = 'user.provision';
      payload = {
        subject: record.subject,
        roleExternalId: 'role:' + record.roleId,
        branchExternalIds: record.branchIds?.map((b) => 'branch:' + b),
        enabled: record.active,
      };
    }
    if (entity === 'driver') {
      operationId = 'driver.provisionReference';
      payload = {
        userExternalId: 'user:' + userId,
        enabled: record.active,
        vehicleReference: null,
        profile,
      };
    }
    const result = await intent.submit({
      type: 'integration.queue',
      nativeId: id,
      expectedVersion: binding?.version ?? 0,
      operationId,
      payload,
    });
    if (result?.actionId) navigate('/integration/commands/' + result.actionId);
  };
  return (
    <div className="integration-page">
      <PageHeading
        eyebrow="الربط مع توصيل"
        title="إعداد هوية للربط"
        description="تُستخدم الهوية المحلية المسجلة. المستخدم والموظف والسائق سجلات مستقلة."
      />
      <ErrorBox error={q.error} />
      {intent.recovery}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <FormGroup title="الهوية المطلوبة" description="اختر من سجلات الشركة الحالية.">
          <Field label="نوع الهوية">
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setId('');
              }}
            >
              {['branch', 'role', 'user', 'driver'].map((k) => (
                <option key={k} value={k}>
                  {labels[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="السجل المحلي">
            <select required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">اختر السجل</option>
              {choices
                .filter((c) => c.active)
                .map((c: IntegrationNativeChoice) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          {entity === 'role' && (
            <fieldset>
              <legend>صلاحيات توصيل لهذا الدور</legend>
              {[
                'execution.own',
                'monitor.read',
                'correction.own',
                'planning.manage',
                'location.review',
              ].map((k, i) => (
                <label className="integration-check" key={k}>
                  <input
                    type="checkbox"
                    checked={capabilities.includes(k)}
                    onChange={(e) =>
                      setCapabilities(
                        e.target.checked
                          ? [...capabilities, k]
                          : capabilities.filter((c) => c !== k),
                      )
                    }
                  />
                  {
                    [
                      'تنفيذ عمل السائق',
                      'المتابعة',
                      'تصحيح عمل السائق',
                      'إدارة التخطيط',
                      'مراجعة الموقع',
                    ][i]
                  }
                </label>
              ))}
            </fieldset>
          )}
          {entity === 'user' && record && (
            <p>
              {record.subject
                ? 'ستُستخدم هوية الدخول والدور والفروع المسجلة للمستخدم.'
                : 'يلزم تجهيز هوية الدخول المحلية أولاً.'}
            </p>
          )}
          {entity === 'driver' && (
            <>
              <Field label="المستخدم المرتبط بالسائق">
                <select required value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">اختر المستخدم</option>
                  {q.data?.catalog.users
                    .filter((c) => c.active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="وسيلة الانتقال">
                <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                  <option value="car">سيارة</option>
                  <option value="motorcycle">دراجة نارية</option>
                  <option value="bicycle">دراجة هوائية</option>
                </select>
              </Field>
            </>
          )}
        </FormGroup>
        <Button type="submit" disabled={!record || intent.busy || !!intent.pending}>
          {intent.busy ? 'جارٍ حفظ الطلب…' : 'حفظ طلب الربط'}
        </Button>
      </form>
      <Link to="/integration">العودة لحالة الربط</Link>
    </div>
  );
}
export function IntegrationDetailPage({ kind }: { kind: 'commands' | 'events' }) {
  const location = useLocation(),
    back = (location.state as { returnTo?: string } | null)?.returnTo;
  const { id } = useParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    intent = useIntent();
  const q = useQuery({
    queryKey: ['integration-detail', company, kind, id, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () => api<Record<string, unknown>>('/' + kind + '/' + id + '?companyId=' + company),
  });
  const data = q.data,
    canRetry =
      kind === 'commands' &&
      data &&
      ['pending', 'unknown', 'retryable', 'configuration-blocked'].includes(String(data.state));
  const names: Record<string, string> = {
    actionId: 'معرّف طلب توصيل',
    commandId: 'معرّف الطلب المحلي',
    operationId: 'العملية',
    state: 'الحالة',
    authority: 'تفويض الإرسال',
    requestHash: 'بصمة الطلب الثابت',
    sourceRevision: 'النسخة المطلوبة',
    acceptedRevision: 'النسخة المقبولة',
    lastError: 'آخر تعثر',
    httpStatus: 'رمز الاستجابة',
    createdAt: 'وقت التسجيل',
    entity: 'نوع الهوية',
    nativeId: 'السجل المحلي',
    attempts: 'المحاولات',
    retention: 'حفظ النتيجة',
    receiptId: 'معرّف التأكيد',
    eventId: 'معرّف الحدث',
    eventType: 'نوع الحدث',
    aggregateType: 'نوع التسلسل',
    aggregateId: 'معرّف التسلسل',
    sequence: 'رقم التسلسل',
    bodyHash: 'بصمة المحتوى',
    applicationState: 'حالة التطبيق',
    pendingReason: 'سبب الانتظار',
    receivedAt: 'وقت الاستلام',
    appliedAt: 'وقت التطبيق',
    keyId: 'مفتاح التحقق',
  };
  return (
    <div className="integration-page">
      <PageHeading
        eyebrow="الربط مع توصيل"
        title={kind === 'commands' ? 'تفاصيل الطلب' : 'تفاصيل الحدث'}
        description={
          kind === 'events'
            ? 'الاستلام الدائم منفصل عن تطبيق الحدث.'
            : 'إعادة المحاولة تحفظ الطلب والبيانات ومعرّف توصيل نفسه.'
        }
      />
      <ErrorBox error={q.error} />
      {intent.recovery}
      {q.isPending && <p role="status">جارٍ تحميل التفاصيل…</p>}
      {data && (
        <section className="integration-card">
          <dl>
            {Object.entries(data).map(([k, v]) => (
              <div className="integration-detail-pair" key={k}>
                <dt>{names[k] ?? k}</dt>
                <dd>
                  {v === null
                    ? '—'
                    : k === 'lastError'
                      ? (errors[String(v)] ?? 'راجع إعداد الاتصال أو نتيجة توصيل.')
                      : k === 'pendingReason'
                        ? 'بانتظار المعالج المخصص'
                        : k === 'applicationState' && v === 'pending'
                          ? 'بانتظار التطبيق'
                          : (labels[String(v)] ?? <bdi>{String(v)}</bdi>)}
                </dd>
              </div>
            ))}
          </dl>
          {canRetry && (
            <Button
              disabled={intent.busy || !!intent.pending}
              onClick={async () => {
                if (await intent.submit({ type: 'integration.retry', actionId: id! }))
                  await q.refetch();
              }}
            >
              إعادة المحاولة بنفس الطلب
            </Button>
          )}
          {data.state === 'rejected' && (
            <p>راجع السبب والبيانات قبل إنشاء طلب جديد. الطلب المرفوض محفوظ.</p>
          )}
        </section>
      )}
      <Link to={back?.startsWith('/integration?') ? back : '/integration'}>العودة لحالة الربط</Link>
    </div>
  );
}
export function IntegrationDeliveryPage() {
  const q = useIntegrationQuery(),
    intent = useIntent(),
    navigate = useNavigate(),
    { registry } = useAccess(),
    [operation, setOperation] = useState('integration.configureWebhook'),
    [url, setUrl] = useState(''),
    [revision, setRevision] = useState('0'),
    [keyId, setKeyId] = useState(''),
    [overlap, setOverlap] = useState('300'),
    [eventId, setEventId] = useState('');
  return (
    <div className="integration-page">
      <PageHeading
        eyebrow="الربط مع توصيل"
        title="إعداد استقبال الأحداث"
        description="يُجهّز المسؤول عنوان الاستقبال ومفاتيح التحقق مسبقاً. لا تُدخل مفاتيح سرية هنا."
      />
      {intent.recovery}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const payload =
            operation === 'integration.configureWebhook'
              ? { url, enabled: true, expectedRevision: Number(revision) }
              : operation === 'integration.rotateSigningKey'
                ? { keyId, overlapSeconds: Number(overlap) }
                : { eventId };
          const result = await intent.submit({
            type: 'integration.queue',
            nativeId: registry!.context.companyId,
            expectedVersion: 0,
            operationId: operation,
            payload,
          });
          if (result?.actionId) navigate('/integration/commands/' + result.actionId);
        }}
      >
        <FormGroup title="إجراء الاستقبال" description="أرسل طلباً محفوظاً وتابع نتيجته.">
          <Field label="الإجراء">
            <select value={operation} onChange={(e) => setOperation(e.target.value)}>
              <option value="integration.configureWebhook">تحديد عنوان الاستقبال</option>
              <option value="integration.rotateSigningKey">تفعيل مفتاح تحقق مُجهّز</option>
              <option value="integration.retryDelivery">طلب إعادة إرسال حدث</option>
            </select>
          </Field>
          {operation === 'integration.configureWebhook' ? (
            <>
              <Field label="عنوان الاستقبال المعتمد">
                <input
                  type="url"
                  dir="ltr"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Field>
              <Field label="نسخة الإعداد الحالية">
                <input
                  type="number"
                  min="0"
                  required
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                />
              </Field>
            </>
          ) : operation === 'integration.rotateSigningKey' ? (
            <>
              <Field label="معرّف المفتاح المُجهّز">
                <input required value={keyId} onChange={(e) => setKeyId(e.target.value)} />
              </Field>
              <Field label="مدة قبول المفتاح السابق بالثواني">
                <input
                  required
                  type="number"
                  min="300"
                  max="86400"
                  value={overlap}
                  onChange={(e) => setOverlap(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <Field label="معرّف الحدث">
              <input required value={eventId} onChange={(e) => setEventId(e.target.value)} />
            </Field>
          )}
        </FormGroup>
        <Button type="submit" disabled={!q.data?.source || intent.busy || !!intent.pending}>
          حفظ طلب الإعداد
        </Button>
      </form>
      <Link to="/integration">العودة لحالة الربط</Link>
    </div>
  );
}
