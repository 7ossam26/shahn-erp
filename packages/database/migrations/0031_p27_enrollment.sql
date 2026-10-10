CREATE TABLE integration.enrollment_request (
 company_id uuid NOT NULL, id uuid NOT NULL, source_id uuid NOT NULL,
 command_record_id uuid NOT NULL, requests jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES integration.source(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE integration.enrollment_operator_result (
 company_id uuid NOT NULL, request_id uuid NOT NULL, action_id uuid NOT NULL,
 result jsonb NOT NULL, source_status jsonb NOT NULL,
 principal_id uuid NOT NULL REFERENCES access.principal(id),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,request_id),
 FOREIGN KEY(company_id,request_id) REFERENCES integration.enrollment_request(company_id,id)
);
CREATE TRIGGER enrollment_request_immutable BEFORE UPDATE OR DELETE ON integration.enrollment_request FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
CREATE TRIGGER enrollment_result_immutable BEFORE UPDATE OR DELETE ON integration.enrollment_operator_result FOR EACH ROW EXECUTE FUNCTION integration.preserve_connection_record();
