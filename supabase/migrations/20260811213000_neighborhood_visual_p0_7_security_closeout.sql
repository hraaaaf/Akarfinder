-- NEIGHBORHOOD-VISUAL-P0.7S — remove the temporary one-shot HTTP extension.
-- The P0.7 ingestion has completed and all three Storage objects are verified.
-- Keeping pg_net installed would leave an unnecessary extension in the public schema.

drop extension if exists pg_net;
