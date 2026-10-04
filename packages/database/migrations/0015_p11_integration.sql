-- P11: additive scoped identities and durable transport, using P03 work_item/command_record.
CREATE SCHEMA integration;
INSERT INTO access.screen_capability(id,title,route,policy,implemented) VALUES('integration','الربط مع توصيل','/integration','company',true);
ALTER TABLE work_item ADD CONSTRAINT work_company_identity UNIQUE(company_id,id);
CREATE TABLE integration.source (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 tenant_id uuid NOT NULL, integration_id uuid NOT NULL, selector text NOT NULL CHECK(selector ~ '^[a-zA-Z0-9_-]{1,64}$'),
 external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 256), base_url text NOT NULL, issuer text NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0), enabled boolean NOT NULL DEFAULT true,
 configuration jsonb, configuration_checked_at timestamptz, last_error text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id), UNIQUE(tenant_id,integration_id), UNIQUE(selector)
);
CREATE TABLE integration.binding (
 company_id uuid NOT NULL, source_id uuid NOT NULL, id uuid NOT NULL,
 entity text NOT NULL CHECK(entity IN ('source','branch','role','user','driver')), native_id uuid NOT NULL,
 external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 256), resource_id uuid,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0), submitted_revision bigint NOT NULL DEFAULT 0 CHECK(submitted_revision BETWEEN 0 AND 9007199254740991),
 accepted_revision bigint NOT NULL DEFAULT 0 CHECK(accepted_revision BETWEEN 0 AND submitted_revision),
 issuer_status text NOT NULL DEFAULT 'unbound' CHECK(issuer_status IN ('unbound','not-required','pending','running','retry','ready')),
 enabled boolean, last_action_id uuid, evidence jsonb, checked_at timestamptz,
 branch_id uuid GENERATED ALWAYS AS (CASE WHEN entity='branch' THEN native_id END) STORED,
 role_id uuid GENERATED ALWAYS AS (CASE WHEN entity='role' THEN native_id END) STORED,
 user_id uuid GENERATED ALWAYS AS (CASE WHEN entity='user' THEN native_id END) STORED,
 driver_id uuid GENERATED ALWAYS AS (CASE WHEN entity='driver' THEN native_id END) STORED,
 company_binding uuid GENERATED ALWAYS AS (CASE WHEN entity='source' THEN native_id END) STORED,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,source_id,entity,native_id), UNIQUE(company_id,source_id,entity,external_id),
 UNIQUE(company_id,source_id,entity,resource_id),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,role_id) REFERENCES access.role(company_id,id),
 FOREIGN KEY(company_id,user_id) REFERENCES access.ordinary_user(company_id,id),
 FOREIGN KEY(company_id,driver_id) REFERENCES employees.operational_driver(company_id,id),
 CHECK(company_binding IS NULL OR company_binding=company_id)
);
CREATE TABLE integration.source_command (
 company_id uuid NOT NULL, source_id uuid NOT NULL, action_id uuid NOT NULL, command_record_id uuid NOT NULL,
 binding_id uuid, operation_id text NOT NULL, source_revision bigint, request_body text NOT NULL,
 request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'), work_id uuid NOT NULL UNIQUE,
 authority text NOT NULL CHECK(authority IN ('service','operator')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','rejected','review-required','unknown','retryable','configuration-blocked')),
 remote_result jsonb, last_error text, http_status integer CHECK(http_status BETWEEN 100 AND 599),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
 PRIMARY KEY(company_id,action_id), UNIQUE(source_id,action_id),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,binding_id) REFERENCES integration.binding(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,work_id) REFERENCES work_item(company_id,id),
 CHECK(encode(sha256(convert_to(request_body,'UTF8')),'hex')=request_hash),
 CHECK(request_body::jsonb ?& ARRAY['actionId','operationId','context','payload']),
 CHECK((request_body::jsonb->>'actionId')::uuid=action_id),
 CHECK(request_body::jsonb->>'operationId'=operation_id)
);
CREATE UNIQUE INDEX integration_one_unresolved_revision ON integration.source_command(company_id,binding_id)
 WHERE binding_id IS NOT NULL AND state NOT IN ('accepted','rejected','review-required');
CREATE TABLE integration.verification_key (
 company_id uuid NOT NULL, source_id uuid NOT NULL, key_id text NOT NULL CHECK(key_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
 active_from timestamptz NOT NULL, verify_until timestamptz,
 PRIMARY KEY(company_id,source_id,key_id), FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 CHECK(verify_until IS NULL OR verify_until>=active_from)
);
CREATE TABLE integration.inbox (
 company_id uuid NOT NULL, source_id uuid NOT NULL, event_id uuid NOT NULL, event_type text NOT NULL,
 aggregate_type text NOT NULL CHECK(aggregate_type IN ('task','assignment','trip','workday','return-request','integration')),
 aggregate_id uuid NOT NULL, recipient_sequence bigint NOT NULL CHECK(recipient_sequence BETWEEN 1 AND 9007199254740991),
 raw_body bytea NOT NULL CHECK(octet_length(raw_body)<=2097152), body_hash text NOT NULL,
 envelope jsonb NOT NULL, acknowledgement jsonb NOT NULL, key_id text NOT NULL, delivery_timestamp text NOT NULL CHECK(delivery_timestamp ~ '^[0-9]{13}$'),
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(), applied_at timestamptz,
 application_state text NOT NULL DEFAULT 'pending' CHECK(application_state IN ('pending','applied')),
 pending_reason text NOT NULL DEFAULT 'handler_pending',
 PRIMARY KEY(company_id,source_id,event_id), UNIQUE(source_id,event_id),
 UNIQUE(company_id,source_id,aggregate_type,aggregate_id,recipient_sequence),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 CHECK(encode(sha256(raw_body),'hex')=body_hash),
 CHECK(convert_from(raw_body,'UTF8')::jsonb=envelope),
 CHECK(envelope ?& ARRAY['eventId','eventType','aggregate','tenantId','recipientIntegrationId']),
 CHECK(envelope->>'eventId'=event_id::text AND envelope->>'eventType'=event_type),
 CHECK(envelope->'aggregate'->>'id'=aggregate_id::text AND envelope->'aggregate'->>'type'=aggregate_type AND (envelope->'aggregate'->>'recipientSequence')::bigint=recipient_sequence),
 CHECK(acknowledgement=jsonb_build_object('schemaVersion','1.0.0','tenantId',envelope->>'tenantId','recipientIntegrationId',envelope->>'recipientIntegrationId','eventId',event_id::text,'acknowledgement','received')),
 CHECK((application_state='applied')=(applied_at IS NOT NULL))
);
CREATE TABLE integration.checkpoint (
 company_id uuid NOT NULL, source_id uuid NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 received_through bigint NOT NULL DEFAULT 0, received_high bigint NOT NULL DEFAULT 0,
 applied_through bigint NOT NULL DEFAULT 0, projected_through bigint NOT NULL DEFAULT 0, snapshot_through bigint NOT NULL DEFAULT 0,
 history_complete boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,source_id,aggregate_type,aggregate_id), FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 CHECK(0<=applied_through AND applied_through<=received_through AND received_through<=received_high),
 CHECK(projected_through>=0 AND snapshot_through>=0)
);
CREATE FUNCTION integration.preserve_transport() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mutable text[];
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IMMUTABLE_INTEGRATION_IDENTITY'; END IF;
 mutable:=CASE TG_TABLE_NAME
 WHEN 'source_command' THEN ARRAY['state','remote_result','last_error','http_status','completed_at']
 WHEN 'inbox' THEN ARRAY['application_state','applied_at','pending_reason']
 WHEN 'binding' THEN ARRAY['version','submitted_revision','accepted_revision','resource_id','issuer_status','enabled','last_action_id','evidence','checked_at','branch_id','role_id','user_id','driver_id','company_binding']
 ELSE ARRAY['version','enabled','configuration','configuration_checked_at','last_error'] END;
 IF (to_jsonb(NEW)-mutable)<>(to_jsonb(OLD)-mutable) THEN RAISE EXCEPTION 'IMMUTABLE_INTEGRATION_IDENTITY'; END IF;
 IF TG_TABLE_NAME='source_command' THEN
   IF OLD.state IN ('accepted','rejected','review-required') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'RETAINED_REMOTE_RESULT'; END IF;
 END IF;
 IF TG_TABLE_NAME='binding' THEN
   IF NEW.accepted_revision<OLD.accepted_revision OR NEW.submitted_revision<OLD.submitted_revision OR
   (OLD.resource_id IS NOT NULL AND NEW.resource_id IS DISTINCT FROM OLD.resource_id) THEN RAISE EXCEPTION 'IMMUTABLE_BINDING'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_source BEFORE UPDATE OR DELETE ON integration.source FOR EACH ROW EXECUTE FUNCTION integration.preserve_transport();
CREATE TRIGGER preserve_binding BEFORE UPDATE OR DELETE ON integration.binding FOR EACH ROW EXECUTE FUNCTION integration.preserve_transport();
CREATE TRIGGER preserve_source_command BEFORE UPDATE OR DELETE ON integration.source_command FOR EACH ROW EXECUTE FUNCTION integration.preserve_transport();
CREATE TRIGGER preserve_inbox BEFORE UPDATE OR DELETE ON integration.inbox FOR EACH ROW EXECUTE FUNCTION integration.preserve_transport();
CREATE INDEX integration_inbox_pending ON integration.inbox(company_id,source_id,received_at,event_id) WHERE application_state='pending';
CREATE INDEX integration_command_list ON integration.source_command(company_id,created_at,action_id);
CREATE FUNCTION integration.validate_source_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner integration.source%ROWTYPE; scope jsonb;
BEGIN
 SELECT * INTO STRICT owner FROM integration.source WHERE company_id=NEW.company_id AND id=NEW.source_id;
 IF TG_TABLE_NAME='source_command' THEN
   scope:=NEW.request_body::jsonb->'context';
   IF scope->>'tenantId' IS DISTINCT FROM owner.tenant_id::text OR scope->>'integrationId' IS DISTINCT FROM owner.integration_id::text THEN RAISE EXCEPTION 'SOURCE_SCOPE_MISMATCH'; END IF;
 ELSE
   IF NEW.envelope->>'tenantId' IS DISTINCT FROM owner.tenant_id::text OR NEW.envelope->>'recipientIntegrationId' IS DISTINCT FROM owner.integration_id::text THEN RAISE EXCEPTION 'SOURCE_SCOPE_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_source_command_scope BEFORE INSERT ON integration.source_command FOR EACH ROW EXECUTE FUNCTION integration.validate_source_scope();
CREATE TRIGGER validate_inbox_scope BEFORE INSERT ON integration.inbox FOR EACH ROW EXECUTE FUNCTION integration.validate_source_scope();
