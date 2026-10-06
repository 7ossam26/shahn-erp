import { useRef, useState } from 'react';
import { Button } from '@shahn/ui';
import { validateIncidentViews, type IncidentCommand, type IncidentResult } from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';
export async function incidentApi<T>(
  path: string,
  view: string,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response, data: unknown;
  try {
    response = await fetch('/api/v1/incidents' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    data = await response.json();
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  if (!response.ok)
    throw new CommercialError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : (data as { code: string }).code,
      response.status,
    );
  if (!validateIncidentViews[view]?.(data))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return data as T;
}
type Draft = IncidentCommand extends infer T
  ? T extends IncidentCommand
    ? Omit<T, 'schemaVersion' | 'commandId' | 'companyId'>
    : never
  : never;
export function useIncidentMutation(name: string, onSuccess: (r: IncidentResult) => void) {
  const { session, registry } = useAccess(),
    company = registry?.context.companyId,
    key = `P18:${session?.principalId}:${company}:${name}`,
    guard = useRef(false);
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as IncidentCommand | null;
    } catch {
      return null;
    }
  };
  const [stored, setStored] = useState(() => ({ key, value: read() })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  if (stored.key !== key) setStored({ key, value: read() });
  const pending = stored.key === key ? stored.value : null;
  const persist = (value: IncidentCommand | null) => {
    setStored({ key, value });
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
  };
  const execute = async (c: IncidentCommand) => {
    const r = await incidentApi<IncidentResult>(
      c.type === 'incident.report' ? '' : `/${c.incidentId}/${c.type.split('.')[1]}`,
      'result',
      c,
      session?.csrfToken,
    );
    persist(null);
    onSuccess(r);
  };
  const handle = (e: unknown, recover = false) => {
    setError(e);
    if (
      e instanceof CommercialError &&
      e.status >= 400 &&
      e.status < 500 &&
      (!recover || e.status === 409)
    )
      persist(null);
  };
  const submit = async (draft: Draft) => {
    if (guard.current || pending || !company || !session) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    const c = {
      ...draft,
      schemaVersion: 1,
      companyId: company,
      commandId: crypto.randomUUID(),
    } as IncidentCommand;
    try {
      persist(c);
      await execute(c);
    } catch (e) {
      handle(e);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || guard.current) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await incidentApi<IncidentResult>(
        `/commands/${pending.commandId}?companyId=${pending.companyId}`,
        'result',
      );
      persist(null);
      onSuccess(r);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) {
        try {
          await execute(pending);
        } catch (retry) {
          handle(retry, true);
        }
      } else handle(e, true);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  return {
    submit,
    busy,
    error,
    pending,
    recovery: pending ? (
      <section role="status" className="commercial-warning">
        <p>نتيجة العملية قيد التحقق. احتفظنا بنفس الطلب؛ لا تسجّل عملية جديدة.</p>
        <Button type="button" disabled={busy} onClick={() => void recover()}>
          التحقق من النتيجة
        </Button>
      </section>
    ) : null,
  };
}
const messages: Record<string, string> = {
  RESULT_UNKNOWN: 'تعذر تأكيد نتيجة العملية. استخدم التحقق من النتيجة.',
  CONNECTION_LOST: 'تعذر الاتصال. احتفظنا بالمدخلات.',
  DISPOSITION_DEPENDENCY_PENDING: 'عملية التصرف المسموحة غير متاحة بعد. التعويض المؤكد محفوظ.',
  DISPOSITION_REQUEST_PENDING: 'طلب التصرف في الكمية المحددة لم يصل بعد. التعويض المؤكد محفوظ.',
  DISPOSITION_ALREADY_QUEUED: 'طلب التصرف مسجل بالفعل. راجع حالته الحالية.',
  FORBIDDEN_SCOPE: 'هذه البيانات خارج صلاحياتك الحالية.',
  INCIDENT_SHARES_MISMATCH: 'يجب أن يساوي مجموع الحصتين مبلغ التعويض بالضبط.',
  INCIDENT_QUANTITY_CLAIMED: 'هذه الكمية محجوزة لبلاغ آخر أو عُوّضت من قبل.',
  PAYROLL_PERIOD_PROTECTED: 'الفترة محمية. اختر الفترة المسموحة الظاهرة.',
  PAST_PAYROLL_PERIOD: 'لا يمكن إضافة التزام إلى فترة سابقة.',
  WAREHOUSE_LOSS_COMPANY_RESPONSIBILITY: 'فقد المخزن مسؤولية الشركة بالكامل.',
  COMPENSATION_EXCEEDS_GOODS_VALUE: 'التعويض يتجاوز قيمة البضاعة المتأثرة.',
  INCIDENT_EMPLOYEE_LINK_UNRESOLVED: 'لا توجد رابطة موظف صالحة مع صاحب العهدة وقت الواقعة.',
  INCIDENT_BRANCH_REASON_REQUIRED: 'اكتب سبب تصحيح فرع المسؤولية.',
  INCIDENT_CUSTODY_CHANGED: 'تغيرت العهدة. أعد تحميل الوقائع للمراجعة.',
  INCIDENT_STOCK_UNAVAILABLE: 'الكمية غير متاحة في العهدة الحالية.',
  REVISION_CONFLICT: 'تغيرت نسخة البلاغ. حدّث الصفحة وراجعها.',
  INVALID_MONEY: 'أدخل مبلغًا صحيحًا بالجنيه، والتعويض المؤكد يجب أن يكون موجبًا.',
};
export function IncidentError({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="commercial-error">
      {error instanceof CommercialError
        ? (messages[error.code] ?? 'تعذر إتمام العملية: ' + error.code)
        : 'راجع المدخلات وحاول مجددًا.'}
    </p>
  ) : null;
}
export function incidentMessage(code: string) {
  return messages[code] ?? code;
}
