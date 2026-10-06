-- P17 extends the P03 shared wallet (credit lots, holds, cover, immutable allocations).
-- No second balance model and no backfill: no legacy amount becomes eligible or paid here.
UPDATE access.screen_capability SET implemented=true,title='تحصيل البراندات' WHERE id='brand.payout';
ALTER TABLE finance.money_movement DROP CONSTRAINT money_movement_source_kind_check;
ALTER TABLE finance.money_movement ADD CHECK(source_kind IN ('expense','general','treasury_send','treasury_receive','remittance','brand_payout'));
CREATE SEQUENCE finance.brand_payout_reference_seq;
CREATE TABLE finance.brand_payout (
 company_id uuid NOT NULL, id uuid NOT NULL,
 reference text NOT NULL DEFAULT nextval('finance.brand_payout_reference_seq')::text CHECK(reference ~ '^[1-9][0-9]*$'),
 brand_id uuid NOT NULL, brand_name text NOT NULL, policy_version integer NOT NULL CHECK(policy_version>0),
 scheduled_weekdays smallint[] NOT NULL CHECK(cardinality(scheduled_weekdays) BETWEEN 1 AND 7 AND scheduled_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]),
 source_id uuid NOT NULL, command_record_id uuid NOT NULL, effect_id uuid NOT NULL, movement_id uuid NOT NULL,
 paying_branch_id uuid NOT NULL, paying_branch_name text NOT NULL,
 account_id uuid NOT NULL, account_name text NOT NULL,
 method text NOT NULL CHECK(method IN ('cash','bank_deposit','instapay')),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL DEFAULT 'EGP' CHECK(currency='EGP'),
 actual_date date NOT NULL, weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 off_day boolean NOT NULL, off_day_reason text,
 external_reference text NOT NULL DEFAULT '' CHECK(length(external_reference)<=120),
 eligible_before_minor bigint NOT NULL CHECK(eligible_before_minor>=amount_minor),
 eligible_after_minor bigint NOT NULL CHECK(eligible_after_minor>=0),
 signed_after_minor bigint NOT NULL,
 readiness_revision text NOT NULL CHECK(readiness_revision ~ '^[a-f0-9]{64}$'),
 actor_id uuid NOT NULL REFERENCES access.principal(id), actor_name text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(command_record_id),
 UNIQUE(company_id,source_id), UNIQUE(company_id,effect_id), UNIQUE(company_id,movement_id),
 FOREIGN KEY(company_id,brand_id) REFERENCES commercial.brand(company_id,id),
 FOREIGN KEY(company_id,brand_id,policy_version) REFERENCES commercial.brand_policy(company_id,brand_id,version),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,effect_id) REFERENCES kernel.journal_effect(company_id,id),
 FOREIGN KEY(company_id,movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,paying_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,account_id) REFERENCES finance.account(company_id,id),
 CHECK(off_day=(off_day_reason IS NOT NULL)),
 CHECK(off_day_reason IS NULL OR (length(trim(off_day_reason)) BETWEEN 1 AND 500)),
 CHECK(off_day=NOT(weekday=ANY(scheduled_weekdays))),
 CHECK(eligible_after_minor=eligible_before_minor-amount_minor)
);
-- One row per consumed source lot; the kernel allocation remains the authoritative link.
CREATE TABLE finance.payout_allocation (
 company_id uuid NOT NULL, payout_id uuid NOT NULL, lot_id uuid NOT NULL, effect_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), lot_kind text NOT NULL CHECK(lot_kind IN ('goods','compensation','opening','correction')),
 source_branch_id uuid NOT NULL, lot_effective_date date NOT NULL,
 PRIMARY KEY(company_id,payout_id,lot_id),
 FOREIGN KEY(company_id,payout_id) REFERENCES finance.brand_payout(company_id,id),
 FOREIGN KEY(company_id,lot_id,effect_id) REFERENCES kernel.lot_allocation(company_id,lot_id,effect_id),
 FOREIGN KEY(company_id,source_branch_id) REFERENCES access.branch(company_id,id)
);
CREATE INDEX brand_payout_brand_date ON finance.brand_payout(company_id,brand_id,actual_date DESC,recorded_at DESC,id);
CREATE INDEX brand_payout_date ON finance.brand_payout(company_id,actual_date DESC,recorded_at DESC,id);
CREATE INDEX brand_payout_recorded ON finance.brand_payout(company_id,recorded_at DESC,id);
CREATE INDEX brand_payout_branch ON finance.brand_payout(company_id,paying_branch_id,actual_date DESC,id);
CREATE INDEX payout_allocation_lot ON finance.payout_allocation(company_id,lot_id);
CREATE INDEX payout_allocation_branch ON finance.payout_allocation(company_id,source_branch_id,payout_id);
CREATE INDEX lot_allocation_effect_lot ON kernel.lot_allocation(company_id,effect_id,lot_id);
CREATE INDEX wallet_hold_lot ON kernel.wallet_hold(company_id,lot_id);
CREATE INDEX shipping_cover_brand ON kernel.shipping_cover(company_id,brand_id);
CREATE TRIGGER immutable_brand_payout BEFORE UPDATE OR DELETE ON finance.brand_payout FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE TRIGGER immutable_payout_allocation BEFORE UPDATE OR DELETE ON finance.payout_allocation FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
-- Deferred: the payout, its actual account debit, its brand journal effect and its complete
-- immutable lot allocation must agree exactly when the posting transaction commits.
CREATE FUNCTION finance.check_brand_payout() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p finance.brand_payout; total numeric;
BEGIN
 SELECT * INTO p FROM finance.brand_payout WHERE company_id=NEW.company_id AND id=NEW.id;
 IF NOT EXISTS(SELECT 1 FROM finance.money_movement m WHERE m.company_id=p.company_id AND m.id=p.movement_id
  AND m.source_id=p.source_id AND m.source_kind='brand_payout' AND m.direction='withdrawal' AND m.amount_minor=p.amount_minor
  AND m.account_id=p.account_id AND m.method=p.method AND m.branch_id=p.paying_branch_id AND m.actual_date=p.actual_date)
 THEN RAISE EXCEPTION 'BRAND_PAYOUT_MOVEMENT_MISMATCH'; END IF;
 IF NOT EXISTS(SELECT 1 FROM kernel.journal_effect e WHERE e.company_id=p.company_id AND e.id=p.effect_id
  AND e.source_id=p.source_id AND e.family='brand' AND e.kind='payout' AND e.subject_id=p.brand_id
  AND e.amount_minor=-p.amount_minor AND e.branch_id=p.paying_branch_id AND e.effective_date=p.actual_date)
 THEN RAISE EXCEPTION 'BRAND_PAYOUT_EFFECT_MISMATCH'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO total FROM kernel.lot_allocation WHERE company_id=p.company_id AND effect_id=p.effect_id;
 IF total<>p.amount_minor THEN RAISE EXCEPTION 'BRAND_PAYOUT_ALLOCATION_INCOMPLETE'; END IF;
 SELECT COALESCE(sum(amount_minor),0) INTO total FROM finance.payout_allocation WHERE company_id=p.company_id AND payout_id=p.id;
 IF total<>p.amount_minor THEN RAISE EXCEPTION 'BRAND_PAYOUT_ALLOCATION_INCOMPLETE'; END IF;
 IF EXISTS(SELECT 1 FROM finance.payout_allocation x
  LEFT JOIN kernel.lot_allocation a ON(a.company_id,a.lot_id,a.effect_id)=(x.company_id,x.lot_id,x.effect_id)
  LEFT JOIN kernel.journal_effect l ON(l.company_id,l.id)=(x.company_id,x.lot_id)
  WHERE x.company_id=p.company_id AND x.payout_id=p.id
   AND (x.effect_id<>p.effect_id OR a.amount_minor IS DISTINCT FROM x.amount_minor OR l.kind IS DISTINCT FROM x.lot_kind
    OR l.branch_id IS DISTINCT FROM x.source_branch_id OR l.effective_date IS DISTINCT FROM x.lot_effective_date OR l.subject_id<>p.brand_id))
 THEN RAISE EXCEPTION 'BRAND_PAYOUT_ALLOCATION_MISMATCH'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER validate_brand_payout AFTER INSERT ON finance.brand_payout DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.check_brand_payout();
-- No dedicated payout cash movement or real-brand payout effect may exist without its payout record.
-- P03 isolated kernel fixtures (kernel.resource.fixture) remain the only exemption.
CREATE FUNCTION finance.require_brand_payout() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='money_movement' THEN
  IF NEW.source_kind='brand_payout' AND NOT EXISTS(SELECT 1 FROM finance.brand_payout p WHERE p.company_id=NEW.company_id AND p.movement_id=NEW.id)
  THEN RAISE EXCEPTION 'BRAND_PAYOUT_RECORD_REQUIRED'; END IF;
 ELSIF NEW.family='brand' AND NEW.kind='payout'
  AND NOT EXISTS(SELECT 1 FROM kernel.resource r WHERE r.company_id=NEW.company_id AND r.id=NEW.subject_id AND r.family='brand' AND r.fixture)
  AND NOT EXISTS(SELECT 1 FROM finance.brand_payout p WHERE p.company_id=NEW.company_id AND p.effect_id=NEW.id)
 THEN RAISE EXCEPTION 'BRAND_PAYOUT_RECORD_REQUIRED'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER brand_payout_movement_record AFTER INSERT ON finance.money_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.require_brand_payout();
CREATE CONSTRAINT TRIGGER brand_payout_effect_record AFTER INSERT ON kernel.journal_effect DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
 WHEN (NEW.family='brand' AND NEW.kind='payout') EXECUTE FUNCTION finance.require_brand_payout();
