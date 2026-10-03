-- P04 is additive; P02 compatibility defaults apply only to P02 commands.
CREATE OR REPLACE FUNCTION access.command_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.kind:=COALESCE(NEW.kind,NEW.family);
 IF NEW.kind IN ('user.create','user.update','role.create','role.update','branch.create','branch.update','company.create','company.update','support.start') THEN
  NEW.response_status:=CASE WHEN NEW.state='pending' THEN 202 WHEN NEW.state='rejected' THEN 409 ELSE 200 END;
  IF NEW.result IS NOT NULL THEN NEW.result_reference:=NEW.result; END IF;
 END IF;
 RETURN NEW;
END $$;
INSERT INTO access.screen_capability VALUES
 ('brands','البراندات','/brands','company',true),
 ('reference-data','المناطق وشرائح الأسعار','/settings/reference-data','company',true);
-- Existing grants remain unchanged. Administrators can grant these screens through P02.
CREATE SCHEMA commercial;
CREATE TABLE commercial.reference (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('governorate','area','tier')), name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180),
 active boolean NOT NULL, version integer NOT NULL CHECK(version>0), parent_id uuid,
 parent_kind text GENERATED ALWAYS AS (CASE WHEN kind='area' THEN 'governorate' END) STORED,
 volume_range text CHECK(length(volume_range)<=180),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,id,kind), UNIQUE(company_id,id,parent_id),
 FOREIGN KEY(company_id,parent_id,parent_kind) REFERENCES commercial.reference(company_id,id,kind),
 CHECK((kind='area')=(parent_id IS NOT NULL)), CHECK(kind='tier' OR volume_range IS NULL)
);
CREATE INDEX reference_company_kind ON commercial.reference(company_id,kind,active);
CREATE TABLE commercial.reference_revision (
 company_id uuid NOT NULL, entity_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 fields jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,entity_id,version), FOREIGN KEY(company_id,entity_id) REFERENCES commercial.reference(company_id,id)
);
CREATE TABLE commercial.tariff (
 company_id uuid NOT NULL, id uuid NOT NULL, tier_id uuid NOT NULL,
 tier_kind text GENERATED ALWAYS AS ('tier') STORED,
 governorate_id uuid NOT NULL, governorate_kind text GENERATED ALWAYS AS ('governorate') STORED,
 area_id uuid, area_kind text GENERATED ALWAYS AS (CASE WHEN area_id IS NOT NULL THEN 'area' END) STORED,
 version integer NOT NULL CHECK(version>0), active boolean NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 PRIMARY KEY(company_id,id), UNIQUE NULLS NOT DISTINCT(company_id,tier_id,governorate_id,area_id),
 FOREIGN KEY(company_id,tier_id,tier_kind) REFERENCES commercial.reference(company_id,id,kind),
 FOREIGN KEY(company_id,governorate_id,governorate_kind) REFERENCES commercial.reference(company_id,id,kind),
 FOREIGN KEY(company_id,area_id,area_kind) REFERENCES commercial.reference(company_id,id,kind),
 FOREIGN KEY(company_id,area_id,governorate_id) REFERENCES commercial.reference(company_id,id,parent_id)
);
CREATE TABLE commercial.tariff_revision (
 company_id uuid NOT NULL, entity_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0), active boolean NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,entity_id,version), FOREIGN KEY(company_id,entity_id) REFERENCES commercial.tariff(company_id,id)
);
CREATE TABLE commercial.brand (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 wallet_family text NOT NULL DEFAULT 'brand' CHECK(wallet_family='brand'),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 180), active boolean NOT NULL,
 version integer NOT NULL CHECK(version>0),
 PRIMARY KEY(company_id,id),
 FOREIGN KEY(company_id,id,wallet_family) REFERENCES kernel.resource(company_id,id,family) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX brand_search ON commercial.brand(company_id,lower(name) text_pattern_ops,id);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX brand_name_contains ON commercial.brand USING gin(translate(lower(name),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789') gin_trgm_ops);
CREATE INDEX brand_active ON commercial.brand(company_id,active,id);
CREATE TABLE commercial.brand_policy (
 company_id uuid NOT NULL, brand_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
 tier_id uuid NOT NULL, tier_kind text GENERATED ALWAYS AS ('tier') STORED,
 services text[] NOT NULL, default_service text NOT NULL, packing_uplift_minor bigint NOT NULL CHECK(packing_uplift_minor>=0),
 storage_fee_minor bigint CHECK(storage_fee_minor>=0), storage_branch_id uuid, storage_start date, anniversary_day integer,
 fields jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,brand_id,version),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,tier_id,tier_kind) REFERENCES commercial.reference(company_id,id,kind),
 FOREIGN KEY(company_id,storage_branch_id) REFERENCES access.branch(company_id,id),
 CHECK(cardinality(services) BETWEEN 1 AND 3 AND services <@ ARRAY['brand_packed','company_packed','stored_stock'] AND default_service=ANY(services)),
 CHECK(NOT ('stored_stock'=ANY(services)) OR (storage_fee_minor IS NOT NULL AND storage_branch_id IS NOT NULL AND storage_start IS NOT NULL AND anniversary_day=EXTRACT(day FROM storage_start))),
 CHECK(anniversary_day IS NULL OR anniversary_day BETWEEN 1 AND 31)
);
ALTER TABLE commercial.brand ADD FOREIGN KEY(company_id,id,version) REFERENCES commercial.brand_policy(company_id,brand_id,version) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE commercial.reference ADD FOREIGN KEY(company_id,id,version) REFERENCES commercial.reference_revision(company_id,entity_id,version) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE commercial.tariff ADD FOREIGN KEY(company_id,id,version) REFERENCES commercial.tariff_revision(company_id,entity_id,version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE commercial.price_snapshot (
 company_id uuid NOT NULL, id uuid NOT NULL, brand_id uuid NOT NULL, policy_version integer NOT NULL,
 tariff_id uuid NOT NULL, tariff_version integer NOT NULL, branch_id uuid NOT NULL,
 body jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), FOREIGN KEY(company_id,brand_id,policy_version) REFERENCES commercial.brand_policy(company_id,brand_id,version),
 FOREIGN KEY(company_id,tariff_id,tariff_version) REFERENCES commercial.tariff_revision(company_id,entity_id,version),
 FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE commercial.command_outcome (
 company_id uuid NOT NULL, id uuid NOT NULL, command_record_id uuid NOT NULL REFERENCES command_record(id), body jsonb NOT NULL,
 PRIMARY KEY(company_id,id), UNIQUE(command_record_id)
);
CREATE FUNCTION commercial.immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_COMMERCIAL_HISTORY'; END $$;
CREATE TRIGGER immutable_reference_history BEFORE UPDATE OR DELETE ON commercial.reference_revision FOR EACH ROW EXECUTE FUNCTION commercial.immutable_history();
CREATE TRIGGER immutable_tariff_history BEFORE UPDATE OR DELETE ON commercial.tariff_revision FOR EACH ROW EXECUTE FUNCTION commercial.immutable_history();
CREATE TRIGGER immutable_policy_history BEFORE UPDATE OR DELETE ON commercial.brand_policy FOR EACH ROW EXECUTE FUNCTION commercial.immutable_history();
CREATE TRIGGER immutable_snapshot BEFORE UPDATE OR DELETE ON commercial.price_snapshot FOR EACH ROW EXECUTE FUNCTION commercial.immutable_history();
CREATE TRIGGER immutable_outcome BEFORE UPDATE OR DELETE ON commercial.command_outcome FOR EACH ROW EXECUTE FUNCTION commercial.immutable_history();
CREATE FUNCTION commercial.preserve_master() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DEACTIVATE_MASTER'; END IF;
 IF NEW.company_id<>OLD.company_id OR NEW.id<>OLD.id OR NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'INVALID_MASTER_REVISION'; END IF;
 IF TG_TABLE_NAME='reference' AND (to_jsonb(NEW)->'kind'<>to_jsonb(OLD)->'kind' OR to_jsonb(NEW)->'parent_id' IS DISTINCT FROM to_jsonb(OLD)->'parent_id') THEN RAISE EXCEPTION 'IMMUTABLE_REFERENCE_IDENTITY'; END IF;
 IF TG_TABLE_NAME='tariff' AND (to_jsonb(NEW)-ARRAY['version','active','amount_minor','tier_kind','governorate_kind','area_kind'])<>(to_jsonb(OLD)-ARRAY['version','active','amount_minor','tier_kind','governorate_kind','area_kind']) THEN RAISE EXCEPTION 'IMMUTABLE_TARIFF_KEY'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_reference BEFORE UPDATE OR DELETE ON commercial.reference FOR EACH ROW EXECUTE FUNCTION commercial.preserve_master();
CREATE TRIGGER preserve_tariff BEFORE UPDATE OR DELETE ON commercial.tariff FOR EACH ROW EXECUTE FUNCTION commercial.preserve_master();
CREATE TRIGGER preserve_brand BEFORE UPDATE OR DELETE ON commercial.brand FOR EACH ROW EXECUTE FUNCTION commercial.preserve_master();
