import { test } from "node:test";
import assert from "node:assert/strict";
import { isDirectProductUrl, directOfferUrl, sensitiveCategoryKind } from "../lib/product-url.js";

test("direct retailer product pages are accepted", () => {
  assert.equal(isDirectProductUrl("https://www.amazon.in/dp/B0EXAMPLE"), true);
  assert.equal(isDirectProductUrl("https://www.amazon.in/Portronics-Adapter/dp/B0EXAMPLE/ref=sr_1_1"), true);
  assert.equal(isDirectProductUrl("https://www.flipkart.com/portronics-juicematego-pro-12w/p/itm123abc"), true);
  assert.equal(isDirectProductUrl("https://www.myntra.com/shirts/brand/name/1234567/buy"), true);
  assert.equal(isDirectProductUrl("https://www.portronics.com/products/juicemate-go-pro"), true);
  assert.equal(isDirectProductUrl("https://www.firstcry.com/portronics/portronics-juicemate-go-pro-universal/123456/product-detail"), true);
});

test("marketplace SEARCH urls are never direct product links", () => {
  assert.equal(isDirectProductUrl("https://www.amazon.in/s?k=travel+adapter"), false);
  assert.equal(isDirectProductUrl("https://www.flipkart.com/search?q=travel+adapter"), false);
  assert.equal(isDirectProductUrl("https://www.myntra.com/search?q=shoes"), false);
  assert.equal(isDirectProductUrl("https://www.google.com/search?q=adapter"), false);
});

test("non-HTTPS and junk are rejected", () => {
  assert.equal(isDirectProductUrl("http://www.amazon.in/dp/B0EXAMPLE"), false);
  assert.equal(isDirectProductUrl(""), false);
  assert.equal(isDirectProductUrl("not a url"), false);
  assert.equal(isDirectProductUrl(null), false);
});

test("directOfferUrl prefers a direct affiliate URL, falls back to a direct product URL, else null", () => {
  const dp = "https://www.amazon.in/dp/B0EXAMPLE";
  const search = "https://www.amazon.in/s?k=adapter";
  assert.equal(directOfferUrl({ affiliateUrl: dp, productUrl: "https://www.flipkart.com/x/p/itm1" }), dp);
  assert.equal(directOfferUrl({ affiliateUrl: "", productUrl: dp }), dp);
  assert.equal(directOfferUrl({ affiliateUrl: search, productUrl: dp }), dp); // affiliate is search-shaped -> product URL wins
  assert.equal(directOfferUrl({ affiliateUrl: search, productUrl: search }), null);
  assert.equal(directOfferUrl({ affiliateUrl: "", productUrl: "" }), null);
});

test("sensitive categories: documents, medicines, food", () => {
  assert.equal(sensitiveCategoryKind("Documents"), "documents");
  assert.equal(sensitiveCategoryKind("Medicines"), "medicines");
  assert.equal(sensitiveCategoryKind("Medicine Checklist"), "medicines");
  assert.equal(sensitiveCategoryKind("Food & Kitchen"), "food");
  assert.equal(sensitiveCategoryKind("Electronics"), null);
  assert.equal(sensitiveCategoryKind(""), null);
});
