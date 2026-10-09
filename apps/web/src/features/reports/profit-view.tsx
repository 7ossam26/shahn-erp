import { Link } from 'react-router-dom';
import type {
  ProfitSummary,
  ProfitActualMoney,
  ProfitReconciliationFinding,
} from '@shahn/contracts';

export const profitCategoryLabels: Record<string, string> = {
  shipping_gross: 'تعريفة الشحن والتغليف',
  shipping_waiver: 'إعفاء شحن البديل المعتمد',
  storage_revenue: 'رسوم التخزين المستحقة',
  employee_salary: 'الراتب المستحق',
  employee_commission: 'عمولة الزيارات',
  employee_addition: 'إضافات استحقاق الموظف',
  employee_entitlement_deduction: 'خصومات الاستحقاق المعتمدة',
  paid_expense: 'المصروفات المدفوعة',
  brand_compensation: 'تعويض البراند المؤكد',
  employee_compensation_share: 'حصة الموظف المعتمدة من التعويض',
};
export function profitAmount(v: string | null | undefined) {
  if (v == null) return 'غير معلوم';
  const n = BigInt(v),
    a = n < 0n ? -n : n;
  return `${n < 0n ? '−' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')} ج.م`;
}
export function ProfitFormula() {
  return (
    <details className="profit-formula">
      <summary>كيف يُحسب الربح والفترة؟</summary>
      <p>
        الشحن والتغليف المستحق − إعفاء شحن البديل + كامل رسم التخزين عند بداية الفترة − تكلفة
        استحقاق الموظف بعد خصم الاستحقاق وقبل استرداد السلف − المصروف المدفوع − التعويض المؤكد + حصة
        الموظف المعتمدة من التعويض مرة واحدة.
      </p>
      <p>
        تُسجل المصروفات العادية عند دفعها فقط؛ التكلفة غير المدفوعة التي لم تُدخل لا تظهر في هذه
        النتيجة. لا تمثل النتيجة إقفالاً محاسبياً للفترة.
      </p>
      <p>
        بتوقيت القاهرة: الشحن بتاريخ الزيارة، التخزين بتاريخ بداية الخدمة، الرواتب بفترة الاستحقاق،
        والتعويض بتاريخ تأكيد الحادث. التصحيح يحتفظ بفترة العمل الأصلية ووقت تسجيله. الإيداع العام
        وأموال البضاعة والتحويلات والسلف وصافي دفع الراتب خارج الربح.
      </p>
    </details>
  );
}
export function ProfitOverview({
  profit,
  categoryHref,
}: {
  profit: ProfitSummary;
  categoryHref: (category: string) => string;
}) {
  const p = profit.payroll;
  return (
    <section className="profit-overview" aria-label="ملخص الربح التشغيلي">
      <div className="profit-result">
        <h2>
          {profit.calculationComplete ? 'الربح التشغيلي' : 'النتيجة المتاحة من المصادر المكتملة'}
        </h2>
        <strong>
          <bdi>{profitAmount(profit.profitMinor)}</bdi>
        </strong>
        {!profit.calculationComplete && (
          <p role="status">
            مصادر تحتاج مراجعة؛ المبالغ الصحيحة تظل ظاهرة، والمبلغ المفقود غير معلوم.
          </p>
        )}
      </div>
      {profit.laterEntryCount > 0 && (
        <p className="profit-notice" role="status">
          تحتوي هذه الفترة على {profit.laterEntryCount} قيد مسجل بعد فترة الاستحقاق. قد تغير القيود
          المتأخرة نتيجة لقطة جديدة؛ اللقطة السابقة تحتفظ بقيمها.
        </p>
      )}
      {profit.limitations.map((line, i) => (
        <p key={i} className="profit-notice">
          {line}
        </p>
      ))}
      <div className="profit-category-list" aria-label="فئات الربح">
        {profit.categories.map((c) => (
          <Link key={c.category} to={categoryHref(c.category)} className="profit-category">
            <span>
              <strong>{profitCategoryLabels[c.category] ?? c.category}</strong>
              <small>{c.sourceCount} مصدر · عرض التفاصيل</small>
            </span>
            <bdi>{profitAmount(c.amountMinor)}</bdi>
          </Link>
        ))}
      </div>
      <dl className="profit-breakdown" aria-label="الشحن الإجمالي والإعفاء والصافي">
        {[
          ['الشحن والتغليف قبل الإعفاء', profit.shipping.grossMinor],
          ['إعفاء شحن البديل', profit.shipping.waiverMinor],
          ['صافي الشحن', profit.shipping.netMinor],
        ].map(([label, amount]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <bdi>{profitAmount(amount)}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      <details className="profit-panel">
        <summary>استحقاق الموظفين والتكلفة والدفع الفعلي</summary>
        <dl className="profit-breakdown" aria-label="تفصيل تكلفة الموظفين">
          {[
            ['الراتب', p.salaryMinor],
            ['العمولة', p.commissionMinor],
            ['الإضافات', p.additionsMinor],
            ['خصومات الاستحقاق', p.entitlementDeductionsMinor],
            ['تكلفة الموظفين بعد خصم الاستحقاق', p.employeeCostMinor],
            ['استرداد السلف من الرواتب', p.advanceRecoveryMinor],
            ['استرداد الحوادث المحجوز من الرواتب', p.incidentRecoveryWithheldMinor],
            ['صافي دفع الرواتب الفعلي', p.payoutMinor],
          ].map(([label, amount]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <bdi>{profitAmount(amount)}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        <p>
          استرداد السلفة لا يخفض تكلفة الاستحقاق. حصة الموظف من الحادث تُحسب عند التأكيد مرة واحدة،
          وصافي الدفع يوضح حركة المال.
        </p>
      </details>
      <details className="profit-panel">
        <summary>الربح بحسب الفرع التاريخي</summary>
        <dl className="profit-breakdown" aria-label="مكونات الربح بحسب الفرع">
          {profit.branches.map((b) => (
            <div key={b.branchId ?? 'unattributed'}>
              <dt>{b.branchName}</dt>
              <dd>
                <bdi>{profitAmount(b.profitMinor)}</bdi>
              </dd>
            </div>
          ))}
        </dl>
        <p>
          الزيارة لفرع العمل، التخزين لفرع الاتفاق، الراتب لفرع الموظف التاريخي والتعويض لفرع الحادث
          المسؤول.
        </p>
      </details>
    </section>
  );
}
export function ProfitMoney({ money }: { money: ProfitActualMoney }) {
  return (
    <section className="profit-panel" aria-label="المال الفعلي والالتزامات">
      <h2>المال الفعلي والالتزامات</h2>
      <p>
        الأرصدة الحالية وقت اللقطة <bdi>{money.asOf}</bdi>. الفترة أعلاه تختار الاستحقاق التشغيلي؛
        هذه الأرصدة تشرح موقع الأموال والالتزامات الحالية.
      </p>
      <dl className="profit-breakdown">
        {[
          ['أموال في الطريق', money.fundsInTransitMinor],
          ['فروق حسابات محجوزة', money.heldDiscrepanciesMinor],
          ['مبالغ المستلمين غير الموردة', money.unremittedRecipientMinor],
          ['التزامات البراند', money.brandLiabilitiesMinor],
          ['أموال البراند المعلقة', money.brandPendingMinor],
          ['أموال البراند المحجوزة', money.brandHeldMinor],
          ['التخزين المستحق غير المدفوع', money.storageDueMinor],
          ['رصيد التخزين المقدم غير المخصص', money.storageCreditMinor],
        ].map(([label, amount]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <bdi>{profitAmount(amount)}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {money.accounts.map((a) => (
        <article key={a.id} className="profit-account">
          <h3>
            {a.name} · {a.type === 'cash' ? 'نقدي' : 'بنكي'}
          </h3>
          <dl className="profit-breakdown">
            {[
              ['الرصيد الفعلي المسجل', a.bookMinor],
              ['المحجوز', a.heldMinor],
              ['المتاح', a.availableMinor],
            ].map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <bdi>{profitAmount(amount)}</bdi>
                </dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
      {money.notes.map((line, i) => (
        <p key={i} className="profit-notice">
          {line}
        </p>
      ))}
    </section>
  );
}
const findingLabels: Record<string, string> = {
  duplicate_effect: 'مصدر اقتصادي مكرر',
  missing_classification: 'تصنيف اقتصادي غير مكتمل',
  account_projection: 'فرق سجل الحساب والإسقاط',
  transit_projection: 'فرق الأموال العابرة',
  wallet_lots: 'فرق المحفظة والتخصيصات',
  storage_credit: 'فرق رصيد التخزين',
  source_gap: 'تغطية المصدر غير مكتملة',
};
export function ProfitReconciliation({
  findings,
  asOf,
}: {
  findings: ProfitReconciliationFinding[];
  asOf: string;
}) {
  return (
    <section className="profit-panel" aria-label="مراجعة اتفاق المصادر">
      <h2>مراجعة اتفاق المصادر</h2>
      <p>
        فحص للقراءة وقت اللقطة <bdi>{asOf}</bdi>. لا ينشئ تعديلاً مالياً. التحديث يحتفظ باللقطة
        السابقة ويعرض المراجعة الأحدث.
      </p>
      {!findings.length && <p>لا توجد فروق في المصادر التي شملها الفحص.</p>}
      <div className="profit-findings">
        {findings.map((f) => (
          <article key={f.id}>
            <h3>{findingLabels[f.kind] ?? f.kind}</h3>
            <p>{f.message}</p>
            <dl className="profit-breakdown">
              <div>
                <dt>المتوقع من المصدر</dt>
                <dd>
                  <bdi>{profitAmount(f.expectedMinor)}</bdi>
                </dd>
              </div>
              <div>
                <dt>المشاهد</dt>
                <dd>
                  <bdi>{profitAmount(f.observedMinor)}</bdi>
                </dd>
              </div>
              <div>
                <dt>الفرق الدقيق</dt>
                <dd>
                  <bdi>{profitAmount(f.deltaMinor)}</bdi>
                </dd>
              </div>
              <div>
                <dt>نسخة الفحص</dt>
                <dd>
                  <bdi>{f.observedVersion}</bdi>
                </dd>
              </div>
            </dl>
            <p>
              وقت الفحص: <bdi>{f.asOf}</bdi>
            </p>
            <details>
              <summary>مراجع المصادر</summary>
              <pre className="report-json">{f.sourceIds.join('\n')}</pre>
            </details>
            {f.recoveryPath && <Link to={f.recoveryPath}>فتح مسار المراجعة المصرح به</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}
