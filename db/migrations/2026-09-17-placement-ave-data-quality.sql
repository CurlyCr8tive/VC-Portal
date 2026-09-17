-- 2026-09-17 — ave_data_quality on placements
--
-- Why this column exists: a figure known to be unreliable has to keep
-- saying so, all the way through the stack. The $492,198 / 14.2M number
-- appears under BOTH VeganHood's CPG launch and Candlelit Care's national
-- press push with completely different outlet lists — almost certainly one
-- reused Canva template stat block, not two independently calculated
-- results.
--
-- That caveat already lives in the client-side schema (src/schema.js) and
-- shows as a warning on the owner dashboard. But the API's row mapping had
-- no column to write it to, so the moment a placement round-tripped
-- through Supabase the warning was silently dropped and the figure came
-- back looking confirmed. This closes that hole.
--
-- NULL means "no known problem" — never "verified". The app has no
-- verification step and must not imply one. Only doubt is recorded here.

alter table placements
  add column if not exists ave_data_quality text;

comment on column placements.ave_data_quality is
  'Why this AVE figure should not be treated as settled, when that applies. NULL = no known problem (NOT "verified" — nothing in this app asserts that positive claim).';
