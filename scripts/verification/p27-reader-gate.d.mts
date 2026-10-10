export const adoptedCommit: string;
export function readerContractDigest(): string;
export function requireCompatibleReaders(witness: unknown): {
  state: string;
  companyId: string;
  tenantId: string;
  integrationId: string;
  releaseId: string;
  contractCommit: string;
  contractDigest: string;
  writerActivation: string;
};
