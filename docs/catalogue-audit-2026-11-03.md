# Student Essentials — Product Catalogue Audit

**Date:** 2026-11-03 · **Source:** live Supabase `essential_products`, read-only
public (anon) view — this is exactly what the public site can see.
**No records were deleted, overwritten or modified for this audit.**

## Headline numbers (219 published products = 218 imported + Portronics)

| Measure | Count |
|---|---|
| Published products | **219** |
| With a genuine product image | **1** (Portronics only) |
| With any marketplace offers | **1** (Portronics only) |
| With any purchase URL | **1** (Portronics: Flipkart product pages, portronics.com, FirstCry — all direct product pages) |
| With marketplace *search* URLs stored as links | **0** (search links were never imported — by design) |
| Blank descriptions | 0 |
| Products carrying one identical generic "specification" line | **218** |

## Images — why the cards showed the N92 logo

218 of 219 products have no image at all (the workbook's image column was
empty — left blank deliberately rather than fabricated, per its Read Me).
The old catalogue code used `/logo-header.png` (the N92 logo) as the
no-image artwork, which is why most cards displayed the logo.

**Fixed in code:** imageless products now show a neutral **"Image coming
soon"** placeholder everywhere (catalogue cards and the checklist-page
panel). The logo is never used as product artwork. Genuine images will
appear automatically as soon as verified image URLs are added per product
(Admin → Products → Edit, or the import's image column).

## Purchase links

Only the Portronics product has offers (4 direct product-page links).
The other 218 products have **no offers and no purchase links at all** —
nothing was invented for them. Their workbook rows contain only
marketplace *search* links, which must not be presented as direct
purchase links (also the workbook's own warning).

**Fixed in code:** a "View Product" button now renders only when an
offer's URL is a verified **direct retailer product page**
(Amazon `/dp/…`, Flipkart `/p/…`, Myntra `/…/buy`, other HTTPS retailer
pages). Search-shaped URLs (Amazon `/s?k=…`, Flipkart `/search?q=…`, …)
never render a purchase link — the price/“Check current price” line can
still show, the button cannot. Affiliate URLs stay exactly as stored —
blank until the owner provides them.

## Descriptions

156 distinct descriptions across 219 products. Three repeated category
boilerplates account for 66 products:

- ×25 Documents: “Personal document or travel requirement; obtain from
  the issuing institution or relevant service.”
- ×21 Medicines: “User-listed medicine/health item. Product choice,
  dosage and suitability must be confirmed by a qualified clinician or
  pharmacist.”
- ×20 Food: “Food or kitchen checklist item. Choose sealed, labelled,
  commercially packaged products where permitted.”

The remaining ~152 descriptions are item-specific. Records were **not**
edited by Muse: a review-only SQL file
(`supabase/cleanup_catalogue_boilerplate_FOR_REVIEW.sql`) blanks exactly
these three boilerplates (66 rows) and the one generic specification
line (218 rows) when the owner chooses to run it. It matches exact texts
only — the Portronics product cannot be touched by it.

## Sensitive categories (code handling added)

- **Documents (25), Medicines (21), Food & Kitchen (20)** now render as
  **Information** cards: an "Information" chip, a category guidance
  notice (issuing-institution / doctor-and-customs / sealed-food-and-
  customs wording), and **no shopping links or prices** even if offers
  existed.
- The checklist-page "Recommended Student Essentials" panel excludes
  these categories entirely — documents, medicines and food are never
  presented as recommended shopping.

## What still needs owner-side research (not code)

Genuine images and direct purchase URLs for the 218 generic checklist
items (e.g. “College Bag”) require per-item verified retailer listings —
a specific seller, model, image and price check per product, exactly as
the workbook's Read Me planned. Until a listing is verified for an item,
its card honestly shows “Image coming soon” and no purchase button.
