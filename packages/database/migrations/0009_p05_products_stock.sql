-- Additive P05. No stock/backfilled fictional receipts in existing companies.
UPDATE access.screen_capability SET implemented=true WHERE id='inventory';
CREATE SCHEMA inventory;
CREATE TABLE inventory.product (
 company_id uuid NOT NULL, brand_id uuid NOT NULL, id uuid NOT NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180), active boolean NOT NULL,
 version integer NOT NULL CHECK(version>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,brand_id,id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id)
);
CREATE TABLE inventory.product_variant (
 company_id uuid NOT NULL, brand_id uuid NOT NULL, product_id uuid NOT NULL, id uuid NOT NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180), options text NOT NULL CHECK(length(options)<=180), active boolean NOT NULL,
 version integer NOT NULL CHECK(version>0), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,brand_id,id),
 FOREIGN KEY(company_id,brand_id,product_id) REFERENCES inventory.product(company_id,brand_id,id)
);
CREATE TABLE inventory.product_revision (
 company_id uuid NOT NULL, product_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), fields jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,product_id,version), FOREIGN KEY(company_id,product_id) REFERENCES inventory.product(company_id,id)
);
ALTER TABLE inventory.product ADD FOREIGN KEY(company_id,id,version) REFERENCES inventory.product_revision(company_id,product_id,version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE inventory.stock_position (
 company_id uuid NOT NULL, branch_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL,
 sound_on_hand bigint NOT NULL DEFAULT 0 CHECK(sound_on_hand BETWEEN 0 AND 9007199254740991),
 unavailable_on_hand bigint NOT NULL DEFAULT 0 CHECK(unavailable_on_hand BETWEEN 0 AND 9007199254740991),
 CHECK(sound_on_hand+unavailable_on_hand<=9007199254740991),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), last_movement_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,branch_id,brand_id,variant_id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,brand_id,variant_id) REFERENCES inventory.product_variant(company_id,brand_id,id)
);
-- Sources are explicit stable business identities; later phases link their native
-- aggregates here in the caller's transaction, never by display name.
CREATE TABLE inventory.stock_source (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('receipt','order','loose_transfer','condition','adjustment')),
 source_system text NOT NULL CHECK(length(source_system)>0), source_identity text NOT NULL CHECK(length(source_identity)>0), revision integer NOT NULL CHECK(revision>0),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,id,kind), UNIQUE(company_id,source_system,source_identity,kind,revision)
);
CREATE SEQUENCE inventory.receipt_reference;
CREATE TABLE inventory.stock_receipt (
 company_id uuid NOT NULL, id uuid NOT NULL, source_kind text NOT NULL DEFAULT 'receipt' CHECK(source_kind='receipt'),
 reference text NOT NULL DEFAULT nextval('inventory.receipt_reference')::text CHECK(reference ~ '^[0-9]+$'),
 branch_id uuid NOT NULL, brand_id uuid NOT NULL, actual_date date NOT NULL,
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version=1),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(company_id,id,branch_id,brand_id),
 FOREIGN KEY(company_id,id,source_kind) REFERENCES inventory.stock_source(company_id,id,kind),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 CHECK(actual_date <= (recorded_at AT TIME ZONE 'Africa/Cairo')::date)
);
CREATE TABLE inventory.stock_receipt_line (
 company_id uuid NOT NULL, id uuid NOT NULL, receipt_id uuid NOT NULL, branch_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL,
 line_number integer NOT NULL CHECK(line_number>0), quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 9007199254740991),
 condition text NOT NULL CHECK(condition IN ('sound','damaged','uncertain')),
 product_name text NOT NULL, variant_name text NOT NULL, options text NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,receipt_id,line_number), UNIQUE(company_id,id,receipt_id,branch_id,brand_id,variant_id),
 FOREIGN KEY(company_id,receipt_id,branch_id,brand_id) REFERENCES inventory.stock_receipt(company_id,id,branch_id,brand_id),
 FOREIGN KEY(company_id,brand_id,variant_id) REFERENCES inventory.product_variant(company_id,brand_id,id)
);
CREATE TABLE inventory.stock_movement (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, effect_key text NOT NULL, branch_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL,
 receipt_line_id uuid, condition text NOT NULL CHECK(condition IN ('sound','damaged','uncertain')),
 sound_delta bigint NOT NULL CHECK(sound_delta BETWEEN -9007199254740991 AND 9007199254740991),
 unavailable_delta bigint NOT NULL CHECK(unavailable_delta BETWEEN -9007199254740991 AND 9007199254740991),
 CHECK(sound_delta<>0 OR unavailable_delta<>0), actual_date date NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,effect_key), UNIQUE(company_id,receipt_line_id),
 FOREIGN KEY(company_id,source_id) REFERENCES inventory.stock_source(company_id,id),
 FOREIGN KEY(company_id,branch_id,brand_id,variant_id) REFERENCES inventory.stock_position(company_id,branch_id,brand_id,variant_id),
 FOREIGN KEY(company_id,receipt_line_id,source_id,branch_id,brand_id,variant_id) REFERENCES inventory.stock_receipt_line(company_id,id,receipt_id,branch_id,brand_id,variant_id)
);
CREATE TABLE inventory.stock_reservation (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, source_kind text NOT NULL CHECK(source_kind IN ('order','loose_transfer')), line_key text NOT NULL,
 branch_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL, quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 9007199254740991),
 active boolean NOT NULL DEFAULT true, shortage_held boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,line_key),
 FOREIGN KEY(company_id,source_id,source_kind) REFERENCES inventory.stock_source(company_id,id,kind),
 FOREIGN KEY(company_id,branch_id,brand_id,variant_id) REFERENCES inventory.stock_position(company_id,branch_id,brand_id,variant_id)
);
CREATE TABLE inventory.command_outcome (
 company_id uuid NOT NULL, id uuid NOT NULL, command_record_id uuid NOT NULL UNIQUE REFERENCES command_record(id), body jsonb NOT NULL,
 PRIMARY KEY(company_id,id), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE inventory.reservation_event (
 company_id uuid NOT NULL, id uuid NOT NULL, reservation_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('reserved','released')),
 source_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reservation_id,kind),
 FOREIGN KEY(company_id,reservation_id) REFERENCES inventory.stock_reservation(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES inventory.stock_source(company_id,id)
);
CREATE INDEX stock_movement_position_date ON inventory.stock_movement(company_id,branch_id,brand_id,variant_id,recorded_at,id);
CREATE INDEX stock_reservation_active ON inventory.stock_reservation(company_id,branch_id,brand_id,variant_id) WHERE active;
CREATE INDEX stock_product_brand ON inventory.product(company_id,brand_id,name,id);
CREATE INDEX stock_variant_product ON inventory.product_variant(company_id,product_id,id);
CREATE FUNCTION inventory.retain_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INVENTORY_HISTORY_IMMUTABLE'; END $$;
CREATE TRIGGER product_no_delete BEFORE DELETE ON inventory.product FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER variant_no_delete BEFORE DELETE ON inventory.product_variant FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER position_no_delete BEFORE DELETE ON inventory.stock_position FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER reservation_no_delete BEFORE DELETE ON inventory.stock_reservation FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER source_immutable BEFORE UPDATE OR DELETE ON inventory.stock_source FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER product_revision_immutable BEFORE UPDATE OR DELETE ON inventory.product_revision FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER receipt_immutable BEFORE UPDATE OR DELETE ON inventory.stock_receipt FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER receipt_line_immutable BEFORE UPDATE OR DELETE ON inventory.stock_receipt_line FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER movement_immutable BEFORE UPDATE OR DELETE ON inventory.stock_movement FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER outcome_immutable BEFORE UPDATE OR DELETE ON inventory.command_outcome FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE TRIGGER reservation_event_immutable BEFORE UPDATE OR DELETE ON inventory.reservation_event FOR EACH ROW EXECUTE FUNCTION inventory.retain_history();
CREATE FUNCTION inventory.variant_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.company_id,NEW.id,NEW.brand_id,NEW.product_id) IS DISTINCT FROM (OLD.company_id,OLD.id,OLD.brand_id,OLD.product_id) THEN RAISE EXCEPTION 'VARIANT_IDENTITY_IMMUTABLE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER variant_identity BEFORE UPDATE ON inventory.product_variant FOR EACH ROW EXECUTE FUNCTION inventory.variant_identity();
CREATE FUNCTION inventory.product_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.company_id,NEW.id,NEW.brand_id) IS DISTINCT FROM (OLD.company_id,OLD.id,OLD.brand_id) THEN RAISE EXCEPTION 'PRODUCT_IDENTITY_IMMUTABLE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER product_identity BEFORE UPDATE ON inventory.product FOR EACH ROW EXECUTE FUNCTION inventory.product_identity();
CREATE FUNCTION inventory.receipt_effect_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_kind text; line inventory.stock_receipt_line;
BEGIN
 SELECT kind INTO source_kind FROM inventory.stock_source WHERE company_id=NEW.company_id AND id=NEW.source_id;
 IF (source_kind='receipt') IS DISTINCT FROM (NEW.receipt_line_id IS NOT NULL) THEN RAISE EXCEPTION 'RECEIPT_EFFECT_SOURCE_MISMATCH'; END IF;
 IF NEW.receipt_line_id IS NOT NULL THEN
  SELECT * INTO line FROM inventory.stock_receipt_line WHERE company_id=NEW.company_id AND id=NEW.receipt_line_id;
  IF NEW.condition<>line.condition OR NEW.sound_delta<>(CASE WHEN line.condition='sound' THEN line.quantity ELSE 0 END) OR NEW.unavailable_delta<>(CASE WHEN line.condition='sound' THEN 0 ELSE line.quantity END) THEN RAISE EXCEPTION 'RECEIPT_EFFECT_QUANTITY_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER receipt_effect_guard BEFORE INSERT ON inventory.stock_movement FOR EACH ROW EXECUTE FUNCTION inventory.receipt_effect_guard();
