import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shahn/ui';
import {
  validateShipmentViews,
  type ShipmentCatalog,
  type ShipmentCommand,
  type ShipmentResult,
} from '@shahn/contracts';
import { useAccess } from '../access/access.js';
import { CommercialError } from '../brands/api.js';
export class ShipmentApiError extends CommercialError {
  constructor(
    code: string,
    status: number,
    currentVersion?: number,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(code, status, currentVersion);
  }
}
export async function shipmentApi<T>(
  path: string,
  view: string,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/v1' + path, {
      method: body ? 'POST' : 'GET',
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
    const e = result as {
      code: string;
      currentVersion?: number;
      fieldErrors: Record<string, string>;
    };
    throw new ShipmentApiError(
      body && response.status >= 500 ? 'RESULT_UNKNOWN' : e.code,
      response.status,
      e.currentVersion,
      e.fieldErrors,
    );
  }
  if (!validateShipmentViews[view]?.(result))
    throw new CommercialError(body ? 'RESULT_UNKNOWN' : 'INVALID_RESPONSE', 0);
  return result as T;
}
export function useShipmentCatalog() {
  const access = useAccess(),
    company = access.registry?.context.companyId,
    revision = access.registry?.context.authorizationRevision;
  const query = useQuery({
    queryKey: ['shipment-catalog', company, revision],
    queryFn: () =>
      shipmentApi<ShipmentCatalog>('/shipments/catalog?companyId=' + company, 'catalog'),
    enabled: !!company && !access.authorityError,
    retry: false,
  });
  return { ...query, company, access };
}
type Draft = ShipmentCommand extends infer C
  ? C extends ShipmentCommand
    ? Omit<C, 'companyId' | 'commandId' | 'schemaVersion'>
    : never
  : never;
const pathFor = (input: ShipmentCommand) =>
  input.type === 'shipment.confirm'
    ? '/shipments'
    : '/shipments/' +
      input.shipmentId +
      (input.type === 'shipment.correct'
        ? '/corrections'
        : input.type === 'shipment.cancel'
          ? '/cancel'
          : '/preparation/complete');
export function useShipmentMutation(channel: string, onSuccess: (result: ShipmentResult) => void) {
  const { registry, session } = useAccess(),
    company = registry?.context.companyId,
    key = `P06:${session?.principalId}:${company}:${channel}`;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState<ShipmentCommand | null>(() => {
      try {
        return JSON.parse(sessionStorage.getItem(key) ?? 'null') as ShipmentCommand | null;
      } catch {
        return null;
      }
    });
  const retain = (value: ShipmentCommand | null) => {
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
      setPending(JSON.parse(sessionStorage.getItem(key) ?? 'null') as ShipmentCommand | null);
    } catch {
      setPending(null);
    }
  }, [key]);
  const send = async (input: ShipmentCommand) => {
    try {
      const result = await shipmentApi<ShipmentResult>(
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
    } as ShipmentCommand;
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
      const result = await shipmentApi<ShipmentResult>(
        `/shipments/commands/${pending.commandId}?companyId=${pending.companyId}`,
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
