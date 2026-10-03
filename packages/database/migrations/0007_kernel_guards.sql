-- Keep identity's P02 revision uniqueness without restricting unrelated generic jobs.
ALTER TABLE work_item DROP CONSTRAINT work_item_company_id_entity_id_entity_version_lane_key;
CREATE UNIQUE INDEX identity_work_revision ON work_item(company_id,entity_id,entity_version,lane) WHERE lane='identity';
ALTER TABLE kernel.journal_effect ADD CONSTRAINT correction_reason_required CHECK(kind<>'correction' OR (reason IS NOT NULL AND length(trim(reason))>0));
CREATE FUNCTION kernel.validate_hold() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lot kernel.credit_lot; used numeric; held numeric;
BEGIN
 SELECT * INTO lot FROM kernel.credit_lot WHERE company_id=NEW.company_id AND id=NEW.lot_id;
 PERFORM 1 FROM kernel.resource WHERE company_id=NEW.company_id AND id=lot.brand_id AND family='brand' FOR UPDATE;
 IF lot.readiness<>'eligible' AND NOT EXISTS(SELECT 1 FROM kernel.credit_release WHERE company_id=NEW.company_id AND lot_id=lot.id)
 THEN RAISE EXCEPTION 'PENDING_CREDIT_NOT_HOLDABLE'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM kernel.lot_allocation WHERE company_id=NEW.company_id AND lot_id=lot.id;
 SELECT COALESCE(sum(h.amount_minor),0) INTO held FROM kernel.wallet_hold h WHERE h.company_id=NEW.company_id AND h.lot_id=lot.id
  AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id);
 IF used+held+NEW.amount_minor>lot.amount_minor THEN RAISE EXCEPTION 'HOLD_REQUIRES_REVIEW'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER hold_bounds BEFORE INSERT ON kernel.wallet_hold FOR EACH ROW EXECUTE FUNCTION kernel.validate_hold();
CREATE OR REPLACE FUNCTION access.command_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.kind:=COALESCE(NEW.kind,NEW.family);
 IF NEW.family IN ('company.create','company.update','support.start','branch.create','branch.update','user.create','user.update','role.create','role.update') THEN
   NEW.response_status:=CASE WHEN NEW.state='pending' THEN 202 WHEN NEW.state='rejected' THEN 409 ELSE 200 END;
   IF NEW.result IS NOT NULL THEN NEW.result_reference:=NEW.result; END IF;
 END IF;
 RETURN NEW;
END $$;
