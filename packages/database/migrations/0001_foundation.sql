-- Infrastructure only. Future feature phases own business schemas.
CREATE TABLE erp_infrastructure.schema_identity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  schema_version integer NOT NULL CHECK (schema_version = 1),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO erp_infrastructure.schema_identity (singleton, schema_version) VALUES (true, 1);
