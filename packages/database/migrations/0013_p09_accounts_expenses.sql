-- Extend the P04 catalog, preserving all existing revisions and identities.
ALTER TABLE commercial.reference DROP CONSTRAINT reference_kind_check;
ALTER TABLE commercial.reference ADD CHECK(kind IN ('governorate','area','tier','expense_category'));
INSERT INTO access.screen_capability VALUES
 ('finance.accounts','الحسابات النقدية والبنكية','/finance/accounts','assigned',true),
 ('finance.movements','الإيداع والسحب','/finance/movements','assigned',true);
UPDATE access.screen_capability SET implemented=true WHERE id='expenses';
CREATE OR REPLACE FUNCTION access.command_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.kind:=COALESCE(NEW.kind,NEW.family);
 IF NEW.kind IN ('user.create','user.update','role.create','role.update','branch.create','branch.update','company.create','company.update','support.start') THEN
  NEW.response_status:=CASE WHEN NEW.state='pending' THEN 202 WHEN NEW.state='rejected' THEN 409 ELSE 200 END;
  IF NEW.result IS NOT NULL THEN NEW.result_reference:=NEW.result; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE SCHEMA finance;
CREATE TABLE finance.account (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180), type text NOT NULL CHECK(type IN ('cash','bank')),
 currency text NOT NULL CHECK(currency='EGP'), cash_branch_id uuid,
 active boolean NOT NULL, version integer NOT NULL CHECK(version>0), bank_description text NOT NULL CHECK(length(bank_description)<=1000),
 resource_family text NOT NULL DEFAULT 'money' CHECK(resource_family='money'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,cash_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,id,resource_family) REFERENCES kernel.resource(company_id,id,family),
 CHECK((type='cash')=(cash_branch_id IS NOT NULL)), CHECK(type='bank' OR bank_description='')
);
CREATE TABLE finance.account_usage (
 company_id uuid NOT NULL, account_id uuid NOT NULL, branch_id uuid NOT NULL,
 PRIMARY KEY(company_id,account_id,branch_id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE finance.account_balance (
 company_id uuid NOT NULL, account_id uuid NOT NULL, amount_minor bigint NOT NULL DEFAULT 0 CHECK(amount_minor>=0),
 PRIMARY KEY(company_id,account_id), FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id)
);
CREATE TABLE finance.account_revision (
 company_id uuid NOT NULL, account_id uuid NOT NULL, version integer NOT NULL, fields jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES access.principal(id), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,account_id,version), FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id)
);
ALTER TABLE finance.account ADD FOREIGN KEY(company_id,id,version) REFERENCES finance.account_revision(company_id,account_id,version) DEFERRABLE INITIALLY DEFERRED;
-- Downstream modules register durable uses before releasing the same account lock.
CREATE TABLE finance.account_obligation (
 company_id uuid NOT NULL, account_id uuid NOT NULL, owner text NOT NULL CHECK(length(owner)>0), source_identity text NOT NULL,
 resolved_at timestamptz, PRIMARY KEY(company_id,account_id,owner,source_identity),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id)
);
CREATE TABLE finance.money_movement (
 company_id uuid NOT NULL, id uuid NOT NULL, account_id uuid NOT NULL, branch_id uuid NOT NULL,
 source_id uuid NOT NULL, effect_id uuid NOT NULL, source_kind text NOT NULL CHECK(source_kind IN ('expense','general')),
 direction text NOT NULL CHECK(direction IN ('deposit','withdrawal')), amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency text NOT NULL CHECK(currency='EGP'), method text NOT NULL CHECK(method IN ('cash','bank_deposit','instapay')),
 actual_date date NOT NULL, reason text NOT NULL CHECK(length(reason)<=1000), account_name text NOT NULL, branch_name text NOT NULL,
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,account_id), UNIQUE(company_id,effect_id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id)
);
CREATE TABLE finance.paid_expense (
 company_id uuid NOT NULL, id uuid NOT NULL, movement_id uuid NOT NULL, source_id uuid NOT NULL,
 account_id uuid NOT NULL, branch_id uuid NOT NULL, category_id uuid NOT NULL,
 category_kind text NOT NULL DEFAULT 'expense_category' CHECK(category_kind='expense_category'),
 category_name text NOT NULL, description text NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 1000),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL CHECK(currency='EGP'),
 actual_date date NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id), UNIQUE(company_id,movement_id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id), FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,category_id,category_kind) REFERENCES commercial.reference(company_id,id,kind)
);
CREATE TABLE finance.paid_cost (
 company_id uuid NOT NULL, expense_id uuid NOT NULL, source_id uuid NOT NULL, effect_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), actual_date date NOT NULL, branch_id uuid NOT NULL,
 PRIMARY KEY(company_id,expense_id), UNIQUE(company_id,source_id), UNIQUE(company_id,effect_id),
 FOREIGN KEY(company_id,expense_id) REFERENCES finance.paid_expense(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE finance.command_outcome (
 company_id uuid NOT NULL, id uuid NOT NULL, command_record_id uuid NOT NULL, body jsonb NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(command_record_id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE INDEX finance_account_name ON finance.account(company_id,name,id);
CREATE INDEX finance_usage_branch ON finance.account_usage(company_id,branch_id,account_id);
CREATE INDEX finance_movement_account_date ON finance.money_movement(company_id,account_id,actual_date,id);
CREATE INDEX finance_movement_branch_recorded ON finance.money_movement(company_id,branch_id,recorded_at,id);
CREATE INDEX finance_expense_branch_date ON finance.paid_expense(company_id,branch_id,actual_date,id);
CREATE INDEX finance_expense_category ON finance.paid_expense(company_id,category_id,actual_date,id);
CREATE INDEX finance_cost_period ON finance.paid_cost(company_id,actual_date,branch_id);
CREATE TRIGGER immutable_finance_movement BEFORE UPDATE OR DELETE ON finance.money_movement FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER immutable_finance_expense BEFORE UPDATE OR DELETE ON finance.paid_expense FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER immutable_finance_cost BEFORE UPDATE OR DELETE ON finance.paid_cost FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER immutable_finance_revision BEFORE UPDATE OR DELETE ON finance.account_revision FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER immutable_finance_outcome BEFORE UPDATE OR DELETE ON finance.command_outcome FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE FUNCTION finance.preserve_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DEACTIVATE_ACCOUNT'; END IF;
 IF NEW.company_id<>OLD.company_id OR NEW.id<>OLD.id OR NEW.type<>OLD.type OR NEW.currency<>OLD.currency OR NEW.cash_branch_id IS DISTINCT FROM OLD.cash_branch_id THEN RAISE EXCEPTION 'IMMUTABLE_ACCOUNT_SCOPE'; END IF;
 IF OLD.active AND NOT NEW.active AND EXISTS(SELECT 1 FROM finance.account_obligation WHERE company_id=OLD.company_id AND account_id=OLD.id AND resolved_at IS NULL) THEN RAISE EXCEPTION 'ACCOUNT_OBLIGATIONS_PENDING'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_account BEFORE UPDATE OR DELETE ON finance.account FOR EACH ROW EXECUTE FUNCTION finance.preserve_account();
CREATE FUNCTION finance.guard_obligation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACCOUNT_OBLIGATION_HISTORY_RETAINED'; END IF;
 PERFORM 1 FROM kernel.resource WHERE company_id=NEW.company_id AND id=NEW.account_id AND family='money' FOR UPDATE;
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM finance.account WHERE company_id=NEW.company_id AND id=NEW.account_id AND active) THEN RAISE EXCEPTION 'ACCOUNT_INACTIVE'; END IF;
 IF TG_OP='UPDATE' AND ((to_jsonb(NEW)-'resolved_at')<>(to_jsonb(OLD)-'resolved_at') OR OLD.resolved_at IS NOT NULL OR NEW.resolved_at IS NULL) THEN RAISE EXCEPTION 'IMMUTABLE_ACCOUNT_OBLIGATION'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_account_obligation BEFORE INSERT OR UPDATE OR DELETE ON finance.account_obligation FOR EACH ROW EXECUTE FUNCTION finance.guard_obligation();
-- Every journal writer joins the projection. Previous kernel fixture rows are untouched.
CREATE FUNCTION finance.project_account_effect() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.family='money' AND EXISTS(SELECT 1 FROM finance.account WHERE company_id=NEW.company_id AND id=NEW.subject_id) THEN
  PERFORM 1 FROM kernel.resource WHERE company_id=NEW.company_id AND id=NEW.subject_id AND family='money' FOR UPDATE;
  UPDATE finance.account_balance SET amount_minor=amount_minor+NEW.amount_minor WHERE company_id=NEW.company_id AND account_id=NEW.subject_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_PROJECTION_MISSING'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER project_account_effect AFTER INSERT ON kernel.journal_effect FOR EACH ROW EXECUTE FUNCTION finance.project_account_effect();
CREATE FUNCTION finance.validate_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_id uuid; a finance.account; uses integer;
BEGIN
 IF TG_TABLE_NAME='account' THEN account_id:=NEW.id;
 ELSE account_id:=CASE WHEN TG_OP='DELETE' THEN OLD.account_id ELSE NEW.account_id END; END IF;
 SELECT * INTO a FROM finance.account WHERE company_id=COALESCE(NEW.company_id,OLD.company_id) AND id=account_id;
 SELECT count(*) INTO uses FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id;
 IF uses=0 OR (a.type='cash' AND (uses<>1 OR NOT EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=a.company_id AND x.account_id=a.id AND x.branch_id=a.cash_branch_id))) THEN RAISE EXCEPTION 'INVALID_ACCOUNT_SCOPE'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER account_scope AFTER INSERT OR UPDATE ON finance.account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_scope();
CREATE CONSTRAINT TRIGGER account_usage_scope AFTER INSERT OR UPDATE OR DELETE ON finance.account_usage DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_scope();
CREATE FUNCTION finance.validate_financial_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='money_movement' THEN
 IF NOT EXISTS(
  SELECT 1 FROM kernel.journal_effect j WHERE j.company_id=NEW.company_id AND j.id=NEW.effect_id AND j.source_id=NEW.source_id AND j.family='money' AND j.subject_id=NEW.account_id AND j.branch_id=NEW.branch_id AND j.effective_date=NEW.actual_date
   AND j.amount_minor=CASE WHEN NEW.direction='deposit' THEN NEW.amount_minor ELSE -NEW.amount_minor END
 ) THEN RAISE EXCEPTION 'INVALID_ACCOUNT_EFFECT_LINK'; END IF;
 IF NEW.source_kind='expense' AND NOT EXISTS(SELECT 1 FROM finance.paid_expense e WHERE e.company_id=NEW.company_id AND e.movement_id=NEW.id) THEN RAISE EXCEPTION 'EXPENSE_SOURCE_REQUIRED'; END IF;
 END IF;
 IF TG_TABLE_NAME='paid_expense' THEN
 IF NOT EXISTS(
  SELECT 1 FROM finance.money_movement m WHERE m.company_id=NEW.company_id AND m.id=NEW.movement_id AND m.source_id=NEW.source_id AND m.source_kind='expense' AND m.direction='withdrawal' AND m.account_id=NEW.account_id AND m.branch_id=NEW.branch_id AND m.actual_date=NEW.actual_date AND m.amount_minor=NEW.amount_minor AND m.actor_id=NEW.actor_id
 ) THEN RAISE EXCEPTION 'INVALID_EXPENSE_PAYMENT_LINK'; END IF;
 IF NOT EXISTS(SELECT 1 FROM finance.paid_cost c WHERE c.company_id=NEW.company_id AND c.expense_id=NEW.id) THEN RAISE EXCEPTION 'PAID_COST_REQUIRED'; END IF;
 END IF;
 IF TG_TABLE_NAME='paid_cost' THEN
 IF NOT EXISTS(
  SELECT 1 FROM finance.paid_expense e JOIN kernel.journal_effect j ON j.company_id=e.company_id AND j.id=NEW.effect_id
  WHERE e.company_id=NEW.company_id AND e.id=NEW.expense_id AND e.source_id=NEW.source_id AND e.branch_id=NEW.branch_id AND e.actual_date=NEW.actual_date AND e.amount_minor=NEW.amount_minor
  AND j.source_id=NEW.source_id AND j.family='operating' AND j.kind='cost' AND j.subject_id=NEW.expense_id AND j.branch_id=NEW.branch_id AND j.effective_date=NEW.actual_date AND j.amount_minor=-NEW.amount_minor
 ) THEN RAISE EXCEPTION 'INVALID_PAID_COST_LINK'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER movement_effect_link AFTER INSERT ON finance.money_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_financial_links();
CREATE CONSTRAINT TRIGGER expense_payment_link AFTER INSERT ON finance.paid_expense DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_financial_links();
CREATE CONSTRAINT TRIGGER cost_effect_link AFTER INSERT ON finance.paid_cost DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_financial_links();
