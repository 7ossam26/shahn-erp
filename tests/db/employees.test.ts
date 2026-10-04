import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { isolatedPostgres } from '@shahn/test-support';
import {
  migrate,
  readMigrations,
  transaction,
  lockPayrollControl,
  employeeClock,
  lockEmployeeCompany,
} from '@shahn/database';
import {
  employeeExamples,
  type EmployeeCommand,
  type EmployeeResult,
  type EmployeeDetail,
  type EmployeeFields,
  type EmployeeTerms,
} from '@shahn/contracts';
import { commissionPerVisit } from '@shahn/domain';
import { accessFixture } from '../support/access.js';
import {
  employeeCommands,
  employeeDetail,
  employeeList,
  resolveEmployeeTermsAt,
  guardEditablePayrollPeriod,
} from '../../apps/api/src/modules/employees/service.js';
import { UnitOfWork } from '../../apps/api/src/modules/kernel/unit-of-work.js';
import { compactCommandResults } from '../../apps/api/src/modules/kernel/commands.js';
import { createApplication } from '../../apps/api/src/app.js';
let db: Awaited<ReturnType<typeof isolatedPostgres>>,
  f: Awaited<ReturnType<typeof accessFixture>>,
  service: ReturnType<typeof employeeCommands>,
  app: Awaited<ReturnType<typeof createApplication>>,
  origin: string,
  today: string,
  month: string;
const reports: Record<string, unknown> = {};
const cmd = (draft: object) =>
  ({
    schemaVersion: 1,
    companyId: f.company,
    commandId: randomUUID(),
    ...draft,
  }) as EmployeeCommand;
const fields = (name = 'سلمى', branchId = f.a): EmployeeFields => ({
  name,
  contact: '01000000000',
  active: true,
  employmentStart: today,
  employmentEnd: null,
  branchId,
  workDays: [0, 1, 2, 3, 4],
  hoursPerDay: 8,
  weeklyDayOff: 5,
});
const run = async (draft: object, token = f.admin.token) =>
  (await service.execute(token, cmd(draft))).body as EmployeeResult;
const create = (name = 'سلمى', terms: EmployeeTerms = employeeExamples.salary, branchId = f.a) =>
  run({ type: 'employee.create', fields: fields(name, branchId), terms });
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { resolve, promise };
};
const detail = (r: EmployeeResult, token = f.admin.token) =>
  UnitOfWork.run(db.pool, token, f.company, 'employees', (u) => employeeDetail(u, r.employeeId));
const change = (r: EmployeeResult, salary: unknown = null, commission: unknown = null) => ({
  type: 'employee.terms',
  employeeId: r.employeeId,
  expectedVersion: r.version,
  change: { salary, commission, reason: 'تصحيح أو جدولة موثقة' },
});
const nextMonth = () =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 7);
const priorMonth = () =>
  new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1))
    .toISOString()
    .slice(0, 7);
const nextDate = (date: string) =>
  new Date(Date.parse(date + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
const newDriver = async (name = 'مندوب محلي') => {
  const id = randomUUID();
  await db.pool.query(
    'INSERT INTO employees.operational_driver(company_id,id,name,branch_id) VALUES($1,$2,$3,$4)',
    [f.company, id, name, f.a],
  );
  return id;
};
const link = (
  r: EmployeeResult,
  driverId: string,
  effectiveDate = today,
  endDate: string | null = null,
) =>
  run({
    type: 'employee.link',
    employeeId: r.employeeId,
    expectedVersion: r.version,
    effectiveDate,
    endDate,
    driverId,
    localDriver: null,
    reason: 'ربط هوية صريح',
  });
async function http(path: string, body?: unknown, token = f.admin.token, csrf = f.admin.csrfToken) {
  const response = await fetch(origin + '/api/v1' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: `erp_session=${token}`,
      ...(body
        ? { 'Content-Type': 'application/json', Origin: f.config.origin, 'X-CSRF-Token': csrf }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
beforeAll(async () => {
  await mkdir('docs/verification/P08', { recursive: true });
  db = await isolatedPostgres();
  await migrate(db.pool, (await readMigrations()).slice(0, 11));
  f = await accessFixture(db.pool);
  await db.pool.query(
    "INSERT INTO access.user_exception VALUES($1,$2,'employees','allow'),($1,$3,'employees','allow'),($1,$4,'employees','allow')",
    [f.company, f.staffA.id, f.staffB.id, f.staffAB.id],
  );
  const before = (await db.pool.query('SELECT count(*)::int AS users FROM access.ordinary_user'))
    .rows[0];
  await migrate(db.pool);
  expect(
    (await db.pool.query('SELECT count(*)::int AS users FROM access.ordinary_user')).rows[0],
  ).toEqual(before);
  const clock = await employeeClock(db.pool);
  today = clock.today;
  month = clock.month;
  const status = await promisify(execFile)(
    process.execPath,
    ['packages/database/dist/cli.js', 'status'],
    {
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_URL: db.url,
        MIGRATION_DATABASE_URL: db.url,
      },
    },
  );
  await writeFile('docs/verification/P08/03-live-db-status.txt', status.stdout);
  service = employeeCommands(db.pool);
  app = await createApplication(
    { environment: 'test', runtimeUrl: db.url, migrationUrl: db.url },
    f.config,
  );
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  await writeFile('docs/verification/P08/database-results.json', JSON.stringify(reports, null, 2));
  await app?.close();
  await db?.dispose();
});
it('upgrades P07 and fresh schema without converting users or posting cash/earning', async () => {
  expect((await db.pool.query('SELECT count(*) FROM employees.employee')).rows[0].count).toBe('0');
  const fresh = await isolatedPostgres();
  try {
    expect((await migrate(fresh.pool)).state).toBe('current');
    expect(
      (await fresh.pool.query('SELECT count(*) FROM employees.payroll_period')).rows[0].count,
    ).toBe('0');
  } finally {
    await fresh.dispose();
  }
});
it('creates all independent modes and distinct duplicate names without login/driver linkage', async () => {
  const ids = [];
  for (const terms of Object.values(employeeExamples)) {
    const r = await create('اسم متكرر طويل لا يمثل هوية دخول', terms);
    ids.push(r.employeeId);
    const d = await detail(r);
    expect(d.terms).toEqual(terms);
    expect(d.association).toBe('none');
    expect(d.revisions[0]!.fields.hoursPerDay).toBe(8);
  }
  expect(new Set(ids).size).toBe(4);
  expect((await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0].count).toBe(
    '0',
  );
  expect((await db.pool.query('SELECT count(*) FROM access.ordinary_user')).rows[0].count).toBe(
    '4',
  );
});
it('runs actual denied B query, rejects CSRF/header/schema tampering, and observes current permission revision', async () => {
  const b = await create('ملف مالي في ب', employeeExamples.combined, f.b);
  const denied = await http(
    '/employees/' + b.employeeId + '?companyId=' + f.company,
    undefined,
    f.staffA.token,
  );
  expect(denied.status).toBe(403);
  expect(JSON.stringify(denied.body)).not.toContain('600000');
  reports.deniedBranch = denied;
  const listed = await http('/employees?companyId=' + f.company, undefined, f.staffA.token);
  expect(listed.status).toBe(200);
  expect(listed.body.items.some((r: EmployeeDetail) => r.id === b.employeeId)).toBe(false);
  expect(
    (
      await http(
        '/employees?companyId=' + f.company + '&branchId=' + f.b,
        undefined,
        f.staffA.token,
      )
    ).status,
  ).toBe(403);
  const input = cmd({ type: 'employee.create', fields: fields(), terms: employeeExamples.off });
  expect((await http('/employees', input, f.admin.token, 'wrong')).status).toBe(403);
  expect(
    (
      await http('/employees', {
        ...input,
        terms: {
          ...employeeExamples.fixed,
          commission: { ...employeeExamples.fixed.commission, basisPoints: 1000 },
        },
      })
    ).status,
  ).toBe(400);
  const revision = (await http('/access/context')).body.context?.authorizationRevision;
  reports.permissionRevision = revision;
});
it('corrects current full salary, schedules future and rejects past absent/frozen/paid/zero periods', async () => {
  let r = await create();
  r = await run(
    change(r, {
      month,
      terms: { enabled: true, monthly: { currency: 'EGP', amountMinor: '610000' } },
    }),
  );
  let d = await detail(r);
  expect(d.terms.salary).toEqual({
    enabled: true,
    monthly: { currency: 'EGP', amountMinor: '610000' },
  });
  expect(d.policies.filter((p) => p.axis === 'salary')).toHaveLength(2);
  expect(d.policies.some((p) => p.superseded)).toBe(true);
  r = await run(change(r, { month: nextMonth(), terms: employeeExamples.off.salary }));
  d = await detail(r);
  expect(d.terms.salary.enabled).toBe(true);
  await expect(
    run(change(r, { month: priorMonth(), terms: employeeExamples.off.salary })),
  ).rejects.toThrow('PAST_PAYROLL_PROTECTED');
  for (const state of ['frozen_unpaid', 'paid', 'zero_net_closed']) {
    const e = await create('حماية ' + state);
    await db.pool.query(
      'UPDATE employees.payroll_period SET state=$3,version=version+1 WHERE company_id=$1 AND employee_id=$2',
      [f.company, e.employeeId, state],
    );
    await expect(run(change(e, { month, terms: employeeExamples.off.salary }))).rejects.toThrow(
      'PAYROLL_PERIOD_PROTECTED',
    );
    expect((await detail(e)).version).toBe(1);
  }
  expect(d.fields.employmentStart).toBe(today);
  reports.salaryRevision = { employeeId: r.employeeId, policies: d.policies, periods: d.periods };
});
it('serializes salary edit first then simulated P20 freeze using the real shared control row', async () => {
  const e = await create('edit before freeze'),
    entered = deferred(),
    release = deferred();
  const editing = employeeCommands(db.pool, {
    beforeTermsWrite: async () => {
      entered.resolve();
      await release.promise;
    },
  }).execute(
    f.admin.token,
    cmd(
      change(e, {
        month,
        terms: { enabled: true, monthly: { currency: 'EGP', amountMinor: '650000' } },
      }),
    ),
  );
  await Promise.race([entered.promise, editing]);
  let freezePid = 0;
  const freezing = transaction(db.pool, async (tx) => {
    freezePid = (await tx.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
    await lockPayrollControl(tx, f.company, e.employeeId, month);
    const amount = (
      await tx.query<{ monthly_minor: string }>(
        `SELECT monthly_minor FROM employees.compensation_policy WHERE company_id=$1 AND employee_id=$2 AND axis='salary' AND NOT superseded AND effective_from<=$3 AND (effective_to IS NULL OR $3<effective_to)`,
        [f.company, e.employeeId, month + '-01'],
      )
    ).rows[0]!.monthly_minor;
    await tx.query(
      `UPDATE employees.payroll_period SET state='frozen_unpaid',version=version+1 WHERE company_id=$1 AND employee_id=$2 AND month=$3`,
      [f.company, e.employeeId, month + '-01'],
    );
    return amount;
  });
  let waiting = false;
  for (let i = 0; i < 100; i++) {
    if (freezePid) {
      const a = (
        await db.pool.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [
          freezePid,
        ])
      ).rows[0];
      if (a?.wait_event_type === 'Lock') {
        waiting = true;
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  release.resolve();
  await editing;
  expect(await freezing).toBe('650000');
  expect(waiting).toBe(true);
  reports.editThenFreeze = { waiting, amount: '650000' };
});
it('serializes P20 freeze first then edit, which rejects without policy/revision changes', async () => {
  const e = await create('freeze before edit'),
    entered = deferred(),
    release = deferred();
  const freezing = transaction(db.pool, async (tx) => {
    await lockPayrollControl(tx, f.company, e.employeeId, month);
    await tx.query(
      `UPDATE employees.payroll_period SET state='frozen_unpaid',version=version+1 WHERE company_id=$1 AND employee_id=$2 AND month=$3`,
      [f.company, e.employeeId, month + '-01'],
    );
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  const editing = run(change(e, { month, terms: employeeExamples.off.salary }));
  const rejected = expect(editing).rejects.toThrow('PAYROLL_PERIOD_PROTECTED');
  await new Promise((r) => setTimeout(r, 50));
  release.resolve();
  await freezing;
  await rejected;
  expect((await detail(e)).version).toBe(1);
  reports.freezeThenEdit = { unchanged: true };
});
it('two independent SQL transactions cannot commit overlapping policies or associations', async () => {
  const e = await create('SQL exclusion'),
    other = await create('SQL other'),
    driver = await newDriver();
  const c1 = await db.pool.connect(),
    c2 = await db.pool.connect();
  try {
    await c1.query('BEGIN');
    await c2.query('BEGIN');
    const args = [f.company, randomUUID(), e.employeeId, driver, today];
    const sql = `INSERT INTO employees.employee_driver_link(company_id,id,employee_id,driver_id,effective_from,driver_name,reason) VALUES($1,$2,$3,$4,$5,'SQL driver','SQL race')`;
    await c1.query(sql, args);
    const second = c2.query(sql, [f.company, randomUUID(), other.employeeId, driver, today]);
    const conflict = expect(second).rejects.toMatchObject({ code: '23P01' });
    await new Promise((r) => setTimeout(r, 40));
    await c1.query('COMMIT');
    await conflict;
    await c2.query('ROLLBACK');
    await c1.query('BEGIN');
    await c2.query('BEGIN');
    const future = nextMonth() + '-01';
    const psql = `INSERT INTO employees.compensation_policy(company_id,id,employee_id,axis,enabled,monthly_minor,effective_from,effective_to,reason) VALUES($1,$2,$3,'salary',true,10,$4,$5,'SQL race')`;
    // Choose a month outside the already open interval by superseding the initial row in this fixture.
    await c1.query(
      "UPDATE employees.compensation_policy SET effective_to=$3 WHERE company_id=$1 AND employee_id=$2 AND axis='salary' AND NOT superseded",
      [f.company, other.employeeId, future],
    );
    await c1.query(psql, [f.company, randomUUID(), other.employeeId, future, null]);
    const secondPolicy = c2.query(psql, [f.company, randomUUID(), other.employeeId, future, null]);
    const pconflict = expect(secondPolicy).rejects.toMatchObject({ code: '23P01' });
    await new Promise((r) => setTimeout(r, 40));
    await c1.query('COMMIT');
    await pconflict;
    await c2.query('ROLLBACK');
    reports.sqlRaces = { links: '23P01', policies: '23P01' };
  } finally {
    await c1.query('ROLLBACK');
    await c2.query('ROLLBACK');
    c1.release();
    c2.release();
  }
});
it('concurrent API links produce one exact association and a retained conflict', async () => {
  const a = await create('API link 1'),
    b = await create('API link 2'),
    driver = await newDriver();
  const results = await Promise.allSettled([link(a, driver), link(b, driver)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  expect(
    (
      await db.pool.query(
        'SELECT count(*) FROM employees.employee_driver_link WHERE company_id=$1 AND driver_id=$2 AND NOT superseded',
        [f.company, driver],
      )
    ).rows[0].count,
  ).toBe('1');
  reports.apiLinkRace = results.map((r) => r.status);
});
it('resolves exact work-time policy/link/branch snapshots and refuses pending external mapping', async () => {
  let e = await create('Mona temporal', employeeExamples.combined);
  const driver = await newDriver();
  e = await link(e, driver);
  const workAt = new Date();
  expect(
    await transaction(db.pool, (tx) => resolveEmployeeTermsAt(tx, f.company, driver, workAt)),
  ).toEqual({ status: 'unresolved', reason: 'external_mapping_pending' });
  // Explicitly marked P11-style mapping fixture; no network/connector claim.
  await db.pool.query(
    "UPDATE employees.operational_driver SET external_mapping='mapped',tawsel_driver_id=$3 WHERE company_id=$1 AND id=$2",
    [f.company, driver, 'fixture-driver-' + driver],
  );
  const earlier = await transaction(db.pool, (tx) =>
    resolveEmployeeTermsAt(tx, f.company, driver, workAt, { acceptWork: true }),
  );
  expect(earlier.status).toBe('resolved');
  const d = nextDate(today);
  e = await run(change(e, null, { effectiveDate: d, terms: employeeExamples.fixed.commission }));
  const future = await transaction(db.pool, (tx) =>
    resolveEmployeeTermsAt(tx, f.company, driver, new Date(d + 'T12:00:00Z')),
  );
  const delayed = await transaction(db.pool, (tx) =>
    resolveEmployeeTermsAt(tx, f.company, driver, workAt),
  );
  expect(delayed).toEqual(earlier);
  if (earlier.status === 'resolved' && future.status === 'resolved') {
    expect(commissionPerVisit('5000', earlier.commission)).toBe('500');
    expect(commissionPerVisit('5000', future.commission)).toBe('700');
    expect(future.commissionPolicyId).not.toBe(earlier.commissionPolicyId);
  }
  await expect(
    run(change(e, null, { effectiveDate: today, terms: employeeExamples.off.commission })),
  ).rejects.toThrow('ACCEPTED_WORK_PROTECTED');
  await expect(
    run({
      type: 'employee.update',
      employeeId: e.employeeId,
      expectedVersion: e.version,
      fields: { ...fields(), branchId: f.b },
      branchEffectiveDate: today,
      reason: 'نقل',
    }),
  ).rejects.toThrow('ACCEPTED_WORK_PROTECTED');
  reports.temporal = { earlier, future, delayed };
  e = await run({
    type: 'employee.update',
    employeeId: e.employeeId,
    expectedVersion: e.version,
    fields: { ...fields('Changed later display name') },
    branchEffectiveDate: null,
    reason: 'اسم لاحق لا يعيد تسمية العمل السابق',
  });
  expect(
    await transaction(db.pool, (tx) => resolveEmployeeTermsAt(tx, f.company, driver, workAt)),
  ).toEqual(earlier);
  e = await run({
    type: 'employee.deactivate',
    employeeId: e.employeeId,
    expectedVersion: e.version,
    reason: 'إيقاف مع حفظ العمل السابق',
  });
  expect(
    await transaction(db.pool, (tx) => resolveEmployeeTermsAt(tx, f.company, driver, workAt)),
  ).toEqual(earlier);
  expect(
    await transaction(db.pool, (tx) =>
      resolveEmployeeTermsAt(tx, f.company, driver, new Date(d + 'T12:00:00Z')),
    ),
  ).toEqual({ status: 'unresolved', reason: 'employee_inactive_at_work' });
});
it('preserves branch/name revisions, deactivation, retained results and reauthorizes revoked recovery', async () => {
  let e = await create('Original name');
  const driver = await newDriver('Original driver');
  e = await link(e, driver);
  const before = await detail(e);
  e = await run({
    type: 'employee.update',
    employeeId: e.employeeId,
    expectedVersion: e.version,
    fields: { ...before.fields, name: 'Updated name', branchId: f.b },
    branchEffectiveDate: today,
    reason: 'نقل من أ إلى ب',
  });
  const d = await detail(e);
  expect(d.revisions.some((r) => r.fields.name === 'Original name')).toBe(true);
  expect(d.branches[0]!.branchName).toBe('الفرع ب');
  // The superseded same-day A interval still protects A's historical HR data.
  await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
    f.admin.id,
    f.a,
  ]);
  expect((await http('/employees/' + e.employeeId + '?companyId=' + f.company)).status).toBe(403);
  await db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
    f.company,
    f.admin.id,
    f.a,
  ]);
  expect(
    (
      await db.pool.query(
        'SELECT count(*) FROM employees.employee_branch_history WHERE company_id=$1 AND employee_id=$2',
        [f.company, e.employeeId],
      )
    ).rows[0].count,
  ).toBe('2');
  const input = cmd({
      type: 'employee.deactivate',
      employeeId: e.employeeId,
      expectedVersion: e.version,
      reason: 'انتهاء الخدمة',
    }),
    saved = await service.execute(f.admin.token, input);
  expect(await service.execute(f.admin.token, input)).toEqual(saved);
  const historicalId = randomUUID(),
    historicalCommand = randomUUID();
  await db.pool.query(
    `INSERT INTO command_record(id,company_id,principal_id,command_id,family,kind,capability,payload_digest,payload,result,state,result_reference,created_at,retain_until,response_status) SELECT $1,company_id,principal_id,$2,family,kind,capability,payload_digest,payload,result,state,result_reference,clock_timestamp()-interval '31 days',clock_timestamp()-interval '1 day',response_status FROM command_record WHERE command_id=$3`,
    [historicalId, historicalCommand, input.commandId],
  );
  await compactCommandResults(db.pool);
  expect(
    await service.recover(f.admin.token, f.company, 'employees.profile', historicalCommand),
  ).toEqual(saved);
  expect((await detail(saved.body as EmployeeResult)).fields.active).toBe(false);
  await expect(
    db.pool.query('DELETE FROM employees.employee WHERE company_id=$1 AND id=$2', [
      f.company,
      e.employeeId,
    ]),
  ).rejects.toThrow('EMPLOYEE_HISTORY_IMMUTABLE');
  await db.pool.query('DELETE FROM access.user_branch WHERE user_id=$1 AND branch_id=$2', [
    f.admin.id,
    f.b,
  ]);
  expect(
    (await http('/employees/commands/' + input.commandId + '?companyId=' + f.company)).status,
  ).toBe(403);
  expect((await http('/employees/' + e.employeeId + '?companyId=' + f.company)).status).toBe(403);
  await db.pool.query('INSERT INTO access.user_branch VALUES($1,$2,$3)', [
    f.company,
    f.admin.id,
    f.b,
  ]);
  const audit = (
    await db.pool.query(
      'SELECT principal_id,actor_label FROM audit_entry WHERE command_record_id=(SELECT id FROM command_record WHERE command_id=$1)',
      [input.commandId],
    )
  ).rows;
  expect(audit).toHaveLength(1);
  expect(audit[0].principal_id).toBe(f.admin.id);
  reports.deactivation = { saved: saved.body, audit };
});
it('rolls back injected mutation failure and retains one success after same-intent retry', async () => {
  const input = cmd({
    type: 'employee.create',
    fields: fields('Rollback employee'),
    terms: employeeExamples.fixed,
  });
  await expect(
    employeeCommands(db.pool, {
      afterMutation: async () => {
        throw Error('INJECTED');
      },
    }).execute(f.admin.token, input),
  ).rejects.toThrow('INJECTED');
  expect(
    (
      await db.pool.query('SELECT count(*) FROM employees.employee WHERE name=$1', [
        'Rollback employee',
      ])
    ).rows[0].count,
  ).toBe('0');
  const first = await service.execute(f.admin.token, input);
  expect(await service.execute(f.admin.token, input)).toEqual(first);
  expect(
    (
      await db.pool.query('SELECT count(*) FROM employees.employee WHERE name=$1', [
        'Rollback employee',
      ])
    ).rows[0].count,
  ).toBe('1');
});
it('enforces same-company FKs, formula constraints, immutable histories and descriptive filters', async () => {
  const e = await create('فلترة ١٢٣', employeeExamples.fixed);
  await expect(
    db.pool.query(
      "INSERT INTO employees.operational_driver(company_id,id,name,branch_id) VALUES($1,$2,'foreign',$3)",
      [f.company, randomUUID(), f.foreign],
    ),
  ).rejects.toMatchObject({ code: '23503' });
  await expect(
    db.pool.query(
      "INSERT INTO employees.compensation_policy(company_id,id,employee_id,axis,enabled,formula,basis_points,per_visit_minor,effective_from,reason) VALUES($1,$2,$3,'commission',true,'fixed',1000,700,$4,'invalid')",
      [f.company, randomUUID(), e.employeeId, today],
    ),
  ).rejects.toMatchObject({ code: '23514' });
  const result = await http(
    '/employees?companyId=' +
      f.company +
      '&search=123&commission=fixed&salary=disabled&branchId=' +
      f.a,
  );
  expect(result.body.items.map((x: EmployeeDetail) => x.id)).toContain(e.employeeId);
  const preview = await http('/employees/' + e.employeeId + '/terms/preview', {
    companyId: f.company,
    expectedVersion: e.version,
    change: {
      salary: null,
      commission: { effectiveDate: today, terms: employeeExamples.combined.commission },
      reason: 'معاينة',
    },
    base: { currency: 'EGP', amountMinor: '5000' },
    packingUplift: { currency: 'EGP', amountMinor: '500' },
  });
  expect(preview.status).toBe(200);
  expect(preview.body.commission.amountMinor).toBe('500');
  expect((await detail(e)).version).toBe(1);
  expect((await db.pool.query('SELECT count(*) FROM kernel.journal_effect')).rows[0].count).toBe(
    '0',
  );
  // Missing period lock is materialized; protected past is still refused by the shared exported guard.
  await expect(
    transaction(db.pool, async (tx) => {
      await lockEmployeeCompany(tx, f.company);
      return guardEditablePayrollPeriod(tx, f.company, e.employeeId, priorMonth());
    }),
  ).rejects.toThrow('PAST_PAYROLL_PROTECTED');
  const listed = await UnitOfWork.run(db.pool, f.admin.token, f.company, 'employees', (u) =>
    employeeList(u, {
      search: '123',
      branchId: f.a,
      active: 'all',
      salary: 'disabled',
      commission: 'fixed',
      effectiveDate: today,
      page: 1,
      limit: 20,
    }),
  );
  expect(listed.total).toBe(1);
});
