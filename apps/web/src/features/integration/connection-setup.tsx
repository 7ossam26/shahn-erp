import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shahn/ui';
import { useAccess } from '../access/access.js';
import type { IntegrationNativeChoice } from '@shahn/contracts';
import { EnrollmentPanel } from './enrollment.js';

interface SafeImport {
  importId: string;
  metadata: Record<string, string | string[]>;
  credentialExpiresAt: string;
  state: string;
  signing: string;
}
interface ConnectionStatus {
  state: string;
  connection?: {
    revision: number;
    metadata: Record<string, string | string[]>;
    key_version: string;
    last_error: string | null;
    credentialExpiresAt: string;
    enabled: boolean;
    configuration_checked_at: string;
    configuration: { serviceCapabilities?: string[] | null };
  } | null;
  receipt?: { lastSignedReceipt: string | null; applied: number };
  grantsRequired?: string[];
}
/** Only opaque intent IDs survive navigation. File contents never enter useIntent,
 * React Query, browser persistence, generic commands, errors or URL parameters. */
export function ConnectionSetupPanel({ users }: { users: IntegrationNativeChoice[] }) {
  const access = useAccess(),
    company = access.registry?.context.companyId ?? '',
    support = access.registry?.context.principalKind === 'support',
    key = 'shahn-connection-intent:' + company;
  const [origin, setOrigin] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [intent, setIntent] = useState<{ importId: string; commandId: string } | null>(() => {
      try {
        const x = JSON.parse(sessionStorage.getItem(key) ?? 'null');
        return x && typeof x.importId === 'string' && typeof x.commandId === 'string' ? x : null;
      } catch {
        return null;
      }
    }),
    [imported, setImported] = useState<SafeImport | null>(null),
    [rejected, setRejected] = useState(false);
  async function call(path: string, body?: unknown) {
    const r = await fetch('/api/v1/integration/connection/' + path, {
      credentials: 'same-origin',
      headers: body
        ? { 'Content-Type': 'application/json', 'X-CSRF-Token': access.session?.csrfToken ?? '' }
        : {},
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    });
    const x = await r.json();
    const errors: Record<string, string> = {
      CONNECTION_SETUP_AUTHORITY_REQUIRED: 'يلزم جلسة دعم محددة للشركة مع تحقق متعدد العوامل.',
      PRIVATE_PACKAGE_VALIDATION_FAILED: 'الحزمة لا تطابق سجل التثبيت المعتمد أو انتهت صلاحيتها.',
      REMOTE_SCOPE_OR_GRANTS_MISMATCH:
        'هوية المصدر أو التفويض ناقص: يلزم الاستقبال والتعيين والمراقبة واستلام المرتجعات والتصرف فيها.',
      REMOTE_SETUP_IDENTITY_MISMATCH:
        'تاريخ إجراء الإعداد أو نسخة المصدر لا يطابق الحزمة. راجع مسؤول توصيل.',
      CREDENTIAL_EXPIRED: 'انتهى تفويض الخدمة. استورد حزمة تدوير معتمدة من مسؤول توصيل.',
      OLD_SIGNING_OVERLAP_REQUIRED:
        'يلزم تضمين المفتاح السابق وموعد انتهاء تداخل التحقق لحماية التسليمات المعلقة.',
      REMOTE_SETUP_CHANGED_REIMPORT_REQUIRED:
        'تغير الإعداد المؤكد لدى توصيل. يلزم حزمة محدثة مع الاحتفاظ بطلبات التشغيل القديمة.',
    };
    if (!r.ok) {
      if (
        (path === 'confirm' || path.startsWith('result?')) &&
        r.status === 409 &&
        x.commandId === intent?.commandId
      )
        setRejected(true);
      throw Error(
        errors[x.code] ?? 'تعذر التحقق. احتفظنا بمعرّف الطلب؛ استرد حالته قبل إنشاء طلب آخر.',
      );
    }
    return x;
  }
  const q = useQuery<ConnectionStatus>({
    queryKey: ['connection-state', company],
    enabled: !!company && support,
    queryFn: () => call('status?companyId=' + encodeURIComponent(company)),
  });
  if (!support) return null;
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
      await q.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر استكمال الإعداد');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="integration-card" aria-label="ربط تطبيق توصيل">
      <h2>ربط تطبيق توصيل</h2>
      <p>
        تطبيق مستقل على خادم آخر. استورد الحزمة الخاصة التي أعدها مسؤول توصيل بعد اعتماد سجل
        التثبيت. الحسابات الجديدة تحتاج إلى تفويض هوية من مسؤول توصيل.
      </p>
      {q.data?.state === 'operator-installation-required' ? (
        <p role="status">
          يلزم تثبيت سجل الموافقة ومفتاح تشفير الربط المحميين على الخادم بواسطة مسؤول النشر.
        </p>
      ) : (
        <>
          <label style={{ display: 'block' }} htmlFor="tawsel-origin">
            عنوان تطبيق توصيل HTTPS
          </label>
          <input
            id="tawsel-origin"
            style={{ display: 'block', width: '100%' }}
            type="url"
            dir="ltr"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="https://routing.company.example/"
            disabled={busy}
          />
          <label style={{ display: 'block' }} htmlFor="tawsel-package">
            الحزمة الخاصة من مسؤول توصيل
          </label>
          <input
            id="tawsel-package"
            style={{ display: 'block', maxWidth: '100%' }}
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {
            <Button
              disabled={!file || !origin || busy}
              onClick={() =>
                perform(async () => {
                  const ids = intent ?? {
                    importId: crypto.randomUUID(),
                    commandId: crypto.randomUUID(),
                  };
                  setIntent(ids);
                  sessionStorage.setItem(key, JSON.stringify(ids));
                  const selected = file!;
                  setFile(null);
                  let value: unknown;
                  try {
                    if (selected.size > 60000) throw Error('الحزمة أكبر من الحد المسموح');
                    try {
                      value = JSON.parse(await selected.text());
                    } catch {
                      throw Error('ملف الحزمة ليس JSON صحيحاً. اطلب الملف الأصلي من مسؤول توصيل.');
                    }
                    await call('import', {
                      companyId: company,
                      importId: ids.importId,
                      origin,
                      package: value,
                    });
                  } finally {
                    value = undefined;
                    const input = document.getElementById(
                      'tawsel-package',
                    ) as HTMLInputElement | null;
                    if (input) input.value = '';
                  }
                  setImported(await call('verify', { companyId: company, importId: ids.importId }));
                })
              }
            >
              استيراد وفحص الاتصال
            </Button>
          }
          {intent && (
            <Button
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  setImported(
                    await call('verify', { companyId: company, importId: intent.importId }),
                  );
                })
              }
            >
              استرداد الفحص بنفس الهوية
            </Button>
          )}
          {intent && !imported && (
            <Button
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  const result = await call(
                    'result?companyId=' +
                      encodeURIComponent(company) +
                      '&commandId=' +
                      encodeURIComponent(intent.commandId),
                  );
                  if (result.sourceId) {
                    sessionStorage.removeItem(key);
                    setIntent(null);
                  }
                })
              }
            >
              استرداد نتيجة التأكيد
            </Button>
          )}
          {rejected && (
            <>
              <p>
                الطلب الأصلي مرفوض نهائياً ومحفوظ للمراجعة. بعد معالجة السبب، ابدأ استيراداً جديداً؛
                الاسترداد لا يغيّر الرفض.
              </p>
              <Button
                disabled={busy}
                onClick={() => {
                  sessionStorage.removeItem(key);
                  setIntent(null);
                  setImported(null);
                  setRejected(false);
                }}
              >
                بدء استيراد جديد بعد المراجعة
              </Button>
            </>
          )}
          {imported && !rejected && (
            <>
              <dl>
                <dt>الشركة</dt>
                <dd>{String(imported.metadata.companyCode)}</dd>
                <dt>المصدر</dt>
                <dd>{String(imported.metadata.sourceExternalId)}</dd>
                <dt>جهة الهوية</dt>
                <dd dir="ltr">{String(imported.metadata.issuer)}</dd>
                <dt>الإصدار</dt>
                <dd>{String(imported.metadata.interopVersion)}</dd>
                <dt>التفويض</dt>
                <dd>{String(imported.metadata.capabilities)}</dd>
                <dt>وجهة الاستقبال المعتمدة</dt>
                <dd dir="ltr">{String(imported.metadata.callbackUrl)}</dd>
              </dl>
              <p>
                تم التحقق من المصدر. انتهاء تفويض الخدمة: <bdi>{imported.credentialExpiresAt}</bdi>.
                إثبات التوقيع والتطبيق ينتظر حدث إعداد قانونياً؛ لا ننشئ شحنة لاختبار الاتصال.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    if (!intent) return;
                    await call('confirm', {
                      schemaVersion: 1,
                      companyId: company,
                      type: 'integration.confirmConnection',
                      ...intent,
                    });
                    sessionStorage.removeItem(key);
                    setIntent(null);
                    setImported(null);
                  })
                }
              >
                تأكيد الاتصال
              </Button>
            </>
          )}
        </>
      )}
      {q.data?.connection && (
        <>
          <p>
            نسخة إعداد الاتصال: {q.data.connection.revision} — مفتاح التشفير:{' '}
            {q.data.connection.key_version}
          </p>
          <p>حالة المصدر: {q.data.connection.enabled ? 'آخر حالة مؤكدة مفعّلة' : 'المصدر موقوف'}</p>
          <p>
            تفويض الخدمة:{' '}
            {Date.parse(q.data.connection.credentialExpiresAt) <= Date.now()
              ? 'التفويض منتهٍ؛ يلزم تدوير معتمد'
              : q.data.connection.last_error === 'AUTHORIZATION_EXPIRED'
                ? 'توصيل رفض التفويض؛ قد يكون مسحوباً. اطلب حزمة تدوير معتمدة'
                : 'السحب غير متحقق حالياً؛ آخر فحص مصدر أدناه'}{' '}
            — الانتهاء: <bdi>{q.data.connection.credentialExpiresAt}</bdi>. الخطوة التالية: اطلب من
            مسؤول توصيل تدويراً معتمداً قبل الانتهاء، ثم استورد الحزمة الجديدة هنا.
          </p>
          <p>
            آخر فحص مصدر: <bdi>{q.data.connection.configuration_checked_at}</bdi>
          </p>
          <p>
            التفويض المطلوب:{' '}
            {(q.data.grantsRequired ?? [])
              .filter((g) => !q.data!.connection!.configuration.serviceCapabilities?.includes(g))
              .join('، ') ||
              'متاح بحسب آخر فحص؛ راجع الاستقبال والتعيين والمراقبة والمرتجعات عند تغير الصلاحيات'}
          </p>
          <p>آخر استلام موقع: {q.data.receipt?.lastSignedReceipt ?? 'بانتظار أول حدث موقع'}</p>
          <p>
            {q.data.receipt?.applied
              ? 'توجد أحداث مطبقة — راجع نقاط التتابع والتبعيات أدناه'
              : 'بانتظار أول حدث مطبق'}
          </p>
          <p>حالة الهوية والمصدر والتوقيع والتطبيق مستقلة. الاستلام لا يثبت استلام نقدية الشركة.</p>
        </>
      )}
      <EnrollmentPanel company={company} users={users} csrf={access.session?.csrfToken ?? ''} />
      {(error || q.isError) && <p role="alert">{error || 'تعذر قراءة حالة إعداد الاتصال'}</p>}
    </section>
  );
}
