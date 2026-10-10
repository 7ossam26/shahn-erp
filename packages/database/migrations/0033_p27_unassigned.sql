ALTER TABLE dispatch.intent ADD COLUMN assignment_requested boolean NOT NULL DEFAULT true;
ALTER TABLE dispatch.intent DROP CONSTRAINT intent_state_check;
ALTER TABLE dispatch.intent ADD CHECK(state IN ('synchronizing','unassigned','preparing','prepared','receiving','accepted','rejected','withdrawing','withdrawn','reassigning','review-required'));
