CREATE TABLE dispatch.predeparture_receipt (
 company_id uuid NOT NULL, cycle_id uuid NOT NULL, command_record_id uuid NOT NULL,
 shipment_id uuid NOT NULL, branch_id uuid NOT NULL, snapshot jsonb NOT NULL,
 actual_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,cycle_id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TRIGGER predeparture_receipt_immutable BEFORE UPDATE OR DELETE ON dispatch.predeparture_receipt FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
