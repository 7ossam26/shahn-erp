-- P22 uses the P03 work_item lease/fence and P11 source outbox.
ALTER TABLE integration.inbox ALTER COLUMN key_id DROP NOT NULL;
ALTER TABLE integration.inbox ALTER COLUMN delivery_timestamp DROP NOT NULL;
ALTER TABLE integration.inbox ADD COLUMN provenance text NOT NULL DEFAULT 'webhook' CHECK(provenance IN ('webhook','replay'));
CREATE TABLE integration.webhook_bytes (
 company_id uuid NOT NULL, source_id uuid NOT NULL, event_id uuid NOT NULL,
 raw_body bytea NOT NULL CHECK(octet_length(raw_body)<=2097152), body_hash text NOT NULL,
 key_id text NOT NULL, delivery_timestamp text NOT NULL CHECK(delivery_timestamp ~ '^[0-9]{13}$'),
 bound_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,source_id,event_id),
 FOREIGN KEY(company_id,source_id,event_id) REFERENCES integration.inbox(company_id,source_id,event_id),
 CHECK(encode(sha256(raw_body),'hex')=body_hash)
);
ALTER TABLE integration.checkpoint ADD COLUMN revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991);
ALTER TABLE integration.checkpoint ADD COLUMN rebuild_required boolean NOT NULL DEFAULT false;
-- Detect disagreement; never convert the highest observed sequence into a prefix.
UPDATE integration.checkpoint cp SET rebuild_required=true WHERE
 cp.snapshot_through>0 OR cp.projected_through<>cp.applied_through OR
 cp.received_high<>COALESCE((SELECT max(recipient_sequence) FROM integration.inbox i WHERE (i.company_id,i.source_id,i.aggregate_type,i.aggregate_id)=(cp.company_id,cp.source_id,cp.aggregate_type,cp.aggregate_id)),0) OR
 cp.received_through<>COALESCE((SELECT min(n)-1 FROM (SELECT recipient_sequence,row_number() OVER(ORDER BY recipient_sequence) n FROM integration.inbox i WHERE (i.company_id,i.source_id,i.aggregate_type,i.aggregate_id)=(cp.company_id,cp.source_id,cp.aggregate_type,cp.aggregate_id)) x WHERE recipient_sequence<>n),cp.received_high) OR
 cp.applied_through<>COALESCE((SELECT min(n)-1 FROM (SELECT recipient_sequence,row_number() OVER(ORDER BY recipient_sequence) n FROM integration.inbox i WHERE (i.company_id,i.source_id,i.aggregate_type,i.aggregate_id)=(cp.company_id,cp.source_id,cp.aggregate_type,cp.aggregate_id) AND application_state='applied') x WHERE recipient_sequence<>n),(SELECT max(recipient_sequence) FROM integration.inbox i WHERE (i.company_id,i.source_id,i.aggregate_type,i.aggregate_id)=(cp.company_id,cp.source_id,cp.aggregate_type,cp.aggregate_id) AND application_state='applied'),0);
UPDATE integration.checkpoint SET history_complete=false WHERE applied_through<greatest(received_high,projected_through,snapshot_through) OR rebuild_required;
CREATE FUNCTION integration.checkpoint_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.received_through,NEW.received_high,NEW.applied_through,NEW.projected_through,NEW.snapshot_through,NEW.rebuild_required) IS DISTINCT FROM
 (OLD.received_through,OLD.received_high,OLD.applied_through,OLD.projected_through,OLD.snapshot_through,OLD.rebuild_required) THEN NEW.revision:=OLD.revision+1; END IF;
 NEW.history_complete:=NOT NEW.rebuild_required AND NEW.applied_through>=greatest(NEW.received_high,NEW.projected_through,NEW.snapshot_through);
 IF NEW.projected_through<OLD.projected_through OR NEW.snapshot_through<OLD.snapshot_through THEN RAISE EXCEPTION 'RECOVERY_COVERAGE_REGRESSION'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER checkpoint_revision BEFORE UPDATE ON integration.checkpoint FOR EACH ROW EXECUTE FUNCTION integration.checkpoint_revision();
CREATE FUNCTION integration.inbox_checkpoint_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.application_state,NEW.pending_reason) IS DISTINCT FROM (OLD.application_state,OLD.pending_reason) THEN
 UPDATE integration.checkpoint SET revision=revision+1 WHERE (company_id,source_id,aggregate_type,aggregate_id)=(NEW.company_id,NEW.source_id,NEW.aggregate_type,NEW.aggregate_id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER inbox_checkpoint_revision AFTER UPDATE ON integration.inbox FOR EACH ROW EXECUTE FUNCTION integration.inbox_checkpoint_revision();
CREATE TABLE integration.recovery_job (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL,
 aggregate_type text NOT NULL CHECK(aggregate_type IN ('task','assignment','trip','workday','return-request','integration')), aggregate_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('replay','reconcile')), work_id uuid NOT NULL UNIQUE,
 requested_after bigint NOT NULL CHECK(requested_after BETWEEN 0 AND 9007199254740991),
 next_after bigint NOT NULL CHECK(next_after BETWEEN 0 AND 9007199254740991), page_count integer NOT NULL DEFAULT 0 CHECK(page_count BETWEEN 0 AND 100),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','complete','retryable','expired','configuration-blocked','review-required')),
 failure_class text CHECK(failure_class IN ('outage','authentication','configuration','semantic-conflict','history-expired','reconstruction-limit','invalid-response','basis-changed')),
 last_error text, http_status integer, last_attempt_at timestamptz, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,source_id,aggregate_type,aggregate_id) REFERENCES integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id),
 FOREIGN KEY(company_id,work_id) REFERENCES work_item(company_id,id)
);
CREATE UNIQUE INDEX recovery_one_active ON integration.recovery_job(company_id,source_id,aggregate_type,aggregate_id,kind) WHERE state IN ('pending','running','retryable');
CREATE TABLE integration.recovery_evidence (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL, job_id uuid NOT NULL,
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('replay','reconcile')),
 requested_after bigint NOT NULL, through_sequence bigint NOT NULL, next_after bigint,
 basis_revision bigint NOT NULL, raw_body bytea NOT NULL CHECK(octet_length(raw_body)<=16777216), body_hash text NOT NULL,
 body jsonb NOT NULL, baseline text NOT NULL, schema_hash text NOT NULL,
 retrieved_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,job_id) REFERENCES integration.recovery_job(company_id,id),
 FOREIGN KEY(company_id,source_id,aggregate_type,aggregate_id) REFERENCES integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id),
 CHECK(encode(sha256(raw_body),'hex')=body_hash), CHECK(convert_from(raw_body,'UTF8')::jsonb=body)
);
CREATE TABLE integration.current_projection (
 company_id uuid NOT NULL, source_id uuid NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 through_sequence bigint NOT NULL, state jsonb NOT NULL, evidence_id uuid NOT NULL,
 PRIMARY KEY(company_id,source_id,aggregate_type,aggregate_id),
 FOREIGN KEY(company_id,evidence_id) REFERENCES integration.recovery_evidence(company_id,id),
 FOREIGN KEY(company_id,source_id,aggregate_type,aggregate_id) REFERENCES integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id)
);
CREATE TABLE integration.checkpoint_report (
 company_id uuid NOT NULL, source_id uuid NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 revision bigint NOT NULL, action_id uuid NOT NULL, checkpoint jsonb NOT NULL,
 PRIMARY KEY(company_id,source_id,aggregate_type,aggregate_id,revision),
 FOREIGN KEY(company_id,action_id) REFERENCES integration.source_command(company_id,action_id),
 FOREIGN KEY(company_id,source_id,aggregate_type,aggregate_id) REFERENCES integration.checkpoint(company_id,source_id,aggregate_type,aggregate_id)
);
CREATE FUNCTION integration.recovery_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_RECOVERY_EVIDENCE'; END $$;
CREATE TRIGGER immutable_webhook_bytes BEFORE UPDATE OR DELETE ON integration.webhook_bytes FOR EACH ROW EXECUTE FUNCTION integration.recovery_immutable();
CREATE TRIGGER immutable_recovery_evidence BEFORE UPDATE OR DELETE ON integration.recovery_evidence FOR EACH ROW EXECUTE FUNCTION integration.recovery_immutable();
CREATE TRIGGER immutable_checkpoint_report BEFORE UPDATE OR DELETE ON integration.checkpoint_report FOR EACH ROW EXECUTE FUNCTION integration.recovery_immutable();
CREATE FUNCTION integration.preserve_recovery_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['next_after','page_count','state','failure_class','last_error','http_status','last_attempt_at','completed_at'])<>(to_jsonb(OLD)-ARRAY['next_after','page_count','state','failure_class','last_error','http_status','last_attempt_at','completed_at']) THEN RAISE EXCEPTION 'IMMUTABLE_RECOVERY_INTENT'; END IF;
 IF NEW.next_after<OLD.next_after OR NEW.page_count<OLD.page_count THEN RAISE EXCEPTION 'RECOVERY_CURSOR_REGRESSION'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_recovery_job BEFORE UPDATE OR DELETE ON integration.recovery_job FOR EACH ROW EXECUTE FUNCTION integration.preserve_recovery_job();
