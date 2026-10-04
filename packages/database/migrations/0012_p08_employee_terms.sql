-- P08 additive to the actual P07 registry (0008 is already brands/pricing).
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA employees;
UPDATE access.screen_capability SET implemented=true WHERE id='employees';
CREATE SEQUENCE employees.employee_reference;
CREATE TABLE employees.company_guard (
 company_id uuid PRIMARY KEY REFERENCES access.company(id)
);
CREATE TABLE employees.employee (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 reference text NOT NULL DEFAULT nextval('employees.employee_reference')::text CHECK(reference ~ '^[0-9]+$'),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180), contact text NOT NULL CHECK(length(contact)<=180),
 active boolean NOT NULL, employment_start date NOT NULL, employment_end date,
 branch_id uuid NOT NULL, work_days smallint[] NOT NULL, hours_per_day numeric(3,1) NOT NULL CHECK(hours_per_day BETWEEN 0 AND 24 AND mod(hours_per_day,0.5)=0), weekly_day_off smallint CHECK(weekly_day_off BETWEEN 0 AND 6),
 version integer NOT NULL CHECK(version>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_accepted_work_date date,
 resource_family text NOT NULL DEFAULT 'employee' CHECK(resource_family='employee'),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,id,resource_family) REFERENCES kernel.resource(company_id,id,family),
 CHECK(employment_end IS NULL OR employment_end>=employment_start),
 CHECK(work_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[] AND cardinality(work_days)<=7),
 CHECK(weekly_day_off IS NULL OR NOT weekly_day_off=ANY(work_days))
);
CREATE TABLE employees.profile_revision (
 company_id uuid NOT NULL, employee_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 fields jsonb NOT NULL, reason text NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,employee_id,version), FOREIGN KEY(company_id,employee_id) REFERENCES employees.employee(company_id,id)
);
CREATE TABLE employees.employee_branch_history (
 company_id uuid NOT NULL, employee_id uuid NOT NULL, id uuid NOT NULL, branch_id uuid NOT NULL, branch_name text NOT NULL,
 effective_from date NOT NULL, effective_to date, superseded boolean NOT NULL DEFAULT false,
 reason text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,employee_id) REFERENCES employees.employee(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id), CHECK(effective_to IS NULL OR effective_to>effective_from),
 EXCLUDE USING gist(company_id WITH =, employee_id WITH =, daterange(effective_from,effective_to,'[)') WITH &&) WHERE (NOT superseded)
);
CREATE TABLE employees.compensation_policy (
 company_id uuid NOT NULL, employee_id uuid NOT NULL, id uuid NOT NULL, axis text NOT NULL CHECK(axis IN ('salary','commission')),
 enabled boolean NOT NULL, monthly_minor bigint CHECK(monthly_minor>=0), formula text CHECK(formula IN ('percentage','fixed')),
 basis_points integer CHECK(basis_points BETWEEN 0 AND 10000), per_visit_minor bigint CHECK(per_visit_minor>=0),
 effective_from date NOT NULL, effective_to date, superseded boolean NOT NULL DEFAULT false,
 reason text NOT NULL CHECK(length(reason)>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,employee_id) REFERENCES employees.employee(company_id,id),
 CHECK(effective_to IS NULL OR effective_to>effective_from),
 CHECK(axis<>'salary' OR (extract(day FROM effective_from)=1 AND (effective_to IS NULL OR extract(day FROM effective_to)=1))),
 CHECK((axis='salary' AND formula IS NULL AND basis_points IS NULL AND per_visit_minor IS NULL AND ((enabled AND monthly_minor IS NOT NULL) OR (NOT enabled AND monthly_minor IS NULL))) OR
       (axis='commission' AND monthly_minor IS NULL AND ((NOT enabled AND formula IS NULL AND basis_points IS NULL AND per_visit_minor IS NULL) OR (enabled AND formula IS NOT NULL AND ((formula='percentage' AND basis_points IS NOT NULL AND per_visit_minor IS NULL) OR (formula='fixed' AND per_visit_minor IS NOT NULL AND basis_points IS NULL)))))),
 EXCLUDE USING gist(company_id WITH =, employee_id WITH =, axis WITH =, daterange(effective_from,effective_to,'[)') WITH &&) WHERE (NOT superseded)
);
CREATE TABLE employees.operational_driver (
 company_id uuid NOT NULL, id uuid NOT NULL, name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180), branch_id uuid NOT NULL,
 active boolean NOT NULL DEFAULT true, external_mapping text NOT NULL DEFAULT 'pending' CHECK(external_mapping IN ('pending','mapped')),
 tawsel_driver_id text, last_accepted_work_date date, version integer NOT NULL DEFAULT 1 CHECK(version>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 CHECK((external_mapping='pending' AND tawsel_driver_id IS NULL) OR (external_mapping='mapped' AND tawsel_driver_id IS NOT NULL AND length(trim(tawsel_driver_id))>0)),
 UNIQUE(company_id,tawsel_driver_id)
);
CREATE TABLE employees.employee_driver_link (
 company_id uuid NOT NULL, id uuid NOT NULL, employee_id uuid NOT NULL, driver_id uuid NOT NULL,
 effective_from date NOT NULL, effective_to date, superseded boolean NOT NULL DEFAULT false,
 driver_name text NOT NULL, reason text NOT NULL CHECK(length(reason)>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,employee_id) REFERENCES employees.employee(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id), CHECK(effective_to IS NULL OR effective_to>effective_from),
 EXCLUDE USING gist(company_id WITH =, driver_id WITH =, daterange(effective_from,effective_to,'[)') WITH &&) WHERE (NOT superseded),
 EXCLUDE USING gist(company_id WITH =, employee_id WITH =, daterange(effective_from,effective_to,'[)') WITH &&) WHERE (NOT superseded)
);
CREATE TABLE employees.payroll_period (
 company_id uuid NOT NULL, employee_id uuid NOT NULL, month date NOT NULL CHECK(extract(day FROM month)=1),
 state text NOT NULL CHECK(state IN ('editable_unpaid','frozen_unpaid','paid','zero_net_closed')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,employee_id,month), FOREIGN KEY(company_id,employee_id) REFERENCES employees.employee(company_id,id)
);
CREATE TABLE employees.command_outcome (
 company_id uuid NOT NULL, command_record_id uuid NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(company_id,command_record_id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
-- Original inputs are immutable. Closing an interval/superseding a policy retains its original row.
CREATE FUNCTION employees.protect_interval() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'EMPLOYEE_HISTORY_RETAINED'; END IF;
 IF (to_jsonb(NEW)-ARRAY['effective_to','superseded']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['effective_to','superseded'])
 OR (OLD.superseded AND NOT NEW.superseded)
 OR (OLD.effective_to IS NOT NULL AND (NEW.effective_to IS NULL OR NEW.effective_to>OLD.effective_to))
 THEN RAISE EXCEPTION 'EMPLOYEE_HISTORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_policy BEFORE UPDATE OR DELETE ON employees.compensation_policy FOR EACH ROW EXECUTE FUNCTION employees.protect_interval();
CREATE TRIGGER preserve_branch BEFORE UPDATE OR DELETE ON employees.employee_branch_history FOR EACH ROW EXECUTE FUNCTION employees.protect_interval();
CREATE TRIGGER preserve_link BEFORE UPDATE OR DELETE ON employees.employee_driver_link FOR EACH ROW EXECUTE FUNCTION employees.protect_interval();
CREATE FUNCTION employees.no_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'EMPLOYEE_HISTORY_IMMUTABLE'; END $$;
CREATE TRIGGER preserve_revision BEFORE UPDATE OR DELETE ON employees.profile_revision FOR EACH ROW EXECUTE FUNCTION employees.no_history_change();
CREATE TRIGGER preserve_outcome BEFORE UPDATE OR DELETE ON employees.command_outcome FOR EACH ROW EXECUTE FUNCTION employees.no_history_change();
CREATE TRIGGER retain_employee BEFORE DELETE ON employees.employee FOR EACH ROW EXECUTE FUNCTION employees.no_history_change();
CREATE TRIGGER retain_driver BEFORE DELETE ON employees.operational_driver FOR EACH ROW EXECUTE FUNCTION employees.no_history_change();
CREATE FUNCTION employees.protect_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PAYROLL_HISTORY_RETAINED'; END IF;
 IF (NEW.company_id,NEW.employee_id,NEW.month,NEW.recorded_at) IS DISTINCT FROM (OLD.company_id,OLD.employee_id,OLD.month,OLD.recorded_at)
 OR NEW.version<>OLD.version+1 OR (OLD.state<>'editable_unpaid' AND NOT (OLD.state='frozen_unpaid' AND NEW.state IN ('paid','zero_net_closed')))
 THEN RAISE EXCEPTION 'PAYROLL_PERIOD_PROTECTED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_period BEFORE UPDATE OR DELETE ON employees.payroll_period FOR EACH ROW EXECUTE FUNCTION employees.protect_period();
CREATE INDEX employee_list ON employees.employee(company_id,branch_id,active,name);
