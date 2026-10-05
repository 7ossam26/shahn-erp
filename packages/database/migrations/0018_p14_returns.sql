-- Additive: no inferred receipts, inspection, stock, or canonical acceptance for historical rows.
CREATE SCHEMA returns;
INSERT INTO access.screen_capability(id,title,route,policy,implemented) VALUES('returns','استلام مرتجعات العملاء','/returns','assigned',true);
ALTER TABLE dispatch.cycle DROP CONSTRAINT cycle_company_id_shipment_id_key;
ALTER TABLE dispatch.cycle ADD COLUMN previous_cycle_id uuid;
ALTER TABLE dispatch.cycle ADD COLUMN latest boolean NOT NULL DEFAULT true;
ALTER TABLE dispatch.cycle ADD FOREIGN KEY(company_id,previous_cycle_id) REFERENCES dispatch.cycle(company_id,id);
CREATE UNIQUE INDEX dispatch_one_current_cycle ON dispatch.cycle(company_id,shipment_id) WHERE latest;
CREATE OR REPLACE FUNCTION dispatch.preserve_cycle() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['task_id','remote_cycle_id','desired_revision','pending_revision','accepted_revision','assignment_revision','task','current_intent_id','latest'])<>(to_jsonb(OLD)-ARRAY['task_id','remote_cycle_id','desired_revision','pending_revision','accepted_revision','assignment_revision','task','current_intent_id','latest']) OR
 NEW.accepted_revision<OLD.accepted_revision OR NEW.assignment_revision<OLD.assignment_revision OR
 (OLD.task_id IS NOT NULL AND NEW.task_id IS DISTINCT FROM OLD.task_id) OR
 (OLD.remote_cycle_id IS NOT NULL AND NEW.remote_cycle_id IS DISTINCT FROM OLD.remote_cycle_id)
 THEN RAISE EXCEPTION 'IMMUTABLE_DISPATCH_CYCLE'; END IF; RETURN NEW;
END $$;
CREATE TABLE returns.request (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL, branch_id uuid NOT NULL, driver_id uuid NOT NULL,
 original jsonb NOT NULL, requested_at timestamptz NOT NULL, checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,source_id,id), FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id), FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id)
);
CREATE TABLE returns.item (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL, request_id uuid NOT NULL, cycle_id uuid NOT NULL, shipment_id uuid NOT NULL,
 source_line_id text NOT NULL, original jsonb NOT NULL, current_data jsonb NOT NULL, revision bigint NOT NULL CHECK(revision BETWEEN 0 AND 9007199254740991),
 requested integer NOT NULL CHECK(requested BETWEEN 1 AND 1000000), received integer NOT NULL CHECK(received>=0), lost integer NOT NULL CHECK(lost>=0), damaged integer NOT NULL CHECK(damaged>=0), unresolved integer NOT NULL CHECK(unresolved>=0),
 CHECK(requested=received+lost+damaged+unresolved),
 PRIMARY KEY(company_id,source_id,id), FOREIGN KEY(company_id,source_id,request_id) REFERENCES returns.request(company_id,source_id,id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id), FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id)
);
CREATE TABLE returns.intent (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, request_id uuid NOT NULL, branch_id uuid NOT NULL,
 command_record_id uuid NOT NULL, action_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('received','lost','damaged')),
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL, observed_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','rejected','review-required')), last_error text,
 decision_id uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,command_record_id), UNIQUE(company_id,action_id),
 FOREIGN KEY(company_id,source_id,request_id) REFERENCES returns.request(company_id,source_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,action_id) REFERENCES integration.source_command(company_id,action_id)
);
CREATE TABLE returns.observation_line (
 company_id uuid NOT NULL, intent_id uuid NOT NULL, source_id uuid NOT NULL, item_id uuid NOT NULL,
 expected_revision bigint NOT NULL CHECK(expected_revision BETWEEN 0 AND 9007199254740991), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 condition text CHECK(condition IN ('sound','damaged','uncertain')), inspection text NOT NULL CHECK(inspection IN ('counted-pieces','parcel-exterior','disposition')),
 suspected_shortage boolean NOT NULL DEFAULT false,
 PRIMARY KEY(company_id,intent_id,item_id), FOREIGN KEY(company_id,intent_id) REFERENCES returns.intent(company_id,id),
 FOREIGN KEY(company_id,source_id,item_id) REFERENCES returns.item(company_id,source_id,id)
);
CREATE TABLE returns.disposition_decision (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, request_id uuid NOT NULL, incident_id uuid NOT NULL,
 decision jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,source_id,request_id) REFERENCES returns.request(company_id,source_id,id)
);
ALTER TABLE returns.intent ADD FOREIGN KEY(company_id,decision_id) REFERENCES returns.disposition_decision(company_id,id);
ALTER TABLE returns.intent ADD CHECK((kind='received')=(decision_id IS NULL));
CREATE TABLE returns.transition (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL, item_id uuid NOT NULL, request_id uuid NOT NULL,
 action_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('received','lost','damaged')), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 revision bigint NOT NULL CHECK(revision BETWEEN 0 AND 9007199254740991), fact jsonb NOT NULL, intent_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,source_id,id), UNIQUE(company_id,source_id,item_id,revision),
 FOREIGN KEY(company_id,source_id,item_id) REFERENCES returns.item(company_id,source_id,id),
 FOREIGN KEY(company_id,source_id,request_id) REFERENCES returns.request(company_id,source_id,id), FOREIGN KEY(company_id,intent_id) REFERENCES returns.intent(company_id,id)
);
CREATE TABLE returns.return_receipt (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL, branch_id uuid NOT NULL, actor_id uuid REFERENCES access.principal(id), actor_name text,
 accepted_at timestamptz NOT NULL, observed_at timestamptz, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,source_id,id) REFERENCES returns.transition(company_id,source_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE returns.return_receipt_line (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, item_id uuid NOT NULL, receipt_id uuid NOT NULL,
 shipment_id uuid NOT NULL, cycle_id uuid NOT NULL, source_line_id text NOT NULL, brand_id uuid NOT NULL, branch_id uuid NOT NULL, variant_id uuid,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), condition text NOT NULL CHECK(condition IN ('sound','damaged','uncertain')),
 consumed integer NOT NULL DEFAULT 0 CHECK(consumed>=0 AND consumed<=quantity), version integer NOT NULL DEFAULT 1,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,receipt_id), FOREIGN KEY(company_id,receipt_id) REFERENCES returns.return_receipt(company_id,id),
 FOREIGN KEY(company_id,source_id,item_id) REFERENCES returns.item(company_id,source_id,id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id), FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id), FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,brand_id,variant_id) REFERENCES inventory.product_variant(company_id,brand_id,id)
);
CREATE TABLE returns.receipt_allocation (
 company_id uuid NOT NULL, id uuid NOT NULL, receipt_line_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('redispatch','transfer','brand-handover')),
 owner_id uuid NOT NULL, cycle_id uuid, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), reservation_id uuid, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,receipt_line_id,kind,owner_id), FOREIGN KEY(company_id,receipt_line_id) REFERENCES returns.return_receipt_line(company_id,id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id), FOREIGN KEY(company_id,reservation_id) REFERENCES inventory.stock_reservation(company_id,id)
);
CREATE TABLE returns.brand_handover (
 company_id uuid NOT NULL, id uuid NOT NULL, branch_id uuid NOT NULL, brand_id uuid NOT NULL, recipient_name text NOT NULL CHECK(length(trim(recipient_name)) BETWEEN 1 AND 200),
 command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 actual_at timestamptz NOT NULL, details jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,command_record_id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id), FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id), CHECK(actual_at<=recorded_at)
);
CREATE INDEX return_scope ON returns.request(company_id,branch_id,driver_id,requested_at,id);
CREATE INDEX return_item_cycle ON returns.item(company_id,cycle_id,source_line_id);
CREATE INDEX return_line_scope ON returns.return_receipt_line(company_id,branch_id,brand_id,shipment_id);
CREATE TRIGGER return_transition_immutable BEFORE UPDATE OR DELETE ON returns.transition FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER return_observation_immutable BEFORE UPDATE OR DELETE ON returns.observation_line FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER return_receipt_immutable BEFORE UPDATE OR DELETE ON returns.return_receipt FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION returns.preserve_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'reservation_id')<>(to_jsonb(OLD)-'reservation_id') OR OLD.reservation_id IS NOT NULL THEN RAISE EXCEPTION 'IMMUTABLE_RETURN_ALLOCATION'; END IF; RETURN NEW; END $$;
CREATE TRIGGER return_allocation_immutable BEFORE UPDATE OR DELETE ON returns.receipt_allocation FOR EACH ROW EXECUTE FUNCTION returns.preserve_allocation();
CREATE TRIGGER return_decision_immutable BEFORE UPDATE OR DELETE ON returns.disposition_decision FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER brand_handover_immutable BEFORE UPDATE OR DELETE ON returns.brand_handover FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION returns.preserve_request() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'checked_at')<>(to_jsonb(OLD)-'checked_at') THEN RAISE EXCEPTION 'IMMUTABLE_RETURN_REQUEST'; END IF; RETURN NEW; END $$;
CREATE TRIGGER return_request_identity BEFORE UPDATE OR DELETE ON returns.request FOR EACH ROW EXECUTE FUNCTION returns.preserve_request();
CREATE FUNCTION returns.preserve_item() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['current_data','revision','received','lost','damaged','unresolved'])<>(to_jsonb(OLD)-ARRAY['current_data','revision','received','lost','damaged','unresolved']) OR NEW.revision<OLD.revision OR NEW.received<OLD.received OR NEW.lost<OLD.lost OR NEW.damaged<OLD.damaged THEN RAISE EXCEPTION 'IMMUTABLE_RETURN_ITEM'; END IF; RETURN NEW; END $$;
CREATE TRIGGER return_item_identity BEFORE UPDATE OR DELETE ON returns.item FOR EACH ROW EXECUTE FUNCTION returns.preserve_item();
CREATE FUNCTION returns.preserve_receipt_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['consumed','version'])<>(to_jsonb(OLD)-ARRAY['consumed','version']) OR NEW.consumed<OLD.consumed OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'IMMUTABLE_RETURN_RECEIPT_LINE'; END IF; RETURN NEW; END $$;
CREATE TRIGGER return_line_identity BEFORE UPDATE OR DELETE ON returns.return_receipt_line FOR EACH ROW EXECUTE FUNCTION returns.preserve_receipt_line();
CREATE FUNCTION returns.check_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE total integer; available integer; BEGIN
 SELECT quantity INTO available FROM returns.return_receipt_line WHERE company_id=NEW.company_id AND id=NEW.receipt_line_id FOR UPDATE;
 SELECT COALESCE(sum(quantity),0) INTO total FROM returns.receipt_allocation WHERE company_id=NEW.company_id AND receipt_line_id=NEW.receipt_line_id;
 IF total+NEW.quantity>available THEN RAISE EXCEPTION 'RETURN_ALREADY_ALLOCATED'; END IF; RETURN NEW; END $$;
CREATE TRIGGER return_allocation_quantity BEFORE INSERT ON returns.receipt_allocation FOR EACH ROW EXECUTE FUNCTION returns.check_allocation();
