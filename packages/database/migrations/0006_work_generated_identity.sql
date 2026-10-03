-- PostgreSQL computes generated columns after BEFORE triggers. Compare their
-- immutable inputs (lane/entity), not NEW.identity_entity_id before computation.
CREATE OR REPLACE FUNCTION access.preserve_intent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','attempts','available_at','lease_owner','lease_until','fence','last_error','completed_at','outcome_kind','identity_entity_id'])
   <> (to_jsonb(OLD)-ARRAY['state','attempts','available_at','lease_owner','lease_until','fence','last_error','completed_at','outcome_kind','identity_entity_id'])
 THEN RAISE EXCEPTION 'IMMUTABLE_INTENT'; END IF;
 RETURN NEW;
END $$;
