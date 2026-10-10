-- Private package bytes never enter command_record, audit or browser recovery.
CREATE TABLE integration.protected_import (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 principal_id uuid NOT NULL REFERENCES access.principal(id), key_version text NOT NULL,
 ciphertext bytea NOT NULL, fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 metadata jsonb NOT NULL, credential_expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id)
);
CREATE TABLE integration.import_verification (
 company_id uuid NOT NULL, import_id uuid NOT NULL, configuration jsonb NOT NULL,
 source_status jsonb NOT NULL, verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,import_id), FOREIGN KEY(company_id,import_id) REFERENCES integration.protected_import(company_id,id)
);
CREATE TABLE integration.connection_revision (
 company_id uuid NOT NULL, source_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>0),
 import_id uuid NOT NULL, command_record_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,source_id,revision), UNIQUE(company_id,import_id),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,import_id) REFERENCES integration.import_verification(company_id,import_id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE FUNCTION integration.preserve_connection_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_PROTECTED_CONNECTION'; END $$;
CREATE TRIGGER protected_import_immutable BEFORE UPDATE OR DELETE ON integration.protected_import FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
CREATE TRIGGER import_verification_immutable BEFORE UPDATE OR DELETE ON integration.import_verification FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
CREATE TRIGGER connection_revision_immutable BEFORE UPDATE OR DELETE ON integration.connection_revision FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
