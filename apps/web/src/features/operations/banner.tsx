import { useQuery } from '@tanstack/react-query';
export function OperationsBanner() {
  const state = useQuery({
    queryKey: ['operations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/operations');
      if (!response.ok) throw new Error('operations unavailable');
      return (await response.json()) as { mode: string; mutationsEnabled: boolean };
    },
    refetchInterval: 30000,
    retry: false,
  });
  if (!state.data || state.data.mutationsEnabled) return null;
  return (
    <div role="status" className="state-panel" dir="rtl">
      <strong>النظام متاح للقراءة والمراجعة</strong>
      <p>
        تسجيل الأموال وحركة البضائع والإرسال متوقف أثناء الاستعادة. يراجع مسؤول الشركة الأرصدة
        والحركات المفقودة والأدلة الخارجية قبل إعادة فتح العمل. يمكن قراءة نتيجة إجراء سابق دون
        تكراره.
      </p>
    </div>
  );
}
