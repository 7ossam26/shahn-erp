-- P20: references to actual originals, never fabricated historical salary payments or advances.
ALTER TABLE employees.payroll_period ADD COLUMN calculation jsonb,
 ADD COLUMN source_digest text CHECK(source_digest ~ '^[a-f0-9]{64}$'), ADD COLUMN frozen_at timestamptz;
CREATE OR REPLACE FUNCTION employees.protect_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PAYROLL_HISTORY_RETAINED'; END IF;
 IF (NEW.company_id,NEW.employee_id,NEW.month,NEW.recorded_at) IS DISTINCT FROM (OLD.company_id,OLD.employee_id,OLD.month,OLD.recorded_at)
 OR NEW.version<>OLD.version+1
 OR (OLD.state IN ('paid','zero_net_closed'))
 OR (OLD.state='frozen_unpaid' AND NEW.state NOT IN ('frozen_unpaid','paid','zero_net_closed'))
 OR (OLD.calculation IS NOT NULL AND (NEW.calculation,NEW.source_digest,NEW.frozen_at) IS DISTINCT FROM (OLD.calculation,OLD.source_digest,OLD.frozen_at))
 THEN RAISE EXCEPTION 'PAYROLL_PERIOD_PROTECTED'; END IF;
 RETURN NEW;
END $$;
CREATE TABLE employees.payroll_adjustment (
 company_id uuid NOT NULL, id uuid NOT NULL, employee_id uuid NOT NULL, month date NOT NULL,
 kind text NOT NULL CHECK(kind IN ('bonus','overtime','earning_deduction','earning_correction')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), reason text NOT NULL CHECK(length(trim(reason))>0),
 work_date date NOT NULL, branch_id uuid NOT NULL, source_id uuid NOT NULL, command_record_id uuid NOT NULL,
 visit_id uuid, actor_id uuid NOT NULL REFERENCES access.principal(id), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id), UNIQUE(company_id,visit_id),
 FOREIGN KEY(company_id,employee_id,month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,visit_id) REFERENCES execution.visit_fact(company_id,id),
 CHECK((kind='earning_correction')=(visit_id IS NOT NULL))
);
CREATE TABLE employees.advance (
 company_id uuid NOT NULL,id uuid NOT NULL,employee_id uuid NOT NULL,month date NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), actual_date date NOT NULL, reference text NOT NULL,
 branch_id uuid NOT NULL, source_id uuid NOT NULL, movement_id uuid NOT NULL, command_record_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,id),
 UNIQUE(company_id,movement_id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,employee_id,month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE employees.payroll_obligation (
 company_id uuid NOT NULL,id uuid NOT NULL,employee_id uuid NOT NULL,month date NOT NULL,
 kind text NOT NULL CHECK(kind IN ('advance','earning_deduction','incident')), amount_minor bigint NOT NULL CHECK(amount_minor>0),
 effective_date date NOT NULL,branch_id uuid NOT NULL,source_id uuid NOT NULL,
 advance_id uuid,adjustment_id uuid,incident_obligation_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,id),
 UNIQUE(company_id,id,employee_id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,employee_id,month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,advance_id) REFERENCES employees.advance(company_id,id),
 FOREIGN KEY(company_id,adjustment_id) REFERENCES employees.payroll_adjustment(company_id,id),
 FOREIGN KEY(company_id,incident_obligation_id) REFERENCES employees.incident_obligation(company_id,id),
 CHECK((kind='advance' AND advance_id=id AND adjustment_id IS NULL AND incident_obligation_id IS NULL) OR
 (kind='earning_deduction' AND adjustment_id=id AND advance_id IS NULL AND incident_obligation_id IS NULL) OR
 (kind='incident' AND incident_obligation_id=id AND advance_id IS NULL AND adjustment_id IS NULL))
 ,CHECK(num_nonnulls(advance_id,adjustment_id,incident_obligation_id)=1)
);
CREATE TABLE employees.payroll_recovery (
 company_id uuid NOT NULL,employee_id uuid NOT NULL,month date NOT NULL,obligation_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),state text NOT NULL CHECK(state IN ('reserved','settled')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),settled_at timestamptz,
 PRIMARY KEY(company_id,employee_id,month,obligation_id),
 FOREIGN KEY(company_id,employee_id,month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,obligation_id,employee_id) REFERENCES employees.payroll_obligation(company_id,id,employee_id),
 CHECK((state='settled')=(settled_at IS NOT NULL))
);
CREATE FUNCTION employees.protect_recovery() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original bigint; allocated numeric;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PAYROLL_RECOVERY_IMMUTABLE'; END IF;
 IF TG_OP='UPDATE' AND (OLD.state<>'reserved' OR NEW.state<>'settled' OR
 (to_jsonb(NEW)-ARRAY['state','settled_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','settled_at'])) THEN RAISE EXCEPTION 'PAYROLL_RECOVERY_IMMUTABLE'; END IF;
 SELECT amount_minor INTO original FROM employees.payroll_obligation WHERE company_id=NEW.company_id AND id=NEW.obligation_id FOR UPDATE;
 SELECT COALESCE(sum(amount_minor),0) INTO allocated FROM employees.payroll_recovery WHERE company_id=NEW.company_id AND obligation_id=NEW.obligation_id;
 IF TG_OP='INSERT' AND allocated+NEW.amount_minor>original THEN RAISE EXCEPTION 'PAYROLL_RECOVERY_EXCEEDS_ORIGINAL'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER recovery_cap BEFORE INSERT OR UPDATE OR DELETE ON employees.payroll_recovery FOR EACH ROW EXECUTE FUNCTION employees.protect_recovery();
CREATE TABLE employees.salary_payment (
 company_id uuid NOT NULL,id uuid NOT NULL,employee_id uuid NOT NULL,month date NOT NULL,
 command_id uuid NOT NULL,command_record_id uuid NOT NULL,source_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),actual_date date NOT NULL,account_id uuid,method text, movement_id uuid,reference text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,id),UNIQUE(company_id,employee_id,month),UNIQUE(company_id,movement_id),
 FOREIGN KEY(company_id,employee_id,month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id),
 CHECK((amount_minor=0 AND account_id IS NULL AND method IS NULL AND movement_id IS NULL) OR (amount_minor>0 AND account_id IS NOT NULL AND method IN ('cash','bank_deposit','instapay') AND movement_id IS NOT NULL))
);
CREATE TABLE employees.payroll_outcome (
 company_id uuid NOT NULL,command_record_id uuid NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(company_id,command_record_id),FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['payroll_adjustment','advance','payroll_obligation','salary_payment','payroll_outcome'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON employees.%I FOR EACH ROW EXECUTE FUNCTION employees.no_history_change()',t);
 END LOOP;
END $$;
CREATE VIEW employees.obligation_balance AS
 SELECT o.*, (o.amount_minor-COALESCE(sum(r.amount_minor) FILTER(WHERE r.state='settled'),0))::bigint AS outstanding_amount,
 COALESCE(sum(r.amount_minor) FILTER(WHERE r.state='reserved'),0)::bigint AS reserved_for_frozen_periods,
 (o.amount_minor-COALESCE(sum(r.amount_minor),0))::bigint AS available_for_new_allocation
 FROM employees.payroll_obligation o LEFT JOIN employees.payroll_recovery r ON(r.company_id,r.obligation_id)=(o.company_id,o.id)
 GROUP BY o.company_id,o.id;
-- Existing confirmed incident obligations keep their original identity, classification and timestamps.
INSERT INTO employees.payroll_obligation(company_id,id,employee_id,month,kind,amount_minor,effective_date,branch_id,source_id,incident_obligation_id,recorded_at)
 SELECT company_id,id,employee_id,payroll_month,'incident',amount_minor,effective_date,incident_branch_id,source_id,id,recorded_at FROM employees.incident_obligation;
ALTER TABLE finance.money_movement DROP CONSTRAINT money_movement_source_kind_check;
ALTER TABLE finance.money_movement ADD CHECK(source_kind IN ('general','expense','treasury_send','treasury_receive','remittance','brand_payout','storage_receipt','storage_refund','employee_advance','salary_payout'));
CREATE INDEX payroll_due ON employees.payroll_obligation(company_id,employee_id,month,effective_date,id);
CREATE INDEX payroll_adjustments_period ON employees.payroll_adjustment(company_id,employee_id,month);
CREATE FUNCTION employees.validate_payroll_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p employees.payroll_period; actual numeric; expected numeric; o employees.payroll_obligation;
BEGIN
 IF TG_TABLE_NAME='payroll_obligation' THEN
  o:=NEW;
  IF NOT EXISTS(
   SELECT 1 FROM employees.advance a WHERE o.kind='advance' AND (a.company_id,a.id,a.employee_id,a.month,a.amount_minor,a.source_id,a.branch_id)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id)
   UNION ALL SELECT 1 FROM employees.payroll_adjustment a WHERE o.kind='earning_deduction' AND a.kind='earning_deduction' AND (a.company_id,a.id,a.employee_id,a.month,a.amount_minor,a.source_id,a.branch_id)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id)
   UNION ALL SELECT 1 FROM employees.incident_obligation a WHERE o.kind='incident' AND (a.company_id,a.id,a.employee_id,a.payroll_month,a.amount_minor,a.source_id,a.incident_branch_id)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id)
  ) THEN RAISE EXCEPTION 'PAYROLL_ORIGINAL_LINK_MISMATCH'; END IF;
 ELSIF TG_TABLE_NAME='advance' THEN
  IF NOT EXISTS(SELECT 1 FROM finance.money_movement m WHERE (m.company_id,m.id,m.source_id,m.amount_minor,m.actual_date)=(NEW.company_id,NEW.movement_id,NEW.source_id,NEW.amount_minor,NEW.actual_date) AND m.source_kind='employee_advance' AND m.direction='withdrawal')
  OR NOT EXISTS(SELECT 1 FROM employees.payroll_obligation WHERE company_id=NEW.company_id AND id=NEW.id AND kind='advance') THEN RAISE EXCEPTION 'ADVANCE_CASH_OBLIGATION_MISMATCH'; END IF;
 ELSE
  SELECT * INTO p FROM employees.payroll_period WHERE company_id=NEW.company_id AND employee_id=NEW.employee_id AND month=NEW.month;
  IF p.calculation IS NOT NULL THEN
   expected:=(p.calculation->'calculation'->>'recoveryThisPeriod')::numeric;
   SELECT COALESCE(sum(amount_minor),0) INTO actual FROM employees.payroll_recovery WHERE company_id=p.company_id AND employee_id=p.employee_id AND month=p.month;
   IF actual<>expected OR EXISTS(SELECT 1 FROM employees.payroll_recovery r WHERE r.company_id=p.company_id AND r.employee_id=p.employee_id AND r.month=p.month AND ((p.state='frozen_unpaid' AND r.state<>'reserved') OR (p.state IN ('paid','zero_net_closed') AND r.state<>'settled')))
   THEN RAISE EXCEPTION 'PAYROLL_SNAPSHOT_RECOVERY_MISMATCH'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(p.calculation->'calculation'->'allocations') a
    FULL JOIN (SELECT * FROM employees.payroll_recovery WHERE company_id=p.company_id AND employee_id=p.employee_id AND month=p.month) r
     ON r.obligation_id=(a->>'obligationId')::uuid
    WHERE r.obligation_id IS NULL OR a IS NULL OR r.amount_minor<>(a->>'amountMinor')::bigint)
   THEN RAISE EXCEPTION 'PAYROLL_SNAPSHOT_ORIGINAL_MISMATCH'; END IF;
   IF p.state IN ('paid','zero_net_closed') AND NOT EXISTS(SELECT 1 FROM employees.salary_payment s WHERE s.company_id=p.company_id AND s.employee_id=p.employee_id AND s.month=p.month AND s.amount_minor=(p.calculation->'calculation'->>'netPayable')::bigint)
   THEN RAISE EXCEPTION 'PAYROLL_FULL_PAYMENT_REQUIRED'; END IF;
  END IF;
  IF TG_TABLE_NAME='salary_payment' THEN
   IF p.calculation IS NULL OR p.state NOT IN ('paid','zero_net_closed') OR (p.state='zero_net_closed')<>(NEW.amount_minor=0) OR NEW.amount_minor<>(p.calculation->'calculation'->>'netPayable')::bigint
   OR (NEW.amount_minor>0 AND NOT EXISTS(SELECT 1 FROM finance.money_movement m WHERE(m.company_id,m.id,m.source_id,m.account_id,m.amount_minor,m.actual_date,m.method)=(NEW.company_id,NEW.movement_id,NEW.source_id,NEW.account_id,NEW.amount_minor,NEW.actual_date,NEW.method) AND m.source_kind='salary_payout' AND m.direction='withdrawal'))
   THEN RAISE EXCEPTION 'PAYROLL_CASH_LINK_MISMATCH'; END IF;
  END IF;
 END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['payroll_obligation','advance','salary_payment','payroll_recovery','payroll_period'] LOOP
 EXECUTE format('CREATE CONSTRAINT TRIGGER links AFTER INSERT OR UPDATE ON employees.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION employees.validate_payroll_links()',t);
 END LOOP;
END $$;
-- P24 consumes one classified cost per original source. Recovery never appears in this view.
CREATE VIEW employees.payroll_cost_source AS
 SELECT p.company_id,p.employee_id,p.month AS work_date,(e->>'branchId')::uuid AS branch_id,
 'salary'::text AS kind,(e->>'id')::uuid AS source_id,(e->>'amountMinor')::bigint AS amount_minor
 FROM employees.payroll_period p CROSS JOIN LATERAL jsonb_array_elements(p.calculation->'earnings') e WHERE e->>'kind'='salary'
 UNION ALL SELECT company_id,employee_id,work_date,branch_id,kind,source_id,
 CASE WHEN kind='earning_deduction' THEN -amount_minor ELSE amount_minor END FROM employees.payroll_adjustment
 UNION ALL SELECT b.company_id,(b.resolution->>'employeeId')::uuid,(v.work_at AT TIME ZONE 'Africa/Cairo')::date,v.branch_id,'commission',v.source_record_id,b.amount_minor
 FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
 WHERE b.resolution->>'status'='resolved' AND b.journal_effect_id IS NOT NULL;
