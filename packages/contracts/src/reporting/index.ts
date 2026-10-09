import AjvModule from 'ajv';
import formatsModule from 'ajv-formats';
import {
  profitCategoryLabels,
  profitCategories,
  economicEffectSchema,
  profitSummarySchema,
  profitSourceIssueSchema,
  profitActualMoneySchema,
  profitReconciliationFindingSchema,
  type EconomicEffect,
  type ProfitSummary,
  type ProfitActualMoney,
  type ProfitReconciliationFinding,
} from './profit.js';
export * from './profit.js';

export const reportIds = [
  'REP-01',
  'REP-05',
  'REP-07',
  'REP-08',
  'REP-09',
  'REP-10',
  'REP-12',
  'REP-14',
  'REP-15',
  'REP-18',
] as const;
export type ReportId = (typeof reportIds)[number];
const reportTextLabels: Record<string, string> = {
  brand_packed: 'مغلف من البراند',
  company_packed: 'تغليف الشركة',
  stored_stock: 'من مخزون البراند',
  active: 'نشط',
  cancelled: 'ملغى',
  local: 'محلي',
  driver: 'السائق',
  transfer: 'نقل داخلي',
  recipient: 'المستلم',
  branch: 'الفرع',
  unknown: 'غير معلوم',
  full: 'تسليم كامل',
  partial: 'تسليم جزئي',
  refused: 'رفض',
  'no-answer': 'دون رد',
  open: 'مفتوحة',
  closed: 'مغلقة',
  visit: 'زيارة فعلية',
  round: 'جولة',
  internal_transfer: 'نقل داخلي',
  cash: 'نقدي',
  bank_deposit: 'إيداع بنكي',
  instapay: 'إنستاباي',
  sound: 'سليم',
  damaged: 'تالف',
  eligible: 'مؤهل',
  held: 'محجوز',
  pending: 'معلق',
  empty: 'دون مستحق',
  goods: 'متحصل البضاعة',
  fee: 'رسوم',
  compensation: 'تعويض',
  adjustment: 'تعديل',
  correction: 'تصحيح',
  payout: 'صرف البراند',
  general: 'تمويل / حركة عامة',
  treasury_send: 'إرسال تحويل داخلي',
  treasury_receive: 'استلام تحويل داخلي',
  expense: 'مصروف مدفوع',
  remittance: 'توريد السائق',
  prepared: 'مجهز',
  in_transit: 'في الطريق',
  opening: 'رصيد افتتاحي',
  brand_payout: 'صرف البراند',
  parcel: 'طرد مغلق',
  stock: 'قطع مخزون',
};
export function reportDisplayText(key: string, value: string) {
  if (key === 'category' && profitCategories.includes(value as never))
    return profitCategoryLabels[value as keyof typeof profitCategoryLabels];
  if (key === 'weekdays') {
    try {
      const days = JSON.parse(value) as number[];
      return days
        .map(
          (d) =>
            ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d] ??
            'غير معلوم',
        )
        .join('، ');
    } catch {
      return value;
    }
  }
  if (key === 'payoutExtent') return value === 'full' ? 'كامل' : 'جزئي';
  return ['service', 'status', 'execution', 'custody', 'kind', 'method', 'condition'].includes(key)
    ? (reportTextLabels[value] ?? value)
    : value;
}
export type ReportFilterKey =
  | 'branchIds'
  | 'brandIds'
  | 'driverIds'
  | 'accountIds'
  | 'categoryIds'
  | 'services'
  | 'statuses'
  | 'methods'
  | 'governorateIds'
  | 'areaIds'
  | 'conditions'
  | 'kinds'
  | 'from'
  | 'to'
  | 'search'
  | 'minMinor'
  | 'maxMinor'
  | 'dateBasis';
export interface ReportFilters {
  branchIds?: string[];
  brandIds?: string[];
  driverIds?: string[];
  accountIds?: string[];
  categoryIds?: string[];
  services?: string[];
  statuses?: string[];
  methods?: string[];
  governorateIds?: string[];
  areaIds?: string[];
  conditions?: string[];
  kinds?: string[];
  from?: string;
  to?: string;
  search?: string;
  minMinor?: string;
  maxMinor?: string;
  dateBasis?: string;
}
export interface ReportColumn {
  key: string;
  title: string;
  type: 'text' | 'money' | 'quantity' | 'date';
  total?: boolean;
}
export interface ReportDefinition {
  id: ReportId;
  title: string;
  surface: string;
  scope: 'assigned' | 'wallet';
  capabilities: string[];
  filters: ReportFilterKey[];
  dateBases: string[];
  dateMeaning: string;
  formula: string;
  columns: ReportColumn[];
  sorts: readonly ['dateAsc', 'dateDesc'];
}
const col = (
  key: string,
  title: string,
  type: ReportColumn['type'] = 'text',
  total = false,
): ReportColumn => ({ key, title, type, ...(total ? { total } : {}) });
const common = [col('branch', 'الفرع'), col('brand', 'البراند')];
const dates = [
  col('date', 'التاريخ الفعلي / الفعال', 'date'),
  col('recordedAt', 'وقت التسجيل', 'date'),
];
const moneyFilters: ReportFilterKey[] = ['minMinor', 'maxMinor'];
const range: ReportFilterKey[] = ['from', 'to', 'dateBasis'];
const spec = (d: Omit<ReportDefinition, 'sorts'>): ReportDefinition => ({
  ...d,
  sorts: ['dateAsc', 'dateDesc'],
});
export const reportRegistry: readonly ReportDefinition[] = [
  spec({
    id: 'REP-01',
    title: 'سجل الشحنات',
    surface: '/reports/REP-01',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: [
      'branchIds',
      'brandIds',
      'services',
      'statuses',
      'governorateIds',
      'areaIds',
      'search',
      ...range,
    ],
    dateBases: ['created', 'lastState'],
    dateMeaning: 'إنشاء الشحنة أو آخر واقعة مسجلة؛ التوقيت بتوقيت القاهرة',
    formula: 'شحنة واحدة لكل هوية؛ حالة العمل والتنفيذ والعهدة مستقلة',
    columns: [
      col('reference', 'رقم الشحنة'),
      ...common,
      col('recipient', 'المستلم'),
      col('phone', 'الهاتف'),
      col('service', 'الخدمة'),
      col('status', 'حالة العمل'),
      col('execution', 'التنفيذ'),
      col('custody', 'العهدة'),
      col('custodyBranch', 'فرع العهدة الحالي'),
      col('originalOutcome', 'أول نتيجة مصدر'),
      col('effectiveOutcome', 'النتيجة الفعالة'),
      col('tier', 'الشريحة المتفق عليها'),
      col('tariffMinor', 'التعريفة المحفوظة EGP', 'money'),
      col('tariffRevision', 'هوية / مراجعة التعريفة'),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-05',
    title: 'نشاط السائقين والجولات',
    surface: '/reports/REP-05',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: ['branchIds', 'brandIds', 'driverIds', 'statuses', 'kinds', ...range],
    dateBases: ['visit', 'round'],
    dateMeaning: 'الزيارة الفعلية أو بداية الجولة؛ الجولة العابرة لمنتصف الليل لا تنقسم',
    formula:
      'زيارة واحدة لكل هوية وصول مثبتة؛ الجولة والنقل الداخلي سجلان مستقلان ولا يعني إغلاق الجولة تسليم كل الشحنات',
    columns: [
      col('kind', 'نوع العمل'),
      col('reference', 'المرجع'),
      ...common,
      col('driver', 'السائق'),
      col('status', 'الحالة'),
      col('visits', 'زيارات مثبتة', 'quantity', true),
      col('shipments', 'شحنات مرتبطة', 'quantity'),
      col('endAt', 'نهاية الجولة', 'date'),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-07',
    title: 'المرتجعات وتسليم البراند',
    surface: '/reports/REP-07',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: ['branchIds', 'brandIds', 'driverIds', 'conditions', ...range, 'search'],
    dateBases: ['receipt', 'offered'],
    dateMeaning: 'وقت الاستلام الفعلي؛ غير المستلم له تاريخ استلام مجهول ويمكن عرضه بتاريخ العرض',
    formula: 'المعروض ≠ المستلم؛ الاستلام حسب الحالة وتسليم البراند حقائق مستقلة',
    columns: [
      col('reference', 'الشحنة'),
      ...common,
      col('offered', 'معروض', 'quantity', true),
      col('received', 'مستلم فعلياً', 'quantity', true),
      col('sound', 'سليم', 'quantity', true),
      col('damaged', 'تالف / غير مؤكد', 'quantity', true),
      col('handed', 'مسلم للبراند', 'quantity', true),
      col('handoverAt', 'آخر تسليم للبراند', 'date'),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-08',
    title: 'كشف حساب البراند',
    surface: '/reports/REP-08',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: ['branchIds', 'brandIds', 'kinds', 'search', ...range, ...moneyFilters],
    dateBases: ['effective', 'recorded'],
    dateMeaning: 'تاريخ الحركة الفعال أو وقت تسجيلها؛ الرصيد الافتتاحي والختامي بنفس نطاق الفروع',
    formula:
      'الافتتاحي + الحركات الموقعة = الختامي؛ الائتمان والرسوم والتعويض والتعديل والصرف محفوظة بمصادرها',
    columns: [
      col('kind', 'نوع الحركة'),
      ...common,
      col('amountMinor', 'الحركة EGP', 'money', true),
      col('balanceMinor', 'الرصيد بعد الحركة EGP', 'money'),
      col('reason', 'السبب'),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-09',
    title: 'المستحق المؤهل وجدول الصرف',
    surface: '/brand-payouts',
    scope: 'wallet',
    capabilities: ['reports', 'brand.payout'],
    filters: ['brandIds', 'search', 'statuses'],
    dateBases: ['current'],
    dateMeaning: 'المستحق الحالي وقت اللقطة؛ أيام الصرف المتفق عليها',
    formula: 'المؤهل للصرف = max(0, E − D − H − C)؛ المعلق مستقل؛ الصرف استهلك الدفعات بالفعل',
    columns: [
      col('brand', 'البراند'),
      col('weekdays', 'أيام الصرف'),
      col('signedMinor', 'استحقاق موقع EGP', 'money', true),
      col('pendingMinor', 'معلق EGP', 'money', true),
      col('heldMinor', 'محجوز للمراجعة EGP', 'money', true),
      col('coverMinor', 'غطاء الشحن EGP', 'money', true),
      col('eligibleMinor', 'مؤهل للصرف EGP', 'money', true),
      col('paidMinor', 'صرف فعلي تراكمي EGP', 'money', true),
    ],
  }),
  spec({
    id: 'REP-10',
    title: 'تاريخ صرف البراند',
    surface: '/brand-payouts',
    scope: 'wallet',
    capabilities: ['reports', 'brand.payout'],
    filters: ['brandIds', 'branchIds', 'methods', 'search', ...range, ...moneyFilters],
    dateBases: ['actual', 'recorded'],
    dateMeaning: 'تاريخ الصرف الفعلي؛ الفرع هو الفرع الدافع داخل نطاق محفظة البراند المشترك',
    formula: 'كل صرف فعلي كامل أو جزئي مرة واحدة بهوية الصرف ومصدره',
    columns: [
      col('reference', 'مرجع الصرف'),
      ...common,
      col('account', 'الحساب الدافع'),
      col('payoutExtent', 'كامل / جزئي من المؤهل وقت الصرف'),
      col('method', 'الطريقة'),
      col('amountMinor', 'صرف EGP', 'money', true),
      col('reason', 'سبب خارج الموعد'),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-12',
    title: 'حركة النقدية والبنوك',
    surface: '/reports/REP-12',
    scope: 'assigned',
    capabilities: ['reports', 'finance.accounts'],
    filters: ['branchIds', 'accountIds', 'methods', 'kinds', 'search', ...range, ...moneyFilters],
    dateBases: ['actual', 'recorded'],
    dateMeaning:
      'تاريخ الحركة الفعلي أو وقت التسجيل؛ الأرصدة الحالية والعابر والملاحظات منفصلة عن فترة الحركات',
    formula: 'الحركات الموقعة من سجل النقدية؛ الإيداع العام والتحويل الداخلي ليسا إيراداً',
    columns: [
      col('account', 'الحساب'),
      col('branch', 'فرع الحركة'),
      col('kind', 'مصدر الحركة'),
      col('method', 'الطريقة'),
      col('amountMinor', 'حركة EGP', 'money', true),
      col('reason', 'الوصف'),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-14',
    title: 'المصروفات المدفوعة',
    surface: '/reports/REP-14',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: [
      'branchIds',
      'accountIds',
      'categoryIds',
      'methods',
      'search',
      ...range,
      ...moneyFilters,
    ],
    dateBases: ['actual', 'recorded'],
    dateMeaning: 'تاريخ الدفع الفعلي بما فيه القيد المتأخر أو وقت التسجيل',
    formula: 'مجموع المصروفات المدفوعة فعلياً بهوية المصروف؛ لا التزامات غير مدفوعة',
    columns: [
      col('branch', 'الفرع'),
      col('category', 'الفئة التاريخية'),
      col('account', 'الحساب'),
      col('method', 'الطريقة'),
      col('description', 'الوصف'),
      col('amountMinor', 'مصروف EGP', 'money', true),
      ...dates,
      col('actor', 'مسجل الدفع'),
    ],
  }),
  spec({
    id: 'REP-15',
    title: 'الربح التشغيلي',
    surface: '/reports/REP-15',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: ['branchIds', ...range],
    dateBases: ['effective', 'recorded'],
    dateMeaning: 'فترة الاستحقاق التشغيلي أو وقت التسجيل بتوقيت القاهرة؛ الأرصدة الحالية منفصلة',
    formula:
      'الشحن والتغليف − إعفاء البديل + كامل التخزين عند بداية الفترة − استحقاق الموظفين بعد خصم الاستحقاق وقبل السلف − المصروف المدفوع − التعويض + حصة الموظف مرة واحدة. المصروف غير المدفوع الذي لم يدخل غير مشمول؛ لا إقفال محاسبي.',
    columns: [
      col('category', 'الفئة الاقتصادية'),
      col('branch', 'الفرع التاريخي'),
      col('amountMinor', 'الأثر في الربح EGP', 'money', true),
      ...dates,
    ],
  }),
  spec({
    id: 'REP-18',
    title: 'متابعة المخزون والعهدة',
    surface: '/reports/REP-18',
    scope: 'assigned',
    capabilities: ['reports'],
    filters: ['branchIds', 'brandIds', 'conditions', 'search'],
    dateBases: ['current'],
    dateMeaning: 'المخزون الحالي وقت اللقطة؛ ليس مجموع حركات فترة',
    formula:
      'المتاح = max(0, السليم − الحجز النشط)؛ محتويات الشحنة المجهزة تبقى بنفس حجز الطلب؛ العابر مستقل وغير متاح للوجهة',
    columns: [
      col('kind', 'نوع العهدة'),
      col('reference', 'منتج / شحنة'),
      ...common,
      col('onHand', 'بالفرع', 'quantity', true),
      col('reserved', 'محجوز', 'quantity', true),
      col('available', 'متاح', 'quantity', true),
      col('unavailable', 'غير متاح', 'quantity', true),
      col('carrier', 'عابر / مع السائق', 'quantity', true),
    ],
  }),
];
export const reportDefinition = (id: ReportId) => reportRegistry.find((r) => r.id === id)!;
export interface ReportRow {
  ordinal?: number;
  economicEffect?: EconomicEffect;
  id: string;
  values: Record<string, string | null>;
  sourceIds: string[];
  revision: string;
  effectiveAt: string | null;
  recordedAt: string | null;
  detail: string | null;
}
export interface ReportSnapshot {
  id: string;
  reportId: ReportId;
  companyName: string;
  asOf: string;
  filterDigest: string;
  dataDigest: string;
  filters: ReportFilters;
  sort: 'dateAsc' | 'dateDesc';
  dateBasis: string;
  scope: {
    branchIds: string[];
    authorizationRevision: string;
    completeCompany: boolean;
    policy: 'assigned' | 'wallet';
  };
  totalRows: number;
  totals: Record<string, string>;
  context: Record<string, unknown>;
  coverage: { complete: boolean; flags: string[]; revisions: unknown[] };
}
export interface ReportPage {
  filteredTotalRows?: number;
  snapshot: ReportSnapshot;
  rows: ReportRow[];
  page: number;
  limit: number;
}
/** Human context uses the same frozen values; canonical raw context remains in the source workbook. */
export function reportContextDisplay(snapshot: ReportSnapshot) {
  const c = snapshot.context;
  const lines: string[] = [];
  const amount = (value: unknown) => {
    const n = BigInt(String(value ?? '0')),
      a = n < 0n ? -n : n;
    return `${n < 0n ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')} ج.م`;
  };
  const entries = (value: unknown) => Object.entries((value ?? {}) as Record<string, unknown>);
  const records = (value: unknown) => (value ?? []) as Record<string, unknown>[];
  const accountNames = new Map(
    records(c['accounts']).map((a) => [String(a['id']), String(a['name'])]),
  );
  for (const [key, label] of [
    ['openingByBrand', 'افتتاحي البراند'],
    ['closingByBrand', 'ختامي البراند'],
    ['openingByAccount', 'افتتاحي الحساب'],
    ['closingByAccount', 'ختامي الحساب'],
  ])
    for (const [id, value] of entries(c[key!]))
      lines.push(`${label}: ${accountNames.get(id) ?? id} · ${amount(value)}`);
  for (const a of records(c['accounts']))
    lines.push(
      `${a['name']} · الرصيد الفعلي ${amount(a['bookMinor'])} · المحجوز ${amount(a['heldMinor'])} · المتاح ${amount(a['availableMinor'])}`,
    );
  if ('transit' in c && !records(c['transit']).length)
    lines.push('لا توجد تحويلات نقدية معلقة في الطريق ضمن النطاق');
  for (const t of records(c['transit']))
    lines.push(
      `تحويل في الطريق: ${t['sourceAccount']} ← ${t['destinationAccount']} · ${amount(t['amountMinor'])} · ${t['sentAt']}`,
    );
  if ('discrepancies' in c && !records(c['discrepancies']).length)
    lines.push('لا توجد فروق حسابات قيد المراجعة ضمن النطاق');
  for (const d of records(c['discrepancies']))
    lines.push(
      `فرق قيد المراجعة: ${d['account']} · الفعلي المسجل وقت الملاحظة ${amount(d['bookAtObservationMinor'])} · المبلغ المشاهد ${amount(d['observedMinor'])} · الفرق ${amount(d['differenceMinor'])} · المحجوز ${amount(d['heldMinor'])} · ${d['actualDate']} · مصدر ${d['caseId']}`,
    );
  for (const b of records(c['branchWallets']))
    lines.push(
      `البراند ${b['brandId']} · ${b['branchName']} · مؤهل قبل الحجز ${amount(b['eligibleMinor'])} · معلق ${amount(b['pendingMinor'])} · محجوز ${amount(b['heldMinor'])} · خصومات ${amount(b['debitsMinor'])} · تغطية شحن ${amount(b['coverMinor'])}`,
    );
  const quantities: Record<string, string> = {
    onHand: 'بالفرع',
    reserved: 'محجوز',
    available: 'متاح',
    unavailable: 'غير متاح',
    carrier: 'عابر / مع السائق',
  };
  for (const [key, label] of [
    ['stockTotals', 'القطع'],
    ['parcelTotals', 'الطرود المغلقة'],
  ]) {
    if (c[key!])
      lines.push(
        `${label}: ${entries(c[key!])
          .map(([k, v]) => `${quantities[k] ?? k} ${v}`)
          .join(' · ')}`,
      );
  }
  if (c['units']) lines.push(String(c['units']));
  if (c['walletScope']) lines.push('المحفظة المشتركة للبراند ضمن نطاق الشركة المالي المعتمد');
  if (c['filteredStatement'])
    lines.push('الحركات مقيدة بالفلاتر؛ الختامي المعروض مشتق من الافتتاحي والحركات المختارة');
  if (c['profit']) {
    const p = c['profit'] as ProfitSummary;
    lines.push(
      `${p.calculationComplete ? 'الربح التشغيلي' : 'النتيجة المعروفة الجزئية'}: ${amount(p.profitMinor)}`,
    );
    for (const cat of p.categories)
      lines.push(
        `${profitCategoryLabels[cat.category]}: ${amount(cat.amountMinor)} · ${cat.sourceCount} مصدر`,
      );
    for (const b of p.branches) lines.push(`${b.branchName}: ${amount(b.profitMinor)}`);
    for (const [key, label] of Object.entries({
      salaryMinor: 'الراتب',
      commissionMinor: 'العمولة',
      additionsMinor: 'الإضافات',
      entitlementDeductionsMinor: 'خصم الاستحقاق',
      employeeCostMinor: 'تكلفة الموظف',
      advanceRecoveryMinor: 'استرداد السلف',
      incidentRecoveryWithheldMinor: 'استرداد الحادث عبر الرواتب',
      payoutMinor: 'صافي دفع الرواتب الفعلي',
    }))
      lines.push(`${label}: ${amount(p.payroll[key as keyof typeof p.payroll])}`);
    if (p.laterEntryCount)
      lines.push(`قيود مسجلة بعد فترة استحقاقها: ${p.laterEntryCount}؛ اللقطات السابقة ثابتة.`);
    lines.push(...p.limitations);
  }
  if (c['actualMoney']) {
    const m = c['actualMoney'] as ProfitActualMoney;
    lines.push(`المال الفعلي والالتزامات الحالية وقت اللقطة ${m.asOf}`);
    for (const a of m.accounts)
      lines.push(
        `${a.name}: الفعلي ${amount(a.bookMinor)} · السجل ${amount(a.journalMinor)} · المحجوز ${amount(a.heldMinor)} · المتاح ${amount(a.availableMinor)}`,
      );
    for (const [key, label] of Object.entries({
      fundsInTransitMinor: 'المال في الطريق',
      heldDiscrepanciesMinor: 'فروق محجوزة',
      unremittedRecipientMinor: 'غير مورد من المستلمين',
      brandLiabilitiesMinor: 'التزامات البراند',
      brandPendingMinor: 'معلق للبراند',
      brandHeldMinor: 'محجوز للبراند',
      storageDueMinor: 'مستحق التخزين',
      storageCreditMinor: 'ائتمان التخزين',
    })) {
      const v = m[key as keyof typeof m];
      lines.push(`${label}: ${v === null ? 'غير معلوم / محجوب' : amount(v)}`);
    }
    lines.push(...m.notes);
  }
  for (const finding of (c['reconciliation'] ?? []) as ProfitReconciliationFinding[])
    lines.push(
      `${finding.message} · الفرق ${finding.deltaMinor === null ? 'غير معلوم' : amount(finding.deltaMinor)} · النسخة ${finding.observedVersion} · ${finding.asOf}`,
    );
  return lines;
}
export interface ReportCommand {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  type: 'report.snapshot';
  reportId: ReportId;
  filters: ReportFilters;
  sort: 'dateAsc' | 'dateDesc';
}
export interface ExportCommand {
  schemaVersion: 1;
  commandId: string;
  companyId: string;
  type: 'report.export';
  snapshotId: string;
  filterDigest: string;
  format: 'xlsx' | 'pdf';
}
export interface ExportJob {
  id: string;
  snapshotId: string;
  format: 'xlsx' | 'pdf';
  state: 'pending' | 'running' | 'completed' | 'failed' | 'expired';
  attempts: number;
  error: string | null;
  artifactId: string | null;
  expiresAt: string;
  downloadUrl: string | null;
}
const uuid = { type: 'string', format: 'uuid' };
const strings = {
  type: 'array',
  maxItems: 50,
  uniqueItems: true,
  items: { type: 'string', minLength: 1, maxLength: 80 },
};
const ids = { ...strings, items: uuid };
const filterProperties = Object.fromEntries(
  [
    'branchIds',
    'brandIds',
    'driverIds',
    'accountIds',
    'categoryIds',
    'governorateIds',
    'areaIds',
  ].map((k) => [k, ids]),
);
export const reportFiltersSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...filterProperties,
    ...Object.fromEntries(
      ['services', 'statuses', 'methods', 'conditions', 'kinds'].map((k) => [k, strings]),
    ),
    from: { type: 'string', format: 'date' },
    to: { type: 'string', format: 'date' },
    search: { type: 'string', maxLength: 180 },
    dateBasis: { type: 'string', maxLength: 30 },
    minMinor: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
    maxMinor: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' },
  },
};
const base = { schemaVersion: { const: 1 }, commandId: uuid, companyId: uuid };
export const reportCommandSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(base), 'type', 'reportId', 'filters', 'sort'],
  properties: {
    ...base,
    type: { const: 'report.snapshot' },
    reportId: { enum: reportIds },
    filters: reportFiltersSchema,
    sort: { enum: ['dateAsc', 'dateDesc'] },
  },
};
export const exportCommandSchema = {
  type: 'object',
  additionalProperties: false,
  required: [...Object.keys(base), 'type', 'snapshotId', 'filterDigest', 'format'],
  properties: {
    ...base,
    type: { const: 'report.export' },
    snapshotId: uuid,
    filterDigest: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    format: { enum: ['xlsx', 'pdf'] },
  },
};
const Ajv = AjvModule as unknown as typeof AjvModule.default;
const formats = formatsModule as unknown as typeof formatsModule.default;
const ajv = new Ajv({ allErrors: true, strict: true });
formats(ajv);
export const validateReportCommand = ajv.compile<ReportCommand>(reportCommandSchema);
export const validateExportCommand = ajv.compile<ExportCommand>(exportCommandSchema);

const closed = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const text = { type: 'string' },
  nullableText = { type: ['string', 'null'] },
  dateTime = { type: 'string', format: 'date-time' },
  nullableDateTime = { type: ['string', 'null'], format: 'date-time' };
const hash = { type: 'string', pattern: '^[a-f0-9]{64}$' },
  integer = { type: 'integer', minimum: 0, maximum: 9007199254740991 },
  boolean = { type: 'boolean' };
const minorText = { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' };
const dictionary = { type: 'object', additionalProperties: minorText };
const array = (items: unknown) => ({ type: 'array', items });
const valueKeys = [...new Set(reportRegistry.flatMap((d) => d.columns.map((c) => c.key)))];
export const reportRowSchema = closed(
  {
    ordinal: { ...integer, minimum: 1 },
    economicEffect: economicEffectSchema,
    id: text,
    values: closed(Object.fromEntries(valueKeys.map((k) => [k, nullableText])), []),
    sourceIds: array(text),
    revision: text,
    effectiveAt: nullableDateTime,
    recordedAt: nullableDateTime,
    detail: nullableText,
  },
  ['id', 'values', 'sourceIds', 'revision', 'effectiveAt', 'recordedAt', 'detail'],
);
const checkpoint = closed({
  source_id: uuid,
  aggregate_type: text,
  aggregate_id: uuid,
  revision: minorText,
  received_high: minorText,
  received_through: minorText,
  applied_through: minorText,
  history_complete: boolean,
  financial_ready: boolean,
  gapped: boolean,
  updated_at: dateTime,
});
const scopeSchema = closed({
  branchIds: array(uuid),
  authorizationRevision: text,
  completeCompany: boolean,
  policy: { enum: ['assigned', 'wallet'] },
});
const contextSchema = closed(
  {
    profit: profitSummarySchema,
    actualMoney: profitActualMoneySchema,
    sourceIssues: array(profitSourceIssueSchema),
    reconciliation: array(profitReconciliationFindingSchema),
    walletScope: text,
    period: text,
    openingByBrand: dictionary,
    closingByBrand: dictionary,
    openingByAccount: dictionary,
    closingByAccount: dictionary,
    branchWallets: array(
      closed({
        brandId: uuid,
        branchId: { type: ['string', 'null'], format: 'uuid' },
        branchName: text,
        eligibleMinor: minorText,
        pendingMinor: minorText,
        heldMinor: minorText,
        debitsMinor: minorText,
        coverMinor: minorText,
      }),
    ),
    filteredStatement: boolean,
    units: text,
    stockTotals: dictionary,
    parcelTotals: dictionary,
    accounts: array(
      closed({
        id: uuid,
        name: text,
        bookMinor: minorText,
        heldMinor: minorText,
        availableMinor: minorText,
      }),
    ),
    transit: array(
      closed({
        id: uuid,
        sourceAccount: text,
        destinationAccount: text,
        amountMinor: minorText,
        sentAt: dateTime,
      }),
    ),
    discrepancies: array(
      closed({
        caseId: uuid,
        account: text,
        bookAtObservationMinor: minorText,
        observedMinor: minorText,
        differenceMinor: minorText,
        heldMinor: minorText,
        actualDate: { type: 'string', format: 'date' },
      }),
    ),
  },
  [],
);
export const reportSnapshotSchema = closed({
  id: uuid,
  reportId: { enum: reportIds },
  companyName: text,
  asOf: dateTime,
  filterDigest: hash,
  dataDigest: hash,
  filters: reportFiltersSchema,
  sort: { enum: ['dateAsc', 'dateDesc'] },
  dateBasis: text,
  scope: scopeSchema,
  totalRows: integer,
  totals: dictionary,
  context: contextSchema,
  coverage: closed({ complete: boolean, flags: array(text), revisions: array(checkpoint) }),
});
export const reportPageSchema = closed(
  {
    filteredTotalRows: integer,
    snapshot: reportSnapshotSchema,
    rows: array(reportRowSchema),
    page: { ...integer, minimum: 1 },
    limit: { enum: [25, 50, 100] },
  },
  ['snapshot', 'rows', 'page', 'limit'],
);
export const exportJobSchema = closed({
  id: uuid,
  snapshotId: uuid,
  format: { enum: ['xlsx', 'pdf'] },
  state: { enum: ['pending', 'running', 'completed', 'failed', 'expired'] },
  attempts: integer,
  error: nullableText,
  artifactId: { type: ['string', 'null'], format: 'uuid' },
  expiresAt: dateTime,
  downloadUrl: nullableText,
});
const option = closed({ id: uuid, name: text });
const definitionSchema = closed({
  id: { enum: reportIds },
  title: text,
  surface: text,
  scope: { enum: ['assigned', 'wallet'] },
  capabilities: array(text),
  filters: array(text),
  dateBases: array(text),
  dateMeaning: text,
  formula: text,
  columns: array(
    closed(
      {
        key: text,
        title: text,
        type: { enum: ['text', 'money', 'quantity', 'date'] },
        total: boolean,
      },
      ['key', 'title', 'type'],
    ),
  ),
  sorts: array(text),
});
export const reportCatalogSchema = closed({
  reports: array(definitionSchema),
  branches: array(option),
  companyBranches: array(option),
  brands: array(option),
  drivers: array(option),
  accounts: array(option),
  references: array(closed({ id: uuid, name: text, kind: text })),
});
export const reportingErrorSchema = closed(
  { code: text, messageKey: text, correlationId: uuid, commandId: uuid, currentVersion: integer },
  ['code', 'messageKey', 'correlationId'],
);
export const reportingResponseValidators = {
  catalog: ajv.compile(reportCatalogSchema),
  page: ajv.compile<ReportPage>(reportPageSchema),
  row: ajv.compile<ReportRow>(reportRowSchema),
  job: ajv.compile<ExportJob>(exportJobSchema),
};

const parameter = (name: string, schema: object, location = 'query', required = true) => ({
  name,
  in: location,
  required,
  schema,
});
const jsonContent = (schema: unknown) => ({ 'application/json': { schema } });
export const reportingPaths = Object.fromEntries(
  [
    ['catalog', 'get', 'erp.reports.catalog', reportCatalogSchema, null],
    ['snapshots', 'post', 'erp.reports.snapshot', reportPageSchema, reportCommandSchema],
    ['snapshots/{id}', 'get', 'erp.reports.page', reportPageSchema, null],
    ['snapshots/{id}/rows/{ordinal}', 'get', 'erp.reports.row', reportRowSchema, null],
    ['snapshots/{id}/category/{category}', 'get', 'erp.reports.category', reportPageSchema, null],
    ['exports', 'post', 'erp.reports.export', exportJobSchema, exportCommandSchema],
    ['exports/{id}', 'get', 'erp.reports.exportJob', exportJobSchema, null],
    [
      'exports/{id}/download',
      'get',
      'erp.reports.download',
      { type: 'string', format: 'binary' },
      null,
    ],
    ['commands/{id}', 'get', 'erp.reports.recover', exportJobSchema, null],
  ].map(([path, method, operationId, schema, body]) => {
    const route = String(path);
    const parameters: unknown[] = body ? [] : [parameter('companyId', uuid)];
    if (route.includes('{id}')) parameters.push(parameter('id', uuid, 'path'));
    if (route.includes('{ordinal}'))
      parameters.push(parameter('ordinal', { type: 'integer', minimum: 1 }, 'path'));
    if (route.includes('{category}'))
      parameters.push(parameter('category', { enum: profitCategories }, 'path'));
    if (route === 'snapshots/{id}' || route.includes('{category}'))
      parameters.push(
        parameter('page', { type: 'integer', minimum: 1 }, 'query', false),
        parameter('limit', { enum: [25, 50, 100] }, 'query', false),
      );
    const download = route.endsWith('/download');
    return [
      '/api/v1/reports/' + route,
      {
        [String(method)]: {
          operationId,
          security: [{ erpSession: [], ...(body ? { csrfToken: [] } : {}) }],
          parameters,
          ...(body ? { requestBody: { required: true, content: jsonContent(body) } } : {}),
          responses: {
            ...(route === 'exports'
              ? {
                  '202': {
                    description: 'Retained export intent queued; file is not yet available',
                    content: jsonContent(exportJobSchema),
                  },
                }
              : {}),
            '200': {
              description: download
                ? 'Nonpublic authorized unexpired XLSX/PDF bytes'
                : 'Authorized materialized snapshot or retained export identity',
              content: download
                ? {
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema },
                    'application/pdf': { schema },
                  }
                : jsonContent(schema),
            },
            ...Object.fromEntries(
              [400, 401, 403, 404, 409, 410, 413, 500, 503].map((status) => [
                status,
                {
                  description:
                    'Closed validation, authority, identity, expiry or retry error; no phantom download',
                  content: jsonContent(reportingErrorSchema),
                },
              ]),
            ),
          },
        },
      },
    ];
  }),
);
