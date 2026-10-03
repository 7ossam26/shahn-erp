import { useQuery } from '@tanstack/react-query';
import { validateReadiness, type Readiness } from '@shahn/contracts';
import { StatePanel, Button } from '@shahn/ui';
export async function fetchReadiness(signal?: AbortSignal): Promise<Readiness> {
  const response = await fetch('/api/v1/readiness', { signal: signal ?? null, cache: 'no-store' });
  const data: unknown = await response.json();
  if (![200, 503].includes(response.status) || !validateReadiness(data))
    throw new Error('STATUS_UNAVAILABLE');
  if ((response.status === 200) !== (data.status === 'ready')) throw new Error('INVALID_STATUS');
  return data;
}
export function ApiStatus() {
  const query = useQuery({
    queryKey: ['readiness'],
    queryFn: ({ signal }) => fetchReadiness(signal),
    retry: false,
    refetchInterval: 15000,
  });
  const action = (
    <Button
      variant="outline"
      disabled={query.isFetching}
      onClick={() => {
        void query.refetch();
      }}
    >
      تحديث الحالة
    </Button>
  );
  if (query.isPending)
    return <StatePanel state="pending" title="جارٍ التحقق من API وقاعدة البيانات…" />;
  if (query.isError)
    return (
      <StatePanel state="error" title="تعذر الوصول إلى API">
        تحقق من تشغيل الخدمة ثم حدّث الحالة.{action}
      </StatePanel>
    );
  const status = query.data;
  if (status.status !== 'ready')
    return (
      <StatePanel
        state="error"
        title={
          status.database === 'unavailable'
            ? 'قاعدة البيانات غير متاحة'
            : 'قاعدة البيانات تحتاج مهاجرات متوافقة'
        }
        action={action}
      >
        API يعمل، لكن النظام غير جاهز. لا توجد عمليات تجارية متاحة.
      </StatePanel>
    );
  return (
    <StatePanel state="ready" title="API وقاعدة البيانات جاهزان" action={action}>
      البنية الأساسية متاحة · المهاجرات مطابقة · آخر فحص{' '}
      <time dateTime={status.checkedAt}>
        {new Intl.DateTimeFormat('ar-EG', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date(status.checkedAt))}
      </time>
    </StatePanel>
  );
}
