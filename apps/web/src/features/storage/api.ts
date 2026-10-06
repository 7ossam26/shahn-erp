import { useRef, useState } from 'react';
import { validateStorageViews } from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';
type Views = typeof validateStorageViews;
export interface StorageErrorDetails {
  creditVersion?: number;
  agreementVersion?: number;
  unallocatedMinor?: string;
  allocatedMinor?: string;
  availableMinor?: string;
  today?: string;
}
export class StorageApiError extends CommercialError {
  constructor(
    code: string,
    status: number,
    readonly details?: StorageErrorDetails,
    currentVersion?: number,
  ) {
    super(code, status, currentVersion);
  }
}
/** Every response is checked against the closed contract; a lost POST response is unknown. */
export async function storageApi<T>(
  path: string,
  view: keyof Views,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response, result: unknown;
  try {
    response = await fetch('/api/v1/storage' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    result = await response.json();
  } catch {
    throw new StorageApiError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  if (!response.ok) {
    const e = result as { code?: string; details?: StorageErrorDetails; currentVersion?: number };
    throw new StorageApiError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : (e.code ?? 'REQUEST_FAILED'),
      response.status,
      e.details,
      e.currentVersion,
    );
  }
  if (!validateStorageViews[view](result))
    throw new StorageApiError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
type Kind = 'payment' | 'refund' | 'stop';
const endpoints: Record<
  Kind,
  { post: (c: { agreementId?: string }) => string; recover: string; view: keyof Views }
> = {
  payment: { post: () => '/payments', recover: '/payments/commands/', view: 'paymentResult' },
  refund: {
    post: () => '/credit-refunds',
    recover: '/credit-refunds/commands/',
    view: 'refundResult',
  },
  stop: {
    post: (c) => '/agreements/' + c.agreementId + '/stop',
    recover: '/agreements/commands/',
    view: 'stopResult',
  },
};
type Command = { commandId: string; companyId: string; agreementId?: string };
/**
 * One immutable command identity per confirmed intent, kept (also across reloads) until its
 * result is known. A lost response is recovered with the same ID; never a second receipt/refund.
 */
export function useStorageMutation<C extends Command, R>(
  kind: Kind,
  scopeKey: string,
  onSuccess: (r: R) => void,
) {
  const { session, registry } = useAccess(),
    company = registry?.context.companyId,
    key = `P19:${kind}:${session?.principalId}:${company}:${scopeKey}`;
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? 'null') as C | null;
    } catch {
      return null;
    }
  };
  // Synchronous guard: two clicks in one render must never mint two identities.
  const inFlight = useRef(false),
    committed = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [intent, setIntent] = useState(() => ({ key, value: read() }));
  if (intent.key !== key) setIntent({ key, value: read() });
  const pending = intent.key === key ? intent.value : null;
  const persist = (value: C | null) => {
    setIntent({ key, value });
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* The in-memory intent still prevents a second identity in this page. */
    }
  };
  const settle = (e: unknown) => {
    setError(e);
    // Definite answers (including retained rejections) release the identity; unknown keeps it.
    if (!(e instanceof CommercialError) || e.code !== 'RESULT_UNKNOWN') persist(null);
  };
  const execute = async (c: C) => {
    const r = await storageApi<R>(
      endpoints[kind].post(c),
      endpoints[kind].view,
      c,
      session?.csrfToken,
    );
    committed.current = true;
    persist(null);
    onSuccess(r);
  };
  const submit = async (draft: Omit<C, 'commandId' | 'companyId'>) => {
    if (committed.current || inFlight.current || busy || pending || !company || !session) return;
    inFlight.current = true;
    const c = { ...draft, companyId: company, commandId: crypto.randomUUID() } as C;
    persist(c);
    setBusy(true);
    setError(null);
    try {
      await execute(c);
    } catch (e) {
      settle(e);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await storageApi<R>(
        `${endpoints[kind].recover}${pending.commandId}?companyId=${pending.companyId}`,
        endpoints[kind].view,
      );
      committed.current = true;
      persist(null);
      onSuccess(r);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) {
        // Nothing was retained for this identity: resend the same immutable payload only.
        try {
          await execute(pending);
        } catch (retry) {
          settle(retry);
        }
      } else {
        setError(e);
        if (e instanceof CommercialError && e.status === 409) persist(null);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { submit, recover, busy, error, setError, pending };
}
