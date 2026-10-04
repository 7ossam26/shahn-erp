-- Existing shipments stay local. No inferred acceptance, repricing or receipt backfill.
CREATE SCHEMA dispatch;
INSERT INTO access.screen_capability(id,title,route,policy,implemented) VALUES('dispatch','تسليم الشحنات للمندوب','/dispatch','assigned',true);
ALTER TABLE shipments.parcel_custody ADD COLUMN holder text NOT NULL DEFAULT 'branch' CHECK(holder IN ('branch','driver'));
ALTER TABLE shipments.parcel_custody ADD COLUMN driver_id uuid;
ALTER TABLE shipments.parcel_custody ADD FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id);
ALTER TABLE shipments.parcel_custody ADD CHECK((holder='driver')=(driver_id IS NOT NULL));
CREATE TABLE dispatch.intent (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, branch_id uuid NOT NULL, driver_id uuid NOT NULL,
 driver_external_id text NOT NULL, driver_resource_id uuid NOT NULL, command_record_id uuid NOT NULL UNIQUE,
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), state text NOT NULL DEFAULT 'synchronizing'
 CHECK(state IN ('synchronizing','preparing','prepared','receiving','accepted','rejected','withdrawing','withdrawn','reassigning','review-required')),
 last_error text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE dispatch.cycle (
 company_id uuid NOT NULL, id uuid NOT NULL, shipment_id uuid NOT NULL, source_id uuid NOT NULL, branch_id uuid NOT NULL,
 external_id text NOT NULL, source_cycle_id text NOT NULL, task_id uuid, remote_cycle_id uuid,
 desired_revision bigint NOT NULL DEFAULT 1 CHECK(desired_revision BETWEEN 1 AND 9007199254740991),
 pending_revision bigint CHECK(pending_revision BETWEEN 1 AND desired_revision), accepted_revision bigint NOT NULL DEFAULT 0 CHECK(accepted_revision BETWEEN 0 AND desired_revision),
 assignment_revision bigint NOT NULL DEFAULT 0 CHECK(assignment_revision BETWEEN 0 AND 9007199254740991),
 task jsonb, current_intent_id uuid NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,shipment_id), UNIQUE(source_id,external_id,source_cycle_id), UNIQUE(source_id,task_id,remote_cycle_id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,current_intent_id) REFERENCES dispatch.intent(company_id,id)
);
CREATE TABLE dispatch.item (
 company_id uuid NOT NULL, intent_id uuid NOT NULL, cycle_id uuid NOT NULL, shipment_id uuid NOT NULL, shipment_revision integer NOT NULL,
 snapshot jsonb NOT NULL, price jsonb NOT NULL,
 cover_source_id uuid, cover_id uuid,
 PRIMARY KEY(company_id,intent_id,shipment_id), UNIQUE(company_id,intent_id,cycle_id),
 FOREIGN KEY(company_id,intent_id) REFERENCES dispatch.intent(company_id,id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,shipment_id,shipment_revision) REFERENCES shipments.price_snapshot(company_id,shipment_id,revision),
 FOREIGN KEY(company_id,cover_source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,cover_id) REFERENCES kernel.shipping_cover(company_id,id),
 CHECK(price->>'currency'='EGP'), CHECK((price->>'waiverMinor')::bigint>=0),
 CHECK((price->>'brandShippingMinor')::bigint+(price->>'recipientShippingMinor')::bigint+(price->>'waiverMinor')::bigint=(price->>'tariffMinor')::bigint),
 CHECK((price->>'recipientDueMinor')::bigint=(price->>'goodsDueMinor')::bigint+(price->>'recipientShippingMinor')::bigint)
);
CREATE TABLE dispatch.action (
 company_id uuid NOT NULL, intent_id uuid NOT NULL, action_id uuid NOT NULL, shipment_id uuid,
 PRIMARY KEY(company_id,action_id), FOREIGN KEY(company_id,intent_id) REFERENCES dispatch.intent(company_id,id),
 FOREIGN KEY(company_id,action_id) REFERENCES integration.source_command(company_id,action_id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id)
);
CREATE TABLE dispatch.acceptance (
 company_id uuid NOT NULL, cycle_id uuid NOT NULL, action_id uuid NOT NULL, operation_id text NOT NULL,
 source_revision bigint NOT NULL, assignment_revision bigint NOT NULL, task jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,cycle_id,operation_id,source_revision,assignment_revision),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,action_id) REFERENCES dispatch.action(company_id,action_id)
);
CREATE TABLE dispatch.custody_effect (
 company_id uuid NOT NULL, cycle_id uuid NOT NULL, assignment_revision bigint NOT NULL,
 action_id uuid NOT NULL, shipment_id uuid NOT NULL, driver_id uuid NOT NULL,
 received_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,cycle_id,assignment_revision), UNIQUE(company_id,action_id,shipment_id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,action_id) REFERENCES dispatch.action(company_id,action_id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id)
);
-- Whole-parcel claim shared with P15. A claim is kept during unknown remote outcomes.
CREATE TABLE shipments.parcel_claim (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('dispatch','transfer')),
 owner_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,shipment_id), FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id)
);
CREATE INDEX dispatch_intent_scope ON dispatch.intent(company_id,branch_id,state,created_at,id);
CREATE INDEX dispatch_cycle_shipment ON dispatch.cycle(company_id,shipment_id,accepted_revision);
CREATE TRIGGER dispatch_acceptance_immutable BEFORE UPDATE OR DELETE ON dispatch.acceptance FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER dispatch_custody_immutable BEFORE UPDATE OR DELETE ON dispatch.custody_effect FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER dispatch_action_immutable BEFORE UPDATE OR DELETE ON dispatch.action FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION dispatch.preserve_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['cover_source_id','cover_id'])<>(to_jsonb(OLD)-ARRAY['cover_source_id','cover_id']) OR
 (OLD.cover_id IS NOT NULL AND (NEW.cover_id IS DISTINCT FROM OLD.cover_id OR NEW.cover_source_id IS DISTINCT FROM OLD.cover_source_id)) THEN RAISE EXCEPTION 'IMMUTABLE_DISPATCH_PRICE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER dispatch_item_immutable BEFORE UPDATE OR DELETE ON dispatch.item FOR EACH ROW EXECUTE FUNCTION dispatch.preserve_item();
CREATE FUNCTION dispatch.preserve_cycle() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['task_id','remote_cycle_id','desired_revision','pending_revision','accepted_revision','assignment_revision','task','current_intent_id'])<>(to_jsonb(OLD)-ARRAY['task_id','remote_cycle_id','desired_revision','pending_revision','accepted_revision','assignment_revision','task','current_intent_id']) OR
 NEW.accepted_revision<OLD.accepted_revision OR NEW.assignment_revision<OLD.assignment_revision OR
 (OLD.task_id IS NOT NULL AND NEW.task_id IS DISTINCT FROM OLD.task_id) OR
 (OLD.remote_cycle_id IS NOT NULL AND NEW.remote_cycle_id IS DISTINCT FROM OLD.remote_cycle_id)
 THEN RAISE EXCEPTION 'IMMUTABLE_DISPATCH_CYCLE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER dispatch_cycle_identity BEFORE UPDATE OR DELETE ON dispatch.cycle FOR EACH ROW EXECUTE FUNCTION dispatch.preserve_cycle();
