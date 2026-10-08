import { createPool } from '@shahn/database';
import { ExportWorker } from '../../../apps/api/src/modules/reporting/exports.js';
const pool = createPool(process.env['P23_TEST_DATABASE']!);
const boundary = process.env['P23_EXPORT_KILL_BOUNDARY'];
await new ExportWorker(pool, {
  beforeRender: async () => {
    if (boundary === 'before') process.exit(76);
  },
  afterPublish: async () => {
    if (boundary === 'after') process.exit(77);
  },
}).runOne(1);
await pool.end();
