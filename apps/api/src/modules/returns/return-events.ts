import type { TransactionClient, IntegrationSource } from '@shahn/database';
import type { NormalizedExecutionEvent } from '@shahn/contracts/execution';
import type { ReturnRequest, ReturnTransition } from '@shahn/contracts/tawsel';
import { mergeReturnRequest, postReturnTransition } from './receipt.service.js';
import { ExecutionDependency } from '../execution/visit-facts.service.js';
export async function applyReturnEvent(
  c: TransactionClient,
  company: string,
  source: string,
  n: NormalizedExecutionEvent,
  fault?: () => void,
) {
  const s = (
    await c.query<IntegrationSource>(
      'SELECT * FROM integration.source WHERE company_id=$1 AND id=$2',
      [company, source],
    )
  ).rows[0]!;
  if (n.type === 'return.requested') {
    const request = n.record as unknown as ReturnRequest;
    if (n.stream.aggregateType !== 'return-request' || n.stream.aggregateId !== request.requestId)
      throw new ExecutionDependency('RETURN_AGGREGATE_CONFLICT');
    await mergeReturnRequest(c, s, request);
  } else {
    const transition = n.record as unknown as ReturnTransition;
    if (
      n.stream.aggregateType !== 'return-request' ||
      n.stream.aggregateId !== transition.requestId
    )
      throw new ExecutionDependency('RETURN_AGGREGATE_CONFLICT');
    await postReturnTransition(c, s, transition, fault);
  }
}
