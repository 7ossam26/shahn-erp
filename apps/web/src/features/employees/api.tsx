import { useEffect, useRef, useState } from 'react';
import { Button } from '@shahn/ui';
import { validateEmployeeViews, type EmployeeCommand, type EmployeeResult } from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';
export async function employeeApi<T>(
  path: string,
  view: string,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response, result: unknown;
  try {
    response = await fetch('/api/v1' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
    result = await response.json();
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  if (!response.ok) {
    const e = result as { code: string; currentVersion?: number };
    throw new CommercialError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : e.code,
      response.status,
      e.currentVersion,
    );
  }
  if (!validateEmployeeViews[view]?.(result))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
const pathFor = (c: EmployeeCommand) =>
  c.type === 'employee.create'
    ? '/employees'
    : `/employees/${c.employeeId}` +
      (c.type === 'employee.terms' ? '/terms' : c.type === 'employee.link' ? '/driver-links' : '');
export type EmployeeDraft = EmployeeCommand extends infer C
  ? C extends EmployeeCommand
    ? Omit<C, 'schemaVersion' | 'companyId' | 'commandId'>
    : never
  : never;
export function useEmployeeMutation(onSuccess: (r: EmployeeResult) => void, channel: string) {
  const { session, registry } = useAccess(),
    company = registry?.context.companyId,
    key = `P08:${session?.principalId}:${company}:${channel}`;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState<EmployeeCommand | null>(() => {
      try {
        return JSON.parse(sessionStorage.getItem(key) ?? 'null') as EmployeeCommand | null;
      } catch {
        return null;
      }
    });
  const persist = (p: EmployeeCommand | null) => {
    setPending(p);
    try {
      if (p) sessionStorage.setItem(key, JSON.stringify(p));
      else sessionStorage.removeItem(key);
    } catch {
      /* Retain in-memory identity. */
    }
  };
  const execute = async (c: EmployeeCommand) => {
    const result = await employeeApi<EmployeeResult>(pathFor(c), 'result', c, session?.csrfToken);
    persist(null);
    onSuccess(result);
  };
  const submit = async (draft: EmployeeDraft) => {
    if (busy || pending || !company || !session) return;
    const input = {
      ...draft,
      companyId: company,
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
    } as EmployeeCommand;
    persist(input);
    setBusy(true);
    setError(null);
    try {
      await execute(input);
    } catch (e) {
      setError(e);
      if (!(e instanceof CommercialError) || e.code !== 'RESULT_UNKNOWN') persist(null);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || !session) return;
    setBusy(true);
    setError(null);
    try {
      const result = await employeeApi<EmployeeResult>(
        `/employees/commands/${pending.commandId}?companyId=${pending.companyId}`,
        'result',
      );
      persist(null);
      onSuccess(result);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) {
        try {
          await execute(pending);
        } catch (retry) {
          setError(retry);
          if (retry instanceof CommercialError && retry.status === 409) persist(null);
        }
      } else {
        setError(e);
        if (e instanceof CommercialError && e.status === 409) persist(null);
      }
    } finally {
      setBusy(false);
    }
  };
  return {
    submit,
    busy,
    error,
    setError,
    pending,
    recovery:
      pending && !busy ? (
        <div className="commercial-recovery" role="status">
          <p>نتيجة الحفظ غير مؤكدة. احتفظنا بنفس الطلب ومدخلاته.</p>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void recover()}>
            استرد نتيجة الحفظ
          </Button>
        </div>
      ) : null,
  };
}
const messages: Record<string, string> = {
  PAYROLL_REVISED: 'تغير الحساب أو مصادره. حدّث الحساب وراجع الصافي قبل التأكيد من جديد.',
  ALREADY_PAID: 'تم دفع أو إقفال الشهر بالفعل. اعرض العملية المحفوظة.',
  INSUFFICIENT_FUNDS: 'رصيد الحساب غير كافٍ لدفع الصافي بالكامل.',
  PAYROLL_REVIEW_REQUIRED: 'توجد مصادر تحتاج مراجعة قبل إتمام العملية.',
  PRIOR_PAYROLL_REVIEW_REQUIRED: 'حساب سابق يحتاج مراجعة مصادره قبل تخصيص استرداد جديد.',
  FUTURE_PAYROLL: 'الدفع أو الإقفال متاح للشهر الحالي والشهور السابقة فقط.',
  LINKED_OLD_WORK_REQUIRED: 'تاريخ العمل خارج شهر التسوية يتطلب تصحيحًا مرتبطًا بمصدره الأصلي.',
  FUTURE_PAYMENT_DATE: 'تاريخ الدفع الفعلي لا يمكن أن يكون في المستقبل.',
  RESULT_UNKNOWN: 'لم تصل نتيجة الحفظ. استرد النتيجة بنفس الطلب قبل تغيير البيانات.',
  CONNECTION_LOST: 'تعذر الاتصال. المدخلات محفوظة هنا؛ حاول مرة أخرى.',
  FORBIDDEN_SCOPE: 'صلاحياتك الحالية لا تسمح بقراءة أو تعديل هذا الملف.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجّل الدخول مجددًا؛ مدخلاتك محفوظة.',
  REVISION_CONFLICT:
    'حفظ مستخدم آخر نسخة أحدث. احتفظنا بمدخلاتك؛ حمّل النسخة الحالية وراجعها قبل الحفظ.',
  PAST_PAYROLL_PROTECTED:
    'الشهر السابق محمي حتى إذا كان غير مدفوع. اختر الشهر الحالي غير المقفل أو شهرًا قادمًا.',
  PAYROLL_PERIOD_PROTECTED: 'هذا الشهر مجمّد أو مدفوع أو مقفل. لا يمكن تعديل راتبه من الملف.',
  ACCEPTED_WORK_PROTECTED:
    'يوجد عمل مقبول في هذا التاريخ. اختر تاريخًا لاحقًا للحفاظ على العمولة والفرع السابقين.',
  WORK_DATE_PROTECTED:
    'اختر تاريخ اليوم أو تاريخًا قادمًا، بعد بداية العمل. التعديل التاريخي له مسار مراجعة مستقل.',
  DRIVER_LINK_OVERLAP: 'يوجد ربط متداخل لهذه الهوية أو الموظف. راجع التاريخ والربط الحالي.',
  INVALID_BRANCH_EFFECTIVE_DATE:
    'نقل الفرع يتطلب تاريخ اليوم وسببًا؛ النقل المستقبلي غير متاح هنا.',
  EMPLOYEE_INACTIVE: 'الموظف موقوف. راجع حالة العمل قبل إضافة شروط أو ربط جديد.',
  INVALID_EMPLOYEE_PROFILE: 'راجع أيام العمل والراحة وتواريخ التوظيف؛ يوم الراحة لا يكون يوم عمل.',
  INVALID_COMPENSATION: 'راجع الراتب والعمولة. اختر صيغة عمولة واحدة ومبلغًا أو نسبة صحيحة.',
  VALIDATION_FAILED: 'راجع الحقول المطلوبة والمبالغ والتواريخ.',
  EMPTY_TERM_CHANGE: 'اختر تعديل الراتب أو العمولة أولًا.',
  INVALID_DRIVER_LINK: 'اختر مندوبًا موجودًا أو سجل هوية محلية واحدة، وحدد فترة صالحة.',
  MONEY_OVERFLOW: 'المبلغ يتجاوز الحد المسموح.',
};
export function EmployeeError({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div className="commercial-error" role="alert" tabIndex={-1} ref={ref}>
      {messages[error instanceof Error ? error.message : ''] ??
        'تعذر إكمال الطلب. راجع البيانات وحاول مجددًا.'}
      {error instanceof CommercialError && error.currentVersion !== undefined ? (
        <p>النسخة الحالية: {error.currentVersion}</p>
      ) : null}
    </div>
  );
}
