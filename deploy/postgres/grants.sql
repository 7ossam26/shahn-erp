-- Run as the migration role after migrations. Runtime never receives DDL authority.
DO $$ DECLARE s record; BEGIN
  FOR s IN SELECT nspname FROM pg_namespace WHERE nspowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) AND nspname NOT LIKE 'pg_%' LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO shahn_runtime',s.nspname);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA %I TO shahn_runtime',s.nspname);
    EXECUTE format('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA %I TO shahn_runtime',s.nspname);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE ON erp_infrastructure.migrations, erp_infrastructure.schema_identity FROM shahn_runtime;
