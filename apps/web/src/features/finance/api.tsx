import { useState } from 'react';
import { Button } from '@shahn/ui';
import {
  validateFinanceViews,
  type FinanceCommand,
  type FinanceResult,
  financeFamily,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';
export class FinanceApiError extends CommercialError {
  constructor(
    code: string,
    status: number,
    currentVersion?: number,
    readonly details?: { obligations: { owner: string; sourceIdentity: string }[] },
  ) {
    super(code, status, currentVersion);
  }
}
export async function financeApi<T>(
  path: string,
  view: string,
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
  if (!response.ok) {
    const e = result as {
      code: string;
      currentVersion?: number;
      details?: { obligations: { owner: string; sourceIdentity: string }[] };
    };
    throw new FinanceApiError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : e.code,
      response.status,
      e.currentVersion,
      e.details,
    );
  }
  if (!validateFinanceViews[view]?.(result))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
const pathFor = (_c: FinanceCommand) => '/finance/commands';
export type FinanceDraft = FinanceCommand extends infer C
  ? C extends FinanceCommand
    ? Omit<C, 'schemaVersion' | 'companyId' | 'commandId'>
    : never
  : never;
export function useFinanceMutation(onSuccess: (r: FinanceResult) => void, channel: string) {
  const { session, registry } = useAccess(),
    company = registry?.context.companyId,
    key = `P09:${session?.principalId}:${company}:${channel}`;
  const readPending = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as FinanceCommand | null;
    } catch {
      return null;
    }
  };
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [intent, setIntent] = useState(() => ({ key, value: readPending() }));
  if (intent.key !== key) setIntent({ key, value: readPending() });
  const pending = intent.key === key ? intent.value : null;
  const persist = (value: FinanceCommand | null) => {
    setIntent({ key, value });
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* Keep the in-memory intent. */
    }
  };
  const execute = async (c: FinanceCommand) => {
    const result = await financeApi<FinanceResult>(pathFor(c), 'result', c, session?.csrfToken);
    persist(null);
    onSuccess(result);
  };
  const submit = async (draft: FinanceDraft) => {
    if (busy || pending || !company || !session) return;
    const input = {
      ...draft,
      companyId: company,
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
    } as FinanceCommand;
    persist(input);
    setBusy(true);
    setError(null);
    try {
      await execute(input);
    } catch (e) {
      setError(e);
      if (!(e instanceof CommercialError) || e.code !== 'RESULT_UNKNOWN') persist(null);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || !session) return;
    setBusy(true);
    setError(null);
    try {
      const result = await financeApi<FinanceResult>(
        `/finance/commands/${pending.commandId}?companyId=${pending.companyId}&family=${financeFamily(pending.type)}`,
        'result',
      );
      persist(null);
      onSuccess(result);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) {
        try {
          await execute(pending);
        } catch (retry) {
          setError(retry);
          if (retry instanceof CommercialError && retry.status === 409) persist(null);
        }
      } else {
        setError(e);
        if (e instanceof CommercialError && e.status === 409) persist(null);
      }
    } finally {
      setBusy(false);
    }
  };
  return {
    submit,
    busy,
    error,
    setError,
    pending,
    recovery:
      pending && !busy ? (
        <div className="commercial-recovery" role="status">
          <p>نتيجة الحفظ غير مؤكدة. احتفظنا بنفس الطلب ومدخلاته.</p>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void recover()}>
            استرد نتيجة الحفظ
          </Button>
        </div>
      ) : null,
  };
}
