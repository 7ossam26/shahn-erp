export const capabilityPolicies = {
  settlements: 'assigned',
  opening: 'assigned',
  storage: 'wallet',
  incidents: 'assigned',
  remittances: 'assigned',
  returns: 'assigned',
  dispatch: 'assigned',
  integration: 'company',
  brands: 'company',
  'reference-data': 'company',
  'access.users': 'company',
  'access.roles': 'company',
  intake: 'assigned',
  inventory: 'assigned',
  expenses: 'assigned',
  'finance.accounts': 'assigned',
  'finance.movements': 'assigned',
  'goods.send': 'assigned',
  'goods.receive': 'assigned',
  'treasury.send': 'treasury',
  'treasury.receive': 'treasury',
  tracking: 'tracking',
  'brand.payout': 'wallet',
  employees: 'assigned',
  payroll: 'assigned',
  reports: 'assigned',
} as const;
export type Capability = keyof typeof capabilityPolicies;
export type ExceptionEffect = 'inherit' | 'allow' | 'deny';
export interface AccessContext {
  principalId: string;
  principalKind: 'staff' | 'support';
  sessionId: string;
  companyId: string;
  companyName: string;
  companyActive: boolean;
  userActive: boolean;
  issuer: string;
  subject: string;
  displayName: string;
  authorizationRevision: string;
  grants: Capability[];
  assignedBranches: { id: string; name: string }[];
  companyBranches: { id: string; name: string }[];
  supportSessionId: string | null;
  supportExpiresAt: string | null;
}
export class AccessError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 403,
    public readonly currentVersion?: number,
  ) {
    super(code);
  }
}
export function effectiveGrants(
  roleGrants: readonly string[],
  exceptions: Readonly<Record<string, ExceptionEffect>>,
): Capability[] {
  return (Object.keys(capabilityPolicies) as Capability[]).filter((id) =>
    exceptions[id] === 'deny' ? false : exceptions[id] === 'allow' || roleGrants.includes(id),
  );
}
export function assertCapability(ctx: AccessContext, capability: Capability): void {
  if (
    !ctx.issuer ||
    !ctx.subject ||
    !ctx.companyActive ||
    !ctx.userActive ||
    !ctx.grants.includes(capability)
  )
    throw new AccessError('FORBIDDEN_SCOPE');
}
export function scopedBranches(ctx: AccessContext, capability: Capability): string[] {
  assertCapability(ctx, capability);
  return (
    capabilityPolicies[capability] === 'assigned' ? ctx.assignedBranches : ctx.companyBranches
  ).map((b) => b.id);
}
export interface ResourceScope {
  companyId: string;
  branchId?: string;
  destinationBranchId?: string;
  operation: 'read' | 'write' | 'export';
  dataClass: 'operational' | 'money' | 'employee' | 'administration';
  stateAllowed: boolean;
  // Supplied by the owning domain from its records, never copied from HTTP body.
  brandAccessible?: boolean;
  fundingAllowed?: boolean;
}
export function authorizeResource(
  ctx: AccessContext,
  capability: Capability,
  resource: ResourceScope,
): void {
  assertCapability(ctx, capability);
  if (resource.companyId !== ctx.companyId || !resource.stateAllowed)
    throw new AccessError('FORBIDDEN_SCOPE');
  if (
    capability === 'tracking' &&
    (resource.operation !== 'read' || resource.dataClass !== 'operational')
  )
    throw new AccessError('FORBIDDEN_SCOPE');
  if (resource.operation === 'export' && capability !== 'reports')
    throw new AccessError('FORBIDDEN_SCOPE');
  if (resource.branchId && !scopedBranches(ctx, capability).includes(resource.branchId))
    throw new AccessError('FORBIDDEN_SCOPE');
  if (capabilityPolicies[capability] === 'assigned' && !resource.branchId)
    throw new AccessError('FORBIDDEN_SCOPE');
  if (
    resource.destinationBranchId &&
    (capability !== 'goods.send' ||
      !ctx.companyBranches.some((b) => b.id === resource.destinationBranchId) ||
      resource.destinationBranchId === resource.branchId)
  )
    throw new AccessError('FORBIDDEN_SCOPE');
  if (
    capability === 'brand.payout' &&
    (!resource.brandAccessible || (resource.operation === 'write' && !resource.fundingAllowed))
  )
    throw new AccessError('FORBIDDEN_SCOPE');
}
export function provisioningOutcome(
  kind: 'success' | 'unknown' | 'invalid' | 'unavailable',
): 'ready' | 'pending' | 'failed' {
  return kind === 'success' ? 'ready' : kind === 'invalid' ? 'failed' : 'pending';
}
