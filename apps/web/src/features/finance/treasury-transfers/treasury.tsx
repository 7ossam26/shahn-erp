import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading, FormGroup, Button, StatePanel } from '@shahn/ui';
import type {
  TreasuryCatalog,
  TreasuryTransfer,
  TreasuryList,
  TreasuryScreen,
} from '@shahn/contracts';
import { useAccess, Reauthenticate } from '../../access/access.js';
import { Field, TextField, CommercialError, displayMinor, inputMinor } from '../../brands/api.js';
import { treasuryApi, useTreasuryMutation } from './api.js';
import { cairoInput, cairoTimestamp } from './time.js';
import '../finance.css';
import './treasury.css';
const path = (s: TreasuryScreen) => (s === 'send' ? '/treasury/transfers' : '/treasury/receipts');
const stateName = (t: TreasuryTransfer) =>
  t.state === 'sent' ? 'قيد النقل — لم يُستلم' : 'تم الاستلام بالكامل';
const formatTime = (value: string) =>
  new Date(value).toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
const amount = (value: string) => <bdi className="finance-amount">{displayMinor(value)} ج.م</bdi>;
const messages: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'الرصيد المتاح لا يكفي لإرسال هذا المبلغ. راجع الرصيد قبل إرسال طلب جديد.',
  ACCOUNT_INACTIVE: 'الحساب موقوف. حدّث الاختيارات واختر حسابًا نشطًا.',
  ACCOUNT_USAGE_FORBIDDEN: 'الحساب غير مسموح للفرع المختار.',
  SAME_TRANSFER_SCOPE: 'اختر فرعين وحسابين مختلفين للتحويل.',
  REVISION_CONFLICT: 'تغيّرت النسخة. مدخلاتك باقية؛ حدّث البيانات وراجعها قبل التأكيد.',
  FORBIDDEN_SCOPE: 'صلاحياتك الحالية لا تسمح بفتح هذه الشاشة أو تنفيذ الإجراء.',
  NOT_FOUND: 'التحويل غير متاح ضمن صلاحياتك الحالية.',
  RESULT_UNKNOWN: 'لم تصل نتيجة التأكيد. استرد النتيجة بنفس الطلب قبل تغيير البيانات.',
  CONNECTION_LOST: 'تعذر الاتصال. المدخلات باقية؛ حاول مجددًا عند عودة الاتصال.',
  INVALID_ACTUAL_TIME: 'اختر تاريخًا ووقتًا فعليًا صالحًا بتوقيت القاهرة، اليوم أو في الماضي.',
  RECEIPT_BEFORE_SEND: 'وقت الاستلام الفعلي لا يمكن أن يسبق الإرسال.',
  VALIDATION_FAILED: 'راجع الحسابات والمبلغ الموجب والتاريخ والوقت.',
  AUTHENTICATION_REQUIRED: 'انتهت الجلسة. سجّل الدخول لاسترداد نتيجة الطلب.',
  TRANSFER_RECONCILIATION_REQUIRED: 'حركات التحويل تحتاج إلى مراجعة قبل الاستلام.',
};
export function TreasuryError({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  if (!error) return null;
  return (
    <div ref={ref} className="commercial-error" role="alert" tabIndex={-1}>
      {messages[error instanceof Error ? error.message : ''] ??
        'تعذر إكمال الطلب. راجع البيانات والاتصال.'}
      {error instanceof CommercialError && error.currentVersion !== undefined && (
        <p>النسخة الحالية: {error.currentVersion}</p>
      )}
      {error instanceof CommercialError && error.status === 401 && <Reauthenticate />}
    </div>
  );
}
function useCatalog(screen: TreasuryScreen) {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  return useQuery({
    queryKey: ['treasury-catalog', company, screen, registry?.context.authorizationRevision],
    enabled: !!company,
    retry: false,
    queryFn: () =>
      treasuryApi<TreasuryCatalog>(
        `/treasury/catalog?companyId=${company}&screen=${screen}`,
        'catalog',
      ),
  });
}
export function TreasuryListPage({ screen }: { screen: TreasuryScreen }) {
  const { registry } = useAccess(),
    company = registry?.context.companyId,
    [params, setParams] = useSearchParams(),
    catalog = useCatalog(screen);
  const query = new URLSearchParams(params);
  query.set('companyId', company ?? '');
  const data = useQuery({
    queryKey: [
      'treasury-list',
      company,
      screen,
      params.toString(),
      registry?.context.authorizationRevision,
    ],
    enabled: !!company,
    retry: false,
    queryFn: () => treasuryApi<TreasuryList>(path(screen) + '?' + query, 'list'),
  });
  const set = (name: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(name, value);
    else p.delete(name);
    if (name !== 'page') p.delete('page');
    setParams(p);
  };
  return (
    <>
      <PageHeading
        eyebrow="الخزينة · جميع فروع الشركة"
        title={screen === 'send' ? 'إرسال الأموال' : 'استلام الأموال'}
        description={
          screen === 'send'
            ? 'الإرسال يخصم من المصدر ويظل المبلغ قيد النقل حتى الاستلام الفعلي.'
            : 'أكّد وصول المبلغ الكامل فعليًا إلى الحساب المحدد.'
        }
      />
      {screen === 'send' && (
        <Link className="commercial-primary-link" to={path(screen) + '/new'}>
          إرسال تحويل
        </Link>
      )}
      <details className="finance-filters">
        <summary>فلاتر التحويلات</summary>
        <div className="commercial-fields">
          <TextField
            label="بحث بالمرجع أو اسم الحساب"
            value={params.get('search') ?? ''}
            onChange={(v) => set('search', v)}
          />
          <Field label="حالة التحويل">
            <select
              value={params.get('state') ?? (screen === 'receive' ? 'sent' : 'all')}
              onChange={(e) => set('state', e.target.value)}
            >
              <option value="all">الكل</option>
              <option value="sent">قيد النقل</option>
              <option value="received">تم الاستلام</option>
            </select>
          </Field>
          {(['sourceBranchId', 'destinationBranchId'] as const).map((name) => (
            <Field key={name} label={name === 'sourceBranchId' ? 'الفرع المرسل' : 'الفرع المستلم'}>
              <select value={params.get(name) ?? ''} onChange={(e) => set(name, e.target.value)}>
                <option value="">جميع الفروع</option>
                {catalog.data?.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label="أساس التاريخ">
            <select
              value={params.get('dateBasis') ?? 'sent'}
              onChange={(e) => set('dateBasis', e.target.value)}
            >
              <option value="sent">الإرسال الفعلي</option>
              <option value="received">الاستلام الفعلي</option>
              <option value="recorded">وقت التسجيل</option>
            </select>
          </Field>
          <TextField
            label="من تاريخ"
            type="date"
            value={params.get('from') ?? ''}
            onChange={(v) => set('from', v)}
          />
          <TextField
            label="إلى تاريخ"
            type="date"
            value={params.get('to') ?? ''}
            onChange={(v) => set('to', v)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setParams({})}>
          مسح الفلاتر
        </Button>
      </details>
      <TreasuryError error={data.error ?? catalog.error} />
      <Button type="button" variant="outline" onClick={() => void data.refetch()}>
        تحديث التحويلات
      </Button>
      {data.isLoading ? (
        <StatePanel state="pending" title="جارٍ تحميل التحويلات" />
      ) : (
        data.data && (
          <>
            <p className="treasury-total">
              {data.data.total} تحويل · المبلغ قيد النقل بهذه الفلاتر:{' '}
              {amount(data.data.transitMinor)}
            </p>
            {!data.data.items.length && (
              <StatePanel state="empty" title="لا توجد تحويلات بهذه الفلاتر" />
            )}
            <div className="finance-list">
              {data.data.items.map((t) => (
                <Link
                  className="finance-row"
                  key={t.id}
                  to={path(screen) + '/' + t.id}
                  state={{ back: path(screen) + (params.size ? '?' + params : '') }}
                >
                  <div>
                    <strong>
                      تحويل <bdi>{t.reference}</bdi>
                    </strong>
                    <span>
                      {t.sourceBranchName} ← {t.destinationBranchName}
                    </span>
                    <span>
                      {t.sourceAccountName} ← {t.destinationAccountName}
                    </span>
                    <span>
                      أرسل {t.senderName} · {formatTime(t.actualSentAt)}
                    </span>
                    {t.state === 'sent' && (
                      <span>
                        قيد النقل منذ{' '}
                        {Math.max(
                          0,
                          Math.floor((Date.now() - Date.parse(t.actualSentAt)) / 86400000),
                        )}{' '}
                        يوم
                      </span>
                    )}
                  </div>
                  <div>
                    {amount(t.amountMinor)}
                    <span>{stateName(t)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="finance-pagination">
              <Button
                type="button"
                variant="outline"
                disabled={data.data.page === 1}
                onClick={() => set('page', String(data.data!.page - 1))}
              >
                السابق
              </Button>
              <span>صفحة {data.data.page}</span>
              <Button
                type="button"
                variant="outline"
                disabled={data.data.page * data.data.limit >= data.data.total}
                onClick={() => {
                  const p = new URLSearchParams(params);
                  p.set('page', String(data.data!.page + 1));
                  setParams(p);
                }}
              >
                التالي
              </Button>
            </div>
          </>
        )
      )}
    </>
  );
}
export function TreasurySendPage() {
  const catalog = useCatalog('send');
  if (!catalog.data)
    return catalog.error ? (
      <TreasuryError error={catalog.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل الحسابات" />
    );
  return <SendForm catalog={catalog.data} refresh={() => catalog.refetch()} />;
}
function SendForm({
  catalog,
  refresh,
}: {
  catalog: TreasuryCatalog;
  refresh: () => Promise<unknown>;
}) {
  const navigate = useNavigate(),
    [sourceBranchId, setSourceBranch] = useState(''),
    [destinationBranchId, setDestinationBranch] = useState(''),
    [sourceAccountId, setSource] = useState(''),
    [destinationAccountId, setDestination] = useState(''),
    [money, setMoney] = useState(''),
    [sentAt, setSentAt] = useState(cairoInput),
    [review, setReview] = useState(false);
  const a = catalog.accounts.find((a) => a.id === sourceAccountId),
    b = catalog.accounts.find((a) => a.id === destinationAccountId);
  const mutation = useTreasuryMutation(
    (r) => navigate('/treasury/transfers/' + r.transferId, { state: { confirmed: true } }),
    'send',
  );
  const disabled = mutation.busy || !!mutation.pending;
  const draft = () => {
    const amountMinor = inputMinor(money);
    if (!a || !b || !sourceBranchId || !destinationBranchId || amountMinor === '0')
      throw Error('VALIDATION_FAILED');
    if (a.id === b.id || sourceBranchId === destinationBranchId) throw Error('SAME_TRANSFER_SCOPE');
    return {
      type: 'treasury.send' as const,
      transferId: crypto.randomUUID(),
      sourceAccountId: a.id,
      destinationAccountId: b.id,
      sourceBranchId,
      destinationBranchId,
      amountMinor,
      currency: 'EGP' as const,
      actualSentAt: cairoTimestamp(sentAt),
      expectedSourceVersion: a.version,
      expectedDestinationVersion: b.version,
    };
  };
  return (
    <>
      <PageHeading
        eyebrow="الخزينة · جميع فروع الشركة"
        title="إرسال تحويل أموال"
        description="سجّل الإرسال الذي حدث فعليًا. يصل الرصيد إلى الوجهة عند تأكيد الاستلام الكامل."
      />
      <form
        className="finance-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            draft();
            mutation.setError(null);
            setReview(true);
          } catch (error) {
            mutation.setError(error);
          }
        }}
      >
        <fieldset disabled={disabled || review}>
          <FormGroup
            title="المصدر والوجهة"
            description="هذه الشاشة تسمح بفروع الشركة كلها. اختر حسابًا مسموحًا لكل فرع."
          >
            <div className="commercial-fields">
              {(['source', 'destination'] as const).map((s) => (
                <div key={s} className="treasury-endpoint">
                  <Field label={s === 'source' ? 'فرع المصدر' : 'فرع الوجهة'}>
                    <select
                      required
                      value={s === 'source' ? sourceBranchId : destinationBranchId}
                      onChange={(e) => {
                        if (s === 'source') {
                          setSourceBranch(e.target.value);
                          setSource('');
                        } else {
                          setDestinationBranch(e.target.value);
                          setDestination('');
                        }
                      }}
                    >
                      <option value="">اختر الفرع</option>
                      {catalog.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={s === 'source' ? 'حساب المصدر' : 'حساب الوجهة'}>
                    <select
                      required
                      value={s === 'source' ? sourceAccountId : destinationAccountId}
                      onChange={(e) =>
                        s === 'source' ? setSource(e.target.value) : setDestination(e.target.value)
                      }
                    >
                      <option value="">اختر الحساب</option>
                      {catalog.accounts
                        .filter(
                          (a) =>
                            a.active &&
                            a.branchIds.includes(
                              s === 'source' ? sourceBranchId : destinationBranchId,
                            ),
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
              ))}
            </div>
            {a && <p>الرصيد المتاح بالمصدر: {amount(a.balanceMinor)}</p>}
          </FormGroup>
          <FormGroup title="الإرسال الفعلي" description="المبلغ الكامل والوقت بتوقيت القاهرة.">
            <TextField label="المبلغ بالجنيه" value={money} onChange={setMoney} required />
            <TextField
              label="وقت الإرسال الفعلي — القاهرة"
              type="datetime-local"
              value={sentAt}
              onChange={setSentAt}
              required
            />
          </FormGroup>
        </fieldset>
        <TreasuryError error={mutation.error} />
        {mutation.recovery}
        {!review && (
          <Button type="submit" disabled={disabled}>
            مراجعة الإرسال
          </Button>
        )}
        {review && a && b && (
          <section className="finance-confirm" aria-label="مراجعة الإرسال">
            <h2>مراجعة الإرسال</h2>
            <p>
              {catalog.branches.find((b) => b.id === sourceBranchId)?.name} · {a.name}
            </p>
            <p>
              إلى {catalog.branches.find((b) => b.id === destinationBranchId)?.name} · {b.name}
            </p>
            <p>
              {money} ج.م · {sentAt.replace('T', ' ')} بتوقيت القاهرة
            </p>
            <p>الرصيد المتاح بالمصدر: {amount(a.balanceMinor)}</p>
            <p>يُخصم المبلغ من المصدر ويبقى قيد النقل. رصيد الوجهة لا يزيد عند الإرسال.</p>
            <Button
              type="button"
              disabled={disabled}
              onClick={() => {
                try {
                  void mutation.submit(draft());
                } catch (error) {
                  mutation.setError(error);
                }
              }}
            >
              تأكيد الإرسال الفعلي
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => setReview(false)}
            >
              تعديل المدخلات
            </Button>
          </section>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setReview(false);
            void refresh();
          }}
        >
          تحديث الحسابات والمراجعة
        </Button>
      </form>
      <Link className="back-link" to="/treasury/transfers">
        العودة للتحويلات
      </Link>
    </>
  );
}
export function TreasuryDetailPage({ screen }: { screen: TreasuryScreen }) {
  const { id } = useParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId,
    location = useLocation(),
    [receivedAt, setReceivedAt] = useState(cairoInput),
    [confirmed, setConfirmed] = useState(false),
    [outcome, setOutcome] = useState('');
  const data = useQuery({
    queryKey: ['treasury-detail', company, id, screen, registry?.context.authorizationRevision],
    enabled: !!company && !!id,
    retry: false,
    queryFn: () =>
      treasuryApi<TreasuryTransfer>(`${path(screen)}/${id}?companyId=${company}`, 'detail'),
  });
  const mutation = useTreasuryMutation((r) => {
    setOutcome(r.outcome);
    setConfirmed(false);
    void data.refetch();
  }, 'receive:' + id);
  const t = data.data,
    back = (location.state as { back?: string } | null)?.back ?? path(screen);
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [t?.id]);
  if (!t)
    return data.error ? (
      <TreasuryError error={data.error} />
    ) : (
      <StatePanel state="pending" title="جارٍ تحميل التحويل" />
    );
  return (
    <>
      <div ref={heading} tabIndex={-1}>
        <PageHeading
          eyebrow="الخزينة · جميع فروع الشركة"
          title={'تحويل ' + t.reference}
          description={stateName(t)}
        />
      </div>
      {outcome && (
        <StatePanel
          state="ready"
          title={
            outcome === 'already_received' ? 'هذا التحويل مستلم بالفعل' : 'تم تأكيد الاستلام الكامل'
          }
        />
      )}
      <section className="finance-detail treasury-detail" aria-label="تفاصيل التحويل">
        <div className="treasury-value">
          {amount(t.amountMinor)}
          <span>{stateName(t)}</span>
        </div>
        <dl>
          <dt>المصدر</dt>
          <dd>
            {t.sourceBranchName}
            <br />
            {t.sourceAccountName}
          </dd>
          <dt>الوجهة الفعلية</dt>
          <dd>
            {t.destinationBranchName}
            <br />
            {t.destinationAccountName}
          </dd>
          <dt>قيد النقل</dt>
          <dd>{amount(t.transitMinor)}</dd>
          <dt>المرسل</dt>
          <dd>{t.senderName}</dd>
          <dt>الإرسال الفعلي</dt>
          <dd>{formatTime(t.actualSentAt)} — القاهرة</dd>
          {t.receipt && (
            <>
              <dt>المستلم</dt>
              <dd>{t.receipt.receiverName}</dd>
              <dt>الاستلام الفعلي</dt>
              <dd>{formatTime(t.receipt.actualReceivedAt)} — القاهرة</dd>
            </>
          )}
        </dl>
        {t.state === 'sent' && (
          <p>
            قيد النقل منذ{' '}
            {Math.max(0, Math.floor((Date.now() - Date.parse(t.actualSentAt)) / 86400000))} يوم. هذا
            المبلغ غير متاح للصرف في الوجهة.
          </p>
        )}
      </section>
      <section className="treasury-timeline" aria-label="تاريخ التحويل">
        <h2>تاريخ التحويل</h2>
        <ol>
          {t.history.map((h) => (
            <li key={h.transitId}>
              <strong>
                {h.phase === 'send'
                  ? 'إرسال فعلي — خُصم من المصدر'
                  : 'استلام كامل — أُضيف إلى الوجهة'}
              </strong>
              <p>
                {h.actorName} · {formatTime(h.actualAt)}
              </p>
              <small>سُجّل: {formatTime(h.recordedAt)}</small>
              <details>
                <summary>مراجع الحركة</summary>
                <p>
                  الحركة: <bdi>{h.movementId}</bdi>
                </p>
                <p>
                  المصدر: <bdi>{h.sourceId}</bdi>
                </p>
                <p>
                  القيد: <bdi>{h.effectId}</bdi>
                </p>
                <p>
                  النقل: <bdi>{h.transitId}</bdi>
                </p>
              </details>
            </li>
          ))}
        </ol>
      </section>
      <TreasuryError error={data.error ?? mutation.error} />
      {mutation.recovery}
      {screen === 'receive' && t.state === 'sent' && (
        <form
          className="finance-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              cairoTimestamp(receivedAt);
              setConfirmed(true);
              mutation.setError(null);
            } catch (error) {
              mutation.setError(error);
            }
          }}
        >
          <fieldset disabled={mutation.busy || !!mutation.pending || confirmed}>
            <FormGroup
              title="تأكيد الاستلام الفعلي"
              description="المبلغ ثابت. أكّد فقط بعد وصوله كاملًا إلى الحساب المحدد."
            >
              <p>المبلغ الكامل: {amount(t.amountMinor)}</p>
              <TextField
                label="وقت الاستلام الفعلي — القاهرة"
                type="datetime-local"
                value={receivedAt}
                onChange={setReceivedAt}
                required
              />
            </FormGroup>
          </fieldset>
          {!confirmed && (
            <Button type="submit" disabled={mutation.busy || !!mutation.pending}>
              مراجعة الاستلام الكامل
            </Button>
          )}
          {confirmed && (
            <section className="finance-confirm" aria-label="مراجعة الاستلام">
              <h2>مراجعة الاستلام الكامل</h2>
              <p>
                {amount(t.amountMinor)} إلى {t.destinationBranchName} · {t.destinationAccountName}
              </p>
              <p>{receivedAt.replace('T', ' ')} بتوقيت القاهرة</p>
              <Button
                type="button"
                disabled={mutation.busy || !!mutation.pending}
                onClick={() =>
                  void mutation.submit({
                    type: 'treasury.receive',
                    transferId: t.id,
                    expectedVersion: t.version,
                    actualReceivedAt: cairoTimestamp(receivedAt),
                    confirmFullReceipt: true,
                  })
                }
              >
                أؤكد وصول المبلغ كاملًا فعليًا
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.busy || !!mutation.pending}
                onClick={() => setConfirmed(false)}
              >
                رجوع للمراجعة
              </Button>
            </section>
          )}
        </form>
      )}
      {screen === 'send' &&
        t.state === 'sent' &&
        registry?.context.grants.includes('treasury.receive') && (
          <Link className="commercial-primary-link" to={'/treasury/receipts/' + t.id}>
            فتح شاشة الاستلام
          </Link>
        )}
      <p className="muted">
        إذا كان السجل خاطئًا أو عاد المال فعليًا، يلزم تصحيح مرتبط وأدلة حركة فعلية. مسار التسويات
        لم يُنفذ بعد.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={mutation.busy || !!mutation.pending}
        onClick={() => {
          setConfirmed(false);
          void data.refetch();
        }}
      >
        تحديث التحويل والمراجعة
      </Button>
      <Link className="back-link" to={back}>
        العودة للقائمة
      </Link>
    </>
  );
}
