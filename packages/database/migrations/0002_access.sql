CREATE SCHEMA access;

CREATE TABLE access.company (
  id uuid PRIMARY KEY, code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 180), active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), authorization_revision bigint NOT NULL DEFAULT 1
);
CREATE TABLE access.branch (
  id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES access.company(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 180), active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1, UNIQUE(company_id,id), UNIQUE(company_id,name)
);
CREATE TABLE access.principal (
  id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('staff','support')),
  active boolean NOT NULL DEFAULT true, UNIQUE(id,kind)
);
CREATE TABLE access.role (
  id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES access.company(id), name text NOT NULL,
  active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
  UNIQUE(company_id,id), UNIQUE(company_id,name)
);
CREATE TABLE access.screen_capability (
  id text PRIMARY KEY, title text NOT NULL, route text NOT NULL,
  policy text NOT NULL CHECK (policy IN ('company','assigned','tracking','treasury','wallet')),
  implemented boolean NOT NULL DEFAULT false
);
INSERT INTO access.screen_capability VALUES
 ('access.users','إدارة المستخدمين','/administration/users','company',true),
 ('access.roles','الأدوار والصلاحيات','/administration/roles','company',true),
 ('intake','تسجيل الشحنات','/shipments/new','assigned',false),
 ('inventory','المخزون','/inventory','assigned',false),
 ('expenses','المصروفات','/expenses','assigned',false),
 ('goods.send','إرسال البضائع','/goods-transfers','assigned',false),
 ('goods.receive','استلام البضائع','/goods-receipts','assigned',false),
 ('treasury.send','إرسال الأموال','/treasury/transfers','treasury',false),
 ('treasury.receive','استلام الأموال','/treasury/receipts','treasury',false),
 ('tracking','تتبع الشحنات','/tracking','tracking',false),
 ('brand.payout','صرف مستحقات البراند','/brand-payouts','wallet',false),
 ('employees','الموظفون','/employees','assigned',false),
 ('payroll','الرواتب','/employees/payroll','assigned',false),
 ('reports','التقارير والتصدير','/reports','assigned',false);
CREATE TABLE access.role_grant (
  company_id uuid NOT NULL, role_id uuid NOT NULL, capability text NOT NULL REFERENCES access.screen_capability(id),
  PRIMARY KEY(company_id,role_id,capability), FOREIGN KEY(company_id,role_id) REFERENCES access.role(company_id,id)
);
CREATE TABLE access.ordinary_user (
  id uuid PRIMARY KEY, kind text NOT NULL DEFAULT 'staff' CHECK (kind='staff'),
  company_id uuid NOT NULL REFERENCES access.company(id), role_id uuid NOT NULL,
  username text NOT NULL CHECK (username ~ '^[a-z0-9][a-z0-9._-]{1,79}$'), name text NOT NULL,
  active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1,
  identity_state text NOT NULL DEFAULT 'pending' CHECK (identity_state IN ('pending','failed','ready')),
  identity_error text, correlation_id uuid NOT NULL UNIQUE,
  FOREIGN KEY(id,kind) REFERENCES access.principal(id,kind),
  FOREIGN KEY(company_id,role_id) REFERENCES access.role(company_id,id),
  UNIQUE(company_id,id), UNIQUE(company_id,username)
);
CREATE TABLE access.user_branch (
  company_id uuid NOT NULL, user_id uuid NOT NULL, branch_id uuid NOT NULL,
  PRIMARY KEY(company_id,user_id,branch_id),
  FOREIGN KEY(company_id,user_id) REFERENCES access.ordinary_user(company_id,id),
  FOREIGN KEY(company_id,branch_id) REFERENCES access.branch(company_id,id)
);
CREATE TABLE access.user_exception (
  company_id uuid NOT NULL, user_id uuid NOT NULL, capability text NOT NULL REFERENCES access.screen_capability(id),
  effect text NOT NULL CHECK (effect IN ('inherit','allow','deny')),
  PRIMARY KEY(company_id,user_id,capability), FOREIGN KEY(company_id,user_id) REFERENCES access.ordinary_user(company_id,id)
);
CREATE TABLE access.issuer_binding (
  principal_id uuid PRIMARY KEY REFERENCES access.principal(id), issuer text NOT NULL, subject text NOT NULL CHECK (length(subject)>0),
  UNIQUE(issuer,subject)
);
CREATE TABLE access.server_session (
  id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, principal_id uuid NOT NULL REFERENCES access.principal(id),
  company_id uuid REFERENCES access.company(id), issuer text NOT NULL, subject text NOT NULL,
  csrf_token text NOT NULL, tokens_ciphertext text NOT NULL, mfa boolean NOT NULL,
  authenticated_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  idle_expires_at timestamptz NOT NULL, absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz, UNIQUE(id,principal_id),
  FOREIGN KEY(issuer,subject) REFERENCES access.issuer_binding(issuer,subject)
);
CREATE TABLE access.support_session (
  id uuid PRIMARY KEY, session_id uuid NOT NULL, principal_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'support' CHECK(kind='support'), company_id uuid NOT NULL REFERENCES access.company(id),
  reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 1000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL, ended_at timestamptz,
  CHECK(expires_at <= created_at + interval '1 hour'), UNIQUE(company_id,id),
  FOREIGN KEY(principal_id,kind) REFERENCES access.principal(id,kind),
  FOREIGN KEY(session_id,principal_id) REFERENCES access.server_session(id,principal_id)
);
CREATE TABLE access.login_attempt (
  state_hash text PRIMARY KEY, browser_hash text NOT NULL, verifier_ciphertext text NOT NULL, nonce text NOT NULL,
  company_code text NOT NULL, support boolean NOT NULL, return_path text NOT NULL,
  expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE TABLE access.bootstrap_completion (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), principal_id uuid NOT NULL REFERENCES access.principal(id),
  completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Shared native records. P03 extends these tables, not a second ledger.
CREATE TABLE command_record (
  id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES access.company(id), principal_id uuid NOT NULL REFERENCES access.principal(id),
  command_id uuid NOT NULL, family text NOT NULL, capability text NOT NULL,
  payload_digest text NOT NULL, payload jsonb NOT NULL, result jsonb NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','completed','rejected')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(company_id,principal_id,family,command_id), UNIQUE(company_id,id)
);
CREATE TABLE audit_entry (
  id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES access.company(id), principal_id uuid NOT NULL REFERENCES access.principal(id),
  session_id uuid, support_session_id uuid, actor_label text NOT NULL, action text NOT NULL,
  command_record_id uuid, entity_id uuid NOT NULL, before_version integer, after_version integer,
  detail jsonb NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(session_id,principal_id) REFERENCES access.server_session(id,principal_id),
  FOREIGN KEY(company_id,support_session_id) REFERENCES access.support_session(company_id,id),
  FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE TABLE work_item (
  id uuid PRIMARY KEY, company_id uuid NOT NULL, principal_id uuid NOT NULL REFERENCES access.principal(id),
  command_record_id uuid NOT NULL, entity_id uuid NOT NULL, entity_version integer NOT NULL,
  lane text NOT NULL CHECK(lane='identity'), correlation_id uuid NOT NULL, payload jsonb NOT NULL, payload_digest text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','leased','ready','failed')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_owner uuid, lease_until timestamptz, fence integer NOT NULL DEFAULT 0, last_error text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
  UNIQUE(company_id,entity_id,entity_version,lane),
  FOREIGN KEY(company_id,entity_id) REFERENCES access.ordinary_user(company_id,id),
  FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id)
);
CREATE INDEX work_item_claim ON work_item(available_at,created_at) WHERE state IN ('pending','leased');
CREATE FUNCTION access.preserve_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_AUDIT'; END $$;
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_entry FOR EACH ROW EXECUTE FUNCTION access.preserve_audit();
CREATE FUNCTION access.preserve_intent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 IF (TG_TABLE_NAME='command_record' AND (to_jsonb(NEW)-'state'-'result')<>(to_jsonb(OLD)-'state'-'result')) OR
    (TG_TABLE_NAME='work_item' AND (to_jsonb(NEW)-ARRAY['state','attempts','available_at','lease_owner','lease_until','fence','last_error','completed_at'])<>(to_jsonb(OLD)-ARRAY['state','attempts','available_at','lease_owner','lease_until','fence','last_error','completed_at'])) THEN
   RAISE EXCEPTION 'IMMUTABLE_INTENT';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_command BEFORE UPDATE OR DELETE ON command_record FOR EACH ROW EXECUTE FUNCTION access.preserve_intent();
CREATE TRIGGER immutable_work BEFORE UPDATE OR DELETE ON work_item FOR EACH ROW EXECUTE FUNCTION access.preserve_intent();
CREATE TRIGGER immutable_bootstrap BEFORE UPDATE OR DELETE ON access.bootstrap_completion FOR EACH ROW EXECUTE FUNCTION access.preserve_audit();
