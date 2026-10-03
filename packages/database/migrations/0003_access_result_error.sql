-- Upgrade P02's local development records without replacing immutable command intent.
-- Rejected results retain a safe reason; a corrected intent needs a new command UUID.
UPDATE command_record SET result=result || jsonb_build_object('errorCode',NULL)
WHERE NOT (result ? 'errorCode');
