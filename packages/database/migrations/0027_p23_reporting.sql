CREATE SCHEMA reporting;
UPDATE access.screen_capability SET implemented=true,route='/reports' WHERE id='reports';
CREATE TABLE reporting.snapshot (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 principal_id uuid NOT NULL REFERENCES access.principal(id), command_id uuid NOT NULL,
 payload_digest text NOT NULL CHECK(payload_digest ~ '^[a-f0-9]{64}$'),
 metadata jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,principal_id,command_id)
);
CREATE TABLE reporting.snapshot_row (
 company_id uuid NOT NULL, snapshot_id uuid NOT NULL, ordinal integer NOT NULL CHECK(ordinal>0), row_data jsonb NOT NULL,
 PRIMARY KEY(company_id,snapshot_id,ordinal), FOREIGN KEY(company_id,snapshot_id) REFERENCES reporting.snapshot(company_id,id)
);
CREATE TABLE reporting.export_job (
 company_id uuid NOT NULL, id uuid NOT NULL, snapshot_id uuid NOT NULL, command_record_id uuid NOT NULL,
 format text NOT NULL CHECK(format IN ('xlsx','pdf')), work_id uuid NOT NULL UNIQUE REFERENCES work_item(id),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '24 hours',
 PRIMARY KEY(company_id,id), UNIQUE(company_id,command_record_id),
 FOREIGN KEY(company_id,snapshot_id) REFERENCES reporting.snapshot(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
-- Nonpublic PostgreSQL artifact storage. Publication is atomic under the P03 worker fence.
-- Expiry purges only bytes, never business history or snapshot/result identity.
CREATE TABLE reporting.artifact (
 company_id uuid NOT NULL, job_id uuid NOT NULL, id uuid NOT NULL, snapshot_digest text NOT NULL,
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), media_type text NOT NULL,
 byte_count integer NOT NULL CHECK(byte_count>0), bytes bytea, published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,job_id), UNIQUE(company_id,id), FOREIGN KEY(company_id,job_id) REFERENCES reporting.export_job(company_id,id),
 CHECK(bytes IS NULL OR octet_length(bytes)=byte_count)
);
CREATE TRIGGER reporting_snapshot_immutable BEFORE UPDATE OR DELETE ON reporting.snapshot FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER reporting_rows_immutable BEFORE UPDATE OR DELETE ON reporting.snapshot_row FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER reporting_job_immutable BEFORE UPDATE OR DELETE ON reporting.export_job FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE FUNCTION reporting.preserve_artifact() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'bytes')<>(to_jsonb(OLD)-'bytes') OR NEW.bytes IS NOT NULL OR OLD.bytes IS NULL
 OR NOT EXISTS(SELECT 1 FROM reporting.export_job j WHERE j.company_id=OLD.company_id AND j.id=OLD.job_id AND j.expires_at<=clock_timestamp())
 THEN RAISE EXCEPTION 'IMMUTABLE_REPORT_ARTIFACT'; END IF; RETURN NEW; END $$;
CREATE TRIGGER reporting_artifact_immutable BEFORE UPDATE OR DELETE ON reporting.artifact FOR EACH ROW EXECUTE FUNCTION reporting.preserve_artifact();
CREATE INDEX reporting_job_expiry ON reporting.export_job(expires_at,company_id,id);
CREATE INDEX p23_visit_scope_date ON execution.visit_fact(company_id,branch_id,work_at,id);
CREATE INDEX p23_journal_scope_date ON kernel.journal_effect(company_id,family,branch_id,effective_date,id);
CREATE INDEX p23_return_receipt_date ON returns.return_receipt(company_id,branch_id,observed_at,id);
