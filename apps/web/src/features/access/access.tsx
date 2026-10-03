import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useId,
  isValidElement,
  cloneElement,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Users as UsersIcon, ShieldCheck } from 'lucide-react';
import {
  UtilityHeader,
  PageContainer,
  PageHeading,
  ModuleCard,
  StatePanel,
  Button,
  FormGroup,
  Input,
  ResponsiveList,
} from '@shahn/ui';
import type { AccessCommand, CapabilityId, Exceptions, CommandResult } from '@shahn/contracts';
import { effectiveGrants } from '@shahn/domain';
import {
  api,
  sendCommand,
  errorText,
  ApiError,
  type Registry,
  type Session,
  type Users,
  type User,
  type Role,
} from './api.js';
import './access.css';
const Access = createContext<{
  registry: Registry | undefined;
  session: Session | undefined;
  authorityError: unknown;
  refresh: () => Promise<void>;
}>({ registry: undefined, session: undefined, authorityError: null, refresh: async () => {} });
export const useAccess = () => useContext(Access);
export function AccessShell() {
  const location = useLocation(),
    navigate = useNavigate(),
    client = useQueryClient();
  const session = useQuery({
    queryKey: ['access-session'],
    queryFn: () => api<Session>('/session'),
    retry: false,
    refetchOnWindowFocus: true,
  });
  const registry = useQuery({
    queryKey: ['access-context'],
    queryFn: () => api<Registry>('/context'),
    enabled: !!session.data?.companyId,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const currentRegistry =
    registry.data?.context.principalId === session.data?.principalId ? registry.data : undefined;
  // A newly authenticated support session deliberately starts without company scope.
  // Preserve its current draft until the human explicitly selects a different company.
  const viewCompany = session.data?.companyId ?? currentRegistry?.context.companyId;
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['access-session'] });
    await client.invalidateQueries({ queryKey: ['access-context'] });
  };
  const revision = registry.data?.context.authorizationRevision,
    previous = useRef(revision);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (previous.current && revision && previous.current !== revision) setChanged(true);
    previous.current = revision;
  }, [revision]);
  useEffect(() => {
    document.querySelector<HTMLHeadingElement>('h1')?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const logout = async (global: boolean) => {
    if (!session.data) return;
    try {
      const result = await api<{ url: string }>(
        global ? '/global-signout' : '/logout',
        {},
        session.data.csrfToken,
      );
      client.clear();
      window.location.assign(result.url);
    } catch {
      await refresh();
    }
  };
  return (
    <Access.Provider
      value={{
        // Keep the same identity's form metadata mounted during reauthentication.
        // Every request still goes through current server authorization.
        registry: currentRegistry,
        session: session.data,
        authorityError: session.error ?? registry.error,
        refresh,
      }}
    >
      <a className="skip-link" href="#main-content">
        انتقل للمحتوى
      </a>
      <UtilityHeader
        home={
          <Link to="/" className="wordmark">
            <span>
              <Package size={25} />
            </span>
            <strong>
              شحن<span>مساحة العمل</span>
            </strong>
          </Link>
        }
        context={
          <span>
            {registry.data?.context.companyName ?? 'دخول الشركة'}
            <small>
              {session.data?.kind === 'support'
                ? 'الدعم الفني · Technical Support'
                : (registry.data?.context.displayName ?? 'هوية الشركة المشتركة')}
            </small>
          </span>
        }
      />
      <PageContainer home={location.pathname === '/'}>
        {location.pathname !== '/' && (
          <button className="back-link" onClick={() => navigate('/')}>
            العودة للرئيسية
          </button>
        )}
        {registry.data?.context.supportExpiresAt && (
          <StatePanel state="pending" title="جلسة دعم فني نشطة">
            تنتهي {new Date(registry.data.context.supportExpiresAt).toLocaleTimeString('ar-EG')} ·
            جميع الإجراءات مسجلة باسم الدعم الفني.
          </StatePanel>
        )}
        {changed && (
          <StatePanel state="ready" title="تغيّرت الصلاحيات أو الفروع">
            تم تحديث الاختيارات. راجع النموذج قبل إرساله.
            <button onClick={() => setChanged(false)}>فهمت</button>
          </StatePanel>
        )}
        <Outlet key={`${session.data?.principalId ?? 'anonymous'}:${viewCompany ?? 'none'}`} />
        {session.data && (
          <details className="account-menu">
            <summary>الحساب والجلسة</summary>
            <div>
              <Button type="button" variant="outline" onClick={() => void refresh()}>
                تحديث الصلاحيات
              </Button>
              <Button type="button" variant="outline" onClick={() => void logout(false)}>
                خروج من ERP
              </Button>
              <Button type="button" variant="outline" onClick={() => void logout(true)}>
                خروج من الهوية المشتركة
              </Button>
            </div>
            <p>الخروج من الهوية المشتركة إجراء منفصل قد ينهي دخول تطبيقات الشركة الأخرى.</p>
          </details>
        )}
      </PageContainer>
      <footer className="page-footer">
        <span>شحن · إدارة الوصول</span>
        <span>
          <ShieldCheck size={14} />
          جلسة خاصة بالشركة
        </span>
      </footer>
    </Access.Provider>
  );
}
export function Reauthenticate() {
  const { refresh, session } = useAccess();
  return (
    <div className="access-actions">
      <a
        className="back-link"
        href={`${session?.kind === 'support' ? '/support/login' : '/login'}?return=/auth-complete`}
        target="_blank"
        rel="noreferrer"
      >
        إعادة تسجيل الدخول مع إبقاء النموذج
      </a>
      <Button type="button" variant="outline" onClick={() => void refresh()}>
        تم الدخول — تحديث
      </Button>
    </div>
  );
}
export function ErrorPanel({ error }: { error: unknown }) {
  const { refresh } = useAccess();
  const auth = error instanceof ApiError && error.status === 401;
  return (
    <StatePanel state="error" title={errorText(error)}>
      {auth ? (
        <Reauthenticate />
      ) : (
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          تحديث البيانات والصلاحيات
        </Button>
      )}
    </StatePanel>
  );
}
export function Login({ support = false }: { support?: boolean }) {
  const [companyCode, setCompany] = useState(''),
    [username, setUsername] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(
      new URLSearchParams(window.location.search).has('error')
        ? new ApiError('LOGIN_FAILED', 401)
        : null,
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await api<{ url: string }>('/login', {
        companyCode,
        username,
        support,
        returnPath: new URLSearchParams(window.location.search).get('return') ?? '/',
      });
      window.location.assign(result.url);
    } catch (error) {
      setError(error);
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={support ? 'دعم تقني' : 'دخول الشركة'}
        title={support ? 'دخول الدعم الفني' : 'أهلًا بيك في شحن'}
        description={
          support
            ? 'حساب مستقل مع تحقق بخطوتين وجلسة شركة محددة المدة.'
            : 'أدخل كود الشركة واسم المستخدم، ثم أكمل كلمة المرور لدى مزوّد هوية الشركة.'
        }
      />
      <form className="access-form narrow-form" onSubmit={(e) => void submit(e)}>
        {!support && (
          <Field label="كود الشركة">
            <Input
              required
              value={companyCode}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              maxLength={40}
              dir="ltr"
            />
          </Field>
        )}
        <Field label="اسم المستخدم">
          <Input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={80}
            dir="ltr"
          />
        </Field>
        {Boolean(error) && (
          <StatePanel state="error" title="تعذر تسجيل الدخول">
            راجع بيانات الدخول أو حاول لاحقًا. لا يتم تأكيد وجود شركة أو مستخدم من هذه الصفحة.
          </StatePanel>
        )}
        <Button disabled={pending} type="submit">
          {pending ? 'جارٍ فتح تسجيل الدخول…' : 'متابعة تسجيل الدخول'}
        </Button>
      </form>
      {!support && (
        <Link className="back-link" to="/support/login">
          دخول الدعم الفني
        </Link>
      )}
    </>
  );
}
export function AuthComplete() {
  return (
    <>
      <PageHeading
        eyebrow="الجلسة"
        title="تم تسجيل الدخول"
        description="ارجع إلى نافذة النموذج واضغط تحديث. يمكنك إغلاق هذه النافذة."
      />
      <Link to="/">الرئيسية</Link>
    </>
  );
}
export function AccessHome() {
  const { registry, session, authorityError } = useAccess();
  if (!session) return <Login />;
  if (authorityError) return <ErrorPanel error={authorityError} />;
  if (session.kind === 'support' && !registry) return <Support />;
  if (!registry)
    return (
      <StatePanel state="pending" title="جارٍ تحميل صلاحياتك">
        <Reauthenticate />
      </StatePanel>
    );
  const ctx = registry.context,
    cards = registry.capabilities.filter((c) => c.implemented && ctx.grants.includes(c.id));
  return (
    <>
      <PageHeading
        eyebrow="مساحة العمل"
        title={`أهلًا ${ctx.principalKind === 'support' ? 'بالدعم الفني' : ctx.displayName}`}
        description="اختر المهمة التي تريد إنجازها."
      />
      <BranchContext />
      <div className="module-grid">
        {cards.map((c) => (
          <Link key={c.id} className="module-card" to={c.route}>
            <ModuleCard
              title={c.title}
              description={
                c.id === 'access.users'
                  ? 'المستخدمون والفروع وحالة تجهيز الهوية'
                  : 'أدوار قابلة للتسمية وصلاحيات الشاشات'
              }
              icon={<UsersIcon size={26} />}
            >
              فتح الشاشة
            </ModuleCard>
          </Link>
        ))}
      </div>
      {!cards.length && (
        <StatePanel state="empty" title="لا توجد وحدات متاحة حاليًا">
          تظهر هنا الشاشات المنفذة المسموح لك بها. الوحدات التشغيلية الأخرى ستتاح في مراحلها.
        </StatePanel>
      )}
      {session.kind === 'support' && (
        <Link className="back-link" to="/support">
          إدارة جلسة الدعم والفروع
        </Link>
      )}
    </>
  );
}
export function BranchContext() {
  const { registry } = useAccess();
  const [selected, setSelected] = useState('');
  const branches = registry?.context.assignedBranches ?? [];
  return (
    <section className="branch-context">
      <label>
        نطاق الفروع{' '}
        {branches.length === 1 ? (
          <strong>{branches[0]?.name}</strong>
        ) : (
          <select
            aria-label="سياق الفرع"
            value={branches.some((b) => b.id === selected) ? selected : (branches[0]?.id ?? '')}
            onChange={(e) => setSelected(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </label>
      <small>نطاق العمليات العادية · صلاحيات الشاشة تُراجع عند كل طلب</small>
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="access-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children}
    </div>
  );
}
function useCommand(showRecovery = true) {
  const { session, refresh } = useAccess();
  // Persist only the recovery identity. Form values and the resendable payload stay in memory.
  // Support company selection itself may commit before its response is lost.
  // Scope this marker to the principal so that selected-company refresh cannot hide it.
  const key = session ? `access-pending:${session.principalId}` : null;
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<CommandResult | null>(null),
    [intent, setIntent] = useState<AccessCommand | null>(null),
    [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setPendingId(key ? sessionStorage.getItem(key) : null);
    sync();
    window.addEventListener('access-pending', sync);
    return () => window.removeEventListener('access-pending', sync);
  }, [key]);
  const retain = (id: string | null) => {
    if (key) {
      if (id) sessionStorage.setItem(key, id);
      else sessionStorage.removeItem(key);
    }
    setPendingId(id);
    window.dispatchEvent(new Event('access-pending'));
  };
  const completed = async (r: CommandResult) => {
    setResult(r);
    setIntent(null);
    retain(null);
    setError(null);
    await refresh();
  };
  const failed = (e: unknown) => {
    setError(e);
    if (e instanceof ApiError && e.code !== 'RESULT_UNKNOWN') {
      setIntent(null);
      retain(null);
    }
  };
  const run = async (command: AccessCommand) => {
    if (intent || pendingId || (key && sessionStorage.getItem(key))) return;
    setIntent(command);
    setBusy(true);
    setError(null);
    try {
      if (!session) throw new ApiError('AUTHENTICATION_REQUIRED', 401);
      retain(command.commandId);
      const r = await sendCommand(command, session.csrfToken);
      await completed(r);
      return r;
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pendingId) return;
    setBusy(true);
    try {
      const r = await api<CommandResult>('/commands/' + pendingId);
      await completed(r);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const retrySame = async () => {
    if (!intent || !session) return;
    setBusy(true);
    try {
      const r = await sendCommand(intent, session.csrfToken);
      await completed(r);
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  };
  return {
    run,
    busy,
    locked: !!intent || !!pendingId,
    result,
    feedback: (
      <>
        {Boolean(error) && <ErrorPanel error={error} />}{' '}
        {showRecovery && pendingId && !busy && (
          <div className="access-actions">
            <p>
              يوجد طلب لم تُسترد نتيجته بعد. مرجعه: <bdi>{pendingId}</bdi>
            </p>
            <Button type="button" onClick={() => void recover()}>
              فحص نتيجة الطلب
            </Button>
            {intent && (
              <Button type="button" variant="outline" onClick={() => void retrySame()}>
                إعادة نفس الطلب المحفوظ
              </Button>
            )}
          </div>
        )}
        {result && (
          <StatePanel
            state={
              result.state === 'pending'
                ? 'pending'
                : result.state === 'rejected'
                  ? 'error'
                  : 'ready'
            }
            title={
              result.state === 'pending'
                ? 'حُفظ المستخدم — تجهيز الهوية معلق'
                : result.state === 'rejected'
                  ? 'تحتاج الهوية إلى مراجعة'
                  : 'تم الحفظ'
            }
          >
            مرجع الطلب: <bdi>{result.commandId}</bdi>
            {result.errorCode && <p>{errorText(new ApiError(result.errorCode, 409))}</p>}
          </StatePanel>
        )}
      </>
    ),
  };
}
export function UsersPage() {
  const { registry } = useAccess(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '',
    page = Number(params.get('page') ?? 0);
  const setSearch = (value: string) => setParams({ search: value, page: '0' }),
    setPage = (value: number) => setParams({ search, page: String(value) });
  const setEditing = (user: User | null) =>
    navigate('/administration/users/' + (user?.id ?? 'new') + '?' + params.toString());
  const users = useQuery({
    queryKey: [
      'access-users',
      registry?.context.principalId,
      registry?.context.companyId,
      search,
      page,
      registry?.context.authorizationRevision,
    ],
    queryFn: () => api<Users>('/users?' + new URLSearchParams({ search, page: String(page) })),
    retry: false,
  });
  return (
    <>
      <PageHeading
        eyebrow="الإدارة"
        title="المستخدمون"
        description="مستخدمو الشركة فقط؛ دور واحد وفروع مسندة واستثناءات واضحة لكل شخص."
      />
      <div className="access-actions">
        <Field label="بحث بالاسم">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </Field>
        <Button type="button" onClick={() => setEditing(null)}>
          إضافة مستخدم
        </Button>
      </div>
      {users.isError ? (
        <ErrorPanel error={users.error} />
      ) : users.isPending ? (
        <StatePanel state="pending" title="جارٍ تحميل المستخدمين" />
      ) : (
        <>
          <p className="muted">{users.data.total.toLocaleString('ar-EG')} مستخدم</p>
          <ResponsiveList
            items={users.data.items}
            rowKey={(u) => u.id}
            columns={[
              {
                label: 'المستخدم',
                render: (u) => (
                  <button className="text-button" onClick={() => setEditing(u)}>
                    {u.name}
                  </button>
                ),
              },
              { label: 'الدور', render: (u) => u.roleName },
              { label: 'الهوية', render: (u) => <IdentityState user={u} /> },
            ]}
            card={(u) => (
              <>
                <button className="text-button" onClick={() => setEditing(u)}>
                  {u.name}
                </button>
                <p>{u.roleName}</p>
                <IdentityState user={u} />
              </>
            )}
          />
          {!users.data.items.length && <StatePanel state="empty" title="لا توجد نتائج مطابقة" />}
          <div className="access-actions">
            <Button
              type="button"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              السابق
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={(page + 1) * 25 >= users.data.total}
              onClick={() => setPage(page + 1)}
            >
              التالي
            </Button>
            <Button type="button" variant="outline" onClick={() => void users.refetch()}>
              تحديث حالة الهويات
            </Button>
          </div>
        </>
      )}
      <Audit />
    </>
  );
}
export function UserDetail() {
  const { id } = useParams(),
    { registry } = useAccess(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const data = useQuery({
    queryKey: [
      'access-user',
      registry?.context.principalId,
      registry?.context.companyId,
      id,
      registry?.context.authorizationRevision,
    ],
    queryFn: () => api<Users>(id === 'new' ? '/users' : '/users/' + id),
    retry: false,
  });
  const [retained, setRetained] = useState<{ id: string | undefined; data: Users } | null>(null);
  useEffect(() => {
    if (data.data) setRetained({ id, data: data.data });
  }, [data.data, id]);
  const shown = data.data ?? (retained && retained.id === id ? retained.data : undefined);
  return (
    <>
      <PageHeading
        eyebrow="إدارة المستخدمين"
        title={id === 'new' ? 'إضافة مستخدم' : 'تفاصيل المستخدم'}
        description="راجع الهوية والدور والفروع والاستثناءات، ثم احفظ الطلب."
      />
      {data.isError && <ErrorPanel error={data.error} />}{' '}
      {shown ? (
        <UserEditor
          key={id}
          user={id === 'new' ? null : (shown.items[0] ?? null)}
          data={shown}
          onClose={() => navigate('/administration/users?' + params.toString())}
        />
      ) : (
        !data.isError && <StatePanel state="pending" title="جارٍ تحميل تفاصيل المستخدم" />
      )}
    </>
  );
}
function IdentityState({ user }: { user: User }) {
  return (
    <span className={`identity-state identity-${user.identityState}`}>
      {!user.active ? 'غير نشط · ' : ''}
      {user.identityState === 'ready'
        ? 'جاهز'
        : user.identityState === 'pending'
          ? 'تجهيز الهوية معلق'
          : 'تعذر تجهيز الهوية — راجع البيانات'}
    </span>
  );
}
function UserEditor({
  user,
  data,
  onClose,
}: {
  user: User | null;
  data: Users;
  onClose: () => void;
}) {
  const { registry } = useAccess(),
    command = useCommand();
  const [name, setName] = useState(user?.name ?? ''),
    [username, setUsername] = useState(user?.username ?? ''),
    [role, setRole] = useState(user?.roleId ?? ''),
    [branches, setBranches] = useState(user?.branchIds ?? []),
    [exceptions, setExceptions] = useState<Exceptions>(user?.exceptions ?? {}),
    [active, setActive] = useState(user?.active ?? true),
    [version, setVersion] = useState(user?.version ?? 1);
  const [review, setReview] = useState(false);
  const changed = !!user && data.items.some((u) => u.id === user.id && u.version !== version);
  function save(e: FormEvent) {
    e.preventDefault();
    if (!registry) return;
    if (!review) {
      setReview(true);
      return;
    }
    const common = {
      schemaVersion: 1 as const,
      companyId: registry.context.companyId,
      commandId: crypto.randomUUID(),
      name,
      roleId: role,
      branchIds: branches,
      exceptions,
      active,
    };
    void command.run(
      user
        ? { ...common, type: 'user.update', entityId: user.id, expectedVersion: version }
        : { ...common, type: 'user.create', username },
    );
  }
  return (
    <section className="access-editor">
      <h2>{user ? 'تعديل المستخدم' : 'مستخدم جديد'}</h2>
      <form className="access-form" onSubmit={save}>
        <FormGroup
          title="الهوية والدور"
          description="تجهيز حساب الهوية يحدث بعد حفظ الطلب. كلمة المرور تُدار لدى مزوّد الهوية."
        >
          <Field label="الاسم">
            <Input
              required
              maxLength={180}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setReview(false);
              }}
            />
          </Field>
          <Field label="اسم المستخدم">
            <Input
              required
              disabled={!!user}
              pattern="[a-z0-9][a-z0-9._-]{1,79}"
              dir="ltr"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setReview(false);
              }}
            />
          </Field>
          <Field label="الدور">
            <select
              required
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setReview(false);
              }}
            >
              <option value="">اختر الدور</option>
              {data.roles
                .filter((r) => r.active || r.id === role)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {!r.active ? ' (غير نشط)' : ''}
                  </option>
                ))}
            </select>
          </Field>
          <label className="check-row">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => {
                setActive(e.target.checked);
                setReview(false);
              }}
            />
            مستخدم نشط
          </label>
        </FormGroup>
        <FormGroup
          title="الفروع المسندة"
          description="نفس الصلاحيات في كل الفروع المختارة. اختيار فرع واحد يثبّت سياق العمليات العادية."
        >
          {data.branches.map((b) => (
            <label className="check-row" key={b.id}>
              <input
                type="checkbox"
                checked={branches.includes(b.id)}
                onChange={(e) => {
                  setBranches(
                    e.target.checked ? [...branches, b.id] : branches.filter((id) => id !== b.id),
                  );
                  setReview(false);
                }}
              />
              {b.name}
            </label>
          ))}
        </FormGroup>
        <FormGroup
          title="استثناءات المستخدم"
          description="المنع يتجاوز سماح الدور. السماح لا يتجاوز الشركة أو قواعد العملية."
        >
          {registry?.capabilities.map((c) => (
            <Field key={c.id} label={c.title + (!c.implemented ? ' — غير متاحة بعد' : '')}>
              <select
                value={exceptions[c.id] ?? 'inherit'}
                onChange={(e) => {
                  setExceptions({
                    ...exceptions,
                    [c.id]: e.target.value as 'inherit' | 'allow' | 'deny',
                  });
                  setReview(false);
                }}
              >
                <option value="inherit">وراثة من الدور</option>
                <option value="allow">سماح صريح</option>
                <option value="deny">منع صريح</option>
              </select>
            </Field>
          ))}
        </FormGroup>
        <StatePanel state="ready" title="معاينة الصلاحيات الفعلية">
          {registry?.capabilities
            .filter((c) =>
              effectiveGrants(
                data.roles.find((r) => r.id === role)?.grants ?? [],
                exceptions,
              ).includes(c.id),
            )
            .map((c) => c.title)
            .join('، ') || 'لا توجد شاشة مسموحة'}{' '}
          · لا تغيّر هذه المعاينة نطاق الفروع أو حالة العملية.
        </StatePanel>
        {changed && (
          <StatePanel state="error" title="تغيرت نسخة هذا المستخدم">
            راجع الاسم والدور والفروع الحالية في القائمة قبل اعتمادها.
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const latest = data.items.find((u) => u.id === user?.id);
                if (latest) {
                  setVersion(latest.version);
                  setName(latest.name);
                  setRole(latest.roleId);
                  setBranches(latest.branchIds);
                  setExceptions(latest.exceptions);
                  setActive(latest.active);
                  setReview(false);
                }
              }}
            >
              تحميل النسخة الجديدة للمراجعة
            </Button>
          </StatePanel>
        )}
        {review && (
          <StatePanel state="ready" title="راجع التغيير قبل الحفظ">
            {name} · {data.roles.find((r) => r.id === role)?.name} ·{' '}
            {branches.length.toLocaleString('ar-EG')} فرع · {active ? 'نشط' : 'غير نشط'}
          </StatePanel>
        )}
        {command.feedback}
        <div className="access-actions">
          <Button
            type="submit"
            disabled={command.busy || command.locked || !branches.length || changed}
          >
            {command.busy ? 'جارٍ الحفظ…' : review ? 'تأكيد حفظ المستخدم' : 'مراجعة المستخدم'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إغلاق النموذج
          </Button>
        </div>
      </form>
    </section>
  );
}
export function RolesPage() {
  const { registry } = useAccess(),
    [editing, setEditing] = useState<Role | null | undefined>(undefined);
  const roles = useQuery({
    queryKey: [
      'access-roles',
      registry?.context.principalId,
      registry?.context.companyId,
      registry?.context.authorizationRevision,
    ],
    queryFn: () => api<{ items: Role[] }>('/roles'),
    retry: false,
  });
  return (
    <>
      <PageHeading
        eyebrow="الإدارة"
        title="الأدوار والصلاحيات"
        description="سمّ الأدوار حسب فريقك، ثم امنح الشاشات. لا توجد صلاحيات منفصلة لكل زر."
      />
      <Button type="button" onClick={() => setEditing(null)}>
        إضافة دور
      </Button>
      {roles.isError ? (
        <ErrorPanel error={roles.error} />
      ) : roles.data ? (
        <div className="access-role-list">
          {roles.data.items.map((r) => (
            <button className="access-role" key={r.id} onClick={() => setEditing(r)}>
              <strong>{r.name}</strong>
              <span>
                {r.grants.length.toLocaleString('ar-EG')} شاشة · {r.active ? 'نشط' : 'غير نشط'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <StatePanel state="pending" title="جارٍ تحميل الأدوار" />
      )}
      {editing !== undefined && (
        <RoleEditor
          key={editing?.id ?? 'new'}
          role={editing}
          latest={roles.data?.items.find((r) => r.id === editing?.id)}
          onClose={() => {
            setEditing(undefined);
            void roles.refetch();
          }}
        />
      )}
    </>
  );
}
function RoleEditor({
  role,
  latest,
  onClose,
}: {
  role: Role | null;
  latest: Role | undefined;
  onClose: () => void;
}) {
  const { registry } = useAccess(),
    command = useCommand(),
    [name, setName] = useState(role?.name ?? ''),
    [grants, setGrants] = useState<CapabilityId[]>(role?.grants ?? []),
    [active, setActive] = useState(role?.active ?? true),
    [version, setVersion] = useState(role?.version ?? 1);
  const changed = !!latest && latest.version !== version;
  return (
    <form
      className="access-form access-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (!registry) return;
        const common = {
          schemaVersion: 1 as const,
          commandId: crypto.randomUUID(),
          companyId: registry.context.companyId,
          name,
          grants,
          active,
        };
        void command.run(
          role
            ? { ...common, type: 'role.update', entityId: role.id, expectedVersion: version }
            : { ...common, type: 'role.create' },
        );
      }}
    >
      <h2>{role ? 'تعديل الدور' : 'دور جديد'}</h2>
      <Field label="اسم الدور">
        <Input required value={name} onChange={(e) => setName(e.target.value)} maxLength={180} />
      </Field>
      <label className="check-row">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        دور نشط
      </label>
      <FormGroup
        title="الشاشات المسموحة"
        description="صلاحية الشاشة تظل مقيدة بالنطاق وحالة العملية."
      >
        {registry?.capabilities.map((c) => (
          <label className="check-row" key={c.id}>
            <input
              type="checkbox"
              checked={grants.includes(c.id)}
              onChange={(e) =>
                setGrants(e.target.checked ? [...grants, c.id] : grants.filter((id) => id !== c.id))
              }
            />
            <span>
              {c.title}
              <small>
                {c.policy === 'assigned' ? 'الفروع المسندة' : 'نطاق الشركة حسب سياسة الشاشة'}
                {!c.implemented ? ' · غير متاحة بعد' : ''}
              </small>
            </span>
          </label>
        ))}
      </FormGroup>
      {changed && (
        <StatePanel state="error" title="تغيرت نسخة هذا الدور">
          احتفظنا بتعديلاتك هنا. حمّل النسخة الحالية وراجعها قبل الحفظ.
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (latest) {
                setVersion(latest.version);
                setName(latest.name);
                setGrants(latest.grants);
                setActive(latest.active);
              }
            }}
          >
            تحميل نسخة الدور الجديدة للمراجعة
          </Button>
        </StatePanel>
      )}
      {command.feedback}
      <div className="access-actions">
        <Button disabled={command.busy || command.locked || changed} type="submit">
          حفظ الدور
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          إغلاق النموذج
        </Button>
      </div>
    </form>
  );
}
export function Support() {
  const { session, registry, refresh } = useAccess(),
    command = useCommand();
  const [company, setCompany] = useState(''),
    [reason, setReason] = useState(''),
    [branch, setBranch] = useState(''),
    [newName, setNewName] = useState(''),
    [newCode, setNewCode] = useState('');
  const companies = useQuery({
    queryKey: ['support-companies', session?.principalId, registry?.context.authorizationRevision],
    queryFn: () =>
      api<{
        companies: { id: string; name: string; code: string; active: boolean; version: number }[];
      }>('/support'),
    enabled: session?.kind === 'support',
    retry: false,
  });
  if (!session) return <Login support />;
  if (session.kind !== 'support')
    return <ErrorPanel error={new ApiError('FORBIDDEN_SCOPE', 403)} />;
  const run = (cmd: AccessCommand) => void command.run(cmd).then(() => refresh());
  return (
    <>
      <PageHeading
        eyebrow="الدعم الفني"
        title="جلسة دعم الشركة"
        description="كل جلسة تحتاج سببًا وتحققًا بخطوتين، وتنتهي خلال ساعة. تظهر أعمالها في سجل الشركة باسم الدعم الفني."
      />
      {companies.isError && <ErrorPanel error={companies.error} />}
      <form
        className="access-form narrow-form"
        onSubmit={(e) => {
          e.preventDefault();
          run({
            schemaVersion: 1,
            commandId: crypto.randomUUID(),
            companyId: company,
            type: 'support.start',
            reason,
          });
        }}
      >
        <Field label="الشركة">
          <select required value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">اختر الشركة</option>
            {companies.data?.companies
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
          </select>
        </Field>
        <Field label="سبب الدعم">
          <textarea
            required
            minLength={10}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={command.busy || command.locked}>
          بدء جلسة لمدة ساعة
        </Button>
      </form>
      {registry && (
        <section className="access-editor">
          <h2>فروع {registry.context.companyName}</h2>
          <BranchAdministration />
          <form
            className="access-form narrow-form"
            onSubmit={(e) => {
              e.preventDefault();
              run({
                schemaVersion: 1,
                commandId: crypto.randomUUID(),
                companyId: registry.context.companyId,
                type: 'branch.create',
                name: branch,
              });
            }}
          >
            <Field label="اسم الفرع الجديد">
              <Input
                required
                maxLength={180}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </Field>
            <Button disabled={command.busy || command.locked} type="submit">
              إضافة الفرع
            </Button>
          </form>
          <Link className="back-link" to="/administration/users">
            إدارة مستخدمي الشركة
          </Link>
          <Audit />
        </section>
      )}
      <details className="access-editor">
        <summary>إنشاء شركة جديدة</summary>
        <form
          className="access-form narrow-form"
          onSubmit={(e) => {
            e.preventDefault();
            run({
              schemaVersion: 1,
              commandId: crypto.randomUUID(),
              companyId: crypto.randomUUID(),
              type: 'company.create',
              name: newName,
              code: newCode,
              reason,
            });
          }}
        >
          <Field label="اسم الشركة الجديدة">
            <Input required value={newName} onChange={(e) => setNewName(e.target.value)} />
          </Field>
          <Field label="كود الشركة الجديدة">
            <Input
              required
              dir="ltr"
              pattern="[a-z0-9][a-z0-9-]{1,39}"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </Field>
          <p>يُستخدم سبب الدعم المكتوب أعلاه.</p>
          <Button
            disabled={reason.trim().length < 10 || command.busy || command.locked}
            type="submit"
          >
            إنشاء الشركة وبدء جلسة دعم
          </Button>
        </form>
      </details>
      {command.feedback}
    </>
  );
}
function BranchAdministration() {
  const { registry } = useAccess(),
    command = useCommand(false),
    [editing, setEditing] = useState<{
      id: string;
      name: string;
      active: boolean;
      version: number;
    } | null>(null);
  const branches = useQuery({
    queryKey: [
      'support-branches',
      registry?.context.principalId,
      registry?.context.companyId,
      registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      api<{ items: { id: string; name: string; active: boolean; version: number }[] }>(
        '/support/branches',
      ),
    retry: false,
  });
  return (
    <>
      {branches.isError && <ErrorPanel error={branches.error} />}
      <ul>
        {branches.data?.items.map((b) => (
          <li key={b.id}>
            <button className="text-button" onClick={() => setEditing(b)}>
              {b.name}
            </button>
            {!b.active ? ' · غير نشط' : ''}
          </li>
        ))}
      </ul>
      {editing && (
        <form
          className="access-form narrow-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (registry)
              void command
                .run({
                  schemaVersion: 1,
                  commandId: crypto.randomUUID(),
                  companyId: registry.context.companyId,
                  type: 'branch.update',
                  entityId: editing.id,
                  expectedVersion: editing.version,
                  name: editing.name,
                  active: editing.active,
                })
                .then((result) => {
                  if (result?.state === 'completed') setEditing(null);
                });
          }}
        >
          <Field label="اسم الفرع">
            <Input
              required
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </Field>
          <label className="check-row">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
            />
            فرع نشط
          </label>
          <Button type="submit" disabled={command.busy || command.locked}>
            حفظ الفرع
          </Button>
        </form>
      )}
      {command.feedback}
    </>
  );
}
function Audit() {
  const { registry } = useAccess();
  const audit = useQuery({
    queryKey: [
      'access-audit',
      registry?.context.principalId,
      registry?.context.companyId,
      registry?.context.authorizationRevision,
    ],
    queryFn: () =>
      api<{ items: { id: string; actor: string; action: string; at: string }[] }>('/audit'),
    enabled: !!registry?.context.grants.includes('access.users'),
    retry: false,
  });
  return (
    <details className="access-editor">
      <summary>سجل إدارة الوصول</summary>
      {audit.data?.items.map((a) => (
        <p key={a.id}>
          <strong>
            {a.actor === 'Technical Support' ? 'الدعم الفني · Technical Support' : a.actor}
          </strong>{' '}
          · {auditAction(a.action)} · {new Date(a.at).toLocaleString('ar-EG')}
        </p>
      ))}
    </details>
  );
}
function auditAction(action: string) {
  const names: Record<string, string> = {
    'user.create': 'إنشاء مستخدم',
    'user.update': 'تعديل مستخدم',
    'role.create': 'إنشاء دور',
    'role.update': 'تعديل دور',
    'branch.create': 'إنشاء فرع',
    'branch.update': 'تعديل فرع',
    'company.create': 'إنشاء شركة',
    'company.update': 'تعديل شركة',
    'support.start': 'بدء جلسة دعم',
  };
  const rejected = action.endsWith('.rejected');
  return (
    (rejected ? 'رفض طلب: ' : '') +
    (names[action.replace(/\.rejected$/, '')] ?? 'تغيير في إدارة الوصول')
  );
}
