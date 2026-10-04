import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  employeeExamples,
  type EmployeeFields,
  type EmployeeResult,
  type EmployeeTerms,
} from '@shahn/contracts';
import { employeeClock } from '@shahn/database';
import { UnitOfWork } from '../kernel/unit-of-work.js';
import { employeeCommands, employeeList } from './service.js';
export async function seedEmployees(
  pool: Pool,
  token: string,
  companyId: string,
  branchId: string,
  environment: string,
) {
  if (!['test', 'development'].includes(environment)) throw Error('REFUSE_PRODUCTION_SEED');
  const clock = await employeeClock(pool),
    commands = employeeCommands(pool);
  const fields = (name: string): EmployeeFields => ({
    name,
    contact: '01000000000',
    active: true,
    employmentStart: clock.today,
    employmentEnd: null,
    branchId,
    workDays: [0, 1, 2, 3, 4],
    hoursPerDay: 8,
    weeklyDayOff: 5,
  });
  const create = async (name: string, terms: EmployeeTerms) => {
    const existing = await UnitOfWork.run(pool, token, companyId, 'employees', (u) =>
      employeeList(u, {
        search: name,
        branchId,
        active: 'all',
        salary: 'all',
        commission: 'all',
        effectiveDate: null,
        page: 1,
        limit: 20,
      }),
    );
    if (existing.items[0])
      return {
        commandId: randomUUID(),
        employeeId: existing.items[0].id,
        reference: existing.items[0].reference,
        version: existing.items[0].version,
        branchId,
      };
    return (
      await commands.execute(token, {
        schemaVersion: 1,
        companyId,
        commandId: randomUUID(),
        type: 'employee.create',
        fields: fields(name),
        terms,
      })
    ).body as EmployeeResult;
  };
  const salma = await create('تجربة P08 — سلمى', employeeExamples.salary),
    karim = await create('تجربة P08 — كريم', employeeExamples.fixed),
    mona = await create('تجربة P08 — منى', employeeExamples.combined),
    off = await create('تجربة P08 — بدون تعويض تلقائي', employeeExamples.off);
  const pending = await pool.query(
    'SELECT 1 FROM employees.employee_driver_link WHERE company_id=$1 AND employee_id=$2',
    [companyId, karim.employeeId],
  );
  if (!pending.rowCount) {
    const linked = (
      await commands.execute(token, {
        schemaVersion: 1,
        companyId,
        commandId: randomUUID(),
        type: 'employee.link',
        employeeId: karim.employeeId,
        expectedVersion: karim.version,
        effectiveDate: clock.today,
        endDate: null,
        driverId: null,
        localDriver: { name: 'مرجع محلي كريم — المطابقة الخارجية معلقة', branchId },
        reason: 'Explicit P08 trial linkage, not external provisioning',
      })
    ).body as EmployeeResult;
    karim.version = linked.version;
  }
  return {
    companyId,
    branchId,
    batch: 'P08-trial',
    salma,
    karim,
    mona,
    off,
    today: clock.today,
    month: clock.month,
  };
}
