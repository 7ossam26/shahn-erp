import type { Pool } from 'pg';
import type { IntegrationRuntime } from './config.js';
/** Shared API/worker startup admission. Unbound setup is deliberate; bound scope
 * and recoverable secrets remain mandatory even when setup mode is selected. */
export async function validateManagedConnection(
  pool: Pool,
  runtime: IntegrationRuntime,
  companyId: string,
  issuer: string | undefined,
  mode: string | undefined,
) {
  if (!runtime.resolve) return;
  const sources = (
    await pool.query<{ company_id: string }>('SELECT company_id FROM integration.source')
  ).rows;
  for (const source of sources) {
    const connection = await runtime.resolve(source.company_id);
    if (!connection || connection.companyId !== companyId || connection.issuer !== issuer)
      throw Error('Configuration: bound Tawsel connection recovery required');
  }
  if (!sources.length && mode !== 'setup-required')
    throw Error('Configuration: intentional Tawsel setup-required mode is required');
}
