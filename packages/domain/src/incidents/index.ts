import type { IncidentConfirmation } from '@shahn/contracts';
import { AccessError } from '../access.js';
import { addMinor, minor } from '../kernel.js';

export function validateIncidentShares(c: IncidentConfirmation, warehouseLoss: boolean) {
  const value = minor(c.goodsValueMinor, 'nonnegative'),
    amount = minor(c.compensationMinor, 'positive');
  const company = minor(c.companyShareMinor, 'nonnegative'),
    employee = minor(c.employeeShareMinor, 'nonnegative');
  if (amount > value) throw new AccessError('COMPENSATION_EXCEEDS_GOODS_VALUE', 409);
  if (addMinor(company, employee) !== amount)
    throw new AccessError('INCIDENT_SHARES_MISMATCH', 409);
  if (warehouseLoss && employee !== 0n)
    throw new AccessError('WAREHOUSE_LOSS_COMPANY_RESPONSIBILITY', 409);
  if (
    employee > 0n
      ? !c.employeeId || !c.payrollMonth
      : c.employeeId !== null || c.payrollMonth !== null
  )
    throw new AccessError('INCIDENT_EMPLOYEE_PERIOD_REQUIRED', 409);
}
