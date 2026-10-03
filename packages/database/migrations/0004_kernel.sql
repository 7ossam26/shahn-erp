-- Additive extension of P02. Existing immutable identifiers and audit remain authoritative.
DROP TRIGGER immutable_command ON command_record;
DROP TRIGGER immutable_work ON work_item;
ALTER TABLE command_record ADD COLUMN kind text;
ALTER TABLE command_record ADD COLUMN response_status integer NOT NULL DEFAULT 200 CHECK(response_status BETWEEN 100 AND 599);
ALTER TABLE command_record ADD COLUMN result_reference jsonb NOT NULL DEFAULT '{}';
ALTER TABLE command_record ADD COLUMN retain_until timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '30 days');
ALTER TABLE command_record ADD COLUMN compacted_at timestamptz;
ALTER TABLE command_record ALTER COLUMN result DROP NOT NULL;
ALTER TABLE command_record ALTER COLUMN payload DROP NOT NULL;
UPDATE command_record SET kind=family,result_reference=result,
 response_status=CASE WHEN state='pending' THEN 202 WHEN state='rejected' THEN 409 ELSE 200 END,
 retain_until=created_at+interval '30 days';
ALTER TABLE command_record ALTER COLUMN kind SET NOT NULL;
ALTER TABLE command_record ADD CONSTRAINT command_retention_shape CHECK(
 (compacted_at IS NULL AND payload IS NOT NULL AND result IS NOT NULL) OR
 (compacted_at IS NOT NULL AND state<>'pending' AND payload IS NULL AND result IS NULL AND result_reference<>'{}'::jsonb));
CREATE INDEX command_retention_due ON command_record(retain_until) WHERE compacted_at IS NULL AND state<>'pending';
CREATE FUNCTION access.command_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.kind:=COALESCE(NEW.kind,NEW.family);
 -- P02's compact response is already a permanent affected-record/outcome reference.
 IF NEW.kind NOT LIKE 'kernel.%' THEN
   NEW.response_status:=CASE WHEN NEW.state='pending' THEN 202 WHEN NEW.state='rejected' THEN 409 ELSE 200 END;
   IF NEW.result IS NOT NULL THEN NEW.result_reference:=NEW.result; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER command_defaults BEFORE INSERT OR UPDATE ON command_record FOR EACH ROW EXECUTE FUNCTION access.command_defaults();
CREATE FUNCTION access.preserve_command() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','result','response_status','result_reference','payload','compacted_at'])
   <> (to_jsonb(OLD)-ARRAY['state','result','response_status','result_reference','payload','compacted_at'])
 THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 IF OLD.compacted_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'COMPACTED_IDENTITY_PERMANENT'; END IF;
 IF NEW.payload IS DISTINCT FROM OLD.payload OR NEW.compacted_at IS DISTINCT FROM OLD.compacted_at THEN
   IF NOT (OLD.compacted_at IS NULL AND NEW.compacted_at IS NOT NULL AND OLD.state<>'pending'
     AND OLD.retain_until<=clock_timestamp() AND NEW.payload IS NULL AND NEW.result IS NULL
     AND NEW.result_reference=OLD.result_reference AND NEW.state=OLD.state AND NEW.response_status=OLD.response_status)
   THEN RAISE EXCEPTION 'INVALID_COMPACTION'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_command BEFORE UPDATE OR DELETE ON command_record FOR EACH ROW EXECUTE FUNCTION access.preserve_command();

ALTER TABLE work_item DROP CONSTRAINT work_item_lane_check;
ALTER TABLE work_item DROP CONSTRAINT work_item_company_id_entity_id_fkey;
ALTER TABLE work_item ADD COLUMN identity_entity_id uuid GENERATED ALWAYS AS (CASE WHEN lane='identity' THEN entity_id END) STORED;
ALTER TABLE work_item ADD FOREIGN KEY(company_id,identity_entity_id) REFERENCES access.ordinary_user(company_id,id);
ALTER TABLE work_item ADD COLUMN kind text;
ALTER TABLE work_item ADD COLUMN source_identity text;
ALTER TABLE work_item ADD COLUMN outcome_kind text CHECK(outcome_kind IN ('success','retryable','definite','unknown'));
UPDATE work_item SET kind='identity.reconcile',source_identity=correlation_id::text || ':' || entity_version::text;
ALTER TABLE work_item ALTER COLUMN kind SET NOT NULL;
ALTER TABLE work_item ALTER COLUMN source_identity SET NOT NULL;
ALTER TABLE work_item ADD CONSTRAINT work_lane CHECK(lane IN ('identity','source','inbox','storage','export','kernel'));
CREATE UNIQUE INDEX work_source_identity ON work_item(company_id,kind,source_identity);
CREATE FUNCTION access.work_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.lane='identity' THEN
 NEW.kind:=COALESCE(NEW.kind,'identity.reconcile');
 NEW.source_identity:=COALESCE(NEW.source_identity,NEW.correlation_id::text || ':' || NEW.entity_version::text);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER work_defaults BEFORE INSERT ON work_item FOR EACH ROW EXECUTE FUNCTION access.work_defaults();
CREATE OR REPLACE FUNCTION access.preserve_intent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','attempts','available_at','lease_owner','lease_until','fence','last_error','completed_at','outcome_kind'])
   <> (to_jsonb(OLD)-ARRAY['state','attempts','available_at','lease_owner','lease_until','fence','last_error','completed_at','outcome_kind'])
 THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_work BEFORE UPDATE OR DELETE ON work_item FOR EACH ROW EXECUTE FUNCTION access.preserve_intent();

CREATE SCHEMA kernel;
CREATE SEQUENCE kernel.human_reference AS bigint MINVALUE 1 NO CYCLE;
-- P04/P09/P08 create these lock identities in their master-data creation transaction.
-- Their future master tables reference (company_id,id,family), never create another wallet.
CREATE TABLE kernel.resource (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 family text NOT NULL CHECK(family IN ('brand','money','employee','operating','storage')),
 fixture boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 PRIMARY KEY(company_id,id,family)
);
CREATE TABLE kernel.source_record (
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES access.company(id),
 system text NOT NULL CHECK(length(system) BETWEEN 1 AND 80), identity text NOT NULL CHECK(length(identity) BETWEEN 1 AND 200),
 kind text NOT NULL CHECK(length(kind) BETWEEN 1 AND 80), revision text NOT NULL CHECK(length(revision) BETWEEN 1 AND 80),
 payload_digest text NOT NULL CHECK(payload_digest ~ '^[a-f0-9]{64}$'),
 UNIQUE(company_id,system,identity,kind,revision), UNIQUE(company_id,id)
);
CREATE TABLE kernel.posting_batch (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, source_id uuid NOT NULL,
 command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(company_id,id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE kernel.journal_effect (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, batch_id uuid NOT NULL, source_id uuid NOT NULL,
 family text NOT NULL, kind text NOT NULL, subject_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor<>0),
 branch_id uuid NOT NULL, effective_date date NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor_id uuid NOT NULL REFERENCES access.principal(id), supersedes_id uuid, reason text,
 UNIQUE(company_id,id), UNIQUE(company_id,source_id,family,kind,subject_id),
 FOREIGN KEY(company_id,batch_id) REFERENCES kernel.posting_batch(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,subject_id,family) REFERENCES kernel.resource(company_id,id,family),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,supersedes_id) REFERENCES kernel.journal_effect(company_id,id),
 CHECK((kind='correction' AND supersedes_id IS NOT NULL AND length(trim(reason))>0) OR (kind<>'correction' AND supersedes_id IS NULL)),
 CHECK((family='brand' AND ((kind IN ('goods','compensation') AND amount_minor>0) OR (kind IN ('fee','payout') AND amount_minor<0) OR kind IN ('opening','correction'))) OR
       (family='money' AND ((kind IN ('receipt','transfer_in') AND amount_minor>0) OR (kind IN ('payment','transfer_out') AND amount_minor<0) OR kind IN ('opening','correction'))) OR
       (family='employee' AND ((kind IN ('earning','obligation') AND amount_minor>0) OR (kind='recovery' AND amount_minor<0) OR kind='correction')) OR
       (family='operating' AND ((kind IN ('shipping','storage') AND amount_minor>0) OR (kind IN ('cost','waiver') AND amount_minor<0) OR kind='correction')) OR
       (family='storage' AND ((kind='receipt' AND amount_minor>0) OR (kind IN ('allocation','refund') AND amount_minor<0) OR kind='correction')))
);
CREATE TABLE kernel.credit_lot (
 company_id uuid NOT NULL, id uuid NOT NULL, brand_id uuid NOT NULL, family text NOT NULL DEFAULT 'brand' CHECK(family='brand'),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), readiness text NOT NULL CHECK(readiness IN ('eligible','pending')),
 effective_date date NOT NULL, PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,id) REFERENCES kernel.journal_effect(company_id,id),
 FOREIGN KEY(company_id,brand_id,family) REFERENCES kernel.resource(company_id,id,family)
);
CREATE TABLE kernel.credit_release (
 company_id uuid NOT NULL, lot_id uuid NOT NULL, source_id uuid NOT NULL,
 PRIMARY KEY(company_id,lot_id), FOREIGN KEY(company_id,lot_id) REFERENCES kernel.credit_lot(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id)
);
CREATE TABLE kernel.lot_allocation (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, lot_id uuid NOT NULL, effect_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(company_id,lot_id,effect_id), FOREIGN KEY(company_id,lot_id) REFERENCES kernel.credit_lot(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id)
);
CREATE TABLE kernel.wallet_hold (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, lot_id uuid NOT NULL, source_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), reason text NOT NULL CHECK(length(trim(reason))>0),
 UNIQUE(company_id,id), UNIQUE(company_id,source_id,lot_id),
 FOREIGN KEY(company_id,lot_id) REFERENCES kernel.credit_lot(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id)
);
CREATE TABLE kernel.hold_release (
 company_id uuid NOT NULL, hold_id uuid NOT NULL, source_id uuid NOT NULL,
 PRIMARY KEY(company_id,hold_id), FOREIGN KEY(company_id,hold_id) REFERENCES kernel.wallet_hold(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id)
);
CREATE TABLE kernel.shipping_cover (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, brand_id uuid NOT NULL, family text NOT NULL DEFAULT 'brand' CHECK(family='brand'),
 source_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 UNIQUE(company_id,id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,brand_id,family) REFERENCES kernel.resource(company_id,id,family)
);
CREATE TABLE kernel.cover_close (
 company_id uuid NOT NULL, cover_id uuid NOT NULL, source_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('consume','release')), effect_id uuid, reason text NOT NULL CHECK(length(trim(reason))>0),
 PRIMARY KEY(company_id,cover_id),
 FOREIGN KEY(company_id,cover_id) REFERENCES kernel.shipping_cover(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id),
 CHECK((kind='consume' AND effect_id IS NOT NULL) OR (kind='release' AND effect_id IS NULL))
);
CREATE TABLE kernel.operation_result (
 id uuid PRIMARY KEY, company_id uuid NOT NULL, source_id uuid NOT NULL, branch_id uuid NOT NULL,
 body jsonb NOT NULL, reference text NOT NULL DEFAULT nextval('kernel.human_reference')::text CHECK(reference ~ '^[1-9][0-9]*$'),
 UNIQUE(reference), UNIQUE(company_id,id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE FUNCTION kernel.immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_KERNEL_HISTORY'; END $$;
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['source_record','posting_batch','journal_effect','credit_lot','credit_release','lot_allocation','wallet_hold','hold_release','shipping_cover','cover_close','operation_result'] LOOP
 EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON kernel.%I FOR EACH ROW EXECUTE FUNCTION kernel.immutable()',tab);
 END LOOP;
END $$;
CREATE INDEX journal_subject ON kernel.journal_effect(company_id,family,subject_id,effective_date,id);
CREATE INDEX lot_wallet ON kernel.credit_lot(company_id,brand_id,effective_date,id);
CREATE INDEX allocation_lot ON kernel.lot_allocation(company_id,lot_id);
CREATE INDEX allocation_effect ON kernel.lot_allocation(company_id,effect_id);
