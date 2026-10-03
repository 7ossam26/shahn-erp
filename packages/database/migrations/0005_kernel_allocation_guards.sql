-- Defense in depth for source/batch linkage and immutable allocation totals.
ALTER TABLE kernel.posting_batch ADD UNIQUE(company_id,id,source_id);
ALTER TABLE kernel.journal_effect ADD FOREIGN KEY(company_id,batch_id,source_id)
 REFERENCES kernel.posting_batch(company_id,id,source_id);
CREATE FUNCTION kernel.validate_lot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE movement kernel.journal_effect;
BEGIN
 SELECT * INTO movement FROM kernel.journal_effect WHERE company_id=NEW.company_id AND id=NEW.id;
 IF movement.family<>'brand' OR movement.subject_id<>NEW.brand_id OR movement.amount_minor<>NEW.amount_minor
  OR movement.effective_date<>NEW.effective_date THEN RAISE EXCEPTION 'INVALID_LOT_SOURCE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER lot_source BEFORE INSERT ON kernel.credit_lot FOR EACH ROW EXECUTE FUNCTION kernel.validate_lot();
CREATE FUNCTION kernel.validate_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lot kernel.credit_lot; effect kernel.journal_effect; used numeric; held numeric;
BEGIN
 SELECT * INTO lot FROM kernel.credit_lot WHERE company_id=NEW.company_id AND id=NEW.lot_id;
 PERFORM 1 FROM kernel.resource WHERE company_id=NEW.company_id AND id=lot.brand_id AND family='brand' FOR UPDATE;
 SELECT * INTO effect FROM kernel.journal_effect WHERE company_id=NEW.company_id AND id=NEW.effect_id;
 IF lot.id IS NULL OR effect.id IS NULL OR effect.family<>'brand' OR effect.subject_id<>lot.brand_id OR effect.amount_minor>=0
  THEN RAISE EXCEPTION 'INVALID_ALLOCATION_SOURCE'; END IF;
 IF lot.readiness<>'eligible' AND NOT EXISTS(SELECT 1 FROM kernel.credit_release WHERE company_id=NEW.company_id AND lot_id=lot.id)
  THEN RAISE EXCEPTION 'PENDING_CREDIT_NOT_SPENDABLE'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM kernel.lot_allocation WHERE company_id=NEW.company_id AND lot_id=lot.id;
 SELECT COALESCE(sum(h.amount_minor),0) INTO held FROM kernel.wallet_hold h WHERE h.company_id=NEW.company_id AND h.lot_id=lot.id
  AND NOT EXISTS(SELECT 1 FROM kernel.hold_release r WHERE r.company_id=h.company_id AND r.hold_id=h.id);
 IF used+held+NEW.amount_minor>lot.amount_minor THEN RAISE EXCEPTION 'LOT_OVERALLOCATED'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO used FROM kernel.lot_allocation WHERE company_id=NEW.company_id AND effect_id=effect.id;
 IF used+NEW.amount_minor> -effect.amount_minor::numeric THEN RAISE EXCEPTION 'EFFECT_OVERALLOCATED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER allocation_bounds BEFORE INSERT ON kernel.lot_allocation FOR EACH ROW EXECUTE FUNCTION kernel.validate_allocation();
