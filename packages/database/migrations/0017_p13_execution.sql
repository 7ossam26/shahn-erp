-- P13 facts never infer execution or money for existing shipments.
CREATE SCHEMA execution;
CREATE TABLE execution.source_evidence (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL, scope_key text NOT NULL,
 snapshot_revision bigint NOT NULL, resource_id uuid NOT NULL, digest text NOT NULL, payload jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,id),
 UNIQUE(company_id,source_id,resource_id,digest), FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id)
);
CREATE TRIGGER immutable_source_evidence BEFORE UPDATE OR DELETE ON execution.source_evidence FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
UPDATE access.screen_capability SET implemented=true WHERE id='tracking';
CREATE TABLE execution.timeline (
 company_id uuid NOT NULL, source_id uuid NOT NULL, event_id uuid NOT NULL,
 task_id uuid, round_id uuid, workday_id uuid, event_type text NOT NULL,
 action_id uuid, recorded_at timestamptz, observed_at timestamptz, observation jsonb,
 confirmed_at timestamptz NOT NULL, received_at timestamptz NOT NULL,
 projected_at timestamptz NOT NULL DEFAULT clock_timestamp(), projection_commit_observed_at timestamptz, first_read_at timestamptz,
 PRIMARY KEY(company_id,source_id,event_id),
 FOREIGN KEY(company_id,source_id,event_id) REFERENCES integration.inbox(company_id,source_id,event_id)
);
CREATE INDEX execution_timeline_task ON execution.timeline(company_id,source_id,task_id,confirmed_at,event_id);
CREATE FUNCTION execution.preserve_timeline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['first_read_at','projection_commit_observed_at'])<>(to_jsonb(OLD)-ARRAY['first_read_at','projection_commit_observed_at'])
 OR (OLD.first_read_at IS NOT NULL AND NEW.first_read_at IS DISTINCT FROM OLD.first_read_at)
 OR (OLD.projection_commit_observed_at IS NOT NULL AND NEW.projection_commit_observed_at IS DISTINCT FROM OLD.projection_commit_observed_at)
 THEN RAISE EXCEPTION 'IMMUTABLE_EXECUTION_TIMELINE'; END IF; RETURN NEW; END $$;
CREATE TRIGGER preserve_timeline BEFORE UPDATE OR DELETE ON execution.timeline FOR EACH ROW EXECUTE FUNCTION execution.preserve_timeline();
CREATE TABLE execution.state (
 company_id uuid NOT NULL, source_id uuid NOT NULL, kind text NOT NULL, identity uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision>=0), data jsonb NOT NULL, event_id uuid NOT NULL,
 PRIMARY KEY(company_id,source_id,kind,identity),
 FOREIGN KEY(company_id,source_id,event_id) REFERENCES integration.inbox(company_id,source_id,event_id)
);
CREATE TABLE execution.visit_fact (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL,
 task_id uuid NOT NULL, cycle_id uuid NOT NULL, dispatch_cycle_id uuid NOT NULL, attempt_id uuid NOT NULL,
 round_id uuid NOT NULL, workday_id uuid NOT NULL, driver_id uuid NOT NULL, source_driver_id uuid NOT NULL,
 branch_id uuid NOT NULL, shipment_id uuid NOT NULL, brand_id uuid NOT NULL,
 action_id uuid NOT NULL, arrival jsonb NOT NULL, work_at timestamptz NOT NULL, price jsonb NOT NULL,
 source_record_id uuid NOT NULL, event_id uuid, evidence_id uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,task_id,dispatch_cycle_id,attempt_id),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,shipment_id) REFERENCES shipments.shipment(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,source_record_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,evidence_id) REFERENCES execution.source_evidence(company_id,id), CHECK(event_id IS NOT NULL OR evidence_id IS NOT NULL),
 FOREIGN KEY(company_id,source_id,event_id) REFERENCES integration.inbox(company_id,source_id,event_id)
);
CREATE TABLE execution.outcome_fact (
 company_id uuid NOT NULL, source_id uuid NOT NULL, outcome_id uuid NOT NULL, revision bigint NOT NULL CHECK(revision>=0),
 task_id uuid NOT NULL, cycle_id uuid NOT NULL, attempt_id uuid NOT NULL, round_id uuid NOT NULL,
 previous_outcome_id uuid, previous_revision bigint, correction_id uuid,
 record jsonb NOT NULL, event_id uuid, evidence_id uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,source_id,outcome_id,revision),
 UNIQUE(company_id,source_id,task_id,attempt_id,revision),
 FOREIGN KEY(company_id,cycle_id) REFERENCES dispatch.cycle(company_id,id),
 FOREIGN KEY(company_id,evidence_id) REFERENCES execution.source_evidence(company_id,id), CHECK(event_id IS NOT NULL OR evidence_id IS NOT NULL),
 FOREIGN KEY(company_id,source_id,event_id) REFERENCES integration.inbox(company_id,source_id,event_id),
 FOREIGN KEY(company_id,source_id,previous_outcome_id,previous_revision) REFERENCES execution.outcome_fact(company_id,source_id,outcome_id,revision)
);
CREATE TABLE execution.reported_money_fact (
 company_id uuid NOT NULL, source_id uuid NOT NULL, outcome_id uuid NOT NULL, revision bigint NOT NULL,
 reported_minor bigint, goods_minor bigint NOT NULL, shipping_minor bigint NOT NULL, unpaid_shipping_minor bigint NOT NULL,
 shipping_status text NOT NULL, canonical_collection jsonb NOT NULL,
 PRIMARY KEY(company_id,source_id,outcome_id,revision),
 FOREIGN KEY(company_id,source_id,outcome_id,revision) REFERENCES execution.outcome_fact(company_id,source_id,outcome_id,revision),
 CHECK(reported_minor>=0 AND goods_minor>=0 AND shipping_minor>=0 AND unpaid_shipping_minor>=0)
);
CREATE TABLE execution.earning_basis (
 company_id uuid NOT NULL, visit_id uuid NOT NULL, resolution jsonb NOT NULL,
 amount_minor bigint, journal_effect_id uuid, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,visit_id), FOREIGN KEY(company_id,visit_id) REFERENCES execution.visit_fact(company_id,id),
 FOREIGN KEY(company_id,journal_effect_id) REFERENCES kernel.journal_effect(company_id,id), CHECK(amount_minor>=0)
);
CREATE TABLE execution.allocation (
 company_id uuid NOT NULL, visit_id uuid NOT NULL, outcome_id uuid NOT NULL, outcome_revision bigint NOT NULL,
 source_record_id uuid NOT NULL, goods_minor bigint NOT NULL, brand_fee_minor bigint NOT NULL,
 goods_effect_id uuid, fee_effect_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,visit_id,outcome_revision),
 FOREIGN KEY(company_id,visit_id) REFERENCES execution.visit_fact(company_id,id),
 FOREIGN KEY(company_id,source_record_id) REFERENCES kernel.source_record(company_id,id),
 CHECK(goods_minor>=0 AND brand_fee_minor>=0)
);
CREATE TABLE execution.settlement_review (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, correction_id uuid NOT NULL,
 visit_id uuid NOT NULL, basis jsonb NOT NULL, state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), resolved_at timestamptz,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,correction_id,visit_id),
 FOREIGN KEY(company_id,visit_id) REFERENCES execution.visit_fact(company_id,id),
 CHECK((state='resolved')=(resolved_at IS NOT NULL))
);
CREATE TABLE execution.protected_basis (
 company_id uuid NOT NULL, visit_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('remittance','payout','payroll')),
 reference_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,visit_id,kind), FOREIGN KEY(company_id,visit_id) REFERENCES execution.visit_fact(company_id,id)
);
CREATE TABLE execution.review_resolution (
 company_id uuid NOT NULL, review_id uuid NOT NULL, source_record_id uuid NOT NULL, details jsonb NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(company_id,review_id),
 FOREIGN KEY(company_id,review_id) REFERENCES execution.settlement_review(company_id,id),
 FOREIGN KEY(company_id,source_record_id) REFERENCES kernel.source_record(company_id,id)
);
CREATE TRIGGER immutable_resolution BEFORE UPDATE OR DELETE ON execution.review_resolution FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TABLE execution.monitoring_cache (
 company_id uuid NOT NULL, source_id uuid NOT NULL, path text NOT NULL, scope_key text NOT NULL,
 body jsonb NOT NULL, etag text, snapshot_revision text NOT NULL, refreshed_at timestamptz NOT NULL,
 last_status integer NOT NULL, PRIMARY KEY(company_id,source_id,path),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id)
);
CREATE TABLE execution.round_evidence_basis (
 company_id uuid NOT NULL, source_id uuid NOT NULL, round_id uuid NOT NULL, revision bigint NOT NULL,
 digest text NOT NULL, basis jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,source_id,round_id,revision),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id)
);
CREATE TRIGGER immutable_visit BEFORE UPDATE OR DELETE ON execution.visit_fact FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_outcome BEFORE UPDATE OR DELETE ON execution.outcome_fact FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_report BEFORE UPDATE OR DELETE ON execution.reported_money_fact FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_earning BEFORE UPDATE OR DELETE ON execution.earning_basis FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_allocation BEFORE UPDATE OR DELETE ON execution.allocation FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_protection BEFORE UPDATE OR DELETE ON execution.protected_basis FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE TRIGGER immutable_witness BEFORE UPDATE OR DELETE ON execution.round_evidence_basis FOR EACH ROW EXECUTE FUNCTION shipments.immutable();
CREATE OR REPLACE FUNCTION kernel.validate_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lot kernel.credit_lot; effect kernel.journal_effect; used numeric; held numeric;
BEGIN
 SELECT * INTO lot FROM kernel.credit_lot WHERE company_id=NEW.company_id AND id=NEW.lot_id;
 PERFORM 1 FROM kernel.resource WHERE company_id=NEW.company_id AND id=lot.brand_id AND family='brand' FOR UPDATE;
 SELECT * INTO effect FROM kernel.journal_effect WHERE company_id=NEW.company_id AND id=NEW.effect_id;
 IF lot.id IS NULL OR effect.id IS NULL OR effect.family<>'brand' OR effect.subject_id<>lot.brand_id OR effect.amount_minor>=0
  THEN RAISE EXCEPTION 'INVALID_ALLOCATION_SOURCE'; END IF;
 IF lot.readiness<>'eligible' AND NOT EXISTS(SELECT 1 FROM kernel.credit_release WHERE company_id=NEW.company_id AND lot_id=lot.id)
  AND NOT (effect.kind='correction' AND effect.supersedes_id=lot.id AND effect.amount_minor<0) THEN RAISE EXCEPTION 'PENDING_CREDIT_NOT_SPENDABLE'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM kernel.lot_allocation WHERE company_id=NEW.company_id AND lot_id=lot.id;
 SELECT COALESCE(sum(h.amount_minor),0) INTO held FROM kernel.wallet_hold h WHERE h.company_id=NEW.company_id AND h.lot_id=lot.id
  AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id);
 IF used+held+NEW.amount_minor>lot.amount_minor THEN RAISE EXCEPTION 'LOT_OVERALLOCATED'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM kernel.lot_allocation WHERE company_id=NEW.company_id AND effect_id=effect.id;
 IF used+NEW.amount_minor> -effect.amount_minor::numeric THEN RAISE EXCEPTION 'EFFECT_OVERALLOCATED'; END IF;
 RETURN NEW;
END $$;

-- Search indexes preserve original strings; normalized phone search is an additional read index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX p13_recipient_search ON shipments.revision USING gin ((fields->>'recipientName') gin_trgm_ops);
CREATE INDEX p13_brand_reference_search ON shipments.revision USING gin ((fields->>'brandReference') gin_trgm_ops);
CREATE INDEX p13_phone_search ON shipments.revision USING gin ((translate(fields->>'phoneDisplay','٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789')) gin_trgm_ops);
