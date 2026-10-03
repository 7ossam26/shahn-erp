-- P07 extends the common shipment. Existing external receipts remain unchanged.
ALTER TABLE shipments.parcel_custody ALTER COLUMN receipt_id DROP NOT NULL;
ALTER TABLE shipments.parcel_custody ADD FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id);
ALTER TABLE shipments.event DROP CONSTRAINT event_kind_check;
ALTER TABLE shipments.event ADD CHECK(kind IN ('received','reserved','corrected','prepared','cancelled','unpack_inspected'));
ALTER TABLE inventory.stock_reservation ADD UNIQUE(company_id,id,branch_id,brand_id,variant_id);
CREATE TABLE shipments.stock_allocation (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, revision integer NOT NULL, brand_id uuid NOT NULL,
 branch_id uuid NOT NULL, variant_id uuid NOT NULL, reservation_id uuid NOT NULL,
 PRIMARY KEY(company_id,shipment_id,revision,variant_id), UNIQUE(company_id,reservation_id),
 FOREIGN KEY(company_id,shipment_id,brand_id) REFERENCES shipments.shipment(company_id,id,brand_id),
 FOREIGN KEY(company_id,shipment_id,revision) REFERENCES shipments.revision(company_id,shipment_id,revision),
 FOREIGN KEY(company_id,reservation_id,branch_id,brand_id,variant_id) REFERENCES inventory.stock_reservation(company_id,id,branch_id,brand_id,variant_id)
);
CREATE UNIQUE INDEX stock_order_active_source ON inventory.stock_reservation(company_id,source_id,branch_id,variant_id) WHERE active AND source_kind='order';
CREATE TABLE shipments.unpack_pending (
 company_id uuid NOT NULL, id uuid NOT NULL, shipment_id uuid NOT NULL, shipment_version integer NOT NULL,
 branch_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL,
 quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 9007199254740991),
 reason text NOT NULL DEFAULT 'awaiting_unpack_inspection' CHECK(reason='awaiting_unpack_inspection'),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,shipment_id,shipment_version,variant_id),
 FOREIGN KEY(company_id,shipment_id,brand_id) REFERENCES shipments.shipment(company_id,id,brand_id),
 FOREIGN KEY(company_id,branch_id,brand_id,variant_id) REFERENCES inventory.stock_position(company_id,branch_id,brand_id,variant_id)
);
CREATE TABLE shipments.unpack_inspection (
 company_id uuid NOT NULL, pending_id uuid NOT NULL, command_record_id uuid NOT NULL,
 sound bigint NOT NULL CHECK(sound BETWEEN 0 AND 9007199254740991), damaged bigint NOT NULL CHECK(damaged BETWEEN 0 AND 9007199254740991),
 uncertain bigint NOT NULL CHECK(uncertain BETWEEN 0 AND 9007199254740991), CHECK(sound+damaged+uncertain BETWEEN 1 AND 9007199254740991),
 actor_id uuid NOT NULL REFERENCES access.principal(id), reason text NOT NULL CHECK(length(trim(reason))>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,pending_id,command_record_id),
 FOREIGN KEY(company_id,pending_id) REFERENCES shipments.unpack_pending(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TRIGGER allocation_immutable BEFORE UPDATE OR DELETE ON shipments.stock_allocation FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER unpack_pending_immutable BEFORE UPDATE OR DELETE ON shipments.unpack_pending FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER unpack_inspection_immutable BEFORE UPDATE OR DELETE ON shipments.unpack_inspection FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION shipments.unpack_bound() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total numeric; allowed bigint;
BEGIN
 SELECT quantity INTO allowed FROM shipments.unpack_pending WHERE company_id=NEW.company_id AND id=NEW.pending_id FOR UPDATE;
 SELECT COALESCE(sum(sound+damaged+uncertain),0) INTO total FROM shipments.unpack_inspection WHERE company_id=NEW.company_id AND pending_id=NEW.pending_id;
 IF total>allowed THEN RAISE EXCEPTION 'UNPACK_QUANTITY_EXCEEDED'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER unpack_bound AFTER INSERT ON shipments.unpack_inspection DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shipments.unpack_bound();
CREATE FUNCTION shipments.allocation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE claim inventory.stock_reservation; src inventory.stock_source; rev shipments.revision; total numeric;
BEGIN
 SELECT * INTO claim FROM inventory.stock_reservation WHERE company_id=NEW.company_id AND id=NEW.reservation_id;
 SELECT * INTO src FROM inventory.stock_source WHERE company_id=claim.company_id AND id=claim.source_id;
 SELECT * INTO rev FROM shipments.revision WHERE company_id=NEW.company_id AND shipment_id=NEW.shipment_id AND revision=NEW.revision;
 SELECT COALESCE(sum((l->>'quantity')::numeric),0) INTO total FROM jsonb_array_elements(rev.fields->'lines') l WHERE l->>'variantId'=NEW.variant_id::text;
 IF claim.source_kind<>'order' OR src.source_system<>'shipment' OR src.source_identity<>NEW.shipment_id::text OR src.revision<>NEW.revision OR rev.fields->>'service'<>'stored_stock' OR claim.quantity<>total OR rev.fields->>'branchId'<>NEW.branch_id::text THEN RAISE EXCEPTION 'STOCK_ALLOCATION_SOURCE_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER allocation_guard AFTER INSERT ON shipments.stock_allocation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shipments.allocation_guard();
