import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  PageHeading as SharedHeading,
  Button,
  StatePanel as SharedState,
} from '@shahn/ui';
import {
  reportDefinition,
  reportDisplayText,
  reportContextDisplay,
  reportingResponseValidators,
  type ExportCommand,
  type ExportJob,
  type ReportColumn,
  type ReportDefinition,
  type ReportFilters,
  type ReportId,
  type ReportPage,
  type ReportRow,
  type ProfitSummary,
  type ProfitActualMoney,
  type ProfitReconciliationFinding,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import './reports.css';
import {
  ProfitFormula,
  ProfitOverview,
  ProfitMoney,
  ProfitReconciliation,
  profitCategoryLabels,
} from './profit-view.js';
const PageHeading = ({ title, description }: { title: string; description: string }) => (
  <SharedHeading eyebrow="التقارير" title={title} description={description} />
);
const StatePanel = ({
  title,
  detail,
  action,
  state = 'error',
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  state?: 'error' | 'empty';
}) => (
  <SharedState state={state} title={title} action={action}>
    {detail}
  </SharedState>
);

interface Option {
  id: string;
  name: string;
  kind?: string;
}
interface Catalog {
  reports: ReportDefinition[];
  branches: Option[];
  companyBranches: Option[];
  brands: Option[];
  drivers: Option[];
  accounts: Option[];
  references: Option[];
}
async function request<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  const r = await fetch('/api/v1/reports/' + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.code ?? 'REQUEST_FAILED');
  const responseKind = path.startsWith('catalog')
    ? 'catalog'
    : path.includes('/rows/')
      ? 'row'
      : path.startsWith('snapshots')
        ? 'page'
        : 'job';
  if (!reportingResponseValidators[responseKind](v)) throw new Error('INVALID_RESPONSE');
  return v;
}
const messages: Record<string, string> = {
  FORBIDDEN_SCOPE: 'هذه البيانات خارج صلاحياتك الحالية.',
  NOT_FOUND: 'اللقطة أو الملف غير متاح ضمن صلاحياتك.',
  REPORT_TOO_LARGE_NARROW_FILTERS: 'النتيجة كبيرة. ضيق الفترة أو الفروع ثم أنشئ لقطة جديدة.',
  EXPORT_EXPIRED: 'انتهت صلاحية الملف. أنشئ تصديراً جديداً من اللقطة.',
  INVALID_REPORT_FILTER: 'هذا الفلتر غير مناسب للتقرير.',
  INVALID_DATE_BASIS: 'اختر أساس تاريخ مناسباً.',
  VALIDATION_FAILED: 'راجع الفلاتر والتواريخ والقروش الصحيحة.',
};
const errorMessage = (e: unknown) =>
  messages[e instanceof Error ? e.message : ''] ?? 'تعذر التحميل. الفلاتر محفوظة؛ حاول مجدداً.';
function value(c: ReportColumn, v: string | null | undefined) {
  if (v == null) return 'غير معلوم';
  if (c.type === 'money') {
    const n = BigInt(v),
      a = n < 0n ? -n : n;
    return `${n < 0n ? '-' : ''}${a / 100n}.${(a % 100n).toString().padStart(2, '0')} ج.م`;
  }
  if (c.type === 'date' && v.includes('T'))
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Africa/Cairo',
    }).format(new Date(v));
  return reportDisplayText(c.key, v);
}
export function ReportsPage() {
  const { reportId } = useParams();
  return reportId ? <ReportWorkspace reportId={reportId as ReportId} /> : <ReportPicker />;
}
/** Existing desks explicitly open the frozen reporting view; API resolves its own authority. */
export function OperationalReportLink({
  reportId,
  params,
}: {
  reportId: ReportId;
  params: URLSearchParams;
}) {
  const { registry } = useAccess();
  const def = reportDefinition(reportId);
  if (!def.capabilities.every((c) => registry?.context.grants.includes(c as never))) return null;
  const filters: ReportFilters = {};
  for (const [source, target] of Object.entries({
    branchId: 'branchIds',
    brandId: 'brandIds',
    driverId: 'driverIds',
    accountId: 'accountIds',
    categoryId: 'categoryIds',
    method: 'methods',
    service: 'services',
  })) {
    const raw = params.get(source);
    if (raw && def.filters.includes(target as keyof ReportFilters))
      (filters as Record<string, unknown>)[target] = raw.split(',').filter(Boolean);
  }
  for (const k of ['from', 'to', 'minMinor', 'maxMinor'] as const)
    if (params.get(k) && def.filters.includes(k)) filters[k] = params.get(k)!;
  const search = params.get('search') ?? params.get('query');
  if (search && def.filters.includes('search')) filters.search = search;
  return (
    <Link
      className="commercial-primary-link"
      to={`/reports/${reportId}?${new URLSearchParams({ filters: JSON.stringify(filters) })}`}
    >
      فتح لقطة {def.title} للتصدير
    </Link>
  );
}
function ReportPicker() {
  const { registry } = useAccess(),
    company = registry?.context.companyId;
  const q = useQuery({
    queryKey: ['reports-catalog', company],
    enabled: !!company,
    queryFn: () => request<Catalog>('catalog?companyId=' + company),
    retry: false,
  });
  return (
    <PageContainer>
      <PageHeading
        title="التقارير"
        description="اختر تقريراً. العرض والتصدير من لقطة واحدة بتوقيت القاهرة."
      />
      {q.error ? (
        <StatePanel title="تعذر تحميل التقارير" detail={errorMessage(q.error)} />
      ) : (
        <div className="report-picker">
          {q.data?.reports
            .filter((r) => r.id !== 'REP-10')
            .map((r) => (
              <Link key={r.id} to={r.id === 'REP-09' ? '/brand-payouts?report=REP-09' : r.surface}>
                <strong>{r.title}</strong>
                <span>{r.id === 'REP-09' ? 'المستحق وتاريخ الصرف معاً' : r.dateMeaning}</span>
              </Link>
            ))}
        </div>
      )}
    </PageContainer>
  );
}
export function ReportWorkspace({ reportId }: { reportId: ReportId }) {
  const { registry, session } = useAccess(),
    company = registry?.context.companyId,
    principal = session?.principalId;
  const [params, setParams] = useSearchParams(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [jobId, setJobId] = useState('');
  const def = reportDefinition(reportId),
    key = params.get('filters') ?? '{}',
    snapshotId = params.get('snapshot') ?? '',
    category = reportId === 'REP-15' ? (params.get('category') ?? '') : '',
    page = Number(params.get('page') ?? 1),
    sort = params.get('sort') === 'dateDesc' ? 'dateDesc' : 'dateAsc';
  let filters: ReportFilters = {};
  try {
    filters = JSON.parse(key);
  } catch {
    /* API rejects unsupported fields; malformed URL restores default. */
  }
  const [draft, setDraft] = useState<ReportFilters>(filters);
  useEffect(() => {
    try {
      setDraft(JSON.parse(key));
    } catch {
      setDraft({});
    }
  }, [key]);
  const commandRef = useRef({ key: '', id: '' });
  const exportBusy = useRef(false);
  const exportIntents = useRef(new Map<string, ExportCommand>());
  const identityKey = `${principal}:${company}:${reportId}:${key}:${sort}:${params.get('refresh') ?? ''}`;
  if (commandRef.current.key !== identityKey) {
    let id = '';
    try {
      id = sessionStorage.getItem('report-snapshot:' + identityKey) ?? '';
    } catch {
      /* optional storage */
    }
    id ||= crypto.randomUUID();
    commandRef.current = { key: identityKey, id };
    try {
      sessionStorage.setItem('report-snapshot:' + identityKey, id);
    } catch {
      /* optional storage */
    }
  }
  const catalog = useQuery({
    queryKey: ['reports-catalog', company],
    enabled: !!company,
    queryFn: () => request<Catalog>('catalog?companyId=' + company),
    retry: false,
  });
  const q = useQuery({
    queryKey: [
      'report-page',
      company,
      reportId,
      key,
      sort,
      snapshotId,
      page,
      identityKey,
      category,
    ],
    enabled: !!company && !!def,
    queryFn: () =>
      snapshotId
        ? request<ReportPage>(
            `snapshots/${snapshotId}${category ? '/category/' + encodeURIComponent(category) : ''}?companyId=${company}&page=${page}`,
          )
        : request<ReportPage>(
            'snapshots',
            {
              schemaVersion: 1,
              companyId: company,
              commandId: commandRef.current.id,
              type: 'report.snapshot',
              reportId,
              filters,
              sort,
            },
            session?.csrfToken,
          ),
    retry: false,
  });
  useEffect(() => {
    if (q.data && !snapshotId) {
      const next = new URLSearchParams(params);
      next.set('snapshot', q.data.snapshot.id);
      setParams(next, { replace: true });
    }
  }, [q.data, snapshotId, params, setParams]);
  useEffect(() => {
    try {
      setJobId(sessionStorage.getItem(`report-last-job:${principal}:${snapshotId}`) ?? '');
    } catch {
      setJobId('');
    }
    setError('');
  }, [snapshotId, principal]);
  const job = useQuery({
    queryKey: ['report-job', company, jobId],
    enabled: !!company && !!jobId,
    queryFn: () => request<ExportJob>(`exports/${jobId}?companyId=${company}`),
    refetchInterval: (q) =>
      ['pending', 'running'].includes(q.state.data?.state ?? 'pending') ? 1000 : false,
    retry: false,
  });
  const set = (k: keyof ReportFilters, v: unknown) => setDraft((p) => ({ ...p, [k]: v }));
  const apply = (reset = false) => {
    const next = new URLSearchParams(params);
    next.set('filters', JSON.stringify(reset ? {} : draft));
    next.delete('snapshot');
    next.delete('category');
    next.delete('overviewPage');
    next.delete('page');
    next.set('refresh', crypto.randomUUID());
    setParams(next);
  };
  const fresh = () => {
    const next = new URLSearchParams(params);
    next.delete('snapshot');
    next.delete('category');
    next.delete('overviewPage');
    next.delete('page');
    next.set('refresh', crypto.randomUUID());
    setParams(next);
  };
  const exportFile = async (format: 'xlsx' | 'pdf') => {
    if (!q.data || exportBusy.current || !company) return;
    exportBusy.current = true;
    setBusy(true);
    setError('');
    const storageKey = `report-export:${principal}:${q.data.snapshot.id}:${format}`;
    let input: ExportCommand;
    try {
      let stored: ExportCommand | null = null;
      try {
        stored = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      } catch {
        /* optional storage */
      }
      input = exportIntents.current.get(storageKey) ??
        stored ?? {
          schemaVersion: 1,
          commandId: crypto.randomUUID(),
          companyId: company,
          type: 'report.export',
          snapshotId: q.data.snapshot.id,
          filterDigest: q.data.snapshot.filterDigest,
          format,
        };
      exportIntents.current.set(storageKey, input);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(input));
      } catch {
        /* retained in memory */
      }
      const result = await request<ExportJob>('exports', input, session?.csrfToken);
      setJobId(result.id);
      try {
        sessionStorage.setItem(`report-last-job:${principal}:${q.data.snapshot.id}`, result.id);
      } catch {
        /* optional storage */
      }
    } catch (e) {
      setError('لم تصل نتيجة التصدير. إعادة المحاولة تستخدم نفس معرف الطلب. ' + errorMessage(e));
    } finally {
      exportBusy.current = false;
      setBusy(false);
    }
  };
  const retryJob = async () => {
    if (!job.data) return;
    exportIntents.current.delete(
      `report-export:${principal}:${q.data?.snapshot.id}:${job.data.format}`,
    );
    try {
      sessionStorage.removeItem(
        `report-export:${principal}:${q.data?.snapshot.id}:${job.data.format}`,
      );
    } catch {
      /* optional storage */
    }
    await exportFile(job.data.format);
  };
  if (!def) return <StatePanel title="التقرير غير مختار لهذه المرحلة" />;
  const visibleTotal = q.data?.filteredTotalRows ?? q.data?.snapshot.totalRows ?? 0;
  const categoryHref = (selected: string) => {
    const next = new URLSearchParams(params);
    next.set('category', selected);
    next.set('overviewPage', String(page));
    next.set('page', '1');
    return '/reports/REP-15?' + next;
  };
  const categoryBack = () => {
    const next = new URLSearchParams(params);
    next.set('page', next.get('overviewPage') ?? '1');
    next.delete('category');
    next.delete('overviewPage');
    return '/reports/REP-15?' + next;
  };
  const options = (k: keyof ReportFilters): Option[] => {
    const c = catalog.data;
    if (!c) return [];
    if (k === 'branchIds') return def.scope === 'wallet' ? c.companyBranches : c.branches;
    if (k === 'brandIds') return c.brands;
    if (k === 'driverIds') return c.drivers;
    if (k === 'accountIds') return c.accounts;
    if (k === 'categoryIds') return c.references.filter((r) => r.kind === 'expense_category');
    if (k === 'governorateIds') return c.references.filter((r) => r.kind === 'governorate');
    if (k === 'areaIds') return c.references.filter((r) => r.kind === 'area');
    const lists: Partial<Record<keyof ReportFilters, string[]>> = {
      services: ['brand_packed', 'company_packed', 'stored_stock'],
      statuses:
        reportId === 'REP-09'
          ? ['eligible', 'held', 'pending', 'empty']
          : reportId === 'REP-05'
            ? [
                'open',
                'closed',
                'full',
                'partial',
                'refused',
                'no-answer',
                'prepared',
                'in_transit',
              ]
            : ['active', 'cancelled'],
      methods: ['cash', 'bank_deposit', 'instapay'],
      conditions: ['sound', 'damaged', 'unknown'],
      kinds:
        reportId === 'REP-05'
          ? ['visit', 'round', 'internal_transfer']
          : [
              'goods_credit',
              'brand_fee',
              'compensation',
              'adjustment',
              'correction',
              'payout',
              'general_deposit',
              'general_withdrawal',
              'treasury_send',
              'treasury_receive',
              'expense',
              'remittance',
            ],
    };
    const field =
      (
        {
          services: 'service',
          statuses: 'status',
          methods: 'method',
          conditions: 'condition',
          kinds: 'kind',
        } as Record<string, string>
      )[k] ?? k;
    return (lists[k] ?? []).map((x) => ({ id: x, name: reportDisplayText(field, x) }));
  };
  const labels: Record<string, string> = {
    branchIds: 'الفروع',
    brandIds: 'البراندات',
    driverIds: 'السائقون',
    accountIds: 'الحسابات',
    categoryIds: 'فئات المصروف',
    services: 'الخدمات',
    statuses: 'الحالات',
    methods: 'طرق الدفع',
    governorateIds: 'المحافظات',
    areaIds: 'المناطق',
    conditions: 'حالة الاستلام',
    kinds: 'أنواع الحركة',
    minMinor: 'الحد الأدنى - قروش صحيحة',
    maxMinor: 'الحد الأقصى - قروش صحيحة',
  };
  return (
    <PageContainer>
      <PageHeading
        title={category ? (profitCategoryLabels[category] ?? category) : def.title}
        description={
          category ? 'مصادر الفئة من نفس لقطة الربح؛ الفلاتر والفترة محفوظة.' : def.dateMeaning
        }
      />
      {category && <Link to={categoryBack()}>عودة إلى ملخص الربح والفلاتر</Link>}
      <Link to="/reports">اختيار تقرير آخر</Link>
      <form
        className="report-filters"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        {def.filters.includes('search') && (
          <label>
            بحث
            <input value={draft.search ?? ''} onChange={(e) => set('search', e.target.value)} />
          </label>
        )}
        {def.filters.includes('from') && (
          <>
            <label>
              من تاريخ
              <input
                type="date"
                value={draft.from ?? ''}
                onChange={(e) => set('from', e.target.value)}
              />
            </label>
            <label>
              إلى تاريخ
              <input
                type="date"
                value={draft.to ?? ''}
                onChange={(e) => set('to', e.target.value)}
              />
            </label>
          </>
        )}
        {def.filters.includes('dateBasis') && (
          <label>
            أساس التاريخ
            <select
              value={draft.dateBasis ?? def.dateBases[0]}
              onChange={(e) => set('dateBasis', e.target.value)}
            >
              {def.dateBases.map((b) => (
                <option key={b} value={b}>
                  {(
                    {
                      actual: 'تاريخ الدفع الفعلي',
                      recorded: 'وقت التسجيل',
                      created: 'إنشاء الشحنة',
                      lastState: 'آخر حالة مسجلة',
                      effective:
                        reportId === 'REP-15' ? 'فترة الاستحقاق التشغيلي' : 'تاريخ الحركة الفعال',
                      visit: 'الزيارة الفعلية',
                      round: 'بداية الجولة',
                      receipt: 'الاستلام الفعلي',
                      offered: 'عرض المرتجع',
                    } as Record<string, string>
                  )[b] ?? b}
                </option>
              ))}
            </select>
          </label>
        )}
        {reportId === 'REP-15' && (
          <label>
            نطاق الشركة / الفرع
            <select
              aria-label="نطاق الشركة / الفرع"
              value={draft.branchIds?.length === 1 ? draft.branchIds[0] : ''}
              onChange={(e) => set('branchIds', e.target.value ? [e.target.value] : [])}
            >
              <option value="">كافة الفروع المصرح بها</option>
              {options('branchIds').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <details>
          <summary>
            فلاتر متقدمة (
            {
              Object.keys(draft).filter(
                (k) =>
                  Array.isArray(draft[k as keyof ReportFilters]) &&
                  draft[k as keyof ReportFilters]?.length,
              ).length
            }
            )
          </summary>
          <div className="report-advanced">
            {def.filters
              .filter(
                (k) =>
                  !['search', 'from', 'to', 'dateBasis'].includes(k) &&
                  !(reportId === 'REP-15' && k === 'branchIds'),
              )
              .map((k) =>
                k === 'minMinor' || k === 'maxMinor' ? (
                  <label key={k}>
                    {labels[k]}
                    <input
                      inputMode="numeric"
                      aria-label={labels[k]}
                      value={draft[k] ?? ''}
                      onChange={(e) => set(k, e.target.value)}
                    />
                  </label>
                ) : (
                  <label key={k}>
                    {labels[k]}
                    <select
                      multiple
                      aria-label={labels[k]}
                      value={(draft[k] ?? []) as string[]}
                      onChange={(e) =>
                        set(
                          k,
                          Array.from(e.target.selectedOptions, (o) => o.value),
                        )
                      }
                    >
                      {options(k).map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ),
              )}
          </div>
        </details>
        <label>
          ترتيب التاريخ
          <select
            aria-label="ترتيب التاريخ"
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set('sort', e.target.value);
              next.delete('snapshot');
              next.delete('page');
              next.set('refresh', crypto.randomUUID());
              setParams(next);
            }}
          >
            <option value="dateAsc">الأقدم أولاً</option>
            <option value="dateDesc">الأحدث أولاً</option>
          </select>
        </label>
        <div className="report-actions">
          <Button type="submit">تطبيق الفلاتر</Button>
          <Button type="button" variant="outline" onClick={() => apply(true)}>
            مسح الفلاتر
          </Button>
        </div>
      </form>
      {q.isFetching && <p role="status">جارٍ تحميل اللقطة…</p>}
      {q.error && (
        <StatePanel
          title="تعذر تحميل التقرير"
          detail={errorMessage(q.error)}
          action={<Button onClick={() => void q.refetch()}>إعادة المحاولة</Button>}
        />
      )}
      {q.data && !q.error && (
        <>
          <section className="report-context">
            <p>
              {q.data.snapshot.companyName} · لقطة بتاريخ <bdi>{q.data.snapshot.asOf}</bdi> ·{' '}
              {visibleTotal} صف · EGP
            </p>
            <p>
              {q.data.snapshot.scope.completeCompany
                ? 'نطاق الشركة الكامل'
                : 'نطاق الفروع المصرح بها المختارة'}
            </p>
            <p>{def.formula}</p>
            {reportId === 'REP-15' && <ProfitFormula />}
            {reportId === 'REP-15' ? (
              <p aria-label="الفلاتر المطبقة">
                الفترة: <bdi>{q.data.snapshot.filters.from ?? 'دون حد بداية'}</bdi> إلى{' '}
                <bdi>{q.data.snapshot.filters.to ?? 'دون حد نهاية'}</bdi> · أساس التاريخ:{' '}
                {q.data.snapshot.dateBasis === 'recorded'
                  ? 'وقت التسجيل'
                  : 'فترة الاستحقاق التشغيلي'}
                {' · '}الفروع:{' '}
                {q.data.snapshot.filters.branchIds?.length
                  ? (q.data.snapshot.context['profit'] as ProfitSummary).branches
                      .filter(
                        (b) =>
                          b.branchId && q.data.snapshot.filters.branchIds?.includes(b.branchId),
                      )
                      .map((b) => b.branchName)
                      .join('، ')
                  : 'جميع الفروع ضمن صلاحيات هذه اللقطة'}
              </p>
            ) : (
              <p>
                الفلاتر المطبقة: <bdi>{JSON.stringify(q.data.snapshot.filters)}</bdi>
              </p>
            )}
            {!q.data.snapshot.coverage.complete && (
              <p role="status">البيانات غير مكتملة: {q.data.snapshot.coverage.flags.join(' · ')}</p>
            )}
            <div className="report-actions">
              <Button onClick={fresh} variant="outline">
                تحديث وإنشاء لقطة جديدة
              </Button>
              <Button disabled={busy} onClick={() => void exportFile('xlsx')}>
                تصدير XLSX
              </Button>
              <Button disabled={busy} onClick={() => void exportFile('pdf')}>
                طباعة / PDF
              </Button>
            </div>
          </section>
          {category && (
            <p>
              التصدير يشمل كل الصفوف المختارة بفلاتر لقطة الربح. فتح الفئة يركز العرض على مصادرها
              فقط.
            </p>
          )}
          {reportId === 'REP-15' && !category && (
            <ProfitOverview
              profit={q.data.snapshot.context['profit'] as ProfitSummary}
              categoryHref={categoryHref}
            />
          )}
          {(
            reportId === 'REP-15' && !category
              ? q.data.snapshot.totalRows === 0
              : !q.data.rows.length
          ) ? (
            <StatePanel
              state="empty"
              title="لا توجد بيانات لهذه الفلاتر"
              detail="الفلاتر محفوظة. يمكنك مسحها أو اختيار فترة أخرى."
            />
          ) : reportId !== 'REP-15' || category ? (
            <div className="report-rows">
              {q.data.rows.map((r, i) => (
                <article key={r.id}>
                  <dl>
                    {def.columns.map((c) => (
                      <div key={c.key}>
                        <dt>{c.title}</dt>
                        <dd>
                          <bdi>{value(c, r.values[c.key])}</bdi>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    to={`/reports/snapshots/${q.data.snapshot.id}/rows/${r.ordinal ?? (page - 1) * q.data.limit + i + 1}?${params}&report=${reportId}`}
                  >
                    تفاصيل ومصادر
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
          <div className="report-totals" aria-label="إجماليات اللقطة">
            {def.columns
              .filter((c) => c.total)
              .map((c) => (
                <p key={c.key}>
                  {c.title}:{' '}
                  <strong>
                    <bdi>{value(c, q.data.snapshot.totals[c.key])}</bdi>
                  </strong>
                </p>
              ))}
          </div>
          {reportId !== 'REP-15' && reportContextDisplay(q.data.snapshot).length > 0 && (
            <details>
              <summary>الأرصدة والسياق داخل اللقطة</summary>
              {reportContextDisplay(q.data.snapshot).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </details>
          )}
          {reportId === 'REP-15' && !category && (
            <>
              <ProfitMoney money={q.data.snapshot.context['actualMoney'] as ProfitActualMoney} />
              <ProfitReconciliation
                findings={
                  q.data.snapshot.context['reconciliation'] as ProfitReconciliationFinding[]
                }
                asOf={q.data.snapshot.asOf}
              />
            </>
          )}
          <details>
            <summary>تغطية المصادر وآخر تحديث</summary>
            <pre className="report-json">
              {JSON.stringify(q.data.snapshot.coverage.revisions, null, 2)}
            </pre>
          </details>
          {(reportId !== 'REP-15' || category) && (
            <div className="report-actions">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => {
                  const n = new URLSearchParams(params);
                  n.set('page', String(page - 1));
                  setParams(n);
                }}
              >
                السابق
              </Button>
              <span>
                صفحة {page} من {Math.max(1, Math.ceil(visibleTotal / q.data.limit))}
              </span>
              <Button
                variant="outline"
                disabled={page * q.data.limit >= visibleTotal}
                onClick={() => {
                  const n = new URLSearchParams(params);
                  n.set('page', String(page + 1));
                  setParams(n);
                }}
              >
                التالي
              </Button>
            </div>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {job.error && <p role="alert">{errorMessage(job.error)}</p>}
      {job.data && (
        <section className="report-context" role="status">
          <p>
            {
              (
                {
                  pending: 'التصدير في الانتظار',
                  running: 'جارٍ تجهيز الملف',
                  completed: 'الملف جاهز',
                  failed: 'فشل تجهيز الملف',
                  expired: 'انتهت صلاحية الملف',
                } as const
              )[job.data.state]
            }
          </p>
          <p>
            صلاحية الملف حتى: <bdi>{job.data.expiresAt}</bdi>
          </p>
          {job.data.downloadUrl && (
            <a href={job.data.downloadUrl} download>
              تنزيل {job.data.format.toUpperCase()}
            </a>
          )}
          {['failed', 'expired'].includes(job.data.state) && (
            <Button onClick={() => void retryJob()}>إعادة تجهيز الملف</Button>
          )}
        </section>
      )}
    </PageContainer>
  );
}
export function ReportRowPage() {
  const { snapshotId, ordinal } = useParams(),
    [params] = useSearchParams(),
    { registry } = useAccess(),
    company = registry?.context.companyId;
  const q = useQuery({
    queryKey: ['report-row', snapshotId, ordinal, company],
    enabled: !!company,
    queryFn: () =>
      request<ReportRow>(`snapshots/${snapshotId}/rows/${ordinal}?companyId=${company}`),
    retry: false,
  });
  const reportId = params.get('report') ?? 'REP-14',
    back =
      reportId === 'REP-09' || reportId === 'REP-10' ? '/brand-payouts' : '/reports/' + reportId;
  return (
    <PageContainer>
      <PageHeading title="تفاصيل صف التقرير" description="القيم والمصادر من نفس اللقطة." />
      <Link to={`${back}?${params}`}>عودة إلى التقرير والفلاتر</Link>
      {q.error ? (
        <StatePanel title="تعذر تحميل التفاصيل" detail={errorMessage(q.error)} />
      ) : (
        q.data && (
          <>
            <dl className="report-detail">
              {(reportDefinition(reportId as ReportId)?.columns ?? []).map((c) => (
                <div key={c.key}>
                  <dt>{c.title}</dt>
                  <dd>
                    <bdi>{value(c, q.data!.values[c.key])}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
            <p>المراجعة: {q.data.revision}</p>
            <p>التاريخ الفعال: {q.data.effectiveAt ?? 'غير معلوم'}</p>
            <p>وقت التسجيل: {q.data.recordedAt ?? 'غير معلوم'}</p>
            {q.data.economicEffect && (
              <>
                <p>
                  هوية الأثر: <bdi>{q.data.economicEffect.effectId}</bdi>
                </p>
                <p>
                  فرع الاستحقاق التاريخي:{' '}
                  <bdi>{q.data.economicEffect.historicalBranchId ?? 'غير منسوب؛ يحتاج مراجعة'}</bdi>
                </p>
                <p>
                  دفعة القيد:{' '}
                  <bdi>
                    {q.data.economicEffect.postingBatchId ?? 'لا توجد دفعة مالية لهذا المصدر'}
                  </bdi>
                </p>
                {q.data.economicEffect.correctionOf.length > 0 && (
                  <p>
                    مرتبط بتصحيح المصادر:{' '}
                    <bdi>{q.data.economicEffect.correctionOf.join(' · ')}</bdi>
                  </p>
                )}
                {q.data.economicEffect.sourcePath && (
                  <Link to={q.data.economicEffect.sourcePath}>فتح سجل المصدر المصرح به</Link>
                )}
              </>
            )}
            <pre className="report-json">{q.data.sourceIds.join('\n')}</pre>
          </>
        )
      )}
    </PageContainer>
  );
}
