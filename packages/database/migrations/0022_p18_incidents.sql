-- P18 is additive after the actual P17 migration 0021. No ordinary-shipment waiver backfill.
CREATE SCHEMA incidents;
INSERT INTO access.screen_capability(id,title,route,policy,implemented) VALUES('incidents','التلف والفقد والتعويضات','/incidents','assigned',true);
CREATE TABLE incidents.incident (
 company_id uuid NOT NULL, id uuid NOT NULL, reference text NOT NULL DEFAULT nextval('kernel.human_reference')::text CHECK(reference ~ '^[0-9]+$'),
 brand_id uuid NOT NULL, custody_branch_id uuid NOT NULL, responsible_branch_id uuid NOT NULL,
 holder text NOT NULL CHECK(holder IN ('branch','driver')), driver_id uuid,
 state text NOT NULL DEFAULT 'reported' CHECK(state IN ('reported','confirmed','dismissed')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 report jsonb NOT NULL, observed_at timestamptz NOT NULL, kind text NOT NULL CHECK(kind IN ('loss','damage')),
 command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 dismissal_reason text, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(company_id,command_record_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,custody_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,responsible_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 CHECK(observed_at<=recorded_at), CHECK((state='dismissed')=(dismissal_reason IS NOT NULL))
);
-- Materialized source locks and range exclusions protect *different* incident IDs.
CREATE TABLE incidents.affected_source (
 company_id uuid NOT NULL REFERENCES access.company(id), source_key text NOT NULL,
 PRIMARY KEY(company_id,source_key)
);
CREATE TABLE incidents.affected_item (
 company_id uuid NOT NULL, id uuid NOT NULL, incident_id uuid NOT NULL, source_key text NOT NULL,
 selection jsonb NOT NULL, snapshot jsonb NOT NULL, unit_offset bigint NOT NULL CHECK(unit_offset>=0),
 quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), released boolean NOT NULL DEFAULT false,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id),
 FOREIGN KEY(company_id,source_key) REFERENCES incidents.affected_source(company_id,source_key),
 EXCLUDE USING gist(company_id WITH =, source_key WITH =, int8range(unit_offset,unit_offset+quantity,'[)') WITH &&) WHERE (NOT released)
);
CREATE TABLE incidents.shipment_hold (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, incident_id uuid NOT NULL,
 PRIMARY KEY(company_id,shipment_id,incident_id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id),
 FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id)
);
CREATE TABLE incidents.confirmation (
 company_id uuid NOT NULL, id uuid NOT NULL, incident_id uuid NOT NULL, source_id uuid NOT NULL,
 command_record_id uuid NOT NULL, fields jsonb NOT NULL, goods_value_minor bigint NOT NULL CHECK(goods_value_minor>=0),
 compensation_minor bigint NOT NULL CHECK(compensation_minor>0 AND compensation_minor<=goods_value_minor),
 company_share_minor bigint NOT NULL CHECK(company_share_minor>=0), employee_share_minor bigint NOT NULL CHECK(employee_share_minor>=0),
 responsible_branch_id uuid NOT NULL, employee_id uuid, employee_payroll_branch_id uuid, payroll_month date,
 lot_id uuid NOT NULL, obligation_id uuid, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,incident_id), UNIQUE(company_id,source_id),
 FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,lot_id) REFERENCES kernel.credit_lot(company_id,id),
 FOREIGN KEY(company_id,responsible_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,employee_payroll_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,employee_id,payroll_month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 CHECK(company_share_minor::numeric+employee_share_minor=compensation_minor),
 CHECK((employee_share_minor=0 AND employee_id IS NULL AND obligation_id IS NULL AND payroll_month IS NULL AND employee_payroll_branch_id IS NULL) OR
 (employee_share_minor>0 AND employee_id IS NOT NULL AND obligation_id IS NOT NULL AND payroll_month IS NOT NULL AND employee_payroll_branch_id IS NOT NULL))
);
-- P20 consumes this original debt identity; recovery is never another salary-cost reduction.
CREATE TABLE employees.incident_obligation (
 company_id uuid NOT NULL, id uuid NOT NULL, incident_id uuid NOT NULL, confirmation_id uuid NOT NULL,
 employee_id uuid NOT NULL, payroll_month date NOT NULL, payroll_branch_id uuid NOT NULL, incident_branch_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), effect_id uuid NOT NULL, source_id uuid NOT NULL,
 classification text NOT NULL DEFAULT 'incident_compensation' CHECK(classification='incident_compensation'),
 effective_date date NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,incident_id), UNIQUE(company_id,effect_id),
 FOREIGN KEY(company_id,confirmation_id) REFERENCES incidents.confirmation(company_id,id) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id),
 FOREIGN KEY(company_id,employee_id,payroll_month) REFERENCES employees.payroll_period(company_id,employee_id,month),
 FOREIGN KEY(company_id,payroll_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,incident_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id)
);
ALTER TABLE incidents.confirmation ADD FOREIGN KEY(company_id,obligation_id) REFERENCES employees.incident_obligation(company_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE incidents.disposition (
 company_id uuid NOT NULL, incident_id uuid NOT NULL, affected_item_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('lost','damaged')), handling text NOT NULL CHECK(handling IN ('native_recorded','awaiting_request','awaiting_dependency','canonical')),
 return_intent_id uuid, action_id uuid, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,affected_item_id), FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id),
 FOREIGN KEY(company_id,affected_item_id) REFERENCES incidents.affected_item(company_id,id),
 FOREIGN KEY(company_id,return_intent_id) REFERENCES returns.intent(company_id,id),
 CHECK((handling='canonical')=(return_intent_id IS NOT NULL AND action_id IS NOT NULL))
);
CREATE TABLE incidents.replacement (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, incident_id uuid NOT NULL, confirmation_id uuid NOT NULL,
 original_shipment_id uuid, payer text NOT NULL CHECK(payer IN ('recipient','brand','company')),
 agreement_reason text NOT NULL CHECK(length(trim(agreement_reason))>0), price_snapshot jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), actor_id uuid NOT NULL REFERENCES access.principal(id),
 PRIMARY KEY(company_id,shipment_id), FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id),
 FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id),
 FOREIGN KEY(company_id,confirmation_id) REFERENCES incidents.confirmation(company_id,id),
 FOREIGN KEY(company_id,original_shipment_id) REFERENCES shipments.shipment(company_id,id),
 CHECK(original_shipment_id IS NULL OR original_shipment_id<>shipment_id)
);
-- One incident can span multiple exact return requests. Each gets its own stable action.
ALTER TABLE returns.intent DROP CONSTRAINT intent_company_id_command_record_id_key;
ALTER TABLE returns.intent ADD UNIQUE(company_id,command_record_id,request_id);
CREATE TABLE incidents.disposition_attempt (
 company_id uuid NOT NULL, affected_item_id uuid NOT NULL, return_intent_id uuid NOT NULL, action_id uuid NOT NULL,
 command_record_id uuid NOT NULL, reason text NOT NULL CHECK(length(trim(reason))>0),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,affected_item_id),
 FOREIGN KEY(company_id,affected_item_id) REFERENCES incidents.affected_item(company_id,id),
 FOREIGN KEY(company_id,return_intent_id) REFERENCES returns.intent(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE incidents.review (
 company_id uuid NOT NULL, id uuid NOT NULL, incident_id uuid NOT NULL, source_id uuid NOT NULL, reason text NOT NULL CHECK(length(trim(reason))>0),
 hold_minor bigint NOT NULL CHECK(hold_minor>=0), status text NOT NULL DEFAULT 'awaiting_p21' CHECK(status='awaiting_p21'),
 command_record_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,incident_id), FOREIGN KEY(company_id,incident_id) REFERENCES incidents.incident(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE incidents.command_outcome (
 company_id uuid NOT NULL, command_record_id uuid NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(company_id,command_record_id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
-- Add a dedicated positive operating classification without reclassifying old entries.
DO $$ DECLARE n text; BEGIN
 SELECT conname INTO n FROM pg_constraint WHERE conrelid='kernel.journal_effect'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%shipping%';
 EXECUTE format('ALTER TABLE kernel.journal_effect DROP CONSTRAINT %I',n);
END $$;
ALTER TABLE kernel.journal_effect ADD CONSTRAINT p18_journal_classification CHECK(
 (family='brand' AND ((kind IN ('goods','compensation') AND amount_minor>0) OR (kind IN ('fee','payout') AND amount_minor<0) OR kind IN ('opening','correction'))) OR
 (family='money' AND ((kind IN ('receipt','transfer_in') AND amount_minor>0) OR (kind IN ('payment','transfer_out') AND amount_minor<0) OR kind IN ('opening','correction'))) OR
 (family='employee' AND ((kind IN ('earning','obligation') AND amount_minor>0) OR (kind='recovery' AND amount_minor<0) OR kind='correction')) OR
 (family='operating' AND ((kind IN ('shipping','storage','employee_compensation_share') AND amount_minor>0) OR (kind IN ('cost','waiver') AND amount_minor<0) OR kind='correction')) OR
 (family='storage' AND ((kind='receipt' AND amount_minor>0) OR (kind IN ('allocation','refund') AND amount_minor<0) OR kind='correction')));
CREATE FUNCTION incidents.protect_incident() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'INCIDENT_HISTORY_RETAINED'; END IF;
 IF OLD.state<>'reported' OR NEW.version<>OLD.version+1 OR NEW.state NOT IN ('confirmed','dismissed')
 OR (to_jsonb(NEW)-ARRAY['state','version','responsible_branch_id','dismissal_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','responsible_branch_id','dismissal_reason'])
 THEN RAISE EXCEPTION 'INCIDENT_HISTORY_IMMUTABLE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER incident_immutable BEFORE UPDATE OR DELETE ON incidents.incident FOR EACH ROW EXECUTE FUNCTION incidents.protect_incident();
CREATE FUNCTION incidents.protect_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'released') IS DISTINCT FROM (to_jsonb(OLD)-'released') OR OLD.released OR NOT NEW.released
 OR NOT EXISTS(SELECT 1 FROM incidents.incident i WHERE i.company_id=OLD.company_id AND i.id=OLD.incident_id AND i.state='dismissed')
 THEN RAISE EXCEPTION 'INCIDENT_ALLOCATION_RETAINED'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER incident_allocation_immutable BEFORE UPDATE OR DELETE ON incidents.affected_item FOR EACH ROW EXECUTE FUNCTION incidents.protect_allocation();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['confirmation','disposition','disposition_attempt','replacement','review','command_outcome','shipment_hold'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON incidents.%I FOR EACH ROW EXECUTE FUNCTION shipments.immutable()',t);
 END LOOP;
END $$;
CREATE TRIGGER obligation_immutable BEFORE UPDATE OR DELETE ON employees.incident_obligation FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION incidents.confirmation_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c incidents.confirmation; i incidents.incident; n integer;
BEGIN
 IF TG_TABLE_NAME='incident' THEN
 SELECT * INTO i FROM incidents.incident WHERE company_id=NEW.company_id AND id=NEW.id;
 ELSE
 SELECT * INTO i FROM incidents.incident WHERE company_id=NEW.company_id AND id=NEW.incident_id;
 END IF;
 IF i.state<>'confirmed' THEN RETURN NULL; END IF;
 SELECT * INTO c FROM incidents.confirmation WHERE company_id=i.company_id AND incident_id=i.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'INCIDENT_CONFIRMATION_REQUIRED'; END IF;
 SELECT count(*) INTO n FROM kernel.journal_effect e WHERE e.company_id=c.company_id AND e.source_id=c.source_id;
 IF n<>(CASE WHEN c.employee_share_minor>0 THEN 4 ELSE 2 END)
 OR NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=c.company_id AND e.id=c.lot_id AND e.kind='compensation' AND e.subject_id=i.brand_id AND e.amount_minor=c.compensation_minor AND e.branch_id=c.responsible_branch_id)
 OR NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=c.company_id AND e.source_id=c.source_id AND e.family='operating' AND e.kind='cost' AND e.subject_id=i.id AND e.amount_minor=-c.compensation_minor AND e.branch_id=c.responsible_branch_id)
 OR (c.employee_share_minor>0 AND (NOT EXISTS(SELECT 1 FROM employees.incident_obligation o JOIN kernel.journal_effect e ON(e.company_id,e.id)=(o.company_id,o.effect_id) WHERE o.company_id=c.company_id AND o.id=c.obligation_id AND o.amount_minor=c.employee_share_minor AND e.kind='obligation' AND e.amount_minor=o.amount_minor AND e.subject_id=c.employee_id)
 OR NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=c.company_id AND e.source_id=c.source_id AND e.kind='employee_compensation_share' AND e.amount_minor=c.employee_share_minor AND e.branch_id=c.responsible_branch_id)))
 THEN RAISE EXCEPTION 'INCIDENT_EFFECT_SET_INCOMPLETE'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER incident_complete AFTER INSERT OR UPDATE ON incidents.incident DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION incidents.confirmation_complete();
CREATE CONSTRAINT TRIGGER confirmation_complete AFTER INSERT ON incidents.confirmation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION incidents.confirmation_complete();
CREATE INDEX incident_scope ON incidents.incident(company_id,responsible_branch_id,state,observed_at);
CREATE INDEX incident_custody_scope ON incidents.incident(company_id,custody_branch_id,brand_id);
-- Ordinary snapshots still have no waiver. D203 is a linked company-funded exception.
ALTER TABLE shipments.price_snapshot DROP CONSTRAINT price_snapshot_snapshot_check6;
ALTER TABLE shipments.price_snapshot ADD CONSTRAINT p18_tariff_allocation CHECK(
 (snapshot->>'brandShippingMinor')::numeric+(snapshot->>'recipientShippingMinor')::numeric+COALESCE((snapshot->>'waiverMinor')::numeric,0)=(snapshot->>'tariffMinor')::numeric
 AND COALESCE((snapshot->>'waiverMinor')::numeric,0)>=0);
CREATE FUNCTION incidents.check_replacement_price() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF COALESCE((NEW.snapshot->>'waiverMinor')::numeric,0)>0 AND NOT EXISTS(
 SELECT 1 FROM incidents.replacement r WHERE r.company_id=NEW.company_id AND r.shipment_id=NEW.shipment_id AND r.payer='company'
 AND r.incident_id::text=NEW.snapshot->'incidentAgreement'->>'incidentId'
 AND r.confirmation_id::text=NEW.snapshot->'incidentAgreement'->>'confirmationId'
 AND (NEW.snapshot->>'waiverMinor')::numeric=(NEW.snapshot->>'tariffMinor')::numeric
 AND (NEW.snapshot->>'recipientShippingMinor')::numeric=0 AND (NEW.snapshot->>'brandShippingMinor')::numeric=0)
 THEN RAISE EXCEPTION 'INCIDENT_WAIVER_AUTHORITY_REQUIRED'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER replacement_price_authority AFTER INSERT ON shipments.price_snapshot DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION incidents.check_replacement_price();
