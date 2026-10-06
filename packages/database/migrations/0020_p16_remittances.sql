-- No legacy balance becomes a receipt or eligible credit.
INSERT INTO access.screen_capability(id,title,route,policy,implemented)
VALUES('remittances','استلام أموال المندوبين','/remittances','assigned',true);
ALTER TABLE finance.money_movement DROP CONSTRAINT money_movement_source_kind_check;
ALTER TABLE finance.money_movement ADD CHECK(source_kind IN ('expense','general','treasury_send','treasury_receive','remittance'));
CREATE SEQUENCE finance.remittance_reference_seq;
CREATE TABLE finance.remittance_witness (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, round_id uuid NOT NULL,
 driver_id uuid NOT NULL, branch_id uuid NOT NULL, revision bigint NOT NULL CHECK(revision>0),
 basis_revision bigint NOT NULL, basis_digest text NOT NULL, digest text NOT NULL,
 expected_minor bigint NOT NULL CHECK(expected_minor>=0), basis jsonb NOT NULL, sources jsonb NOT NULL,
 blockers jsonb NOT NULL, actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,round_id,branch_id,revision),
 FOREIGN KEY(company_id,source_id,round_id,basis_revision) REFERENCES execution.round_evidence_basis(company_id,source_id,round_id,revision),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE finance.remittance_refresh (
 company_id uuid NOT NULL, id uuid NOT NULL, witness_id uuid NOT NULL, actor_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,witness_id) REFERENCES finance.remittance_witness(company_id,id)
);
CREATE TABLE finance.remittance (
 company_id uuid NOT NULL, id uuid NOT NULL, reference text NOT NULL DEFAULT nextval('finance.remittance_reference_seq')::text CHECK(reference~'^[0-9]+$'),
 source_id uuid NOT NULL, round_id uuid NOT NULL, driver_id uuid NOT NULL, branch_id uuid NOT NULL,
 witness_id uuid NOT NULL, refresh_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 kind text NOT NULL CHECK(kind IN ('received','checked')), actual_date date NOT NULL,
 command_record_id uuid NOT NULL REFERENCES command_record(id), actor_id uuid NOT NULL, actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,id), UNIQUE(company_id,reference),
 UNIQUE(company_id,source_id,round_id), UNIQUE(command_record_id),
 FOREIGN KEY(company_id,witness_id) REFERENCES finance.remittance_witness(company_id,id),
 FOREIGN KEY(company_id,refresh_id) REFERENCES finance.remittance_refresh(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 CHECK((amount_minor=0)=(kind='checked'))
);
CREATE TABLE finance.remittance_source (
 company_id uuid NOT NULL, remittance_id uuid NOT NULL, source_id uuid NOT NULL,
 task_id uuid NOT NULL, cycle_id uuid NOT NULL, attempt_id uuid NOT NULL,
 outcome_id uuid NOT NULL, outcome_revision bigint NOT NULL, visit_id uuid,
 reported_minor bigint, goods_minor bigint NOT NULL, shipping_minor bigint NOT NULL, credit_lot_id uuid,
 PRIMARY KEY(company_id,source_id,task_id,cycle_id,attempt_id),
 FOREIGN KEY(company_id,remittance_id) REFERENCES finance.remittance(company_id,id),
 FOREIGN KEY(company_id,source_id,outcome_id,outcome_revision) REFERENCES execution.outcome_fact(company_id,source_id,outcome_id,revision),
 FOREIGN KEY(company_id,visit_id) REFERENCES execution.visit_fact(company_id,id),
 FOREIGN KEY(company_id,credit_lot_id) REFERENCES kernel.credit_lot(company_id,id),
 CHECK(reported_minor>=0 AND goods_minor>=0 AND shipping_minor>=0)
);
CREATE TABLE finance.remittance_component (
 company_id uuid NOT NULL, remittance_id uuid NOT NULL, ordinal integer NOT NULL CHECK(ordinal>=0),
 movement_id uuid NOT NULL, method text NOT NULL CHECK(method IN ('cash','bank_deposit','instapay')),
 account_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0), reference text NOT NULL,
 PRIMARY KEY(company_id,remittance_id,ordinal), UNIQUE(company_id,movement_id),
 FOREIGN KEY(company_id,remittance_id) REFERENCES finance.remittance(company_id,id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id)
);
CREATE INDEX remittance_driver_date ON finance.remittance(company_id,driver_id,actual_date,id);
CREATE INDEX remittance_branch_date ON finance.remittance(company_id,branch_id,recorded_at,id);
CREATE TRIGGER immutable_remittance BEFORE UPDATE OR DELETE ON finance.remittance FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_remittance_source BEFORE UPDATE OR DELETE ON finance.remittance_source FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_remittance_component BEFORE UPDATE OR DELETE ON finance.remittance_component FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_remittance_witness BEFORE UPDATE OR DELETE ON finance.remittance_witness FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_remittance_refresh BEFORE UPDATE OR DELETE ON finance.remittance_refresh FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE FUNCTION finance.check_remittance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r finance.remittance; total numeric;
BEGIN
 SELECT * INTO r FROM finance.remittance WHERE company_id=NEW.company_id AND id=NEW.id;
 SELECT COALESCE(sum(amount_minor),0) INTO total FROM finance.remittance_component WHERE company_id=r.company_id AND remittance_id=r.id;
 IF total<>r.amount_minor THEN RAISE EXCEPTION 'INCOMPLETE_REMITTANCE'; END IF;
 SELECT COALESCE(sum(reported_minor),0) INTO total FROM finance.remittance_source WHERE company_id=r.company_id AND remittance_id=r.id;
 IF total<>r.amount_minor THEN RAISE EXCEPTION 'REMITTANCE_COVERAGE_MISMATCH'; END IF;
 IF NOT EXISTS(SELECT 1 FROM finance.remittance_witness w JOIN finance.remittance_refresh f ON(f.company_id,f.witness_id)=(w.company_id,w.id)
 WHERE w.company_id=r.company_id AND w.id=r.witness_id AND f.id=r.refresh_id AND f.actor_id=r.actor_id
 AND (w.source_id,w.round_id,w.driver_id,w.branch_id,w.expected_minor)=(r.source_id,r.round_id,r.driver_id,r.branch_id,r.amount_minor) AND w.blockers='[]'::jsonb)
 THEN RAISE EXCEPTION 'REMITTANCE_WITNESS_MISMATCH'; END IF;
 IF EXISTS(SELECT 1 FROM finance.remittance_component c JOIN finance.money_movement m ON(m.company_id,m.id)=(c.company_id,c.movement_id)
 WHERE c.company_id=r.company_id AND c.remittance_id=r.id AND (m.source_kind<>'remittance' OR m.direction<>'deposit' OR m.amount_minor<>c.amount_minor OR m.account_id<>c.account_id OR m.method<>c.method OR m.branch_id<>r.branch_id OR m.actual_date<>r.actual_date))
 THEN RAISE EXCEPTION 'REMITTANCE_MOVEMENT_MISMATCH'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER validate_remittance AFTER INSERT ON finance.remittance DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.check_remittance();
