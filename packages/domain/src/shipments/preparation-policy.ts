import { AccessError } from '../access.js';
export function assertUnpackTransition(
  state: { sourceState: string; handedOver: boolean; version: number },
  expected: number,
) {
  if (expected !== state.version) throw new AccessError('REVISION_CONFLICT', 409, state.version);
  if (state.handedOver) throw new AccessError('HANDED_OVER_PROTECTED', 409);
  if (state.sourceState !== 'local') throw new AccessError('SOURCE_ADAPTER_REQUIRED', 409);
  if (state.version === 2147483647) throw new AccessError('REVISION_OVERFLOW', 409);
}
