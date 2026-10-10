CREATE TABLE dispatch.relocation (
 company_id uuid NOT NULL, cycle_id uuid NOT NULL, previous_cycle_id uuid NOT NULL,
 transfer_id uuid NOT NULL, destination_receipt_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN('predeparture','returned')),
 whole_parcel boolean NOT NULL DEFAULT true,
 PRIMARY KEY(company_id,cycle_id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,previous_cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,destination_receipt_id,transfer_id) REFERENCES goods_transfer.receipt(company_id,id,manifest_id)
);
CREATE TABLE dispatch.transferred_return_allocation (
 company_id uuid NOT NULL, cycle_id uuid NOT NULL, receipt_line_id uuid NOT NULL,
 destination_receipt_id uuid NOT NULL, transfer_line_id uuid NOT NULL, branch_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0), reservation_id uuid,
 PRIMARY KEY(company_id,cycle_id,receipt_line_id), UNIQUE(company_id,receipt_line_id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.relocation(company_id,cycle_id),
 FOREIGN KEY(company_id,receipt_line_id) REFERENCES returns.return_receipt_line(company_id,id),
 FOREIGN KEY(company_id,destination_receipt_id,transfer_line_id) REFERENCES goods_transfer.receipt_line(company_id,receipt_id,line_id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,reservation_id) REFERENCES inventory.stock_reservation(company_id,id)
);
CREATE TRIGGER relocation_immutable BEFORE UPDATE OR DELETE ON dispatch.relocation FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
CREATE TRIGGER transferred_return_allocation_immutable BEFORE UPDATE OR DELETE ON dispatch.transferred_return_allocation FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
