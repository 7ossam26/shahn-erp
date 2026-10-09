-- Read-only source classification: no cash history is migrated to guessed operating revenue.
CREATE INDEX p24_correction_parent ON kernel.journal_effect(company_id,supersedes_id,id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX p24_payroll_work_branch ON employees.payroll_adjustment(company_id,branch_id,work_date,id);
CREATE INDEX p24_payroll_frozen_month ON employees.payroll_period(company_id,month,employee_id) WHERE calculation IS NOT NULL;
CREATE INDEX p24_snapshot_category ON reporting.snapshot_row(company_id,snapshot_id,(row_data->'values'->>'category'),ordinal);
