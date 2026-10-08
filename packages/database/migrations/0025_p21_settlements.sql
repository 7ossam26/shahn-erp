-- P21 typed settlements, corrections and optional opening entries (ERP-D-109/118/119/121/124/
-- 125/132/133/174/202/204, ERP-R-115/125/126/129/133/134/141/142/183). Additive only: no posted
-- source record is rewritten and no historical value is backfilled as settled or eligible.
INSERT INTO access.screen_capability(id,title,route,policy,implemented) VALUES
 ('settlements','التسويات والتصحيحات','/settlements','assigned',true),
 ('opening','الأرصدة الافتتاحية','/settings/opening-balances','assigned',true);

-- Two new typed journal classes. Existing rows keep their original classification.
--   brand/adjustment: independently agreed commercial credit or debit, outside profit until classified.
--   employee/opening: signed pre-ERP balance (positive entitlement, negative obligation).
DO $$ DECLARE n text; BEGIN
 SELECT conname INTO n FROM pg_constraint WHERE conrelid='kernel.journal_effect'::regclass AND conname='p18_journal_classification';
 EXECUTE format('ALTER TABLE kernel.journal_effect DROP CONSTRAINT %I',n);
END $$;
ALTER TABLE kernel.journal_effect ADD CONSTRAINT p21_journal_classification CHECK(
 (family='brand' AND ((kind IN ('goods','compensation') AND amount_minor>0) OR (kind IN ('fee','payout') AND amount_minor<0) OR kind IN ('opening','correction','adjustment'))) OR
 (family='money' AND ((kind IN ('receipt','transfer_in') AND amount_minor>0) OR (kind IN ('payment','transfer_out') AND amount_minor<0) OR kind IN ('opening','correction'))) OR
 (family='employee' AND ((kind IN ('earning','obligation') AND amount_minor>0) OR (kind='recovery' AND amount_minor<0) OR kind IN ('correction','opening'))) OR
 (family='operating' AND ((kind IN ('shipping','storage','employee_compensation_share') AND amount_minor>0) OR (kind IN ('cost','waiver') AND amount_minor<0) OR kind='correction')) OR
 (family='storage' AND ((kind='receipt' AND amount_minor>0) OR (kind IN ('allocation','refund') AND amount_minor<0) OR kind='correction')));
ALTER TABLE finance.money_movement DROP CONSTRAINT money_movement_source_kind_check;
ALTER TABLE finance.money_movement ADD CHECK(source_kind IN ('general','expense','treasury_send','treasury_receive','remittance','brand_payout','storage_receipt','storage_refund','employee_advance','salary_payout','opening','settlement'));

CREATE SCHEMA settlements;
CREATE SEQUENCE settlements.case_reference_seq;
CREATE SEQUENCE settlements.opening_reference_seq;
CREATE TABLE settlements.adjustment_case (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 reference text NOT NULL DEFAULT nextval('settlements.case_reference_seq')::text CHECK(reference ~ '^[0-9]+$'),
 target_kind text NOT NULL CHECK(target_kind IN ('product','account','brand','employee','parcel','source','storage')),
 target_id uuid NOT NULL, branch_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('product.observe','account.observe','brand.correct','brand.adjust','employee.adjust','source.resolve','incident.resolve','storage.refund','parcel.incident','parcel.cancel')),
 state text NOT NULL CHECK(state IN ('open','resolved')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000), actual_date date NOT NULL,
 opened_command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), resolved_at timestamptz,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,opened_command_record_id) REFERENCES command_record(company_id,id),
 CHECK((state='resolved')=(resolved_at IS NOT NULL)),
 CHECK(actual_date <= (recorded_at AT TIME ZONE 'Africa/Cairo')::date)
);
-- One typed result per confirmed command. Its canonical preview and digest are what staff saw.
CREATE TABLE settlements.resolution (
 company_id uuid NOT NULL, id uuid NOT NULL, case_id uuid NOT NULL,
 operation text NOT NULL CHECK(length(operation) BETWEEN 1 AND 60),
 classification text NOT NULL CHECK(classification IN ('stock_observation','account_observation','missed_expense','missed_general_movement',
  'company_loss_unclassified','employee_liability','brand_correction','brand_commercial_unclassified','payroll_addition','payroll_earning_deduction',
  'source_review_correction','source_review_retained','incident_review_correction','incident_review_retained','storage_credit_refund',
  'parcel_incident_report','parcel_cancellation')),
 amount_minor bigint, quantity bigint, source_id uuid,
 effect_digest text NOT NULL CHECK(effect_digest ~ '^[a-f0-9]{64}$'), preview jsonb NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000), actual_date date NOT NULL,
 command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,command_record_id),
 FOREIGN KEY(company_id,case_id) REFERENCES settlements.adjustment_case(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 CHECK(amount_minor IS NULL OR amount_minor<>0), CHECK(quantity IS NULL OR quantity<>0)
);
-- Permanent links: the original evidence, dependent posted records seen, and every result record.
CREATE TABLE settlements.case_link (
 company_id uuid NOT NULL, case_id uuid NOT NULL, resolution_id uuid,
 role text NOT NULL CHECK(role IN ('original','dependent','result')),
 entity_kind text NOT NULL CHECK(entity_kind ~ '^[a-z_]{1,60}$'), entity_id uuid NOT NULL,
 label text NOT NULL CHECK(length(label)<=300), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,case_id,role,entity_kind,entity_id),
 FOREIGN KEY(company_id,case_id) REFERENCES settlements.adjustment_case(company_id,id),
 FOREIGN KEY(company_id,resolution_id) REFERENCES settlements.resolution(company_id,id)
);
CREATE TABLE settlements.stock_observation (
 company_id uuid NOT NULL, case_id uuid NOT NULL, branch_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL,
 condition text NOT NULL CHECK(condition IN ('sound','unavailable')),
 recorded_quantity bigint NOT NULL CHECK(recorded_quantity BETWEEN 0 AND 9007199254740991),
 observed_quantity bigint NOT NULL CHECK(observed_quantity BETWEEN 0 AND 9007199254740991),
 delta bigint NOT NULL CHECK(delta<>0 AND delta=observed_quantity-recorded_quantity),
 position_version integer NOT NULL CHECK(position_version>0),
 reserved_quantity bigint NOT NULL CHECK(reserved_quantity>=0), shortage_after bigint NOT NULL CHECK(shortage_after>=0),
 stock_source_id uuid NOT NULL, observed_date date NOT NULL,
 PRIMARY KEY(company_id,case_id), UNIQUE(company_id,stock_source_id),
 FOREIGN KEY(company_id,case_id) REFERENCES settlements.adjustment_case(company_id,id),
 FOREIGN KEY(company_id,branch_id,brand_id,variant_id) REFERENCES inventory.stock_position(company_id,branch_id,brand_id,variant_id),
 FOREIGN KEY(company_id,stock_source_id) REFERENCES inventory.stock_source(company_id,id)
);
-- Observation is retained even after later genuine movements; the hold amount never re-reads it.
CREATE TABLE settlements.account_observation (
 company_id uuid NOT NULL, case_id uuid NOT NULL, account_id uuid NOT NULL, branch_id uuid NOT NULL,
 book_minor bigint NOT NULL CHECK(book_minor>=0), observed_minor bigint NOT NULL CHECK(observed_minor>=0),
 difference_minor bigint NOT NULL CHECK(difference_minor<>0 AND difference_minor=observed_minor-book_minor),
 movement_count integer NOT NULL CHECK(movement_count>=0), observed_date date NOT NULL,
 PRIMARY KEY(company_id,case_id),
 FOREIGN KEY(company_id,case_id) REFERENCES settlements.adjustment_case(company_id,id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE INDEX settlements_observation_account ON settlements.account_observation(company_id,account_id);
CREATE TABLE settlements.account_hold (
 company_id uuid NOT NULL, id uuid NOT NULL, case_id uuid NOT NULL, account_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,case_id),
 FOREIGN KEY(company_id,case_id) REFERENCES settlements.account_observation(company_id,case_id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id)
);
CREATE TABLE settlements.account_hold_release (
 company_id uuid NOT NULL, id uuid NOT NULL, hold_id uuid NOT NULL, resolution_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,resolution_id),
 FOREIGN KEY(company_id,hold_id) REFERENCES settlements.account_hold(company_id,id),
 FOREIGN KEY(company_id,resolution_id) REFERENCES settlements.resolution(company_id,id)
);
CREATE VIEW settlements.account_hold_balance AS
 SELECT h.company_id,h.id,h.case_id,h.account_id,h.amount_minor,
 (h.amount_minor-COALESCE(sum(r.amount_minor),0))::bigint AS active_minor
 FROM settlements.account_hold h LEFT JOIN settlements.account_hold_release r ON(r.company_id,r.hold_id)=(h.company_id,h.id)
 GROUP BY h.company_id,h.id;
CREATE FUNCTION settlements.cap_hold_release() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE remaining numeric;
BEGIN
 PERFORM 1 FROM settlements.account_hold WHERE company_id=NEW.company_id AND id=NEW.hold_id FOR UPDATE;
 SELECT active_minor INTO remaining FROM settlements.account_hold_balance WHERE company_id=NEW.company_id AND id=NEW.hold_id;
 IF remaining IS NULL OR NEW.amount_minor>remaining THEN RAISE EXCEPTION 'SETTLEMENT_HOLD_OVER_RELEASED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cap_hold_release BEFORE INSERT ON settlements.account_hold_release FOR EACH ROW EXECUTE FUNCTION settlements.cap_hold_release();
-- Account resolutions never exceed the observed unexplained difference.
CREATE FUNCTION settlements.cap_account_resolution() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE o settlements.account_observation; used numeric;
BEGIN
 SELECT * INTO o FROM settlements.account_observation WHERE company_id=NEW.company_id AND case_id=NEW.case_id;
 IF o.case_id IS NULL OR NEW.classification='account_observation' THEN RETURN NEW; END IF;
 IF NEW.amount_minor IS NULL OR NEW.amount_minor<=0 THEN RAISE EXCEPTION 'SETTLEMENT_ACCOUNT_RESOLUTION_AMOUNT'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM settlements.resolution WHERE company_id=NEW.company_id AND case_id=NEW.case_id AND classification<>'account_observation';
 IF used+NEW.amount_minor>abs(o.difference_minor) THEN RAISE EXCEPTION 'SETTLEMENT_RESOLUTION_EXCEEDS_DIFFERENCE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cap_account_resolution BEFORE INSERT ON settlements.resolution FOR EACH ROW EXECUTE FUNCTION settlements.cap_account_resolution();

-- Employee originals created by P21 (opening obligation or approved account-shortage liability).
-- P20 recovers them through its ordinary obligation order; recovery never reduces employee cost.
CREATE TABLE settlements.employee_obligation (
 company_id uuid NOT NULL, id uuid NOT NULL, employee_id uuid NOT NULL, month date NOT NULL,
 kind text NOT NULL CHECK(kind IN ('opening','account_liability')), amount_minor bigint NOT NULL CHECK(amount_minor>0),
 effective_date date NOT NULL, branch_id uuid NOT NULL, source_id uuid NOT NULL,
 label text NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 300), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,employee_id,month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id)
);

CREATE TABLE settlements.opening_batch (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 reference text NOT NULL DEFAULT nextval('settlements.opening_reference_seq')::text CHECK(reference ~ '^[0-9]+$'),
 opening_date date NOT NULL, description text NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 1000),
 evidence text NOT NULL CHECK(length(evidence)<=500), effect_digest text NOT NULL CHECK(effect_digest ~ '^[a-f0-9]{64}$'),
 preview jsonb NOT NULL, command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(company_id,command_record_id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 CHECK(opening_date <= (recorded_at AT TIME ZONE 'Africa/Cairo')::date)
);
CREATE TABLE settlements.opening_line (
 company_id uuid NOT NULL, batch_id uuid NOT NULL, line_number integer NOT NULL CHECK(line_number BETWEEN 1 AND 200),
 target_kind text NOT NULL CHECK(target_kind IN ('account','brand','employee','stock')),
 -- The duplicate-target guard: one opening per account, brand class, employee class or stock position/condition.
 target_key text NOT NULL CHECK(length(target_key) BETWEEN 1 AND 300),
 classification text NOT NULL CHECK(classification IN ('account_balance','brand_eligible_credit','brand_pending_driver_held','brand_debt',
  'employee_obligation','employee_entitlement','stock_sound','stock_unavailable')),
 branch_id uuid NOT NULL, account_id uuid, brand_id uuid, employee_id uuid, variant_id uuid, payroll_month date,
 amount_minor bigint CHECK(amount_minor>0), quantity bigint CHECK(quantity BETWEEN 1 AND 9007199254740991),
 source_id uuid, effect_id uuid, stock_source_id uuid, employee_obligation_id uuid, payroll_adjustment_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,batch_id,line_number), UNIQUE(company_id,target_key),
 FOREIGN KEY(company_id,batch_id) REFERENCES settlements.opening_batch(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id),
 FOREIGN KEY(company_id,stock_source_id) REFERENCES inventory.stock_source(company_id,id),
 FOREIGN KEY(company_id,employee_obligation_id) REFERENCES settlements.employee_obligation(company_id,id),
 FOREIGN KEY(company_id,payroll_adjustment_id) REFERENCES employees.payroll_adjustment(company_id,id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,employee_id) REFERENCES employees.employee(company_id,id),
 FOREIGN KEY(company_id,brand_id,variant_id) REFERENCES inventory.product_variant(company_id,brand_id,id),
 CHECK(
  (classification='account_balance' AND target_kind='account' AND account_id IS NOT NULL AND amount_minor IS NOT NULL AND effect_id IS NOT NULL AND quantity IS NULL) OR
  (classification IN ('brand_eligible_credit','brand_pending_driver_held','brand_debt') AND target_kind='brand' AND brand_id IS NOT NULL AND amount_minor IS NOT NULL AND effect_id IS NOT NULL AND quantity IS NULL) OR
  (classification='employee_obligation' AND target_kind='employee' AND employee_id IS NOT NULL AND payroll_month IS NOT NULL AND amount_minor IS NOT NULL AND effect_id IS NOT NULL AND employee_obligation_id IS NOT NULL) OR
  (classification='employee_entitlement' AND target_kind='employee' AND employee_id IS NOT NULL AND payroll_month IS NOT NULL AND amount_minor IS NOT NULL AND effect_id IS NOT NULL AND payroll_adjustment_id IS NOT NULL) OR
  (classification IN ('stock_sound','stock_unavailable') AND target_kind='stock' AND brand_id IS NOT NULL AND variant_id IS NOT NULL AND quantity IS NOT NULL AND stock_source_id IS NOT NULL AND amount_minor IS NULL))
);
-- Retained native result for command recovery, readable after command-record compaction.
CREATE TABLE settlements.command_outcome (
 company_id uuid NOT NULL, command_record_id uuid NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(company_id,command_record_id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE FUNCTION settlements.protect_case() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'SETTLEMENT_HISTORY_RETAINED'; END IF;
 IF OLD.state<>'open' OR NEW.state<>'resolved' OR NEW.version<>OLD.version+1 OR NEW.resolved_at IS NULL
 OR (to_jsonb(NEW)-ARRAY['state','version','resolved_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','resolved_at'])
 THEN RAISE EXCEPTION 'SETTLEMENT_HISTORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_case BEFORE UPDATE OR DELETE ON settlements.adjustment_case FOR EACH ROW EXECUTE FUNCTION settlements.protect_case();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['resolution','case_link','stock_observation','account_observation','account_hold','account_hold_release','employee_obligation','opening_batch','opening_line','command_outcome'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON settlements.%I FOR EACH ROW EXECUTE FUNCTION kernel.immutable()',t);
 END LOOP;
END $$;
CREATE INDEX settlements_case_list ON settlements.adjustment_case(company_id,state,recorded_at DESC,id);
CREATE INDEX settlements_case_target ON settlements.adjustment_case(company_id,target_kind,target_id);
CREATE INDEX settlements_hold_account ON settlements.account_hold(company_id,account_id);
CREATE INDEX settlements_link_entity ON settlements.case_link(company_id,entity_kind,entity_id);

-- P20 extension: P21 originals join the ordinary payroll order without a new recovery engine.
--   payroll_obligation kind 'settlement' recovers an opening/approved-liability original (no cost effect).
--   payroll_adjustment kind 'opening_entitlement' pays a pre-ERP entitlement once (excluded from cost).
ALTER TABLE employees.payroll_obligation ADD COLUMN settlement_obligation_id uuid;
ALTER TABLE employees.payroll_obligation ADD FOREIGN KEY(company_id,settlement_obligation_id) REFERENCES settlements.employee_obligation(company_id,id);
DO $$ DECLARE n text; BEGIN
 FOR n IN SELECT conname FROM pg_constraint WHERE conrelid='employees.payroll_obligation'::regclass AND contype='c'
  AND (pg_get_constraintdef(oid) LIKE '%advance_id%' OR pg_get_constraintdef(oid) LIKE '%earning_deduction%') LOOP
  EXECUTE format('ALTER TABLE employees.payroll_obligation DROP CONSTRAINT %I',n);
 END LOOP;
 FOR n IN SELECT conname FROM pg_constraint WHERE conrelid='employees.payroll_adjustment'::regclass AND contype='c'
  AND pg_get_constraintdef(oid) LIKE '%bonus%' LOOP
  EXECUTE format('ALTER TABLE employees.payroll_adjustment DROP CONSTRAINT %I',n);
 END LOOP;
END $$;
ALTER TABLE employees.payroll_obligation ADD CONSTRAINT payroll_obligation_kind_check CHECK(kind IN ('advance','earning_deduction','incident','settlement'));
ALTER TABLE employees.payroll_obligation ADD CONSTRAINT payroll_obligation_original_link CHECK(
 (kind='advance' AND advance_id=id AND adjustment_id IS NULL AND incident_obligation_id IS NULL AND settlement_obligation_id IS NULL) OR
 (kind='earning_deduction' AND adjustment_id=id AND advance_id IS NULL AND incident_obligation_id IS NULL AND settlement_obligation_id IS NULL) OR
 (kind='incident' AND incident_obligation_id=id AND advance_id IS NULL AND adjustment_id IS NULL AND settlement_obligation_id IS NULL) OR
 (kind='settlement' AND settlement_obligation_id=id AND advance_id IS NULL AND adjustment_id IS NULL AND incident_obligation_id IS NULL));
ALTER TABLE employees.payroll_obligation ADD CONSTRAINT payroll_obligation_one_original CHECK(num_nonnulls(advance_id,adjustment_id,incident_obligation_id,settlement_obligation_id)=1);
ALTER TABLE employees.payroll_adjustment ADD CONSTRAINT payroll_adjustment_kind_check CHECK(kind IN ('bonus','overtime','earning_deduction','earning_correction','opening_entitlement'));
CREATE OR REPLACE FUNCTION employees.validate_payroll_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p employees.payroll_period; actual numeric; expected numeric; o employees.payroll_obligation;
BEGIN
 IF TG_TABLE_NAME='payroll_obligation' THEN
  o:=NEW;
  IF NOT EXISTS(
   SELECT 1 FROM employees.advance a WHERE o.kind='advance' AND (a.company_id,a.id,a.employee_id,a.month,a.amount_minor,a.source_id,a.branch_id)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id)
   UNION ALL SELECT 1 FROM employees.payroll_adjustment a WHERE o.kind='earning_deduction' AND a.kind='earning_deduction' AND (a.company_id,a.id,a.employee_id,a.month,a.amount_minor,a.source_id,a.branch_id)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id)
   UNION ALL SELECT 1 FROM employees.incident_obligation a WHERE o.kind='incident' AND (a.company_id,a.id,a.employee_id,a.payroll_month,a.amount_minor,a.source_id,a.incident_branch_id)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id)
   UNION ALL SELECT 1 FROM settlements.employee_obligation a WHERE o.kind='settlement' AND (a.company_id,a.id,a.employee_id,a.month,a.amount_minor,a.source_id,a.branch_id,a.effective_date)=(o.company_id,o.id,o.employee_id,o.month,o.amount_minor,o.source_id,o.branch_id,o.effective_date)
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
-- An opening entitlement was a pre-ERP cost; paying it now is not current employee earning cost.
CREATE OR REPLACE VIEW employees.payroll_cost_source AS
 SELECT p.company_id,p.employee_id,p.month AS work_date,(e->>'branchId')::uuid AS branch_id,
 'salary'::text AS kind,(e->>'id')::uuid AS source_id,(e->>'amountMinor')::bigint AS amount_minor
 FROM employees.payroll_period p CROSS JOIN LATERAL jsonb_array_elements(p.calculation->'earnings') e WHERE e->>'kind'='salary'
 UNION ALL SELECT company_id,employee_id,work_date,branch_id,kind,source_id,
 CASE WHEN kind='earning_deduction' THEN -amount_minor ELSE amount_minor END FROM employees.payroll_adjustment WHERE kind<>'opening_entitlement'
 UNION ALL SELECT b.company_id,(b.resolution->>'employeeId')::uuid,(v.work_at AT TIME ZONE 'Africa/Cairo')::date,v.branch_id,'commission',v.source_record_id,b.amount_minor
 FROM execution.earning_basis b JOIN execution.visit_fact v ON(v.company_id,v.id)=(b.company_id,b.visit_id)
 WHERE b.resolution->>'status'='resolved' AND b.journal_effect_id IS NOT NULL;
