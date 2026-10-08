import { useRef, useState } from 'react';
import { validateSettlementViews } from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';

type Views = typeof validateSettlementViews;
export class SettlementApiError extends CommercialError {
  constructor(
    code: string,
    status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(code, status);
  }
}
/** Every response is checked against the closed contract; a lost POST response is unknown. */
export async function settlementApi<T>(
  path: string,
  view: keyof Views,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response, result: unknown;
  try {
    response = await fetch('/api/v1/settlements' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    result = await response.json();
  } catch {
    throw new SettlementApiError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  if (!response.ok) {
    const e = result as { code?: string; details?: Record<string, unknown> };
    throw new SettlementApiError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : (e.code ?? 'REQUEST_FAILED'),
      response.status,
      e.details,
    );
  }
  if (!validateSettlementViews[view](result))
    throw new SettlementApiError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
type Kind = 'settlement' | 'opening';
const endpoints: Record<Kind, { post: string; recover: string; view: keyof Views }> = {
  settlement: { post: '/commands', recover: '/commands/', view: 'result' },
  opening: { post: '/opening/commands', recover: '/opening/commands/', view: 'openingResult' },
};
type Command = { commandId: string; companyId: string };
/**
 * One immutable command identity per reviewed intent, kept across reloads until its result is
 * known. A lost response is recovered with the same identity; a definite answer releases it.
 */
export function useSettlementMutation<C extends Command, R>(
  kind: Kind,
  scopeKey: string,
  onSuccess: (r: R) => void,
) {
  const { session, registry } = useAccess(),
    company = registry?.context.companyId,
    key = `P21:${kind}:${session?.principalId}:${company}:${scopeKey}`;
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as C | null;
    } catch {
      return null;
    }
  };
  const inFlight = useRef(false),
    committed = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [intent, setIntent] = useState(() => ({ key, value: read() }));
  if (intent.key !== key) setIntent({ key, value: read() });
  const pending = intent.key === key ? intent.value : null;
  const persist = (value: C | null) => {
    setIntent({ key, value });
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* The in-memory intent still prevents a second identity on this page. */
    }
  };
  const settle = (e: unknown) => {
    setError(e);
    if (!(e instanceof CommercialError) || e.code !== 'RESULT_UNKNOWN') persist(null);
  };
  const execute = async (c: C) => {
    const r = await settlementApi<R>(
      endpoints[kind].post,
      endpoints[kind].view,
      c,
      session?.csrfToken,
    );
    committed.current = true;
    persist(null);
    onSuccess(r);
  };
  const submit = async (draft: Omit<C, 'commandId' | 'companyId'>) => {
    if (committed.current || inFlight.current || busy || pending || !company || !session) return;
    inFlight.current = true;
    const c = { ...draft, companyId: company, commandId: crypto.randomUUID() } as C;
    persist(c);
    setBusy(true);
    setError(null);
    try {
      await execute(c);
    } catch (e) {
      settle(e);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await settlementApi<R>(
        `${endpoints[kind].recover}${pending.commandId}?companyId=${pending.companyId}`,
        endpoints[kind].view,
      );
      committed.current = true;
      persist(null);
      onSuccess(r);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) {
        try {
          await execute(pending);
        } catch (retry) {
          settle(retry);
        }
      } else {
        setError(e);
        if (e instanceof CommercialError && e.status === 409) persist(null);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const discard = () => {
    if (!busy) persist(null);
  };
  return { submit, recover, discard, busy, error, setError, pending };
}
export const messages: Record<string, string> = {
  SETTLEMENT_PREVIEW_STALE:
    'تغيرت البيانات بعد مراجعتك (حركة فعلية أو تسوية أخرى). لم يُسجل شيء؛ راجع الأثر الجديد ثم أكد.',
  SETTLEMENT_ALREADY_RESOLVED: 'هذه الحالة أو المراجعة سُويت بالفعل. افتح السجل بدل تكرار التسوية.',
  NO_DIFFERENCE: 'الكمية أو الرصيد الملاحظ يساوي المسجل؛ لا يوجد فرق لتسويته.',
  RESERVATION_SHORTAGE_HOLDS_AFFECTED_WORK:
    'سيظهر عجز حجز وتتوقف كل الطلبات غير المسلمة لهذا الصنف.',
  POSITIVE_OBSERVATION_IS_NOT_A_BRAND_RECEIPT:
    'الزيادة الملاحظة تصحيح جرد وليست استلام بضاعة جديد من البراند.',
  INCIDENT_CUSTODY_HELD: 'جزء من الكمية غير الصالحة محجوز لبلاغ حادث؛ عالجه من صفحة الحوادث.',
  ACCOUNT_OBSERVATION_OPEN: 'يوجد فرق مفتوح لهذا الحساب. سوِّه أولًا بدل تسجيل ملاحظة ثانية.',
  POSITIVE_OBSERVATION_NOT_SPENDABLE:
    'الفائض الملاحظ لا يصبح رصيدًا قابلًا للصرف حتى يُفسر بحركة فعلية.',
  UNEXPLAINED_SHORTAGE_HELD_UNTIL_RESOLVED: 'العجز غير المفسر يُحجز من الرصيد المتاح حتى تسويته.',
  RESOLUTION_EXCEEDS_DIFFERENCE: 'المبلغ أكبر من الفرق غير المفسر المتبقي.',
  RESOLUTION_KIND_NOT_LAWFUL: 'هذا النوع غير مسموح لفائض ملاحظ؛ استخدم حركة فعلية فائتة فقط.',
  UNCLASSIFIED_OUTSIDE_OPERATING_PROFIT: 'تبقى خارج ربح التشغيل حتى تصنيف مبرر.',
  GENERAL_MOVEMENT_OUTSIDE_OPERATING_PROFIT: 'حركة عامة خارج ربح التشغيل.',
  INSUFFICIENT_FUNDS: 'رصيد الحساب المتاح لا يكفي. لم يتغير أي رصيد.',
  PAYOUT_CORRECTION_REQUIRES_ACTUAL_RETURN: 'لا يُعكس تحصيل مدفوع إلا بإثبات رجوع المال فعليًا.',
  USE_INCIDENT_REVIEW: 'التعويض يُصحح من مراجعة الحادث المرتبطة فقط.',
  CORRECT_THE_ORIGINAL_MOVEMENT: 'صحح الحركة الأصلية وليس حركة تصحيح.',
  MOVEMENT_NOT_CORRECTABLE: 'هذه الحركة لا تُصحح من هنا.',
  SOURCE_REVIEW_OPEN: 'توجد مراجعة فرق مصدر مفتوحة لهذه الحركة؛ سوِّها من قائمة المراجعات.',
  CORRECTION_CHANGES_CLASS: 'التصحيح لا يحول المستحق إلى مديونية أو العكس.',
  PENDING_CORRECTION_EXCEEDS_LOT: 'التصحيح أكبر من المستحق المعلق المتبقي.',
  BRAND_DEBT_AFTER_CORRECTION: 'سيصبح على البراند مديونية بعد التصحيح.',
  PENDING_CLASS_PRESERVED: 'يبقى التصحيح معلقًا مثل أصله حتى استلام أموال المندوب.',
  NO_CASH_MOVEMENT: 'لا توجد حركة نقدية؛ هذا اتفاق تجاري موثق.',
  PAST_PAYROLL_PROTECTED: 'الشهر السابق محمي. استخدم الشهر الحالي غير المدفوع أو شهرًا قادمًا.',
  PAYROLL_PERIOD_PROTECTED: 'هذا الشهر مدفوع أو مجمد ولا يُعدل. لا يوجد مسار لتجاوز ذلك.',
  PAYROLL_REVIEW_REQUIRED: 'الشهر يحتاج مراجعة مصدر قبل أي تعديل.',
  LINKED_OLD_WORK_REQUIRED: 'تاريخ العمل يجب أن يكون داخل نفس الشهر.',
  DEDUCTION_IS_NOT_ADVANCE_RECOVERY: 'خصم الاستحقاق يخفض تكلفة الموظف وليس استرداد سلفة.',
  RECEIVED_CASH_RETAINED_REVIEW_ACCOUNT:
    'المال المستلم فعليًا يبقى في الحساب؛ عالج أي فرق حساب بملاحظة مستقلة.',
  NEW_GOODS_PENDING_ACTUAL_RECEIPT: 'مستحقات البضاعة الجديدة تبقى معلقة حتى استلام فعلي.',
  NO_MONEY_DIFFERENCE_RETAIN: 'لا يوجد فرق مالي؛ اختر الإبقاء على الأصل.',
  COMPENSATION_BELOW_EMPLOYEE_SHARE: 'التعويض لا يقل عن حصة الموظف المعتمدة.',
  STORAGE_CREDIT_ALLOCATED: 'جزء من المبلغ مخصص لفترات مستحقة ولا يُسترد هنا.',
  INSUFFICIENT_STORAGE_CREDIT: 'المبلغ أكبر من رصيد التخزين غير المخصص.',
  STORAGE_CREDIT_SEPARATE_FROM_BRAND_WALLET: 'رصيد التخزين منفصل عن مستحقات البراند.',
  SHIPMENT_CANCELLED: 'الشحنة ملغاة بالفعل.',
  HANDED_OVER_PROTECTED: 'سُلمت الشحنة للمندوب؛ استخدم الحادث أو المرتجع.',
  SOURCE_ADAPTER_REQUIRED: 'الشحنة مرتبطة بنظام التوصيل ولا تُعدل من هنا.',
  RECORD_RETAINED_NOT_DELETED: 'السجل يبقى في التاريخ ولا يُحذف.',
  NO_MONEY_UNTIL_INCIDENT_CONFIRMATION: 'لا تعويض ولا خصم قبل التأكيد في صفحة الحوادث.',
  INCIDENT_QUANTITY_CLAIMED: 'الكمية محجوزة لبلاغ آخر.',
  DUPLICATE_OPENING_TARGET: 'هذا الهدف له رصيد افتتاحي مسجل بالفعل؛ أي تغيير يتم بتسوية مرتبطة.',
  FUTURE_ACTUAL_DATE: 'اختر التاريخ الفعلي اليوم أو قبله.',
  ACCOUNT_INACTIVE: 'الحساب موقوف.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح للفرع المختار.',
  METHOD_ACCOUNT_MISMATCH: 'النقدي يحتاج حسابًا نقديًا، والبنكي يحتاج حسابًا بنكيًا.',
  REVISION_CONFLICT: 'تغيرت البيانات. حدّث الصفحة وراجعها.',
  COMMAND_PAYLOAD_CONFLICT: 'هذا الطلب سُجل ببيانات مختلفة. افتح السجل.',
  RESULT_UNKNOWN: 'لم تصل النتيجة. لا تكرر؛ تحقق من النتيجة بنفس الطلب.',
  CONNECTION_LOST: 'تعذر الاتصال. البيانات الظاهرة قد تكون قديمة؛ المدخلات باقية.',
  FORBIDDEN_SCOPE: 'هذا الإجراء خارج صلاحياتك أو فروعك. لم يُسجل شيء.',
  CSRF_FAILED: 'انتهت صلاحية الجلسة لهذا الإجراء. حدّث الصفحة.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجل الدخول؛ المدخلات باقية.',
  NOT_FOUND: 'الهدف غير متاح ضمن صلاحياتك. لم يُسجل شيء.',
  VALIDATION_FAILED: 'راجع الحقول المطلوبة والمبالغ والتواريخ.',
  INVALID_RESPONSE: 'وصل رد غير متوقع من الخادم. حدّث الصفحة.',
  INVALID_MONEY: 'أدخل مبلغًا صحيحًا بالجنيه بحد أقصى منزلتين.',
};
export const messageFor = (code: string) => messages[code] ?? 'تعذر إتمام العملية: ' + code;
