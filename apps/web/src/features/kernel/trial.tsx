import { useEffect, useRef, useState } from 'react';
import { Button, Input, PageHeading } from '@shahn/ui';
import { parseEgpDecimal, egpDecimal, type WalletAmounts } from '@shahn/domain';
import { validateKernelResult, type KernelCommand } from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import './trial.css';
interface TrialResult {
  fixture: true;
  resultId: string;
  brandId: string;
  branchId: string;
  version: number;
  wallet: WalletAmounts;
  reference: string;
}
const labels: Record<keyof WalletAmounts, string> = {
  eligible: 'رصيد مؤهل متبقٍ',
  pending: 'مبالغ معلقة',
  debits: 'خصومات غير موزعة',
  held: 'رصيد محجوز للمراجعة',
  cover: 'غطاء شحن محجوز',
  signedEntitlement: 'إجمالي الاستحقاق',
  eligibleToPay: 'متاح للتجربة',
};
const messages: Record<string, string> = {
  INSUFFICIENT_ELIGIBLE_CREDIT: 'الرصيد المؤهل لا يكفي لهذا التخصيص.',
  INSUFFICIENT_SHIPPING_COVER: 'الرصيد المؤهل لا يكفي لغطاء الشحن.',
  REVISION_CONFLICT: 'تغيّرت المحفظة. استرد آخر نتيجة وراجع النسخة قبل إجراء جديد.',
  FORBIDDEN_SCOPE: 'الصلاحيات الحالية لا تسمح بقراءة النتيجة أو تعديل هذه المحفظة.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجّل الدخول ثم استرد النتيجة.',
  COVER_ALREADY_CLOSED: 'استهلك أو أطلق هذا الغطاء من قبل.',
  COVER_NOT_FOUND: 'معرّف حجز الغطاء غير موجود.',
  RESULT_UNKNOWN: 'لم تصل نتيجة مؤكدة. استرد الطلب المحفوظ قبل أي إجراء جديد.',
  NOT_FOUND: 'لم نعثر على نتيجة محفوظة. احتفظ بمعرّف الطلب وافحص السجل قبل إجراء جديد.',
};
export function KernelTrial() {
  const { registry, session } = useAccess();
  const [result, setResult] = useState<TrialResult | null>(null),
    [amount, setAmount] = useState('50'),
    [cover, setCover] = useState('');
  const [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState(''),
    [requestId, setRequestId] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null),
    loaded = useRef('');
  const key = session ? 'kernel-trial:' + session.principalId : '';
  const context = registry?.context;
  async function receive(response: Response) {
    const body = await response.json();
    if (!response.ok) throw Error(body.code ?? 'RESULT_UNKNOWN');
    if (!validateKernelResult(body)) throw Error('RESULT_UNKNOWN');
    setResult(body as TrialResult);
    setUnknown(false);
    setError('');
  }
  async function recover(id = requestId) {
    if (!id || !context) return;
    setBusy(true);
    try {
      await receive(
        await fetch('/api/v1/kernel/commands/' + id + '?companyId=' + context.companyId, {
          signal: AbortSignal.timeout(12000),
        }),
      );
    } catch (e) {
      setUnknown(true);
      setError(messages[(e as Error).message] ?? messages.RESULT_UNKNOWN!);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!key || !context || loaded.current === key) return;
    loaded.current = key;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      setRequestId(stored);
      setUnknown(true);
      void recover(stored);
    }
    // Recovery runs once per authenticated identity; mutations use the latest context.
  }, [key, context]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(type: KernelCommand['type']) {
    if (!context || !session || busy || unknown) return;
    let money;
    try {
      money = parseEgpDecimal(amount.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)));
      if (BigInt(money.amountMinor) <= 0n) throw Error();
    } catch {
      setError('أدخل مبلغًا موجبًا بمنزلتين عشريتين كحد أقصى.');
      return;
    }
    const input: KernelCommand = {
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
      companyId: context.companyId,
      brandId: result?.brandId ?? crypto.randomUUID(),
      branchId: result?.branchId ?? context.assignedBranches[0]?.id ?? '',
      sourceId: crypto.randomUUID(),
      type,
      ...(['kernel.reserve', 'kernel.release', 'kernel.payout'].includes(type)
        ? { expectedVersion: result?.version ?? 1 }
        : {}),
      ...(['kernel.reserve', 'kernel.fee', 'kernel.payout'].includes(type) ? { money } : {}),
      ...(['kernel.fee', 'kernel.release'].includes(type) ? { coverSourceId: cover } : {}),
    };
    const previous = sessionStorage.getItem(key);
    sessionStorage.setItem(key, input.commandId);
    setRequestId(input.commandId);
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/v1/kernel/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(12000),
      });
      if (response.status >= 500) throw Error('RESULT_UNKNOWN');
      await receive(response);
      if (type === 'kernel.reserve') setCover(input.sourceId);
    } catch (e) {
      const code = (e as Error).message;
      const uncertain =
        !Object.hasOwn(messages, code) ||
        code === 'RESULT_UNKNOWN' ||
        code === 'AUTHENTICATION_REQUIRED';
      setUnknown(uncertain);
      setError(messages[code] ?? messages.RESULT_UNKNOWN!);
      if (!uncertain && previous) {
        sessionStorage.setItem(key, previous);
        setRequestId(previous);
      }
    } finally {
      setBusy(false);
    }
  }
  if (!context || !session) return <p role="status">سجّل الدخول لفتح تجربة المعاملات.</p>;
  return (
    <section className="kernel-trial">
      <PageHeading
        eyebrow="تجربة التطوير · المرحلة الثالثة"
        title="تجربة المعاملات والمحفظة"
        description="بيانات اختبار معزولة — لا تسجل صرفًا حقيقيًا أو حركة شحن."
      />
      <p className="kernel-notice">
        تبدأ التجربة برصيد مؤهل ١٠٠ ج.م ومعلق ٢٥٠ ج.م. احجز غطاء ٥٠ ثم طبّق الرسم نفسه؛ يظل المتاح
        ٥٠ ج.م.
      </p>
      {error && (
        <p role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      )}
      {result && (
        <>
          <dl className="kernel-totals">
            {(Object.keys(labels) as (keyof WalletAmounts)[]).map((key) => (
              <div key={key}>
                <dt>{labels[key]}</dt>
                <dd data-testid={'wallet-' + key}>
                  {egpDecimal({ currency: 'EGP', amountMinor: result.wallet[key] })} ج.م
                </dd>
              </div>
            ))}
          </dl>
          <p>
            مرجع التجربة: {result.reference} · النسخة: {result.version}
          </p>
        </>
      )}
      {!result ? (
        <Button disabled={busy || unknown} onClick={() => void submit('kernel.seed')}>
          ابدأ محفظة اختبار
        </Button>
      ) : (
        <>
          <label htmlFor="kernel-amount">
            المبلغ بالجنيه
            <Input
              id="kernel-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label htmlFor="kernel-cover">
            معرّف مصدر حجز الغطاء
            <Input
              id="kernel-cover"
              dir="ltr"
              value={cover}
              onChange={(event) => setCover(event.target.value)}
            />
          </label>
          <div className="kernel-actions">
            <Button disabled={busy || unknown} onClick={() => void submit('kernel.reserve')}>
              احجز غطاء شحن
            </Button>
            <Button disabled={busy || unknown} onClick={() => void submit('kernel.payout')}>
              جرّب تخصيص صرف
            </Button>
            <Button disabled={busy || unknown || !cover} onClick={() => void submit('kernel.fee')}>
              طبّق الرسم واستهلك الغطاء
            </Button>
            <Button
              disabled={busy || unknown || !cover}
              onClick={() => void submit('kernel.release')}
            >
              أطلق الغطاء
            </Button>
          </div>
        </>
      )}
      {requestId && (
        <div className="kernel-recovery">
          <p>
            معرّف الطلب: <bdi>{requestId}</bdi>
          </p>
          <Button disabled={busy} onClick={() => void recover()}>
            استرد نتيجة الطلب
          </Button>
        </div>
      )}
      <p role="status">
        {busy
          ? 'جارٍ التحقق والحفظ…'
          : unknown
            ? 'النتيجة غير مؤكدة؛ الإجراءات متوقفة حتى الاسترداد.'
            : ''}
      </p>
    </section>
  );
}
