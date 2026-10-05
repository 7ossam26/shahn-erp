-- A manifest is one physical trip. Reservations are claims on branch stock, not stock.
CREATE SCHEMA goods_transfer;
INSERT INTO access.screen_capability(id,title,route,policy,implemented) VALUES
 ('goods.send','إرسال بضائع بين الفروع','/goods-transfers','assigned',true),
 ('goods.receive','استلام بضائع من فرع','/goods-receipts','assigned',true)
ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,route=EXCLUDED.route,implemented=true;
CREATE SEQUENCE goods_transfer.numeric_reference AS bigint MINVALUE 10000 START 10000 NO CYCLE;
CREATE TABLE goods_transfer.manifest (
 company_id uuid NOT NULL, id uuid NOT NULL, reference text NOT NULL DEFAULT nextval('goods_transfer.numeric_reference')::text CHECK(reference ~ '^[0-9]+$'),
 source_branch_id uuid NOT NULL, destination_branch_id uuid NOT NULL, driver_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','in_transit','closed','cancelled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), planned_at timestamptz NOT NULL,
 created_command_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(company_id,created_command_id),
 FOREIGN KEY(company_id,source_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,destination_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 FOREIGN KEY(company_id,created_command_id) REFERENCES command_record(company_id,id),
 CHECK(source_branch_id<>destination_branch_id)
);
CREATE TABLE goods_transfer.line (
 company_id uuid NOT NULL, id uuid NOT NULL, manifest_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('parcel','loose')), brand_id uuid NOT NULL,
 shipment_id uuid, variant_id uuid, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), prior_dispatch_owner_id uuid,
 remaining integer NOT NULL CHECK(remaining>=0 AND remaining<=quantity), reservation_id uuid,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,manifest_id,id),
 FOREIGN KEY(company_id,manifest_id) REFERENCES goods_transfer.manifest(company_id,id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,shipment_id,brand_id) REFERENCES shipments.shipment(company_id,id,brand_id),
 FOREIGN KEY(company_id,prior_dispatch_owner_id) REFERENCES dispatch.intent(company_id,id),
 FOREIGN KEY(company_id,brand_id,variant_id) REFERENCES inventory.product_variant(company_id,brand_id,id),
 FOREIGN KEY(company_id,reservation_id) REFERENCES inventory.stock_reservation(company_id,id),
 CHECK((kind='parcel' AND shipment_id IS NOT NULL AND variant_id IS NULL AND quantity=1 AND reservation_id IS NULL)
    OR (kind='loose' AND shipment_id IS NULL AND variant_id IS NOT NULL AND reservation_id IS NOT NULL AND prior_dispatch_owner_id IS NULL))
);
CREATE UNIQUE INDEX goods_transfer_parcel_once ON goods_transfer.line(company_id,manifest_id,shipment_id) WHERE kind='parcel';
CREATE TABLE goods_transfer.component (
 company_id uuid NOT NULL, line_id uuid NOT NULL, brand_id uuid NOT NULL, variant_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000), original_reservation_id uuid NOT NULL, transfer_reservation_id uuid,
 PRIMARY KEY(company_id,line_id,variant_id),
 FOREIGN KEY(company_id,line_id) REFERENCES goods_transfer.line(company_id,id),
 FOREIGN KEY(company_id,brand_id,variant_id) REFERENCES inventory.product_variant(company_id,brand_id,id),
 FOREIGN KEY(company_id,original_reservation_id) REFERENCES inventory.stock_reservation(company_id,id),
 FOREIGN KEY(company_id,transfer_reservation_id) REFERENCES inventory.stock_reservation(company_id,id)
);
CREATE TABLE goods_transfer.return_claim (
 company_id uuid NOT NULL, receipt_line_id uuid NOT NULL, manifest_id uuid NOT NULL, line_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 PRIMARY KEY(company_id,receipt_line_id),
 FOREIGN KEY(company_id,receipt_line_id) REFERENCES returns.return_receipt_line(company_id,id),
 FOREIGN KEY(company_id,manifest_id,line_id) REFERENCES goods_transfer.line(company_id,manifest_id,id)
);
CREATE TABLE goods_transfer.action_fact (
 company_id uuid NOT NULL, id uuid NOT NULL, manifest_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('handover','cancel')),
 command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 actual_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,manifest_id,kind), UNIQUE(company_id,command_record_id),
 FOREIGN KEY(company_id,manifest_id) REFERENCES goods_transfer.manifest(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE goods_transfer.receipt (
 company_id uuid NOT NULL, id uuid NOT NULL, manifest_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('destination','source_return')), branch_id uuid NOT NULL,
 command_record_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 actual_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,id,manifest_id), UNIQUE(company_id,command_record_id),
 FOREIGN KEY(company_id,manifest_id) REFERENCES goods_transfer.manifest(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE goods_transfer.receipt_line (
 company_id uuid NOT NULL, receipt_id uuid NOT NULL, manifest_id uuid NOT NULL, line_id uuid NOT NULL,
 sound integer NOT NULL DEFAULT 0 CHECK(sound>=0), damaged integer NOT NULL DEFAULT 0 CHECK(damaged>=0),
 uncertain integer NOT NULL DEFAULT 0 CHECK(uncertain>=0),
 inspection text NOT NULL CHECK(inspection IN ('counted-pieces','parcel-exterior')),
 suspected_internal_issue boolean NOT NULL DEFAULT false,
 PRIMARY KEY(company_id,receipt_id,line_id),
 FOREIGN KEY(company_id,receipt_id,manifest_id) REFERENCES goods_transfer.receipt(company_id,id,manifest_id),
 FOREIGN KEY(company_id,manifest_id,line_id) REFERENCES goods_transfer.line(company_id,manifest_id,id),
 CHECK(sound+damaged+uncertain BETWEEN 1 AND 1000000)
);
ALTER TABLE shipments.parcel_custody ADD COLUMN transfer_id uuid;
ALTER TABLE shipments.parcel_custody ADD COLUMN exterior_condition text NOT NULL DEFAULT 'sound' CHECK(exterior_condition IN ('sound','damaged','uncertain'));
ALTER TABLE shipments.parcel_custody ADD FOREIGN KEY(company_id,transfer_id) REFERENCES goods_transfer.manifest(company_id,id);
ALTER TABLE shipments.parcel_custody ADD CHECK(transfer_id IS NULL OR holder='driver');
ALTER TABLE shipments.event DROP CONSTRAINT event_kind_check;
ALTER TABLE shipments.event ADD CHECK(kind IN ('received','reserved','corrected','prepared','cancelled','unpack_inspected','transfer_handover','transfer_received','transfer_source_return'));
CREATE INDEX goods_transfer_source_state ON goods_transfer.manifest(company_id,source_branch_id,state,created_at,id);
CREATE INDEX goods_transfer_destination_state ON goods_transfer.manifest(company_id,destination_branch_id,state,created_at,id);
CREATE INDEX goods_transfer_driver_date ON goods_transfer.manifest(company_id,driver_id,planned_at,id);
CREATE INDEX goods_transfer_line_brand ON goods_transfer.line(company_id,brand_id,kind);
CREATE INDEX goods_transfer_receipt_date ON goods_transfer.receipt(company_id,branch_id,actual_at,id);
CREATE TRIGGER goods_transfer_component_immutable BEFORE UPDATE OR DELETE ON goods_transfer.component FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER goods_transfer_action_immutable BEFORE UPDATE OR DELETE ON goods_transfer.action_fact FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER goods_transfer_receipt_immutable BEFORE UPDATE OR DELETE ON goods_transfer.receipt FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER goods_transfer_receipt_line_immutable BEFORE UPDATE OR DELETE ON goods_transfer.receipt_line FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
