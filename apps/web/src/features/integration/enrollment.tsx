import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shahn/ui';
import type { IntegrationNativeChoice } from '@shahn/contracts';
interface Batch {
  requestId: string;
  requests: unknown[];
  state: string;
  actionId: string | null;
}
export function EnrollmentPanel({
  company,
  users,
  csrf,
}: {
  company: string;
  users: IntegrationNativeChoice[];
  csrf: string;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [target, setTarget] = useState('');
  const storage = 'shahn-enrollment-command:' + company,
    [command, setCommand] = useState(sessionStorage.getItem(storage));
  async function call(path: string, body?: unknown) {
    const r = await fetch('/api/v1/integration/connection/' + path, {
      credentials: 'same-origin',
      ...(body
        ? {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
            body: JSON.stringify(body),
          }
        : {}),
    });
    const value = await r.json();
    if (!r.ok) {
      if (path.startsWith('enrollment-recover?') && r.status === 404 && value.code === 'NOT_FOUND')
        finish();
      if (path === 'enrollment' && r.status >= 400 && r.status < 500) finish();
      throw Error(
        'لم يؤكد تفويض الهوية. راجع الشركة وجهة الهوية وإجراء مسؤول توصيل، ثم استرد نفس الطلب.',
      );
    }
    return value;
  }
  const q = useQuery<{ items: Batch[] }>({
    queryKey: ['connection-enrollment', company],
    enabled: !!company,
    queryFn: () => call('enrollment-status?companyId=' + encodeURIComponent(company)),
  });
  async function work(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await q.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الإجراء');
    } finally {
      setBusy(false);
    }
  }
  function finish() {
    sessionStorage.removeItem(storage);
    setCommand(null);
  }
  return (
    <details>
      <summary>تفويض هويات المستخدمين لدى توصيل</summary>
      <p>
        اختر المستخدمين الذين يحتاجون إلى توصيل فقط. الموظف غير المرتبط بالتشغيل لا يحتاج حساباً.
        طلب التفويض لا يمنح صلاحية؛ مسؤول توصيل يراجع كل هوية، ثم يلزم قبول إعداد المستخدم وجاهزية
        جهة الهوية قبل استخدام السائق.
      </p>
      <fieldset>
        <legend>المستخدمون المطلوب تفويضهم</legend>
        {users
          .filter((x) => x.active && x.subject)
          .map((x) => (
            <label key={x.id}>
              <input
                type="checkbox"
                checked={selected.includes(x.id)}
                disabled={busy || !!command}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? [...selected, x.id] : selected.filter((id) => id !== x.id),
                  )
                }
              />
              {x.name}
            </label>
          ))}
      </fieldset>
      <Button
        disabled={busy || !!command || !selected.length || selected.length > 100}
        onClick={() =>
          work(async () => {
            const id = crypto.randomUUID();
            sessionStorage.setItem(storage, id);
            setCommand(id);
            await call('enrollment', {
              schemaVersion: 1,
              type: 'integration.requestEnrollment',
              companyId: company,
              commandId: id,
              principalIds: selected,
            });
            finish();
          })
        }
      >
        حفظ طلب تفويض غير سري
      </Button>
      {command && (
        <Button
          disabled={busy}
          onClick={() =>
            work(async () => {
              await call(
                'enrollment-recover?companyId=' +
                  encodeURIComponent(company) +
                  '&commandId=' +
                  encodeURIComponent(command),
              );
              finish();
            })
          }
        >
          استرداد طلب التفويض الأصلي
        </Button>
      )}
      {q.data?.items.map((batch) => (
        <article key={batch.requestId}>
          <p>
            {batch.state === 'awaiting-tawsel-identity-authorization'
              ? 'بانتظار تفويض الهوية من مسؤول توصيل'
              : 'حُفظت نتيجة المسؤول؛ بانتظار قبول إعداد المستخدم وجاهزية جهة الهوية'}
          </p>
          <Button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(batch.requests, null, 2)], { type: 'application/json' }),
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = 'tawsel-enrollment-' + batch.requestId + '.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            تنزيل طلب المراجعة غير السري
          </Button>
          {!batch.actionId && (
            <Button onClick={() => setTarget(batch.requestId)}>تسجيل نتيجة المسؤول المقبولة</Button>
          )}
        </article>
      ))}
      {target && (
        <>
          <label htmlFor="enrollment-result">
            نتيجة integration.bindSource المقبولة من مسؤول توصيل
          </label>
          <input
            id="enrollment-result"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button
            disabled={busy || !file}
            onClick={() =>
              work(async () => {
                const selectedFile = file!;
                setFile(null);
                try {
                  if (selectedFile.size > 60000) throw Error('ملف النتيجة أكبر من الحد');
                  let result: unknown;
                  try {
                    result = JSON.parse(await selectedFile.text());
                  } catch {
                    throw Error(
                      'ملف النتيجة ليس JSON صحيحاً. اطلب النتيجة الأصلية من مسؤول توصيل.',
                    );
                  }
                  await call('enrollment-result', {
                    companyId: company,
                    requestId: target,
                    result,
                  });
                  setTarget('');
                } finally {
                  const input = document.getElementById(
                    'enrollment-result',
                  ) as HTMLInputElement | null;
                  if (input) input.value = '';
                }
              })
            }
          >
            فحص المصدر وحفظ النتيجة
          </Button>
        </>
      )}
      {(error || q.isError) && <p role="alert">{error || 'تعذر تحميل تفويضات الهوية'}</p>}
    </details>
  );
}
