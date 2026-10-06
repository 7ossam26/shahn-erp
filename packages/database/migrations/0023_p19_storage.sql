-- P19 storage subscriptions, partial/advance storage credit and refunds (ERP-D-048/139/140/141/172/
-- 192/201/204, adopted mechanics ERP-D-205). Planned as 0019; 0019..0022 were already used.
--
-- Safe migration policy for P04 agreement data: the configuration (start date, anchor day, fee and
-- revenue branch) carries over as one agreement per company brand with revision 1. Nothing is
-- paid, received, allocated, refunded or earned here. Anniversary periods that started before this
-- migration are historical: they need existing evidence through the later P21 opening/adjustment
-- flow and are never generated automatically (first_billable_index starts at the first period
-- beginning on/after the migration's Cairo date).
INSERT INTO access.screen_capability(id,title,route,policy,implemented)
VALUES('storage','اشتراكات التخزين','/storage','wallet',true);
ALTER TABLE finance.money_movement DROP CONSTRAINT money_movement_source_kind_check;
ALTER TABLE finance.money_movement ADD CHECK(source_kind IN ('expense','general','treasury_send','treasury_receive','remittance','brand_payout','storage_receipt','storage_refund'));
CREATE SCHEMA storage;
-- Original-anchor boundary: never derived from a previously clamped boundary.
CREATE FUNCTION storage.period_start(original date, anchor integer, idx integer) RETURNS date
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
 SELECT (m + (least(anchor, extract(day FROM (m + interval '1 month' - interval '1 day'))::int) - 1))::date
 FROM (SELECT (date_trunc('month', original) + make_interval(months => idx))::date AS m) x
$$;
CREATE TABLE storage.agreement (
 company_id uuid NOT NULL, id uuid NOT NULL, brand_id uuid NOT NULL,
 start_date date NOT NULL, anchor_day smallint NOT NULL CHECK(anchor_day BETWEEN 1 AND 31),
 first_billable_index integer NOT NULL CHECK(first_billable_index BETWEEN 0 AND 12000),
 entry_date date NOT NULL,
 state text NOT NULL CHECK(state IN ('active','stopped')), stop_boundary date,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 origin text NOT NULL CHECK(origin IN ('brand_setup','p04_configuration')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,id,brand_id),
 -- One subscription per company brand, independent of how many branches hold its stock.
 UNIQUE(company_id,brand_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 CHECK(anchor_day=extract(day FROM start_date)),
 CHECK((state='stopped')=(stop_boundary IS NOT NULL)),
 CHECK(stop_boundary IS NULL OR stop_boundary>=start_date)
);
CREATE TABLE storage.agreement_revision (
 company_id uuid NOT NULL, agreement_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
 effective_period_index integer NOT NULL CHECK(effective_period_index BETWEEN 0 AND 12000),
 fee_minor bigint NOT NULL CHECK(fee_minor>=0), branch_id uuid NOT NULL,
 origin text NOT NULL CHECK(origin IN ('brand_setup','p04_configuration')),
 command_record_id uuid, actor_id uuid REFERENCES access.principal(id), actor_name text NOT NULL DEFAULT '',
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,agreement_id,revision),
 FOREIGN KEY(company_id,agreement_id) REFERENCES storage.agreement(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 CHECK((command_record_id IS NULL)=(actor_id IS NULL)),
 CHECK(origin='p04_configuration' OR command_record_id IS NOT NULL),
 CHECK(revision>1 OR effective_period_index=0)
);
-- Dedicated (company, brand) storage-credit subledger lock row. Its kernel resource uses the brand
-- ID with family 'storage', so it is never the brand payout wallet ('brand') or an account.
CREATE TABLE storage.credit_account (
 company_id uuid NOT NULL, brand_id uuid NOT NULL, family text NOT NULL DEFAULT 'storage' CHECK(family='storage'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,brand_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,brand_id,family) REFERENCES kernel.resource(company_id,id,family)
);
CREATE TABLE storage.period (
 company_id uuid NOT NULL, id uuid NOT NULL, agreement_id uuid NOT NULL, brand_id uuid NOT NULL,
 period_index integer NOT NULL CHECK(period_index BETWEEN 0 AND 12000),
 start_date date NOT NULL, next_start_date date NOT NULL,
 fee_minor bigint NOT NULL CHECK(fee_minor>=0), branch_id uuid NOT NULL, revision integer NOT NULL,
 source_id uuid NOT NULL, revenue_effect_id uuid, generated_on date NOT NULL,
 work_item_id uuid, lease_owner uuid, fence integer,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,id,brand_id),
 UNIQUE(company_id,agreement_id,period_index), UNIQUE(company_id,agreement_id,start_date),
 UNIQUE(company_id,source_id), UNIQUE(company_id,revenue_effect_id),
 FOREIGN KEY(company_id,agreement_id,brand_id) REFERENCES storage.agreement(company_id,id,brand_id),
 FOREIGN KEY(company_id,agreement_id,revision) REFERENCES storage.agreement_revision(company_id,agreement_id,revision),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,revenue_effect_id) REFERENCES kernel.journal_effect(company_id,id),
 FOREIGN KEY(company_id,work_item_id) REFERENCES work_item(company_id,id),
 CHECK(next_start_date>start_date), CHECK(generated_on>=start_date),
 CHECK((fee_minor=0)=(revenue_effect_id IS NULL)),
 CHECK((work_item_id IS NULL)=(fence IS NULL) AND (work_item_id IS NULL)=(lease_owner IS NULL)),
 EXCLUDE USING gist(company_id WITH =, agreement_id WITH =, daterange(start_date,next_start_date,'[)') WITH &&)
);
CREATE SEQUENCE storage.receipt_reference_seq;
CREATE SEQUENCE storage.refund_reference_seq;
CREATE TABLE storage.receipt (
 company_id uuid NOT NULL, id uuid NOT NULL,
 reference text NOT NULL DEFAULT nextval('storage.receipt_reference_seq')::text CHECK(reference ~ '^[1-9][0-9]*$'),
 brand_id uuid NOT NULL, agreement_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL DEFAULT 'EGP' CHECK(currency='EGP'),
 actual_date date NOT NULL, method text NOT NULL CHECK(method IN ('cash','bank_deposit','instapay')),
 account_id uuid NOT NULL, account_name text NOT NULL, branch_id uuid NOT NULL, branch_name text NOT NULL,
 external_reference text NOT NULL DEFAULT '' CHECK(length(external_reference)<=120),
 source_id uuid NOT NULL, command_record_id uuid NOT NULL, movement_id uuid NOT NULL, credit_effect_id uuid NOT NULL,
 credit_version_before integer NOT NULL CHECK(credit_version_before>0),
 -- Immutable original result for exact recovery after command-result compaction.
 result jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,id,brand_id), UNIQUE(company_id,reference), UNIQUE(command_record_id),
 UNIQUE(company_id,source_id), UNIQUE(company_id,movement_id), UNIQUE(company_id,credit_effect_id),
 FOREIGN KEY(company_id,agreement_id,brand_id) REFERENCES storage.agreement(company_id,id,brand_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES storage.credit_account(company_id,brand_id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,credit_effect_id) REFERENCES kernel.journal_effect(company_id,id)
);
-- Immutable receipt-lot → period links. Allocation is neither a cash receipt nor an earning.
CREATE TABLE storage.allocation (
 company_id uuid NOT NULL, id uuid NOT NULL, receipt_id uuid NOT NULL, period_id uuid NOT NULL, brand_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 trigger_kind text NOT NULL CHECK(trigger_kind IN ('payment','renewal')),
 source_id uuid NOT NULL, effect_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,receipt_id,period_id),
 FOREIGN KEY(company_id,receipt_id,brand_id) REFERENCES storage.receipt(company_id,id,brand_id),
 FOREIGN KEY(company_id,period_id,brand_id) REFERENCES storage.period(company_id,id,brand_id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id)
);
CREATE TABLE storage.refund (
 company_id uuid NOT NULL, id uuid NOT NULL,
 reference text NOT NULL DEFAULT nextval('storage.refund_reference_seq')::text CHECK(reference ~ '^[1-9][0-9]*$'),
 brand_id uuid NOT NULL, agreement_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL DEFAULT 'EGP' CHECK(currency='EGP'),
 actual_date date NOT NULL, method text NOT NULL CHECK(method IN ('cash','bank_deposit','instapay')),
 account_id uuid NOT NULL, account_name text NOT NULL, branch_id uuid NOT NULL, branch_name text NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),
 external_reference text NOT NULL DEFAULT '' CHECK(length(external_reference)<=120),
 cash_out_confirmed boolean NOT NULL CHECK(cash_out_confirmed),
 unallocated_before_minor bigint NOT NULL, unallocated_after_minor bigint NOT NULL CHECK(unallocated_after_minor>=0),
 source_id uuid NOT NULL, command_record_id uuid NOT NULL, movement_id uuid NOT NULL, refund_effect_id uuid NOT NULL,
 credit_version_before integer NOT NULL CHECK(credit_version_before>0),
 result jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(command_record_id), UNIQUE(company_id,source_id),
 UNIQUE(company_id,movement_id), UNIQUE(company_id,refund_effect_id),
 FOREIGN KEY(company_id,agreement_id,brand_id) REFERENCES storage.agreement(company_id,id,brand_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES storage.credit_account(company_id,brand_id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,refund_effect_id) REFERENCES kernel.journal_effect(company_id,id),
 CHECK(unallocated_after_minor=unallocated_before_minor-amount_minor)
);
-- Which receipt lots' unallocated credit the refund returned.
CREATE TABLE storage.refund_source (
 company_id uuid NOT NULL, refund_id uuid NOT NULL, receipt_id uuid NOT NULL, brand_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 PRIMARY KEY(company_id,refund_id,receipt_id),
 FOREIGN KEY(company_id,refund_id) REFERENCES storage.refund(company_id,id),
 FOREIGN KEY(company_id,receipt_id,brand_id) REFERENCES storage.receipt(company_id,id,brand_id)
);
-- Stop is a recorded decision, not a refund, proration or deletion of dues/credit/history.
CREATE TABLE storage.stop_record (
 company_id uuid NOT NULL, id uuid NOT NULL, agreement_id uuid NOT NULL, brand_id uuid NOT NULL,
 stop_boundary date NOT NULL, requested_on date NOT NULL, reason text NOT NULL DEFAULT '' CHECK(length(reason)<=500),
 version_before integer NOT NULL, command_record_id uuid NOT NULL, result jsonb NOT NULL,
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,agreement_id), UNIQUE(command_record_id),
 FOREIGN KEY(company_id,agreement_id,brand_id) REFERENCES storage.agreement(company_id,id,brand_id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE INDEX storage_period_brand_start ON storage.period(company_id,brand_id,start_date,id);
CREATE INDEX storage_period_branch_start ON storage.period(company_id,branch_id,start_date,id);
CREATE INDEX storage_receipt_brand_date ON storage.receipt(company_id,brand_id,actual_date,id);
CREATE INDEX storage_receipt_date ON storage.receipt(company_id,actual_date,id);
CREATE INDEX storage_receipt_recorded ON storage.receipt(company_id,recorded_at,id);
CREATE INDEX storage_allocation_period ON storage.allocation(company_id,period_id);
CREATE INDEX storage_allocation_receipt ON storage.allocation(company_id,receipt_id);
CREATE INDEX storage_refund_brand_date ON storage.refund(company_id,brand_id,actual_date,id);
CREATE INDEX storage_refund_source_receipt ON storage.refund_source(company_id,receipt_id);
CREATE INDEX storage_work_due ON work_item(company_id,kind,state) WHERE kind='storage.renew';

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['agreement_revision','period','receipt','allocation','refund','refund_source','stop_record'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON storage.%I FOR EACH ROW EXECUTE FUNCTION kernel.immutable()',t);
 END LOOP;
END $$;
CREATE FUNCTION storage.protect_agreement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'STORAGE_AGREEMENT_RETAINED'; END IF;
 IF NEW.company_id<>OLD.company_id OR NEW.id<>OLD.id OR NEW.brand_id<>OLD.brand_id OR NEW.origin<>OLD.origin
  OR NEW.created_at<>OLD.created_at OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'STORAGE_AGREEMENT_IMMUTABLE'; END IF;
 IF OLD.state='stopped' AND (NEW.state<>'stopped' OR NEW.stop_boundary IS DISTINCT FROM OLD.stop_boundary)
 THEN RAISE EXCEPTION 'STORAGE_AGREEMENT_STOPPED'; END IF;
 -- The original anchor can only change before any period exists and while active.
 IF (NEW.start_date,NEW.anchor_day,NEW.first_billable_index,NEW.entry_date) IS DISTINCT FROM (OLD.start_date,OLD.anchor_day,OLD.first_billable_index,OLD.entry_date)
  AND (OLD.state='stopped' OR EXISTS(SELECT 1 FROM storage.period p WHERE p.company_id=OLD.company_id AND p.agreement_id=OLD.id))
 THEN RAISE EXCEPTION 'STORAGE_ANCHOR_IMMUTABLE'; END IF;
 -- A stop never cuts off a period that has already been generated.
 IF OLD.state='active' AND NEW.state='stopped' AND EXISTS(SELECT 1 FROM storage.period p
  WHERE p.company_id=OLD.company_id AND p.agreement_id=OLD.id AND p.start_date>=NEW.stop_boundary)
 THEN RAISE EXCEPTION 'STORAGE_STOP_BEFORE_GENERATED_PERIOD'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_agreement BEFORE UPDATE OR DELETE ON storage.agreement FOR EACH ROW EXECUTE FUNCTION storage.protect_agreement();
CREATE FUNCTION storage.protect_credit_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'STORAGE_CREDIT_RETAINED'; END IF;
 IF (to_jsonb(NEW)-'version')<>(to_jsonb(OLD)-'version') OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'STORAGE_CREDIT_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_credit_account BEFORE UPDATE OR DELETE ON storage.credit_account FOR EACH ROW EXECUTE FUNCTION storage.protect_credit_account();
-- A later revision may only change periods that have not yet been generated.
CREATE FUNCTION storage.check_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM storage.agreement WHERE company_id=NEW.company_id AND id=NEW.agreement_id FOR UPDATE;
 IF NEW.revision<>COALESCE((SELECT max(revision) FROM storage.agreement_revision WHERE company_id=NEW.company_id AND agreement_id=NEW.agreement_id),0)+1
 THEN RAISE EXCEPTION 'STORAGE_REVISION_SEQUENCE'; END IF;
 IF EXISTS(SELECT 1 FROM storage.period p WHERE p.company_id=NEW.company_id AND p.agreement_id=NEW.agreement_id AND p.period_index>=NEW.effective_period_index)
 THEN RAISE EXCEPTION 'STORAGE_REVISION_RETROACTIVE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_revision BEFORE INSERT ON storage.agreement_revision FOR EACH ROW EXECUTE FUNCTION storage.check_revision();
-- Deterministic, contiguous, non-historical periods with the applicable snapshotted terms.
CREATE FUNCTION storage.check_period() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a storage.agreement; r storage.agreement_revision;
BEGIN
 SELECT * INTO a FROM storage.agreement WHERE company_id=NEW.company_id AND id=NEW.agreement_id FOR UPDATE;
 IF NEW.start_date<>storage.period_start(a.start_date,a.anchor_day,NEW.period_index)
  OR NEW.next_start_date<>storage.period_start(a.start_date,a.anchor_day,NEW.period_index+1)
 THEN RAISE EXCEPTION 'STORAGE_PERIOD_BOUNDARY_MISMATCH'; END IF;
 IF NEW.period_index<a.first_billable_index THEN RAISE EXCEPTION 'STORAGE_PERIOD_HISTORICAL'; END IF;
 IF NEW.period_index>a.first_billable_index AND NOT EXISTS(SELECT 1 FROM storage.period p
  WHERE p.company_id=NEW.company_id AND p.agreement_id=NEW.agreement_id AND p.period_index=NEW.period_index-1)
 THEN RAISE EXCEPTION 'STORAGE_PERIOD_GAP'; END IF;
 IF a.stop_boundary IS NOT NULL AND NEW.start_date>=a.stop_boundary THEN RAISE EXCEPTION 'STORAGE_AGREEMENT_STOPPED'; END IF;
 SELECT * INTO r FROM storage.agreement_revision WHERE company_id=NEW.company_id AND agreement_id=NEW.agreement_id
  AND effective_period_index<=NEW.period_index ORDER BY revision DESC LIMIT 1;
 IF r.revision IS DISTINCT FROM NEW.revision OR r.fee_minor<>NEW.fee_minor OR r.branch_id<>NEW.branch_id
 THEN RAISE EXCEPTION 'STORAGE_PERIOD_TERMS_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_period BEFORE INSERT ON storage.period FOR EACH ROW EXECUTE FUNCTION storage.check_period();
-- Row locks serialize racing writers even outside the application lock order: a period can never
-- be over-allocated and a receipt lot can never fund more than its own amount.
CREATE FUNCTION storage.check_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p storage.period; r storage.receipt; used numeric;
BEGIN
 SELECT * INTO p FROM storage.period WHERE company_id=NEW.company_id AND id=NEW.period_id FOR UPDATE;
 SELECT * INTO r FROM storage.receipt WHERE company_id=NEW.company_id AND id=NEW.receipt_id FOR UPDATE;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM storage.allocation WHERE company_id=NEW.company_id AND period_id=NEW.period_id;
 IF used+NEW.amount_minor>p.fee_minor THEN RAISE EXCEPTION 'STORAGE_PERIOD_OVER_ALLOCATED'; END IF;
 SELECT COALESCE((SELECT sum(amount_minor) FROM storage.allocation WHERE company_id=NEW.company_id AND receipt_id=NEW.receipt_id),0)
  +COALESCE((SELECT sum(amount_minor) FROM storage.refund_source WHERE company_id=NEW.company_id AND receipt_id=NEW.receipt_id),0) INTO used;
 IF used+NEW.amount_minor>r.amount_minor THEN RAISE EXCEPTION 'STORAGE_CREDIT_OVERDRAWN'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_allocation BEFORE INSERT ON storage.allocation FOR EACH ROW EXECUTE FUNCTION storage.check_allocation();
CREATE FUNCTION storage.check_refund_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r storage.receipt; used numeric;
BEGIN
 SELECT * INTO r FROM storage.receipt WHERE company_id=NEW.company_id AND id=NEW.receipt_id FOR UPDATE;
 SELECT COALESCE((SELECT sum(amount_minor) FROM storage.allocation WHERE company_id=NEW.company_id AND receipt_id=NEW.receipt_id),0)
  +COALESCE((SELECT sum(amount_minor) FROM storage.refund_source WHERE company_id=NEW.company_id AND receipt_id=NEW.receipt_id),0) INTO used;
 IF used+NEW.amount_minor>r.amount_minor THEN RAISE EXCEPTION 'STORAGE_CREDIT_OVERDRAWN'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_refund_source BEFORE INSERT ON storage.refund_source FOR EACH ROW EXECUTE FUNCTION storage.check_refund_source();
-- Deferred: each storage record agrees exactly with its actual-money movement and typed journal
-- effects when the posting transaction commits.
CREATE FUNCTION storage.check_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total numeric;
BEGIN
 IF TG_TABLE_NAME='receipt' THEN
  IF NOT EXISTS(SELECT 1 FROM finance.money_movement m WHERE m.company_id=NEW.company_id AND m.id=NEW.movement_id
   AND m.source_id=NEW.source_id AND m.source_kind='storage_receipt' AND m.direction='deposit' AND m.amount_minor=NEW.amount_minor
   AND m.account_id=NEW.account_id AND m.method=NEW.method AND m.branch_id=NEW.branch_id AND m.actual_date=NEW.actual_date)
  THEN RAISE EXCEPTION 'STORAGE_RECEIPT_MOVEMENT_MISMATCH'; END IF;
  IF NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=NEW.company_id AND e.id=NEW.credit_effect_id
   AND e.source_id=NEW.source_id AND e.family='storage' AND e.kind='receipt' AND e.subject_id=NEW.brand_id
   AND e.amount_minor=NEW.amount_minor AND e.branch_id=NEW.branch_id AND e.effective_date=NEW.actual_date)
  THEN RAISE EXCEPTION 'STORAGE_RECEIPT_EFFECT_MISMATCH'; END IF;
 ELSIF TG_TABLE_NAME='refund' THEN
  IF NOT EXISTS(SELECT 1 FROM finance.money_movement m WHERE m.company_id=NEW.company_id AND m.id=NEW.movement_id
   AND m.source_id=NEW.source_id AND m.source_kind='storage_refund' AND m.direction='withdrawal' AND m.amount_minor=NEW.amount_minor
   AND m.account_id=NEW.account_id AND m.method=NEW.method AND m.branch_id=NEW.branch_id AND m.actual_date=NEW.actual_date)
  THEN RAISE EXCEPTION 'STORAGE_REFUND_MOVEMENT_MISMATCH'; END IF;
  IF NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=NEW.company_id AND e.id=NEW.refund_effect_id
   AND e.source_id=NEW.source_id AND e.family='storage' AND e.kind='refund' AND e.subject_id=NEW.brand_id
   AND e.amount_minor=-NEW.amount_minor AND e.branch_id=NEW.branch_id AND e.effective_date=NEW.actual_date)
  THEN RAISE EXCEPTION 'STORAGE_REFUND_EFFECT_MISMATCH'; END IF;
  SELECT COALESCE(sum(amount_minor),0) INTO total FROM storage.refund_source WHERE company_id=NEW.company_id AND refund_id=NEW.id;
  IF total<>NEW.amount_minor THEN RAISE EXCEPTION 'STORAGE_REFUND_SOURCE_INCOMPLETE'; END IF;
 ELSIF TG_TABLE_NAME='allocation' THEN
  SELECT COALESCE(sum(amount_minor),0) INTO total FROM storage.allocation WHERE company_id=NEW.company_id AND source_id=NEW.source_id;
  IF NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=NEW.company_id AND e.id=NEW.effect_id
   AND e.source_id=NEW.source_id AND e.family='storage' AND e.kind='allocation' AND e.subject_id=NEW.brand_id AND e.amount_minor=-total)
  THEN RAISE EXCEPTION 'STORAGE_ALLOCATION_EFFECT_MISMATCH'; END IF;
  IF EXISTS(SELECT 1 FROM storage.allocation x WHERE x.company_id=NEW.company_id AND x.source_id=NEW.source_id AND x.effect_id<>NEW.effect_id)
  THEN RAISE EXCEPTION 'STORAGE_ALLOCATION_EFFECT_MISMATCH'; END IF;
 ELSIF TG_TABLE_NAME='period' THEN
  IF NEW.revenue_effect_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=NEW.company_id
   AND e.id=NEW.revenue_effect_id AND e.source_id=NEW.source_id AND e.family='operating' AND e.kind='storage'
   AND e.subject_id=NEW.id AND e.amount_minor=NEW.fee_minor AND e.branch_id=NEW.branch_id AND e.effective_date=NEW.start_date)
  THEN RAISE EXCEPTION 'STORAGE_REVENUE_MISMATCH'; END IF;
  -- Exactly one complete period-start earning (none for a zero fee); never daily rows.
  IF (SELECT count(*) FROM kernel.journal_effect e WHERE e.company_id=NEW.company_id AND e.source_id=NEW.source_id AND e.family='operating')
   <>(CASE WHEN NEW.fee_minor>0 THEN 1 ELSE 0 END) THEN RAISE EXCEPTION 'STORAGE_REVENUE_MISMATCH'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER validate_receipt AFTER INSERT ON storage.receipt DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION storage.check_links();
CREATE CONSTRAINT TRIGGER validate_refund AFTER INSERT ON storage.refund DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION storage.check_links();
CREATE CONSTRAINT TRIGGER validate_allocation AFTER INSERT ON storage.allocation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION storage.check_links();
CREATE CONSTRAINT TRIGGER validate_period AFTER INSERT ON storage.period DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION storage.check_links();
-- No dedicated storage cash movement or real storage journal effect may exist without its record.
-- P03 isolated kernel fixtures (kernel.resource.fixture) remain the only exemption.
CREATE FUNCTION storage.require_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='money_movement' THEN
  IF (NEW.source_kind='storage_receipt' AND NOT EXISTS(SELECT 1 FROM storage.receipt r WHERE r.company_id=NEW.company_id AND r.movement_id=NEW.id))
   OR (NEW.source_kind='storage_refund' AND NOT EXISTS(SELECT 1 FROM storage.refund r WHERE r.company_id=NEW.company_id AND r.movement_id=NEW.id))
  THEN RAISE EXCEPTION 'STORAGE_RECORD_REQUIRED'; END IF;
  RETURN NULL;
 END IF;
 IF EXISTS(SELECT 1 FROM kernel.resource r WHERE r.company_id=NEW.company_id AND r.id=NEW.subject_id AND r.family=NEW.family AND r.fixture)
 THEN RETURN NULL; END IF;
 IF (NEW.family='storage' AND NEW.kind='receipt' AND NOT EXISTS(SELECT 1 FROM storage.receipt r WHERE r.company_id=NEW.company_id AND r.credit_effect_id=NEW.id))
  OR (NEW.family='storage' AND NEW.kind='refund' AND NOT EXISTS(SELECT 1 FROM storage.refund r WHERE r.company_id=NEW.company_id AND r.refund_effect_id=NEW.id))
  OR (NEW.family='storage' AND NEW.kind='allocation' AND NOT EXISTS(SELECT 1 FROM storage.allocation a WHERE a.company_id=NEW.company_id AND a.effect_id=NEW.id))
  OR (NEW.family='operating' AND NEW.kind='storage' AND NOT EXISTS(SELECT 1 FROM storage.period p WHERE p.company_id=NEW.company_id AND p.revenue_effect_id=NEW.id))
 THEN RAISE EXCEPTION 'STORAGE_RECORD_REQUIRED'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER storage_movement_record AFTER INSERT ON finance.money_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
 WHEN (NEW.source_kind IN ('storage_receipt','storage_refund')) EXECUTE FUNCTION storage.require_record();
CREATE CONSTRAINT TRIGGER storage_effect_record AFTER INSERT ON kernel.journal_effect DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
 WHEN ((NEW.family='storage' AND NEW.kind IN ('receipt','refund','allocation')) OR (NEW.family='operating' AND NEW.kind='storage'))
 EXECUTE FUNCTION storage.require_record();

-- Configuration carry-over only (see the policy at the top of this file).
CREATE TEMPORARY TABLE p19_carry ON COMMIT DROP AS
 SELECT b.company_id,b.id AS brand_id,p.version,p.storage_start,extract(day FROM p.storage_start)::int AS anchor,
  p.storage_fee_minor,p.storage_branch_id,COALESCE((p.fields->'storage'->>'active')::boolean,true) AS active,
  (clock_timestamp() AT TIME ZONE 'Africa/Cairo')::date AS today
 FROM commercial.brand b JOIN commercial.brand_policy p ON(p.company_id,p.brand_id,p.version)=(b.company_id,b.id,b.version)
 WHERE p.storage_start IS NOT NULL AND p.storage_fee_minor IS NOT NULL AND p.storage_branch_id IS NOT NULL;
INSERT INTO kernel.resource(company_id,id,family) SELECT company_id,brand_id,'storage' FROM p19_carry ON CONFLICT DO NOTHING;
INSERT INTO storage.credit_account(company_id,brand_id) SELECT company_id,brand_id FROM p19_carry;
INSERT INTO storage.agreement(company_id,id,brand_id,start_date,anchor_day,first_billable_index,entry_date,state,stop_boundary,origin)
 SELECT c.company_id,gen_random_uuid(),c.brand_id,c.storage_start,c.anchor,
  (SELECT min(k) FROM generate_series(0,12000) k WHERE storage.period_start(c.storage_start,c.anchor,k)>=c.today),
  c.today,CASE WHEN c.active THEN 'active' ELSE 'stopped' END,CASE WHEN c.active THEN NULL ELSE c.storage_start END,'p04_configuration'
 FROM p19_carry c;
INSERT INTO storage.agreement_revision(company_id,agreement_id,revision,effective_period_index,fee_minor,branch_id,origin,command_record_id,actor_id,actor_name)
 SELECT a.company_id,a.id,1,0,c.storage_fee_minor,c.storage_branch_id,'p04_configuration',x.id,x.principal_id,COALESCE(u.name,'')
 FROM p19_carry c JOIN storage.agreement a ON(a.company_id,a.brand_id)=(c.company_id,c.brand_id)
 LEFT JOIN LATERAL (SELECT r.id,r.principal_id FROM commercial.command_outcome o JOIN command_record r ON(r.company_id,r.id)=(o.company_id,o.command_record_id)
  WHERE o.company_id=c.company_id AND o.body->>'entityId'=c.brand_id::text AND o.body->>'version'=c.version::text AND r.state='completed'
  ORDER BY r.created_at LIMIT 1) x ON true
 LEFT JOIN access.ordinary_user u ON u.id=x.principal_id;
