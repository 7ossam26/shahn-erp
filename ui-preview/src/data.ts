// Design-review fixtures only. These local IDs and states are not Tawsel contracts.
export type BranchId = "cairo" | "giza" | "alexandria";
export type ShipmentState =
  | "available"
  | "preparing"
  | "in_transfer"
  | "received"
  | "out_for_delivery"
  | "delivered"
  | "return_pending"
  | "damaged";
export type ShipmentService = "ready" | "packing" | "stock";
export type Tone = "lime" | "amber" | "blue" | "rose" | "neutral";

export interface Branch {
  id: BranchId;
  name: string;
  shortName: string;
}

export interface ModuleCard {
  id: string;
  title: string;
  description: string;
  count: string;
  tone: Tone;
}

export interface ShipmentItem {
  name: string;
  variant: string;
  quantity: number;
  unitPrice: number;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  at: string;
  status: "done" | "current";
  actor: string;
}

export interface Shipment {
  id: string;
  brand: string;
  customer: string;
  phone: string;
  address: string;
  governorate: string;
  area: string;
  branchId: BranchId | null;
  originBranchId: BranchId;
  destinationBranchId?: BranchId;
  custodian: string;
  location: string;
  state: ShipmentState;
  stateLabel: string;
  tone: Tone;
  service: ShipmentService;
  serviceLabel: string;
  pieces: number;
  goodsValue: number;
  baseShipping: number;
  packing: number;
  // Expected recipient payment at delivery; not current debt or payout eligibility.
  recipientDue: number;
  recipientPaymentLabel: string;
  recipientPaymentStatus: "expected" | "reported" | "none";
  updatedAt: string;
  createdAt: string;
  items: ShipmentItem[];
  timeline: TimelineEvent[];
  nextAction: string;
  transferId?: string;
  note?: string;
}

export interface StockItem {
  id: string;
  brand: string;
  name: string;
  variant: string;
  branchId: BranchId;
  // On-hand includes reserved and damaged quantities, each disjoint here.
  onHand: number;
  reserved: number;
  damaged: number;
  available: number;
  updatedAt: string;
}

export const branches: Branch[] = [
  { id: "cairo", name: "فرع القاهرة", shortName: "القاهرة" },
  { id: "giza", name: "فرع الجيزة", shortName: "الجيزة" },
  { id: "alexandria", name: "فرع الإسكندرية", shortName: "الإسكندرية" },
];

export const moduleCards: ModuleCard[] = [
  { id: "inventory", title: "المخزون والشحنات", description: "اعرف الموجود في كل فرع ومكان كل شحنة.", count: "12 شحنة · 6 أصناف", tone: "lime" },
  { id: "transfers", title: "نقل بين الفروع", description: "إرسال نقلة وتأكيد استلامها في الفرع التاني.", count: "نقلة واحدة في الطريق", tone: "blue" },
  { id: "brands", title: "البراندات", description: "بيانات البراند والخدمات والأسعار المتفق عليها.", count: "4 براندات في العينة", tone: "neutral" },
  { id: "money", title: "الخزائن والفلوس", description: "توريد المندوبين وتحصيل البراندات والمصروفات.", count: "ضمن التصميم القادم", tone: "neutral" },
  { id: "people", title: "الموظفين", description: "المرتبات والعمولات والسلف والخصومات.", count: "ضمن التصميم القادم", tone: "neutral" },
  { id: "reports", title: "التقارير", description: "تابع الإيرادات والمصروفات ونتيجة الشغل.", count: "ضمن التصميم القادم", tone: "neutral" },
];

const serviceLabels: Record<ShipmentService, string> = {
  ready: "شحنة جاهزة",
  packing: "تغليف وتوصيل",
  stock: "تجهيز من المخزون",
};

function event(
  id: string,
  title: string,
  description: string,
  location: string,
  at: string,
  actor: string,
  status: "done" | "current" = "done",
): TimelineEvent {
  return { id, title, description, location, at, actor, status };
}

function shipment(
  data: Omit<Shipment, "serviceLabel" | "goodsValue" | "pieces" | "recipientPaymentLabel">,
): Shipment {
  return {
    ...data,
    serviceLabel: serviceLabels[data.service],
    goodsValue: data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    pieces: data.items.reduce((sum, item) => sum + item.quantity, 0),
    recipientPaymentLabel: "المبلغ المطلوب من المستلم عند التوصيل",
  };
}

export const shipments: Shipment[] = [
  shipment({
    id: "10428", brand: "لِين", customer: "سارة محمود", phone: "01000000128",
    address: "شارع التحرير، الدقي، عمارة 18، الدور الثالث", governorate: "الجيزة", area: "الدقي",
    branchId: "giza", originBranchId: "cairo", destinationBranchId: "giza",
    custodian: "فرع الجيزة", location: "مخزون فرع الجيزة", state: "received", stateLabel: "تم الاستلام في الفرع", tone: "lime",
    service: "ready", baseShipping: 60, packing: 0, recipientDue: 510, recipientPaymentStatus: "expected",
    createdAt: "٢ أكتوبر ٢٠٢٦، ١٠:١٥ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ١٠:٤٠ ص",
    items: [{ name: "قميص قطن", variant: "أبيض · M", quantity: 1, unitPrice: 250 }, { name: "بنطلون قطن", variant: "بيج · M", quantity: 1, unitPrice: 200 }],
    transferId: "2084", nextAction: "موجودة في مخزون الجيزة؛ لم تُسلّم لمندوب توصيل بعد.",
    note: "المعاينة مسموحة قبل الاستلام.",
    timeline: [
      event("10428-1", "استلام الشحنة", "اتسجلت الشحنة الجاهزة من البراند، ٢ قطعة.", "فرع القاهرة", "٢ أكتوبر، ١٠:١٥ ص", "مريم أحمد"),
      event("10428-2", "تجهيز نقلة للجيزة", "اتضافت للنقلة 2084، وتم حجزها للنقل.", "فرع القاهرة", "٣ أكتوبر، ٨:٤٥ ص", "مريم أحمد"),
      event("10428-3", "تسليم الشحنة للمندوب", "تم تأكيد التسليم الفعلي لأحمد حسن للنقل بين الفروع.", "من القاهرة إلى الجيزة", "٣ أكتوبر، ٩:١٠ ص", "مريم أحمد"),
      event("10428-4", "استلام الشحنة في الجيزة", "تم تأكيد استلام الطرد بحالة خارجية سليمة، وتحديث مكانه بالمخزون.", "فرع الجيزة", "٣ أكتوبر، ١٠:٤٠ ص", "عمر علي", "current"),
    ],
  }),
  shipment({
    id: "10432", brand: "لِين", customer: "هنا إبراهيم", phone: "01000000132",
    address: "شارع مكرم عبيد، مدينة نصر، عمارة 12", governorate: "القاهرة", area: "مدينة نصر",
    branchId: "cairo", originBranchId: "cairo", custodian: "فرع القاهرة", location: "مخزون فرع القاهرة",
    state: "available", stateLabel: "جاهزة في الفرع", tone: "lime", service: "ready",
    baseShipping: 50, packing: 0, recipientDue: 300, recipientPaymentStatus: "expected",
    createdAt: "٣ أكتوبر ٢٠٢٦، ١١:٢٠ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ١١:٢٠ ص",
    items: [{ name: "قميص قطن", variant: "أبيض · L", quantity: 1, unitPrice: 250 }],
    nextAction: "جاهزة للتسليم لمندوب؛ لسه في عهدة الفرع.",
    timeline: [event("10432-1", "استلام الشحنة", "تم تسجيل واستلام طرد جاهز من البراند.", "فرع القاهرة", "٣ أكتوبر، ١١:٢٠ ص", "مريم أحمد", "current")],
  }),
  shipment({
    id: "10431", brand: "خطوة", customer: "محمد سامح", phone: "01000000131",
    address: "شارع عباس العقاد، مدينة نصر، عمارة 26", governorate: "القاهرة", area: "مدينة نصر",
    branchId: "cairo", originBranchId: "cairo", custodian: "فرع القاهرة", location: "منطقة التجهيز · القاهرة",
    state: "preparing", stateLabel: "قيد التجهيز", tone: "amber", service: "stock",
    baseShipping: 50, packing: 5, recipientDue: 475, recipientPaymentStatus: "expected",
    createdAt: "٣ أكتوبر ٢٠٢٦، ١٠:٥٠ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ١١:١٠ ص",
    items: [{ name: "حذاء رياضي", variant: "أسود · 42", quantity: 1, unitPrice: 420 }],
    nextAction: "مستني تأكيد انتهاء التجهيز قبل التسليم للمندوب.",
    timeline: [
      event("10431-1", "تأكيد الأوردر وحجز الكمية", "اتحجزت قطعة واحدة من ستوك البراند الموجود في الفرع.", "فرع القاهرة", "٣ أكتوبر، ١٠:٥٠ ص", "مريم أحمد"),
      event("10431-2", "بدأ تجهيز الشحنة", "القطعة لسه داخل الفرع ومحجوزة للأوردر.", "منطقة التجهيز · القاهرة", "٣ أكتوبر، ١١:١٠ ص", "كريم سعيد", "current"),
    ],
  }),
  shipment({
    id: "10430", brand: "نواة", customer: "أسماء خالد", phone: "01000000130",
    address: "شارع فيصل، محطة المساحة، عمارة 7", governorate: "الجيزة", area: "فيصل",
    branchId: null, originBranchId: "cairo", destinationBranchId: "giza",
    custodian: "محمود عادل · مندوب نقل", location: "في عهدة المندوب · القاهرة إلى الجيزة",
    state: "in_transfer", stateLabel: "نقل بين الفروع", tone: "blue", service: "packing",
    baseShipping: 50, packing: 5, recipientDue: 375, recipientPaymentStatus: "expected",
    createdAt: "٣ أكتوبر ٢٠٢٦، ٨:١٥ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ١١:٠٠ ص",
    items: [{ name: "طقم علب حفظ", variant: "٣ قطع · شفاف", quantity: 1, unitPrice: 320 }],
    transferId: "2085", nextAction: "مستنية استلام فرع الجيزة؛ غير متاحة في مخزون أي فرع حاليًا.",
    timeline: [
      event("10430-1", "استلام الأوردر", "تم استلام محتويات الأوردر من البراند للتغليف.", "فرع القاهرة", "٣ أكتوبر، ٨:١٥ ص", "مريم أحمد"),
      event("10430-2", "انتهاء التغليف", "تم تأكيد تجهيز الطرد للنقل.", "فرع القاهرة", "٣ أكتوبر، ٩:٣٥ ص", "كريم سعيد"),
      event("10430-3", "تسليم نقلة للجيزة", "استلم محمود عادل الطرد فعليًا ضمن النقلة 2085.", "من القاهرة إلى الجيزة", "٣ أكتوبر، ١١:٠٠ ص", "مريم أحمد", "current"),
    ],
  }),
  shipment({
    id: "10429", brand: "لِين", customer: "مينا نبيل", phone: "01000000129",
    address: "شارع جامعة الدول، المهندسين، عمارة 30", governorate: "الجيزة", area: "المهندسين",
    branchId: null, originBranchId: "giza", custodian: "أحمد حسن · مندوب توصيل", location: "في عهدة مندوب التوصيل",
    state: "out_for_delivery", stateLabel: "مع مندوب التوصيل", tone: "blue", service: "ready",
    baseShipping: 60, packing: 0, recipientDue: 560, recipientPaymentStatus: "expected",
    createdAt: "٢ أكتوبر ٢٠٢٦، ٣:٣٠ م", updatedAt: "٣ أكتوبر ٢٠٢٦، ٩:٢٠ ص",
    items: [{ name: "قميص قطن", variant: "كحلي · L", quantity: 2, unitPrice: 250 }],
    nextAction: "مستنية نتيجة محاولة التوصيل من Tawsel.",
    timeline: [
      event("10429-1", "استلام الشحنة", "تم تسجيل واستلام طرد جاهز من البراند.", "فرع الجيزة", "٢ أكتوبر، ٣:٣٠ م", "عمر علي"),
      event("10429-2", "تسليم لمندوب التوصيل", "تم تأكيد التسليم الفعلي لأحمد حسن.", "فرع الجيزة", "٣ أكتوبر، ٨:٥٠ ص", "عمر علي"),
      event("10429-3", "بدأت جولة التوصيل", "وردت بداية الجولة من Tawsel؛ لم ترد نتيجة للشحنة بعد.", "آخر معلومة مؤكدة: مع المندوب", "٣ أكتوبر، ٩:٢٠ ص", "Tawsel", "current"),
    ],
  }),
  shipment({
    id: "10427", brand: "بيت ومودة", customer: "نهى ياسر", phone: "01000000127",
    address: "شارع أبو قير، سموحة، عمارة 16", governorate: "الإسكندرية", area: "سموحة",
    branchId: "alexandria", originBranchId: "alexandria", custodian: "فرع الإسكندرية", location: "مخزون فرع الإسكندرية",
    state: "available", stateLabel: "جاهزة في الفرع", tone: "lime", service: "ready",
    baseShipping: 60, packing: 0, recipientDue: 0, recipientPaymentStatus: "none",
    createdAt: "٢ أكتوبر ٢٠٢٦، ٢:٤٠ م", updatedAt: "٢ أكتوبر ٢٠٢٦، ٢:٤٠ م",
    items: [{ name: "غطاء وسادة", variant: "بيج · 45×45", quantity: 2, unitPrice: 140 }],
    nextAction: "جاهزة للتوصيل. المستلم دافع للبراند شامل التوصيل.",
    note: "مفيش مبلغ مطلوب من المستلم عند التوصيل؛ الشحن يُسجل على حساب البراند وفق القواعد المعتمدة.",
    timeline: [event("10427-1", "استلام الشحنة", "تم استلام الشحنة من البراند وتسجيل أن المستلم دفع له شامل التوصيل.", "فرع الإسكندرية", "٢ أكتوبر، ٢:٤٠ م", "سلمى حسن", "current")],
  }),
  shipment({
    id: "10426", brand: "خطوة", customer: "يوسف أشرف", phone: "01000000126",
    address: "شارع مصطفى كامل، سموحة، عمارة 8", governorate: "الإسكندرية", area: "سموحة",
    branchId: null, originBranchId: "alexandria", custodian: "يوسف أشرف · المستلم", location: "تم التسليم للمستلم",
    state: "delivered", stateLabel: "تم التوصيل", tone: "neutral", service: "ready",
    baseShipping: 60, packing: 0, recipientDue: 480, recipientPaymentStatus: "reported",
    createdAt: "٢ أكتوبر ٢٠٢٦، ١١:٣٠ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ١٠:٢٥ ص",
    items: [{ name: "حذاء رياضي", variant: "أبيض · 43", quantity: 1, unitPrice: 420 }],
    nextAction: "التوصيل مسجل. توريد المندوب وتسوية الفلوس لهم سجل منفصل.",
    timeline: [
      event("10426-1", "استلام الشحنة", "تم تسجيل واستلام الشحنة من البراند.", "فرع الإسكندرية", "٢ أكتوبر، ١١:٣٠ ص", "سلمى حسن"),
      event("10426-2", "تسليم لمندوب التوصيل", "تم تأكيد تسليم الشحنة لإبراهيم محمد.", "فرع الإسكندرية", "٣ أكتوبر، ٨:٣٠ ص", "سلمى حسن"),
      event("10426-3", "تم التوصيل للمستلم", "سجل المندوب تسليم الشحنة ودفع المستلم 480 جنيه. ده لا يؤكد توريد المبلغ للشركة.", "سموحة · الإسكندرية", "٣ أكتوبر، ١٠:٢٥ ص", "Tawsel", "current"),
    ],
  }),
  shipment({
    id: "10425", brand: "نواة", customer: "دينا طارق", phone: "01000000125",
    address: "شارع السودان، العجوزة، عمارة 41", governorate: "الجيزة", area: "العجوزة",
    branchId: null, originBranchId: "giza", custodian: "أحمد حسن · مندوب توصيل", location: "في عهدة المندوب · مرتجع منتظر",
    state: "return_pending", stateLabel: "منتظرة رجوع للفرع", tone: "amber", service: "ready",
    baseShipping: 60, packing: 0, recipientDue: 380, recipientPaymentStatus: "expected",
    createdAt: "٢ أكتوبر ٢٠٢٦، ١:١٠ م", updatedAt: "٣ أكتوبر ٢٠٢٦، ١٠:٠٥ ص",
    items: [{ name: "طقم علب حفظ", variant: "٣ قطع · شفاف", quantity: 1, unitPrice: 320 }],
    nextAction: "المندوب لسه معاه الشحنة؛ محتاجة استلام فعلي في الفرع.",
    note: "المستلم رفض بعد المعاينة. الشحنة لم ترجع للمخزون بعد.",
    timeline: [
      event("10425-1", "استلام الشحنة", "تم تسجيل واستلام الشحنة الجاهزة.", "فرع الجيزة", "٢ أكتوبر، ١:١٠ م", "عمر علي"),
      event("10425-2", "تسليم لمندوب التوصيل", "تم تأكيد التسليم الفعلي لأحمد حسن.", "فرع الجيزة", "٣ أكتوبر، ٨:٥٠ ص", "عمر علي"),
      event("10425-3", "المستلم رفض الاستلام", "وردت نتيجة رفض بعد الوصول. الشحنة ما زالت في عهدة المندوب.", "العجوزة · الجيزة", "٣ أكتوبر، ١٠:٠٥ ص", "Tawsel", "current"),
    ],
  }),
  shipment({
    id: "10424", brand: "بيت ومودة", customer: "رانيا عادل", phone: "01000000124",
    address: "شارع النصر، المعادي، عمارة 19", governorate: "القاهرة", area: "المعادي",
    branchId: "cairo", originBranchId: "cairo", custodian: "فرع القاهرة", location: "منطقة الفحص · فرع القاهرة",
    state: "damaged", stateLabel: "تلف تحت المراجعة", tone: "rose", service: "ready",
    baseShipping: 50, packing: 0, recipientDue: 330, recipientPaymentStatus: "expected",
    createdAt: "١ أكتوبر ٢٠٢٦، ١١:٠٠ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ٩:٤٥ ص",
    items: [{ name: "غطاء وسادة", variant: "بيج · 45×45", quantity: 2, unitPrice: 140 }],
    nextAction: "غير متاحة للتسليم. واقعة التلف محتاجة مراجعة المسؤول.",
    note: "تم تسجيل تلف عند الفحص. لم يتم اعتماد تعويض أو خصم على موظف.",
    timeline: [
      event("10424-1", "استلام الشحنة", "تم استلام الشحنة الجاهزة من البراند.", "فرع القاهرة", "١ أكتوبر، ١١:٠٠ ص", "مريم أحمد"),
      event("10424-2", "بلاغ تلف أثناء الفحص", "اتعزل الطرد للفحص واتسجل بلاغ للمراجعة بدون اعتماد تعويض.", "منطقة الفحص · القاهرة", "٣ أكتوبر، ٩:٤٥ ص", "كريم سعيد", "current"),
    ],
  }),
  shipment({
    id: "10423", brand: "لِين", customer: "أحمد هاني", phone: "01000000123",
    address: "شارع جسر السويس، مصر الجديدة، عمارة 23", governorate: "القاهرة", area: "مصر الجديدة",
    branchId: "cairo", originBranchId: "cairo", custodian: "فرع القاهرة", location: "منطقة التغليف · القاهرة",
    state: "preparing", stateLabel: "قيد التغليف", tone: "amber", service: "packing",
    baseShipping: 50, packing: 5, recipientDue: 505, recipientPaymentStatus: "expected",
    createdAt: "٣ أكتوبر ٢٠٢٦، ٩:٠٠ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ٩:٣٠ ص",
    items: [{ name: "قميص قطن", variant: "أزرق · M", quantity: 1, unitPrice: 250 }, { name: "بنطلون قطن", variant: "بيج · M", quantity: 1, unitPrice: 200 }],
    nextAction: "مستني تأكيد انتهاء التغليف قبل التسليم للمندوب.",
    timeline: [
      event("10423-1", "استلام محتويات الأوردر", "تم استلام قطعتين من البراند للتغليف والتوصيل.", "فرع القاهرة", "٣ أكتوبر، ٩:٠٠ ص", "مريم أحمد"),
      event("10423-2", "بدأ التغليف", "الشحنة في منطقة التغليف داخل الفرع.", "فرع القاهرة", "٣ أكتوبر، ٩:٣٠ ص", "كريم سعيد", "current"),
    ],
  }),
  shipment({
    id: "10422", brand: "نواة", customer: "كريم وائل", phone: "01000000122",
    address: "شارع ترعة الزمر، العمرانية، عمارة 10", governorate: "الجيزة", area: "العمرانية",
    branchId: "giza", originBranchId: "giza", custodian: "فرع الجيزة", location: "منطقة الشحنات الجاهزة · الجيزة",
    state: "available", stateLabel: "جاهزة في الفرع", tone: "lime", service: "stock",
    baseShipping: 50, packing: 5, recipientDue: 375, recipientPaymentStatus: "expected",
    createdAt: "٣ أكتوبر ٢٠٢٦، ٨:٠٠ ص", updatedAt: "٣ أكتوبر ٢٠٢٦، ٩:١٥ ص",
    items: [{ name: "طقم علب حفظ", variant: "٣ قطع · شفاف", quantity: 1, unitPrice: 320 }],
    nextAction: "انتهى التجهيز؛ الشحنة لسه في عهدة الفرع.",
    timeline: [
      event("10422-1", "تأكيد الأوردر وحجز الكمية", "اتحجز طقم من مخزون البراند في فرع الجيزة.", "فرع الجيزة", "٣ أكتوبر، ٨:٠٠ ص", "عمر علي"),
      event("10422-2", "انتهاء التجهيز", "تم تأكيد التغليف. الكمية المحجوزة ما زالت ضمن الموجود الفعلي لحين التسليم.", "فرع الجيزة", "٣ أكتوبر، ٩:١٥ ص", "ياسمين علي", "current"),
    ],
  }),
  shipment({
    id: "10421", brand: "بيت ومودة", customer: "علي عمرو", phone: "01000000121",
    address: "شارع فؤاد، محطة الرمل، عمارة 6", governorate: "الإسكندرية", area: "محطة الرمل",
    branchId: "alexandria", originBranchId: "alexandria", custodian: "فرع الإسكندرية", location: "مخزون فرع الإسكندرية",
    state: "available", stateLabel: "جاهزة في الفرع", tone: "lime", service: "ready",
    baseShipping: 60, packing: 0, recipientDue: 60, recipientPaymentStatus: "expected",
    createdAt: "٢ أكتوبر ٢٠٢٦، ١٢:٤٥ م", updatedAt: "٢ أكتوبر ٢٠٢٦، ١٢:٤٥ م",
    items: [{ name: "غطاء وسادة", variant: "أخضر · 45×45", quantity: 3, unitPrice: 140 }],
    nextAction: "جاهزة للتوصيل؛ المستلم هيدفع الشحن فقط.",
    note: "قيمة البضاعة مدفوعة للبراند. المطلوب عند التوصيل 60 جنيه.",
    timeline: [event("10421-1", "استلام الشحنة", "تم استلام الطرد وتسجيل دفع قيمة البضاعة للبراند.", "فرع الإسكندرية", "٢ أكتوبر، ١٢:٤٥ م", "سلمى حسن", "current")],
  }),
];

// The only reserved stock units in this fixture belong to 10431 and 10422.
// Packed brand-owned parcels are separate records, not duplicated stock units.
export const stockItems: StockItem[] = [
  { id: "501", brand: "خطوة", name: "حذاء رياضي", variant: "أسود · 42", branchId: "cairo", onHand: 18, reserved: 1, damaged: 1, available: 16, updatedAt: "٣ أكتوبر، ١٠:٥٠ ص" },
  { id: "502", brand: "خطوة", name: "حذاء رياضي", variant: "أبيض · 43", branchId: "alexandria", onHand: 12, reserved: 0, damaged: 0, available: 12, updatedAt: "٢ أكتوبر، ١:٣٠ م" },
  { id: "503", brand: "نواة", name: "طقم علب حفظ", variant: "٣ قطع · شفاف", branchId: "giza", onHand: 25, reserved: 1, damaged: 2, available: 22, updatedAt: "٣ أكتوبر، ٨:٠٠ ص" },
  { id: "504", brand: "لِين", name: "قميص قطن", variant: "أبيض · M", branchId: "cairo", onHand: 32, reserved: 0, damaged: 0, available: 32, updatedAt: "٢ أكتوبر، ٤:١٠ م" },
  { id: "505", brand: "بيت ومودة", name: "غطاء وسادة", variant: "بيج · 45×45", branchId: "giza", onHand: 14, reserved: 0, damaged: 1, available: 13, updatedAt: "٢ أكتوبر، ٣:٢٠ م" },
  { id: "506", brand: "لِين", name: "بنطلون قطن", variant: "بيج · L", branchId: "cairo", onHand: 0, reserved: 0, damaged: 0, available: 0, updatedAt: "١ أكتوبر، ٢:٠٠ م" },
];

export const sampleContext = {
  companyName: "شحن",
  employeeName: "مريم أحمد",
  assignedBranchIds: ["cairo", "giza"] as BranchId[],
  activeBranchId: "cairo" as BranchId,
  defaultShipmentId: "10428",
  sampleDate: "السبت، ٣ أكتوبر ٢٠٢٦",
  dataNotice: "بيانات تجريبية لمراجعة التصميم",
  trackingScopeNotice: "التتبع يعرض شحنات كل فروع الشركة. تنفيذ العمليات حسب صلاحياتك وفروعك.",
};
