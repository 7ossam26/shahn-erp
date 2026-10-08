import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@shahn/ui';
import {
  validatePayrollMonth,
  validatePayrollPreview,
  validatePayrollResult,
  validatePayrollCatalog,
  type PayrollCommand,
  type PayrollResult,
} from '@shahn/contracts';
import { CommercialError } from '../../brands/api.js';
import { useAccess } from '../../access/access.js';
const validators = {
  month: validatePayrollMonth,
  preview: validatePayrollPreview,
  result: validatePayrollResult,
  catalog: validatePayrollCatalog,
};
export async function payrollApi<T>(
  path: string,
  view: keyof typeof validators,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response, result: unknown;
  try {
    response = await fetch('/api/v1' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
    result = await response.json();
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  if (!response.ok)
    throw new CommercialError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : (result as { code: string }).code,
      response.status,
    );
  if (!validators[view](result))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
export const payrollCommandPath = (c: PayrollCommand) =>
  `/employees/${c.employeeId}/` +
  (c.type === 'payroll.advance'
    ? 'advances'
    : c.type === 'payroll.adjustment'
      ? 'period-adjustments'
      : c.type === 'payroll.resolve'
        ? 'source-reviews/resolve'
        : `months/${c.month}/${c.type === 'payroll.payout' ? 'payout' : 'zero-close'}`);
export function usePayrollCommand(channel: string, onSuccess: (r: PayrollResult) => void) {
  const queries = useQueryClient();
  const { session, registry } = useAccess(),
    key = `P20:${session?.principalId}:${registry?.context.companyId}:${channel}`;
  const [pending, setPending] = useState<PayrollCommand | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as PayrollCommand | null;
    } catch {
      return null;
    }
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  const persist = (c: PayrollCommand | null) => {
    setPending(c);
    if (c) sessionStorage.setItem(key, JSON.stringify(c));
    else sessionStorage.removeItem(key);
  };
  const done = async (r: PayrollResult) => {
    persist(null);
    await queries.invalidateQueries({ queryKey: ['payroll'] });
    onSuccess(r);
  };
  const execute = async (c: PayrollCommand) => {
    const r = await payrollApi<PayrollResult>(
      payrollCommandPath(c),
      'result',
      c,
      session?.csrfToken,
    );
    await done(r);
  };
  const submit = async (c: PayrollCommand) => {
    if (pending || busy) return;
    if (!navigator.onLine) {
      setError(new CommercialError('CONNECTION_LOST', 0));
      return;
    }
    persist(c);
    setBusy(true);
    setError(null);
    try {
      await execute(c);
    } catch (e) {
      setError(e);
      if (e instanceof CommercialError && e.code !== 'RESULT_UNKNOWN') persist(null);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || !navigator.onLine) return;
    setBusy(true);
    setError(null);
    try {
      let r: PayrollResult;
      try {
        r = await payrollApi<PayrollResult>(
          `/employees/payroll/commands/${pending.commandId}?companyId=${pending.companyId}`,
          'result',
        );
      } catch (e) {
        if (e instanceof CommercialError && e.status === 404) {
          await execute(pending);
          return;
        }
        throw e;
      }
      await done(r);
    } catch (e) {
      setError(e);
      if (e instanceof CommercialError && e.status === 409) persist(null);
    } finally {
      setBusy(false);
    }
  };
  return {
    submit,
    pending,
    busy,
    error,
    setError,
    recovery: pending && !busy ? <StateRecovery recover={() => void recover()} /> : null,
  };
}
function StateRecovery({ recover }: { recover: () => void }) {
  return (
    <div className="commercial-recovery" role="status">
      <p>نتيجة العملية غير مؤكدة. نتحقق بنفس رقم الطلب قبل أي دفع جديد.</p>
      <Button type="button" onClick={recover}>
        تحقق من نتيجة الطلب
      </Button>
    </div>
  );
}
