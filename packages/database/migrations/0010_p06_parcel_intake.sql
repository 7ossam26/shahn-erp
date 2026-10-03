CREATE SCHEMA shipments;
UPDATE access.screen_capability SET implemented=true,route='/shipments/new' WHERE id='intake';
CREATE SEQUENCE shipments.numeric_reference AS bigint MINVALUE 10000 START 10000 NO CYCLE;
CREATE TABLE shipments.shipment (
 company_id uuid NOT NULL, id uuid NOT NULL, reference text NOT NULL DEFAULT nextval('shipments.numeric_reference')::text CHECK(reference ~ '^[0-9]+$'),
 brand_id uuid NOT NULL, branch_id uuid NOT NULL, command_record_id uuid NOT NULL UNIQUE,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','cancelled')),
 preparation text NOT NULL CHECK(preparation IN ('not_required','awaiting_preparation','complete')),
 source_state text NOT NULL DEFAULT 'local' CHECK(source_state IN ('local','integrated')), handed_over boolean NOT NULL DEFAULT false,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(reference), UNIQUE(company_id,id,brand_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id), FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE shipments.revision (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, brand_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
 fields jsonb NOT NULL, phone_canonical text NOT NULL CHECK(phone_canonical ~ '^(\+[1-9][0-9]{7,14}|01[0125][0-9]{8})$'),
 PRIMARY KEY(company_id,shipment_id,revision), FOREIGN KEY(company_id,shipment_id,brand_id) REFERENCES shipments.shipment(company_id,id,brand_id)
);
CREATE TABLE shipments.price_snapshot (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, revision integer NOT NULL, snapshot jsonb NOT NULL,
 brand_id uuid GENERATED ALWAYS AS ((snapshot->>'brandId')::uuid) STORED,
 policy_version integer GENERATED ALWAYS AS ((snapshot->>'policyVersion')::integer) STORED,
 tariff_id uuid GENERATED ALWAYS AS ((snapshot->>'tariffId')::uuid) STORED,
 tariff_version integer GENERATED ALWAYS AS ((snapshot->>'tariffVersion')::integer) STORED,
 CHECK(snapshot->>'currency'='EGP'),
 CHECK((snapshot->>'baseShippingMinor')::numeric>=0 AND (snapshot->>'packingUpliftMinor')::numeric>=0),
 CHECK((snapshot->>'tariffMinor')::numeric=(snapshot->>'baseShippingMinor')::numeric+(snapshot->>'packingUpliftMinor')::numeric),
 CHECK((snapshot->>'recipientDueMinor')::numeric=(snapshot->>'goodsDueMinor')::numeric+(snapshot->>'recipientShippingMinor')::numeric),
 CHECK((snapshot->>'recipientDueMinor')::numeric BETWEEN 0 AND 9007199254740991),
 CHECK((snapshot->>'recipientShippingMinor')::numeric>=0 AND (snapshot->>'brandShippingMinor')::numeric>=0),
 CHECK((snapshot->>'brandShippingMinor')::numeric+(snapshot->>'recipientShippingMinor')::numeric=(snapshot->>'tariffMinor')::numeric),
 FOREIGN KEY(company_id,brand_id,policy_version) REFERENCES commercial.brand_policy(company_id,brand_id,version),
 FOREIGN KEY(company_id,tariff_id,tariff_version) REFERENCES commercial.tariff_revision(company_id,entity_id,version),
 PRIMARY KEY(company_id,shipment_id,revision), FOREIGN KEY(company_id,shipment_id,revision) REFERENCES shipments.revision(company_id,shipment_id,revision)
);
CREATE TABLE shipments.line (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, revision integer NOT NULL, id uuid NOT NULL,
 description text NOT NULL CHECK(length(description) BETWEEN 1 AND 200), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 unit_due_minor bigint NOT NULL CHECK(unit_due_minor BETWEEN 0 AND 9007199254740991),
 PRIMARY KEY(company_id,shipment_id,revision,id), FOREIGN KEY(company_id,shipment_id,revision) REFERENCES shipments.revision(company_id,shipment_id,revision)
);
CREATE TABLE shipments.receipt (
 company_id uuid NOT NULL, id uuid NOT NULL, shipment_id uuid NOT NULL, brand_id uuid NOT NULL, branch_id uuid NOT NULL,
 command_record_id uuid NOT NULL UNIQUE, actor_id uuid NOT NULL, actor_name text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,shipment_id), UNIQUE(company_id,id,shipment_id),
 FOREIGN KEY(company_id,shipment_id,brand_id) REFERENCES shipments.shipment(company_id,id,brand_id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE shipments.parcel_custody (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, receipt_id uuid NOT NULL, branch_id uuid NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 PRIMARY KEY(company_id,shipment_id), FOREIGN KEY(company_id,receipt_id,shipment_id) REFERENCES shipments.receipt(company_id,id,shipment_id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE shipments.event (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, version integer NOT NULL, kind text NOT NULL CHECK(kind IN ('received','corrected','prepared','cancelled')),
 actor_id uuid NOT NULL, actor_name text NOT NULL, reason text NOT NULL DEFAULT '', recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,shipment_id,version), FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id)
);
CREATE TABLE shipments.custody_correction (
 company_id uuid NOT NULL, shipment_id uuid NOT NULL, version integer NOT NULL, from_branch_id uuid NOT NULL, to_branch_id uuid NOT NULL,
 actual_at_corrected_branch boolean NOT NULL CHECK(actual_at_corrected_branch),
 PRIMARY KEY(company_id,shipment_id,version), FOREIGN KEY(company_id,shipment_id,version) REFERENCES shipments.event(company_id,shipment_id,version),
 FOREIGN KEY(company_id,from_branch_id) REFERENCES access.branch(company_id,id), FOREIGN KEY(company_id,to_branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE shipments.command_outcome (
 company_id uuid NOT NULL, id uuid NOT NULL, command_record_id uuid NOT NULL UNIQUE, body jsonb NOT NULL,
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE INDEX shipment_branch_created ON shipments.shipment(company_id,branch_id,received_at,id);
CREATE INDEX shipment_brand ON shipments.shipment(company_id,brand_id,id);
CREATE INDEX shipment_brand_reference ON shipments.revision(company_id,(fields->>'brandReference'));
ALTER TABLE shipments.shipment ADD FOREIGN KEY(company_id,id,revision) REFERENCES shipments.revision(company_id,shipment_id,revision) DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION shipments.line_total_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual numeric; expected numeric; line_count integer; expected_line_count integer;
BEGIN
 SELECT COALESCE(sum(quantity::numeric*unit_due_minor),0),count(*) INTO actual,line_count FROM shipments.line WHERE company_id=NEW.company_id AND shipment_id=NEW.shipment_id AND revision=NEW.revision;
 SELECT (snapshot->>'goodsDueMinor')::numeric INTO expected FROM shipments.price_snapshot WHERE company_id=NEW.company_id AND shipment_id=NEW.shipment_id AND revision=NEW.revision;
 SELECT jsonb_array_length(fields->'lines') INTO expected_line_count FROM shipments.revision WHERE company_id=NEW.company_id AND shipment_id=NEW.shipment_id AND revision=NEW.revision;
 IF actual IS DISTINCT FROM expected OR line_count NOT BETWEEN 1 AND 100 OR line_count IS DISTINCT FROM expected_line_count THEN RAISE EXCEPTION 'SHIPMENT_LINE_TOTAL_MISMATCH'; END IF; RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER line_total_guard AFTER INSERT ON shipments.price_snapshot DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shipments.line_total_guard();
CREATE CONSTRAINT TRIGGER line_revision_guard AFTER INSERT ON shipments.line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION shipments.line_total_guard();
CREATE FUNCTION shipments.immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SHIPMENT_HISTORY_IMMUTABLE'; END $$;
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON shipments.revision FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER price_immutable BEFORE UPDATE OR DELETE ON shipments.price_snapshot FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER line_immutable BEFORE UPDATE OR DELETE ON shipments.line FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER receipt_immutable BEFORE UPDATE OR DELETE ON shipments.receipt FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER event_immutable BEFORE UPDATE OR DELETE ON shipments.event FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER custody_correction_immutable BEFORE UPDATE OR DELETE ON shipments.custody_correction FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER outcome_immutable BEFORE UPDATE OR DELETE ON shipments.command_outcome FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER shipment_no_delete BEFORE DELETE ON shipments.shipment FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER custody_no_delete BEFORE DELETE ON shipments.parcel_custody FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION shipments.identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.company_id,NEW.id,NEW.reference,NEW.brand_id,NEW.command_record_id,NEW.received_at) IS DISTINCT FROM (OLD.company_id,OLD.id,OLD.reference,OLD.brand_id,OLD.command_record_id,OLD.received_at) THEN RAISE EXCEPTION 'SHIPMENT_IDENTITY_IMMUTABLE'; END IF;
 IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'SHIPMENT_VERSION_REQUIRED'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER shipment_identity BEFORE UPDATE ON shipments.shipment FOR EACH ROW EXECUTE FUNCTION shipments.identity_guard();
