import {
  useEffect,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Input, Button } from '@shahn/ui';
import { egpDecimal, parseEgpDecimal } from '@shahn/domain';
import {
  validateCommercialViews,
  type CommercialCommand,
  type CommercialResult,
  type CommercialFailure,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
export const serviceNames = {
  brand_packed: 'طرد جاهز من البراند',
  company_packed: 'تغليف بواسطة الشركة',
  stored_stock: 'تجهيز من مخزون البراند',
};
export const displayMinor = (amountMinor: string) => egpDecimal({ currency: 'EGP', amountMinor });
export const inputMinor = (value: string) => {
  const money = parseEgpDecimal(
    value
      .replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)))
      .replace(/٫/g, '.'),
  );
  if (BigInt(money.amountMinor) < 0n) throw Error('VALIDATION_FAILED');
  return money.amountMinor;
};
export class CommercialError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly currentVersion?: number,
  ) {
    super(code);
  }
}
export async function commercialApi<T>(
  path: string,
  view: string,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/v1' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  }
  if (!response.ok) {
    const e = result as CommercialFailure;
    throw new CommercialError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : e.code,
      response.status,
      e.currentVersion,
    );
  }
  if (!validateCommercialViews[view]?.(result))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="commercial-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id: string }>, { id })
        : children}
    </div>
  );
}
export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={180}
      />
    </Field>
  );
}
export const errorMessage = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  return (
    (
      {
        PRICE_MISSING: 'لا يوجد سعر للمحافظة في الشريحة المختارة. أضف السعر قبل إنشاء لقطة الطلب.',
        INVALID_GEOGRAPHY_OR_TIER:
          'المنطقة أو المحافظة أو الشريحة غير صالحة أو موقوفة. يجب أن تتبع المنطقة المحافظة.',
        INVALID_DEFAULT_SERVICE: 'اختر خدمة افتراضية من الخدمات المفعلة.',
        STORAGE_REQUIRED: 'أكمل اتفاق التخزين للخدمة المفعلة.',
        INVALID_STORAGE_AGREEMENT: 'راجع تاريخ البداية ويوم التجديد وتاريخ الإيقاف.',
        INVALID_STORAGE_BRANCH: 'اختر فرعًا نشطًا من الشركة لاتفاق التخزين.',
        TARIFF_KEY_EXISTS: 'يوجد سعر لهذا الاختيار. افتح السعر الموجود لتعديله.',
        SERVICE_UNAVAILABLE: 'البراند أو الخدمة موقوفة.',
        REVISION_CONFLICT:
          'حفظ مستخدم آخر نسخة أحدث. احتفظنا بمدخلاتك؛ حدّث رقم النسخة وراجعها قبل الحفظ.',
        FORBIDDEN_SCOPE: 'لا تسمح صلاحياتك الحالية بهذا الإجراء.',
        AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجّل الدخول ثم حدّث الصفحة؛ المدخلات باقية هنا.',
        RESULT_UNKNOWN: 'لم تصل نتيجة الحفظ. احتفظنا بالطلب؛ استرد نتيجته قبل إعادة الإرسال.',
        CONNECTION_LOST: 'تعذر الاتصال. احتفظنا بالمدخلات؛ حاول مجددًا.',
        VALIDATION_FAILED: 'راجع الحقول والمبالغ المطلوبة.',
        INVALID_QUANTITY: 'أدخل كمية صحيحة موجبة من الوحدات، دون كسور.',
        QUANTITY_OVERFLOW: 'مجموع الكميات يتجاوز الحد الآمن. راجع الأرصدة والكميات قبل التسجيل.',
        INACTIVE_OR_UNKNOWN_VARIANT: 'المتغير غير موجود في البراند أو موقوف للاستخدام الجديد.',
        INACTIVE_OR_UNKNOWN_BRAND: 'البراند غير متاح للاستخدام الجديد.',
        FUTURE_RECEIPT_DATE: 'تاريخ الاستلام الفعلي لا يمكن أن يكون في المستقبل.',
        VARIANT_HISTORY_REQUIRED: 'احتفظ بالمتغيرات السابقة؛ أوقف المتغير بدل حذف هويته أو تاريخه.',
      } as Record<string, string>
    )[code] ?? 'تعذر الحفظ. راجع البيانات والاتصال وحاول مجددًا.'
  );
};
export function ErrorNotice({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  return error ? (
    <div ref={ref} role="alert" tabIndex={-1} className="commercial-error">
      {errorMessage(error)}
      {error instanceof CommercialError && error.currentVersion !== undefined && (
        <p>
          النسخة الحالية: <bdi>{error.currentVersion}</bdi>
        </p>
      )}
    </div>
  ) : null;
}
type CommandDraft = CommercialCommand extends infer C
  ? C extends CommercialCommand
    ? Omit<C, 'schemaVersion' | 'companyId' | 'commandId'>
    : never
  : never;
const family = (type: string) =>
  type.startsWith('reference.')
    ? 'commercial.reference'
    : type.startsWith('tariff.')
      ? 'commercial.tariff'
      : type === 'pricing.snapshot'
        ? 'commercial.snapshot'
        : 'commercial.brand';
export function useCommercialMutation(
  onSuccess: (result: CommercialResult) => void,
  channel: string,
) {
  const { registry, session } = useAccess(),
    companyId = registry?.context.companyId;
  const key = `P04:${session?.principalId}:${companyId}:${channel}`;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState<CommercialCommand | null>(() => {
      try {
        return JSON.parse(sessionStorage.getItem(key) ?? 'null') as CommercialCommand | null;
      } catch {
        return null;
      }
    });
  const savePending = (value: CommercialCommand | null) => {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* Recovery still retains the intent while this form is open. */
    }
  };
  const submit = async (draft: CommandDraft) => {
    if (busy || pending || !companyId || !session) return;
    const input = {
      ...draft,
      schemaVersion: 1,
      companyId,
      commandId: crypto.randomUUID(),
    } as CommercialCommand;
    setBusy(true);
    setError(null);
    savePending(input);
    try {
      const result = await commercialApi<CommercialResult>(
        '/brands/commands',
        'result',
        input,
        session.csrfToken,
      );
      savePending(null);
      onSuccess(result);
    } catch (e) {
      setError(e);
      if (!(e instanceof CommercialError) || e.code !== 'RESULT_UNKNOWN') savePending(null);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || !session) return;
    setBusy(true);
    setError(null);
    try {
      const result = await commercialApi<CommercialResult>(
        `/brands/commands/${pending.commandId}?companyId=${pending.companyId}&family=${family(pending.type)}`,
        'result',
      );
      savePending(null);
      onSuccess(result);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) {
        try {
          const result = await commercialApi<CommercialResult>(
            '/brands/commands',
            'result',
            pending,
            session.csrfToken,
          );
          savePending(null);
          onSuccess(result);
        } catch (retry) {
          setError(retry);
          if (retry instanceof CommercialError && retry.status === 409) savePending(null);
        }
      } else {
        setError(e);
        if (e instanceof CommercialError && e.status === 409) savePending(null);
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
    recovery: pending ? (
      <div className="commercial-recovery">
        <p>
          طلب محفوظ قيد الاسترداد: <bdi>{pending.commandId}</bdi>
        </p>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void recover()}>
          استرد نتيجة الحفظ
        </Button>
      </div>
    ) : null,
  };
}
