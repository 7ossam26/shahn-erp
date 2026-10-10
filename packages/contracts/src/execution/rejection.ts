export const rejectionLabels: Record<string, string> = {
  'changed-mind': 'تغيير الرأي أو عدم الحاجة',
  'amount-disagreement': 'المبلغ مختلف عن الاتفاق',
  'wrong-product': 'المنتج مختلف عن الطلب',
  'condition-problem': 'مشكلة في حالة المنتج أو الطرد',
  'inspection-unavailable': 'المعاينة المتفق عليها غير متاحة',
  'missing-pieces': 'قطع ناقصة',
  other: 'أخرى',
};
export interface RejectionDisplay {
  reasonState: 'known' | 'legacy' | 'unavailable' | 'unknown-code' | 'not-applicable';
  reason: string;
  reasonDetail: string | null;
}
export function rejectionDisplay(
  record: {
    outcome?: string;
    recordVersion?: string;
    rejection?: { catalogVersion: string; code: string; detail?: string };
  } | null,
): RejectionDisplay {
  if (!record)
    return { reasonState: 'unavailable', reason: 'النتيجة غير متاحة', reasonDetail: null };
  if (!['refused', 'partial'].includes(record.outcome ?? ''))
    return { reasonState: 'not-applicable', reason: 'لا ينطبق سبب الرفض', reasonDetail: null };
  if (!record.rejection)
    return {
      reasonState: record.recordVersion === '2.0.0' ? 'unavailable' : 'legacy',
      reason: 'سبب الرفض غير متاح في السجل التاريخي',
      reasonDetail: null,
    };
  const r = record.rejection;
  if (r.catalogVersion !== '1.0.0' || !Object.hasOwn(rejectionLabels, r.code))
    return {
      reasonState: 'unknown-code',
      reason: 'رمز سبب غير معروف — يحتاج إلى مراجعة',
      reasonDetail: null,
    };
  return {
    reasonState: 'known',
    reason: rejectionLabels[r.code]!,
    reasonDetail: r.code === 'other' ? (r.detail ?? null) : null,
  };
}
