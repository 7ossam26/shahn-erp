import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { transaction } from '@shahn/database';
/** Operator-only local procedure. No HTTP route, password, or public signup exists. */
export async function bootstrapSupport(
  pool: Pool,
  issuer: string,
  subject: string,
): Promise<string> {
  if (!subject.trim() || !issuer.startsWith('http')) throw new Error('INVALID_BOOTSTRAP_IDENTITY');
  return transaction(pool, async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(158197199)');
    if ((await client.query('SELECT singleton FROM access.bootstrap_completion')).rowCount)
      throw new Error('BOOTSTRAP_ALREADY_COMPLETED');
    const id = randomUUID();
    await client.query("INSERT INTO access.principal(id,kind) VALUES($1,'support')", [id]);
    await client.query('INSERT INTO access.issuer_binding VALUES($1,$2,$3)', [id, issuer, subject]);
    await client.query(
      'INSERT INTO access.bootstrap_completion(singleton,principal_id) VALUES(true,$1)',
      [id],
    );
    return id;
  });
}
