import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shahn/ui';
import {
  validateInventoryViews,
  type InventoryCatalog,
  type InventoryCommand,
  type InventoryResult,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';
export async function inventoryApi<T>(
  path: string,
  view: string,
  body?: InventoryCommand,
  csrf?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/v1' + path, {
      method: body?.type === 'product.update' ? 'PATCH' : body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'CONNECTION_LOST', 0);
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  }
  if (!response.ok) {
    const e = result as { code: string; currentVersion?: number };
    throw new CommercialError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : e.code,
      response.status,
      e.currentVersion,
    );
  }
  if (!validateInventoryViews[view]?.(result))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
export function useInventoryCatalog() {
  const access = useAccess(),
    company = access.registry?.context.companyId,
    revision = access.registry?.context.authorizationRevision;
  const query = useQuery({
    queryKey: ['inventory-catalog', company, revision],
    queryFn: () =>
      inventoryApi<InventoryCatalog>('/inventory/catalog?companyId=' + company, 'catalog'),
    enabled: !!company && !access.authorityError,
    retry: false,
  });
  return { ...query, company, access };
}
type Draft = InventoryCommand extends infer C
  ? C extends InventoryCommand
    ? Omit<C, 'companyId' | 'commandId' | 'schemaVersion'>
    : never
  : never;
const pathFor = (input: InventoryCommand) =>
  input.type === 'stock.receive'
    ? '/inventory/receipts'
    : input.type === 'product.create'
      ? `/brands/${input.brandId}/products`
      : `/products/${input.productId}`;
export function useInventoryMutation(
  channel: string,
  onSuccess: (result: InventoryResult) => void,
) {
  const { registry, session } = useAccess(),
    company = registry?.context.companyId,
    key = `P05:${session?.principalId}:${company}:${channel}`;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState<InventoryCommand | null>(() => {
      try {
        return JSON.parse(sessionStorage.getItem(key) ?? 'null') as InventoryCommand | null;
      } catch {
        return null;
      }
    });
  const retain = (value: InventoryCommand | null) => {
    setPending(value);
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {
      /* Mounted form still retains its command. */
    }
  };
  useEffect(() => {
    try {
      setPending(JSON.parse(sessionStorage.getItem(key) ?? 'null') as InventoryCommand | null);
    } catch {
      setPending(null);
    }
  }, [key]);
  const send = async (input: InventoryCommand) => {
    try {
      const result = await inventoryApi<InventoryResult>(
        pathFor(input),
        'result',
        input,
        session?.csrfToken,
      );
      retain(null);
      onSuccess(result);
    } catch (e) {
      setError(e);
      if (e instanceof CommercialError && e.status >= 400 && e.status < 500) retain(null);
    }
  };
  const submit = async (draft: Draft) => {
    if (busy || pending || !company || !session) return;
    if (!navigator.onLine) {
      setError(new CommercialError('CONNECTION_LOST', 0));
      return;
    }
    const input = {
      ...draft,
      companyId: company,
      commandId: crypto.randomUUID(),
      schemaVersion: 1,
    } as InventoryCommand;
    retain(input);
    setBusy(true);
    setError(null);
    try {
      await send(input);
    } finally {
      setBusy(false);
    }
  };
  const recover = async () => {
    if (!pending || busy || !navigator.onLine) return;
    setBusy(true);
    setError(null);
    try {
      const result = await inventoryApi<InventoryResult>(
        `/inventory/commands/${pending.commandId}?companyId=${pending.companyId}&family=${pending.type === 'stock.receive' ? 'inventory.receipt' : 'inventory.product'}`,
        'result',
      );
      retain(null);
      onSuccess(result);
    } catch (e) {
      if (e instanceof CommercialError && e.status === 404) await send(pending);
      else {
        setError(e);
        if (e instanceof CommercialError && e.status === 409) retain(null);
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
    recovery: pending ? (
      <div className="commercial-recovery" role="status">
        <p>نتيجة الاستلام أو الحفظ غير مؤكدة. سنراجع الطلب نفسه قبل أي محاولة جديدة.</p>
        <p>
          هوية الطلب: <bdi>{pending.commandId}</bdi>
        </p>
        <Button variant="outline" type="button" disabled={busy} onClick={() => void recover()}>
          استرد نتيجة الحفظ
        </Button>
      </div>
    ) : null,
  };
}
export const conditionNames = {
  sound: 'سليم',
  damaged: 'تالف — غير متاح',
  uncertain: 'غير مؤكد — غير متاح',
};
