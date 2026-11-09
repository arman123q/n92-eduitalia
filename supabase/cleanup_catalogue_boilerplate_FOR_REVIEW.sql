-- =====================================================================
-- N92 Edu-Italia — catalogue boilerplate cleanup — FOR OWNER REVIEW.
-- Muse has NOT run this. Nothing here deletes or re-creates rows:
-- it only blanks two kinds of REPEATED boilerplate text on the
-- imported products. The Portronics product does NOT match any
-- of these exact texts and is never touched.
--
-- HOW TO USE: run the COUNT queries first and check they match
-- the audit numbers, then run whichever UPDATE blocks you
-- approve, then re-run the counts (they should drop to 0).
-- =====================================================================

-- STEP 1 — counts (published + draft rows are both counted):
select count(*) as boilerplate_specs_rows
from essential_products
where specs = '[{"label": "Confirm size, material, compatibility, warranty and seller before purchase.", "value": ""}]'::jsonb;
-- expected at audit time: 218 (every imported product carries
-- this one generic "specification"; the public page now also
-- shows proper category guidance instead)

select description, count(*) from essential_products
where description in (
  'Personal document or travel requirement; obtain from the issuing institution or relevant service.',
  'User-listed medicine/health item. Product choice, dosage and suitability must be confirmed by a qualified clinician or pharmacist.',
  'Food or kitchen checklist item. Choose sealed, labelled, commercially packaged products where permitted.'
)
group by description;
-- expected at audit time: 25 / 21 / 20 = 66 rows

-- STEP 2a — (recommended) clear the generic specification line:
update essential_products
set specs = '[]'::jsonb
where specs = '[{"label": "Confirm size, material, compatibility, warranty and seller before purchase.", "value": ""}]'::jsonb;

-- STEP 2b — (recommended) blank the three repeated category
-- boilerplate descriptions. The catalogue now presents proper
-- per-category guidance notices for Documents / Medicines /
-- Food, so these stop posing as product descriptions.
update essential_products
set description = ''
where description in (
  'Personal document or travel requirement; obtain from the issuing institution or relevant service.',
  'User-listed medicine/health item. Product choice, dosage and suitability must be confirmed by a qualified clinician or pharmacist.',
  'Food or kitchen checklist item. Choose sealed, labelled, commercially packaged products where permitted.'
);

-- Undo note: there is no automatic undo. The original texts are
-- preserved verbatim in your workbook
-- (N92_Student_Essentials_Enriched_Working.xlsx) and in this
-- file, so any row can be restored from those sources.
