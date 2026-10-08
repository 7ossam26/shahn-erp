import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormGroup,
  PageHeading,
  StatePanel,
} from '@shahn/ui';
import type {
  OpeningBatchDetail,
  OpeningBatchList,
  OpeningCommand,
  OpeningLine,
  OpeningPreview,
  OpeningResult,
  SettlementCatalog,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError, Field, displayMinor, inputMinor } from '../brands/api.js';
import { messageFor, settlementApi, useSettlementMutation } from './api.js';
import { SettlementError, useSettlementCatalog } from './settlements.js';
import '../finance/finance.css';
import './settlements.css';

const number = new Intl.NumberFormat('ar-EG');
type Classification = OpeningLine['classification'];
const classes: Record<Classification, { name: string; help: string }> = {
  account_balance: {
    name: 'رصيد حساب نقدي أو بنكي',
    help: 'مبلغ موجود فعليًا في الحساب عند تاريخ البدء.',
  },
  brand_eligible_credit: {
    name: 'مستحق براند مؤهل للتحصيل',
    help: 'مبلغ مستحق للبراند ومغطى بأموال محصلة فعلًا.',
  },
  brand_pending_driver_held: {
    name: 'مستحق براند لدى المناديب غير محصل',
    help: 'يبقى معلقًا وغير قابل للتحصيل حتى استلام فعلي.',
  },
  brand_debt: { name: 'مديونية على البراند', help: 'مبلغ مستحق للشركة على البراند.' },
  employee_obligation: {
    name: 'التزام على موظف (سلفة أو مديونية قائمة)',
    help: 'يُسترد من راتب شهر حالي غير مدفوع أو قادم، دون تخفيض تكلفة.',
  },
  employee_entitlement: {
    name: 'مستحق قائم لموظف',
    help: 'يُصرف مرة واحدة ضمن صافي راتب شهر حالي أو قادم، خارج تكلفة الشهر.',
  },
  stock_sound: { name: 'مخزون سليم موجود', help: 'كمية فعلية بفرع وبراند وصنف محدد.' },
  stock_unavailable: { name: 'مخزون تالف أو غير مؤكد', help: 'لا يصبح متاحًا للطلبات.' },
};
const readiness: Record<string, string> = {
  eligible: 'مؤهل',
  pending: 'معلق لدى المناديب',
  debt: 'مديونية',
  obligation: 'التزام',
  entitlement: 'مستحق',
  available: 'متاح',
  unavailable: 'غير متاح',
};
interface Row {
  key: string;
  classification: Classification;
  branchId: string;
  targetId: string;
  variantId: string;
  month: string;
  amount: string;
}
function lineOf(r: Row, c: SettlementCatalog): OpeningLine | null {
  let minorAmount: string | null = null;
  try {
    minorAmount = inputMinor(r.amount);
  } catch {
    minorAmount = null;
  }
  const q = Number(r.amount.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
  if (!r.branchId) return null;
  switch (r.classification) {
    case 'account_balance':
      return r.targetId && minorAmount && minorAmount !== '0'
        ? {
            classification: r.classification,
            accountId: r.targetId,
            branchId: r.branchId,
            amountMinor: minorAmount,
          }
        : null;
    case 'brand_eligible_credit':
    case 'brand_pending_driver_held':
    case 'brand_debt':
      return r.targetId && minorAmount && minorAmount !== '0'
        ? {
            classification: r.classification,
            brandId: r.targetId,
            branchId: r.branchId,
            amountMinor: minorAmount,
          }
        : null;
    case 'employee_obligation':
    case 'employee_entitlement':
      return r.targetId && r.month && minorAmount && minorAmount !== '0'
        ? {
            classification: r.classification,
            employeeId: r.targetId,
            branchId: r.branchId,
            month: r.month,
            amountMinor: minorAmount,
          }
        : null;
    default: {
      const v = c.variants.find((x) => x.variantId === r.variantId);
      return v && Number.isSafeInteger(q) && q > 0
        ? {
            classification: r.classification,
            brandId: v.brandId,
            variantId: v.variantId,
            branchId: r.branchId,
            quantity: q,
          }
        : null;
    }
  }
}
export function OpeningPage() {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    location = useLocation(),
    notice = (location.state as { notice?: string } | null)?.notice;
  const batches = useQuery({
    queryKey: ['opening-batches', company],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      settlementApi<OpeningBatchList>(`/opening/batches?companyId=${company}`, 'openingList'),
  });
  return (
    <>
      <PageHeading
        eyebrow="إعداد اختياري"
        title="الأرصدة الافتتاحية"
        description="لشركة تبدأ ولديها أموال أو مستحقات أو مخزون قائم. الشركة التي تبدأ من الصفر لا تحتاج هذه الصفحة. الأرصدة الافتتاحية لا تُحسب إيرادًا ولا مصروفًا."
      />
      {notice && (
        <p role="status" className="commercial-notice">
          {notice}
        </p>
      )}
      <Link className="settlement-action" to="/settings/opening-balances/new">
        تسجيل دفعة أرصدة افتتاحية
      </Link>
      {batches.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل الدفعات" />
      ) : batches.isError ? (
        <SettlementError error={batches.error} />
      ) : !batches.data.items.length ? (
        <StatePanel state="empty" title="لا توجد أرصدة افتتاحية">
          هذا طبيعي لشركة بدأت من الصفر. يمكنك تخطي هذه الخطوة.
        </StatePanel>
      ) : (
        <ul className="settlement-cards">
          {batches.data.items.map((b) => (
            <li key={b.id}>
              <Link to={'/settings/opening-balances/' + b.id}>
                <strong>
                  دفعة رقم <bdi>{b.reference}</bdi> · {b.openingDate}
                </strong>
                <span>{b.description}</span>
                <span className="muted">
                  {number.format(b.lineCount)} بند · {b.actorName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function TargetSelect({
  row,
  c,
  set,
}: {
  row: Row;
  c: SettlementCatalog;
  set: (p: Partial<Row>) => void;
}) {
  if (row.classification === 'account_balance')
    return (
      <Field label="الحساب">
        <select value={row.targetId} onChange={(e) => set({ targetId: e.target.value })}>
          <option value="">اختر</option>
          {c.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
    );
  if (row.classification.startsWith('brand_'))
    return (
      <Field label="البراند">
        <select value={row.targetId} onChange={(e) => set({ targetId: e.target.value })}>
          <option value="">اختر</option>
          {c.brands.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
    );
  if (row.classification.startsWith('employee_'))
    return (
      <>
        <Field label="الموظف">
          <select value={row.targetId} onChange={(e) => set({ targetId: e.target.value })}>
            <option value="">اختر</option>
            {c.employees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="شهر الراتب (حالي غير مدفوع أو قادم)">
          <input
            type="month"
            min={c.today.slice(0, 7)}
            value={row.month}
            onChange={(e) => set({ month: e.target.value })}
          />
        </Field>
      </>
    );
  return (
    <Field label="البراند والصنف">
      <select value={row.variantId} onChange={(e) => set({ variantId: e.target.value })}>
        <option value="">اختر</option>
        {c.variants.map((v) => (
          <option key={v.variantId} value={v.variantId}>
            {(c.brands.find((b) => b.id === v.brandId)?.name ?? '') + ' · ' + v.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function OpeningNewPage() {
  const catalog = useSettlementCatalog('/opening/catalog'),
    navigate = useNavigate(),
    { registry, session } = useAccess();
  const [date, setDate] = useState(''),
    [description, setDescription] = useState(''),
    [evidence, setEvidence] = useState(''),
    [rows, setRows] = useState<Row[]>([]),
    [kind, setKind] = useState<Classification>('account_balance'),
    [preview, setPreview] = useState<OpeningPreview | null>(null),
    [reviewing, setReviewing] = useState(false),
    [checking, setChecking] = useState(false),
    [formError, setFormError] = useState<unknown>(null),
    [notice, setNotice] = useState('');
  useEffect(() => {
    if (catalog.data && !date) setDate(catalog.data.today);
  }, [catalog.data]);
  const mutation = useSettlementMutation<OpeningCommand, OpeningResult>('opening', 'batch', (r) =>
    navigate('/settings/opening-balances/' + r.batchId, {
      state: { notice: `سُجلت دفعة الأرصدة الافتتاحية رقم ${r.reference} مرة واحدة.` },
    }),
  );
  const locked = mutation.busy || !!mutation.pending || checking;
  useEffect(() => {
    const e = mutation.error;
    if (e instanceof CommercialError && e.code === 'SETTLEMENT_PREVIEW_STALE') {
      mutation.setError(null);
      setReviewing(false);
      void review(messageFor('SETTLEMENT_PREVIEW_STALE'));
    }
  }, [mutation.error]);
  if (!catalog.data)
    return catalog.isError ? (
      <SettlementError error={catalog.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الأهداف" />
    );
  const c = catalog.data;
  const lines = rows.map((r) => lineOf(r, c));
  const complete = rows.length > 0 && lines.every(Boolean);
  const invalidate = () => {
    setPreview(null);
    setReviewing(false);
  };
  const update = (key: string, p: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
    invalidate();
  };
  async function review(message = '') {
    setChecking(true);
    setFormError(null);
    try {
      const p = await settlementApi<OpeningPreview>(
        '/opening/prepare',
        'openingPreview',
        {
          companyId: registry!.context.companyId,
          openingDate: date,
          lines: lines as OpeningLine[],
        },
        session?.csrfToken,
      );
      setPreview(p);
      setNotice(message);
    } catch (e) {
      setFormError(e);
    } finally {
      setChecking(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="إعداد اختياري"
        title="دفعة أرصدة افتتاحية"
        description="اختر نوع كل بند أولًا ثم بياناته. تُراجع الدفعة كاملة ثم تُسجل مرة واحدة. لا يتكرر رصيد افتتاحي لنفس الهدف."
      />
      <Link className="back-link" to="/settings/opening-balances">
        العودة للأرصدة الافتتاحية
      </Link>
      {mutation.pending && (
        <section role="status" className="commercial-warning">
          <p>نتيجة التسجيل السابق غير معروفة. لا تسجل دفعة جديدة قبل التحقق.</p>
          <Button type="button" disabled={mutation.busy} onClick={() => void mutation.recover()}>
            التحقق من النتيجة
          </Button>
        </section>
      )}
      <form
        className="finance-form settlement-form"
        onSubmit={(e) => {
          e.preventDefault();
          void review();
        }}
      >
        <fieldset disabled={locked}>
          <FormGroup title="بيانات الدفعة" description="تاريخ البدء الفعلي ومصدر الأرقام.">
            <Field label="تاريخ الرصيد الافتتاحي">
              <input
                type="date"
                max={c.today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  invalidate();
                }}
              />
            </Field>
            <Field label="وصف الدفعة">
              <input
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="المستند أو المصدر (اختياري)">
              <input
                value={evidence}
                maxLength={500}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </Field>
          </FormGroup>
          <FormGroup title="البنود" description="لكل بند هدف واحد وفرع مسند ومعنى صريح.">
            <ol className="opening-lines">
              {rows.map((r, i) => (
                <li key={r.key} className="opening-line">
                  <span className="opening-line-kind">
                    {number.format(i + 1)}. {classes[r.classification].name}
                    <small className="muted"> — {classes[r.classification].help}</small>
                  </span>
                  <TargetSelect row={r} c={c} set={(p) => update(r.key, p)} />
                  <Field label="الفرع">
                    <select
                      value={r.branchId}
                      onChange={(e) => update(r.key, { branchId: e.target.value })}
                    >
                      {c.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={r.classification.startsWith('stock_') ? 'الكمية' : 'المبلغ (ج.م)'}>
                    <input
                      inputMode={r.classification.startsWith('stock_') ? 'numeric' : 'decimal'}
                      value={r.amount}
                      onChange={(e) => update(r.key, { amount: e.target.value })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setRows((rs) => rs.filter((x) => x.key !== r.key));
                      invalidate();
                    }}
                  >
                    حذف البند
                  </Button>
                </li>
              ))}
            </ol>
            <Field label="نوع البند التالي">
              <select value={kind} onChange={(e) => setKind(e.target.value as Classification)}>
                {Object.entries(classes).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRows((rs) => [
                  ...rs,
                  {
                    key: crypto.randomUUID(),
                    classification: kind,
                    branchId: c.branches[0]?.id ?? '',
                    targetId: '',
                    variantId: '',
                    month: c.today.slice(0, 7),
                    amount: '',
                  },
                ]);
                invalidate();
              }}
            >
              إضافة بند
            </Button>
          </FormGroup>
        </fieldset>
        <Button type="submit" disabled={locked || !complete || !date}>
          {checking ? 'جارٍ المراجعة…' : 'مراجعة الدفعة'}
        </Button>
      </form>
      <SettlementError error={formError ?? (reviewing ? null : mutation.error)} />
      {notice && (
        <p role="status" className="commercial-warning">
          {notice}
        </p>
      )}
      {preview && (
        <section className="settlement-preview" aria-labelledby="opening-preview">
          <h2 id="opening-preview">مراجعة الدفعة · {preview.openingDate}</h2>
          <p className="commercial-notice">
            الأرصدة الافتتاحية لا تُنشئ أي إيراد أو مصروف تشغيل ولا حركة نقدية جديدة.
          </p>
          <ul className="settlement-rows">
            {preview.lines.map((l) => (
              <li key={l.lineNumber}>
                <div>
                  <strong>
                    {number.format(l.lineNumber)}. {classes[l.classification].name}
                  </strong>
                  <span>
                    {l.label} · {l.branchName}
                  </span>
                </div>
                <span>
                  {l.amountMinor ? (
                    <bdi dir="ltr">
                      {displayMinor(l.amountMinor)} <small>ج.م</small>
                    </bdi>
                  ) : (
                    number.format(l.quantity ?? 0)
                  )}{' '}
                  · {readiness[l.readiness]}
                </span>
              </li>
            ))}
          </ul>
          <dl className="settlement-summary">
            <div>
              <dt>أموال الحسابات</dt>
              <dd>{displayMinor(preview.totals.moneyMinor)}</dd>
            </div>
            <div>
              <dt>مستحق براند مؤهل</dt>
              <dd>{displayMinor(preview.totals.brandEligibleMinor)}</dd>
            </div>
            <div>
              <dt>مستحق براند معلق</dt>
              <dd>{displayMinor(preview.totals.brandPendingMinor)}</dd>
            </div>
            <div>
              <dt>التزامات الموظفين</dt>
              <dd>{displayMinor(preview.totals.employeeObligationMinor)}</dd>
            </div>
            <div>
              <dt>وحدات المخزون</dt>
              <dd>{number.format(preview.totals.stockQuantity)}</dd>
            </div>
          </dl>
          {!!preview.blockers.length && (
            <ul className="settlement-blockers" role="alert">
              {preview.blockers.map((b) => (
                <li key={b}>{messageFor(b)}</li>
              ))}
              {preview.existing.map((x) => (
                <li key={x.targetKey}>مسجل سابقًا في الدفعة رقم {x.batchReference}</li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            disabled={locked || !!preview.blockers.length || !description.trim()}
            onClick={() => setReviewing(true)}
          >
            تأكيد الدفعة
          </Button>
        </section>
      )}
      <Dialog open={reviewing && !!preview} onOpenChange={(o) => !mutation.busy && setReviewing(o)}>
        <DialogContent>
          <DialogTitle>تسجيل الأرصدة الافتتاحية</DialogTitle>
          <DialogDescription>
            تُسجل الدفعة كاملة مرة واحدة. أي تغيير لاحق يكون بتسوية مرتبطة.
          </DialogDescription>
          <SettlementError error={mutation.error} />
          {mutation.pending && !mutation.busy && (
            <Button type="button" onClick={() => void mutation.recover()}>
              التحقق من النتيجة
            </Button>
          )}
          <Button
            type="button"
            disabled={locked}
            onClick={() =>
              preview &&
              void mutation.submit({
                schemaVersion: 1,
                type: 'opening.confirm',
                openingDate: date,
                description: description.trim(),
                evidence: evidence.trim(),
                lines: lines as OpeningLine[],
                expectedDigest: preview.digest,
              })
            }
          >
            {mutation.busy ? 'جارٍ التسجيل…' : 'تسجيل نهائي'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.busy}
            onClick={() => setReviewing(false)}
          >
            رجوع
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
/** The permanent posted record of one line: its journal effect, or its stock source. */
function SourceLink({ line }: { line: OpeningBatchDetail['lines'][number] | undefined }) {
  const ref = line?.effectId ?? line?.stockSourceId;
  if (!ref) return null;
  return (
    <small className="muted">
      {line?.effectId ? 'قيد الرصيد' : 'حركة المخزون'}:{' '}
      <bdi dir="ltr" title={ref}>
        {ref.slice(0, 8)}
      </bdi>
    </small>
  );
}
export function OpeningDetailPage() {
  const { batchId } = useParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    location = useLocation(),
    notice = (location.state as { notice?: string } | null)?.notice;
  const detail = useQuery({
    queryKey: ['opening-batch', company, batchId],
    enabled: !!company && !!batchId,
    retry: false,
    queryFn: () =>
      settlementApi<OpeningBatchDetail>(
        `/opening/batches/${batchId}?companyId=${company}`,
        'openingDetail',
      ),
  });
  if (!detail.data)
    return detail.isError ? (
      <SettlementError error={detail.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ التحميل" />
    );
  const { batch, preview, lines } = detail.data;
  return (
    <>
      <PageHeading
        eyebrow={'دفعة رقم ' + batch.reference}
        title="أرصدة افتتاحية مسجلة"
        description={`${batch.openingDate} · ${batch.description}`}
      />
      {notice && (
        <p role="status" className="commercial-notice">
          {notice}
        </p>
      )}
      <Link className="back-link" to="/settings/opening-balances">
        العودة للأرصدة الافتتاحية
      </Link>
      <section className="settlement-panel">
        <ul className="settlement-rows">
          {preview.lines.map((l) => (
            <li key={l.lineNumber}>
              <div>
                <strong>{classes[l.classification].name}</strong>
                <span>
                  {l.label} · {l.branchName}
                </span>
                <SourceLink line={lines.find((x) => x.lineNumber === l.lineNumber)} />
              </div>
              <span>
                {l.amountMinor
                  ? displayMinor(l.amountMinor) + ' ج.م'
                  : number.format(l.quantity ?? 0)}{' '}
                · {readiness[l.readiness]}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">
          المصدر: {batch.evidence || 'غير مذكور'} · سجلها {batch.actorName}
        </p>
      </section>
    </>
  );
}
