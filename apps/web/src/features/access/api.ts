import {
  accessResponseKey,
  validateAccessResponse,
  type AccessCommand,
  type CommandResult,
  type AccessRegistry,
  type AccessSession as Session,
  type AccessUser as User,
  type AccessRole as Role,
  type AccessUsers as Users,
} from '@shahn/contracts';
import type { AccessContext } from '@shahn/domain';
export type Registry = AccessRegistry<AccessContext>;
export type { Session, User, Role, Users };
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
export async function api<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/v1/access' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body
        ? { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }
        : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ApiError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  }
  if (body && response.status >= 500) throw new ApiError('RESULT_UNKNOWN', response.status);
  if (!response.ok) throw new ApiError(result.code ?? 'REQUEST_FAILED', response.status);
  const validator = validateAccessResponse[accessResponseKey(path)];
  if (!validator?.(result)) throw new ApiError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 500);
  return result as T;
}
export const sendCommand = (command: AccessCommand, csrf: string) =>
  api<CommandResult>('/commands', command, csrf);
export const errorText = (error: unknown) => {
  const code = error instanceof ApiError ? error.code : '';
  return (
    (
      {
        AUTHENTICATION_REQUIRED:
          'انتهت الجلسة. سجّل الدخول في نافذة أخرى ثم حدّث الصلاحيات. بيانات النموذج محفوظة هنا.',
        REAUTHENTICATION_REQUIRED: 'يلزم تسجيل دخول حديث لبدء جلسة الدعم.',
        FORBIDDEN_SCOPE:
          'لا تسمح صلاحياتك الحالية بهذه الصفحة أو العملية. راجع التغيير مع مسؤول الشركة.',
        SUPPORT_SESSION_REQUIRED: 'انتهت جلسة الدعم أو لم تبدأ بعد. ابدأ جلسة جديدة بسبب واضح.',
        SUPPORT_MFA_REQUIRED: 'يلزم التحقق بخطوتين لحساب الدعم.',
        REVISION_CONFLICT:
          'تغيّرت البيانات لدى مستخدم آخر. حدّث البيانات وراجع النسخة الجديدة قبل الحفظ.',
        IDENTITY_PENDING: 'تجهيز الهوية ما زال معلقًا. انتظر اكتماله قبل تعديل المستخدم.',
        IDENTITY_CONFLICT: 'الاسم أو الهوية مستخدم بالفعل. راجع البيانات.',
        COMMAND_PAYLOAD_CONFLICT: 'هذا الطلب محفوظ ببيانات مختلفة. استرد نتيجته أولًا.',
        RESULT_UNKNOWN: 'لم تصل نتيجة الطلب. احتفظنا بمعرّفه؛ افحص النتيجة قبل أي إرسال جديد.',
        CONNECTION_LOST:
          'تعذر الاتصال بالخادم. بيانات النموذج محفوظة؛ حاول التحديث عند عودة الاتصال.',
        IDENTITY_UNAVAILABLE: 'خدمة تسجيل الدخول غير متاحة الآن. حاول لاحقًا.',
        VALIDATION_FAILED: 'راجع الحقول المطلوبة والقيم المدخلة.',
      } as Record<string, string>
    )[code] ?? 'تعذر إتمام العملية. راجع البيانات وحاول مرة أخرى.'
  );
};
