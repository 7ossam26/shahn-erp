-- Transit has its own source-linked append-only journal; it is never an available account.
UPDATE access.screen_capability SET implemented=true WHERE id IN ('treasury.send','treasury.receive');
ALTER TABLE finance.money_movement DROP CONSTRAINT money_movement_source_kind_check;
ALTER TABLE finance.money_movement ADD CHECK(source_kind IN ('expense','general','treasury_send','treasury_receive'));
CREATE TABLE finance.treasury_transfer (
 company_id uuid NOT NULL REFERENCES access.company(id), id uuid NOT NULL,
 reference bigint NOT NULL DEFAULT nextval('kernel.human_reference') CHECK(reference>0),
 source_account_id uuid NOT NULL, destination_account_id uuid NOT NULL,
 source_branch_id uuid NOT NULL, destination_branch_id uuid NOT NULL,
 source_account_name text NOT NULL, destination_account_name text NOT NULL,
 source_branch_name text NOT NULL, destination_branch_name text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL CHECK(currency='EGP'),
 actual_sent_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 sender_id uuid NOT NULL REFERENCES access.principal(id), sender_name text NOT NULL,
 send_source_id uuid NOT NULL, send_movement_id uuid NOT NULL, send_command_record_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'sent' CHECK(state IN ('sent','received')), version integer NOT NULL DEFAULT 1,
 actual_received_at timestamptz, receipt_recorded_at timestamptz, receiver_id uuid REFERENCES access.principal(id), receiver_name text,
 receipt_source_id uuid, receipt_movement_id uuid, receipt_command_record_id uuid,
 PRIMARY KEY(company_id,id), UNIQUE(company_id,reference), UNIQUE(company_id,send_source_id), UNIQUE(company_id,receipt_source_id),
 UNIQUE(company_id,send_movement_id), UNIQUE(company_id,receipt_movement_id), UNIQUE(send_command_record_id), UNIQUE(receipt_command_record_id),
 FOREIGN KEY(company_id,source_account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,destination_account_id) REFERENCES finance.account(company_id,id),
 FOREIGN KEY(company_id,source_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,destination_branch_id) REFERENCES access.branch(company_id,id),
 FOREIGN KEY(company_id,send_source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,receipt_source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,send_movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,receipt_movement_id) REFERENCES finance.money_movement(company_id,id),
 FOREIGN KEY(company_id,send_command_record_id) REFERENCES command_record(company_id,id),
 FOREIGN KEY(company_id,receipt_command_record_id) REFERENCES command_record(company_id,id),
 CHECK(source_account_id<>destination_account_id AND source_branch_id<>destination_branch_id),
 CHECK(actual_received_at IS NULL OR actual_received_at>=actual_sent_at),
 CHECK((state='sent' AND version=1 AND actual_received_at IS NULL AND receipt_recorded_at IS NULL AND receiver_id IS NULL AND receiver_name IS NULL AND receipt_source_id IS NULL AND receipt_movement_id IS NULL AND receipt_command_record_id IS NULL)
 OR (state='received' AND version=2 AND actual_received_at IS NOT NULL AND receipt_recorded_at IS NOT NULL AND receiver_id IS NOT NULL AND receiver_name IS NOT NULL AND receipt_source_id IS NOT NULL AND receipt_movement_id IS NOT NULL AND receipt_command_record_id IS NOT NULL))
);
CREATE TABLE finance.treasury_transit_movement (
 company_id uuid NOT NULL, id uuid NOT NULL, transfer_id uuid NOT NULL,
 phase text NOT NULL CHECK(phase IN ('send','receive')), amount_minor bigint NOT NULL,
 source_id uuid NOT NULL, money_effect_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(company_id,id), UNIQUE(company_id,transfer_id,phase), UNIQUE(company_id,source_id), UNIQUE(company_id,money_effect_id),
 FOREIGN KEY(company_id,transfer_id) REFERENCES finance.treasury_transfer(company_id,id),
 FOREIGN KEY(company_id,source_id) REFERENCES kernel.source_record(company_id,id),
 FOREIGN KEY(company_id,money_effect_id) REFERENCES kernel.journal_effect(company_id,id),
 CHECK((phase='send' AND amount_minor>0) OR (phase='receive' AND amount_minor<0))
);
CREATE INDEX treasury_pending_destination ON finance.treasury_transfer(company_id,state,destination_branch_id,actual_sent_at,id);
CREATE INDEX treasury_source_date ON finance.treasury_transfer(company_id,source_branch_id,actual_sent_at,id);
CREATE INDEX treasury_receipt_date ON finance.treasury_transfer(company_id,actual_received_at,id);
CREATE INDEX treasury_recorded_date ON finance.treasury_transfer(company_id,recorded_at,id);
CREATE TRIGGER immutable_treasury_transit BEFORE UPDATE OR DELETE ON finance.treasury_transit_movement FOR EACH ROW EXECUTE FUNCTION kernel.immutable();
CREATE FUNCTION finance.preserve_transfer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'TRANSFER_HISTORY_RETAINED'; END IF;
 IF OLD.state<>'sent' OR NEW.state<>'received' OR NEW.version<>2 OR
 (to_jsonb(NEW)-ARRAY['state','version','actual_received_at','receipt_recorded_at','receiver_id','receiver_name','receipt_source_id','receipt_movement_id','receipt_command_record_id']) <>
 (to_jsonb(OLD)-ARRAY['state','version','actual_received_at','receipt_recorded_at','receiver_id','receiver_name','receipt_source_id','receipt_movement_id','receipt_command_record_id'])
 THEN RAISE EXCEPTION 'IMMUTABLE_TRANSFER'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_treasury_transfer BEFORE UPDATE OR DELETE ON finance.treasury_transfer FOR EACH ROW EXECUTE FUNCTION finance.preserve_transfer();
CREATE FUNCTION finance.validate_transfer_links() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t finance.treasury_transfer; phase_name text; m finance.money_movement; transit finance.treasury_transit_movement; sign_amount bigint;
BEGIN
 IF TG_TABLE_NAME='treasury_transfer' THEN SELECT * INTO t FROM finance.treasury_transfer WHERE company_id=NEW.company_id AND id=NEW.id;
 ELSIF TG_TABLE_NAME='money_movement' THEN
  IF NEW.source_kind NOT IN ('treasury_send','treasury_receive') THEN RETURN NULL; END IF;
  SELECT * INTO t FROM finance.treasury_transfer WHERE company_id=NEW.company_id AND (send_movement_id=NEW.id OR receipt_movement_id=NEW.id);
 ELSE SELECT * INTO t FROM finance.treasury_transfer WHERE company_id=NEW.company_id AND id=NEW.transfer_id; END IF;
 IF t.id IS NULL THEN RAISE EXCEPTION 'TRANSFER_SOURCE_REQUIRED'; END IF;
 FOR phase_name IN SELECT unnest(CASE WHEN t.state='received' THEN ARRAY['send','receive'] ELSE ARRAY['send'] END) LOOP
  SELECT * INTO m FROM finance.money_movement WHERE company_id=t.company_id AND id=CASE WHEN phase_name='send' THEN t.send_movement_id ELSE t.receipt_movement_id END;
  SELECT * INTO transit FROM finance.treasury_transit_movement WHERE company_id=t.company_id AND transfer_id=t.id AND phase=phase_name;
  sign_amount:=CASE WHEN phase_name='send' THEN t.amount_minor ELSE -t.amount_minor END;
  IF m.id IS NULL OR transit.id IS NULL OR transit.amount_minor<>sign_amount OR transit.source_id<>m.source_id OR transit.money_effect_id<>m.effect_id
   OR m.source_id<>(CASE WHEN phase_name='send' THEN t.send_source_id ELSE t.receipt_source_id END)
   OR m.amount_minor<>t.amount_minor OR m.account_id<>(CASE WHEN phase_name='send' THEN t.source_account_id ELSE t.destination_account_id END)
   OR m.branch_id<>(CASE WHEN phase_name='send' THEN t.source_branch_id ELSE t.destination_branch_id END)
   OR m.actor_id<>(CASE WHEN phase_name='send' THEN t.sender_id ELSE t.receiver_id END)
   OR m.source_kind<>(CASE WHEN phase_name='send' THEN 'treasury_send' ELSE 'treasury_receive' END)
   OR m.actual_date<>(CASE WHEN phase_name='send' THEN t.actual_sent_at ELSE t.actual_received_at END AT TIME ZONE 'Africa/Cairo')::date
   OR NOT EXISTS(SELECT 1 FROM kernel.journal_effect j JOIN kernel.posting_batch p ON p.company_id=j.company_id AND p.id=j.batch_id
    WHERE j.company_id=t.company_id AND j.id=m.effect_id AND j.source_id=m.source_id AND j.family='money'
    AND j.kind=CASE WHEN phase_name='send' THEN 'transfer_out' ELSE 'transfer_in' END AND j.amount_minor=-sign_amount
    AND p.command_record_id=CASE WHEN phase_name='send' THEN t.send_command_record_id ELSE t.receipt_command_record_id END)
   OR (SELECT count(*) FROM kernel.journal_effect WHERE company_id=t.company_id AND source_id=m.source_id)<>1
  THEN RAISE EXCEPTION 'INVALID_TRANSFER_EFFECT_LINK'; END IF;
 END LOOP;
 IF (SELECT sum(amount_minor) FROM finance.treasury_transit_movement WHERE company_id=t.company_id AND transfer_id=t.id)<>(CASE WHEN t.state='sent' THEN t.amount_minor ELSE 0 END)
 THEN RAISE EXCEPTION 'INVALID_TRANSFER_TRANSIT'; END IF;
 IF (SELECT count(*) FROM finance.account_obligation WHERE company_id=t.company_id AND owner='treasury_transfer' AND source_identity=t.id::text
   AND account_id IN (t.source_account_id,t.destination_account_id) AND (resolved_at IS NULL)=(t.state='sent'))<>2
 THEN RAISE EXCEPTION 'TRANSFER_OBLIGATIONS_REQUIRED'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER treasury_transfer_links AFTER INSERT OR UPDATE ON finance.treasury_transfer DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_transfer_links();
CREATE CONSTRAINT TRIGGER treasury_transit_links AFTER INSERT ON finance.treasury_transit_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_transfer_links();
CREATE CONSTRAINT TRIGGER treasury_money_links AFTER INSERT ON finance.money_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.validate_transfer_links();
-- A pending destination/source usage cannot be removed even by a lower-level writer.
-- Deferred checking permits harmless renames that delete/reinsert the same usage set.
CREATE FUNCTION finance.guard_treasury_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM finance.treasury_transfer t WHERE t.company_id=OLD.company_id AND t.state='sent'
  AND ((t.source_account_id=OLD.account_id AND NOT EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=t.company_id AND x.account_id=t.source_account_id AND x.branch_id=t.source_branch_id))
   OR (t.destination_account_id=OLD.account_id AND NOT EXISTS(SELECT 1 FROM finance.account_usage x WHERE x.company_id=t.company_id AND x.account_id=t.destination_account_id AND x.branch_id=t.destination_branch_id))))
 THEN RAISE EXCEPTION 'ACCOUNT_OBLIGATIONS_PENDING'; END IF;
 IF TG_TABLE_NAME='account_obligation' THEN
  IF OLD.owner='treasury_transfer' AND EXISTS(SELECT 1 FROM finance.treasury_transfer t WHERE t.company_id=OLD.company_id AND t.id::text=OLD.source_identity AND t.state='sent')
  THEN RAISE EXCEPTION 'TRANSFER_OBLIGATION_STILL_PENDING'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER treasury_usage_lifecycle AFTER DELETE ON finance.account_usage DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.guard_treasury_lifecycle();
CREATE CONSTRAINT TRIGGER treasury_obligation_lifecycle AFTER UPDATE ON finance.account_obligation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.guard_treasury_lifecycle();
