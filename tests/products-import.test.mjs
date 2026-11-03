import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  parseCsv, prepareImport, normalizeDate, parsePrice, buildTemplateCsv, TEMPLATE_HEADERS,
} from "../lib/import-products.js";

test("CSV parser: BOM, CRLF, quoted commas and escaped quotes", () => {
  const csv = '﻿name,description\r\n"Adapter, Universal","He said ""hi"""\r\nPlain,Simple\r\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Adapter, Universal");
  assert.equal(rows[0].description, 'He said "hi"');
  assert.equal(rows[1].name, "Plain");
});

test("happy path: full row with two offers, specs and images", () => {
  const [row] = prepareImport([{
    Name: "Travel Adapter Pro",
    Category: "Electronics",
    Description: "12W universal adapter",
    Specifications: "Power: 12W; Pins: EU/US/UK",
    Images: "https://cdn.example.com/a.jpg | https://cdn.example.com/b.jpg",
    Status: "Published",
    Display_Order: "3",
    offer1_marketplace: "Amazon India",
    offer1_product_url: "https://www.amazon.in/dp/EXAMPLE",
    offer1_affiliate_url: "https://www.amazon.in/dp/EXAMPLE?tag=n92-21",
    offer1_price: "₹1,499",
    offer1_currency: "inr",
    offer1_last_verified_date: "02/11/2026",
    offer1_availability: "In Stock",
    offer2_marketplace: "Flipkart",
    offer2_product_url: "https://www.flipkart.com/item/EXAMPLE",
    offer2_price: "",
  }], []);
  assert.deepEqual(row.errors, []);
  assert.equal(row.product.name, "Travel Adapter Pro");
  assert.equal(row.product.status, "published");
  assert.equal(row.product.displayOrder, 3);
  assert.equal(row.product.imageUrl, "https://cdn.example.com/a.jpg");
  assert.deepEqual(row.product.images, ["https://cdn.example.com/b.jpg"]);
  assert.deepEqual(row.product.specs, [{ label: "Power", value: "12W" }, { label: "Pins", value: "EU/US/UK" }]);
  assert.equal(row.product.offers.length, 2);
  assert.equal(row.product.offers[0].marketplace, "amazon-in");
  assert.equal(row.product.offers[0].price, 1499);
  assert.equal(row.product.offers[0].currency, "INR");
  assert.equal(row.product.offers[0].lastVerifiedDate, "2026-11-02");
  assert.equal(row.product.offers[0].availability, "in-stock");
  assert.equal(row.product.offers[1].price, null); // never invented
});

test("minimal row: only a name — everything else stays blank, defaults to draft", () => {
  const [row] = prepareImport([{ name: "Plain Notebook" }], []);
  assert.deepEqual(row.errors, []);
  assert.equal(row.product.status, "draft");
  assert.deepEqual(row.product.offers, []);
  assert.equal(row.product.imageUrl, "");
});

test("errors: missing name, bad URLs, bad price, bad date are row errors", () => {
  const rows = prepareImport([
    { name: "", category: "X" },
    { name: "Bad Links", images: "http://insecure.example.com/x.jpg", offer1_product_url: "ftp://x", offer1_price: "abc", offer1_last_verified_date: "31/02/2026" },
  ], []);
  assert.ok(rows[0].errors.some((e) => e.includes("name is required")));
  assert.equal(rows[0].product, null);
  assert.ok(rows[1].errors.length >= 4, rows[1].errors.join(" | "));
  assert.equal(rows[1].product, null);
});

test("warnings: price without verification date, unknown marketplace becomes custom", () => {
  const [row] = prepareImport([{
    name: "Kettle",
    offer1_marketplace: "Some Local Store",
    offer1_product_url: "https://shop.example.com/kettle",
    offer1_price: "999",
  }], []);
  assert.deepEqual(row.errors, []);
  assert.equal(row.product.offers[0].marketplace, "other");
  assert.equal(row.product.offers[0].marketplaceLabel, "Some Local Store");
  assert.ok(row.warnings.some((w) => w.includes("Check current price")));
});

test("duplicates: existing product and in-file duplicates are flagged, never imported", () => {
  const rows = prepareImport([
    { name: "Portronics JuiceMateGo Pro" },
    { name: "New Bag" },
    { name: "new bag" },
  ], ["portronics juicematego pro"]);
  assert.equal(rows[0].duplicate, "existing");
  assert.equal(rows[1].duplicate, undefined);
  assert.equal(rows[2].duplicate, "file");
});

test("blank rows are skipped silently; specs accept JSON too", () => {
  const rows = prepareImport([{ name: "", category: "" }, { name: "Spec Test", specifications: '{"Capacity":"20 L","Weight":"400 g"}' }], []);
  assert.equal(rows[0].blank, true);
  assert.deepEqual(rows[1].product.specs, [{ label: "Capacity", value: "20 L" }, { label: "Weight", value: "400 g" }]);
});

test("dates and prices edge cases", () => {
  assert.equal(normalizeDate("2026-02-29"), null); // 2026 is not a leap year
  assert.equal(normalizeDate("2024-02-29"), "2024-02-29");
  assert.equal(normalizeDate("5/3/2026"), "2026-03-05");
  assert.equal(normalizeDate(""), "");
  assert.equal(parsePrice("₹ 2,499.00"), 2499);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("-5"), undefined);
  assert.equal(parsePrice("free"), undefined);
});

test("template has every documented column; XLSX round-trips through the same normaliser", () => {
  assert.ok(buildTemplateCsv().startsWith(TEMPLATE_HEADERS.join(",")));
  const ws = XLSX.utils.json_to_sheet([{ name: "XLSX Widget", category: "Study", offer1_price: 250, offer1_last_verified_date: "2026-11-01" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  const back = XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
  const objects = XLSX.utils.sheet_to_json(back.Sheets[back.SheetNames[0]], { defval: "" });
  const [row] = prepareImport(objects, []);
  assert.deepEqual(row.errors, []);
  assert.equal(row.product.name, "XLSX Widget");
  assert.equal(row.product.offers[0].price, 250);
  assert.equal(row.product.offers[0].lastVerifiedDate, "2026-11-01");
});
