/**
 * Security tests for lib/sanitize.js — the DOMPurify allowlist that
 * sanitises blog HTML at save time (admin) and render time
 * (ArticleView). Payloads per the security review of 3 Nov 2026:
 * SVG/MathML injection, event handlers, mixed-case and entity- or
 * whitespace-obfuscated javascript:/vbscript:/data: URLs,
 * protocol-relative and plain-http URLs, dangerous elements, and
 * malformed markup — plus a preservation battery proving legitimate
 * blog formatting survives untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
// eslint-disable-next-line import/no-relative-packages
import { sanitizeHtml, isSafeImageUrl } from "../lib/sanitize.js";

const noScript = (out) => assert.ok(!/<script/i.test(out), `script survived: ${out}`);

test("SVG with onload is removed entirely", () => {
  const out = sanitizeHtml(`<svg onload="alert(1)"><circle cx="5"/></svg><p>ok</p>`);
  assert.ok(!out.includes("<svg"), out);
  assert.ok(!out.includes("onload"), out);
  assert.ok(out.includes("<p>ok</p>"), out);
});

test("MathML payload is removed", () => {
  const out = sanitizeHtml(`<math><mtext><script>alert(1)</scr` + `ipt></mtext></math><p>ok</p>`);
  assert.ok(!out.includes("<math"), out);
  noScript(out);
  assert.ok(out.includes("<p>ok</p>"), out);
});

test("img onerror handler is stripped, https src kept", () => {
  const out = sanitizeHtml(`<img src="https://example.com/a.jpg" alt="A" onerror="alert(1)">`);
  assert.ok(out.includes('src="https://example.com/a.jpg"'), out);
  assert.ok(!out.includes("onerror"), out);
});

test("mixed-case javascript: URL is stripped", () => {
  const out = sanitizeHtml(`<a href="JaVaScRiPt:alert(1)">x</a>`);
  assert.ok(!/href=/i.test(out), out);
  assert.ok(out.includes(">x</a>"), out);
});

test("entity-encoded javascript: URL is stripped", () => {
  const out = sanitizeHtml(`<a href="java&#115;cript:alert(1)">x</a>`);
  assert.ok(!/href=/i.test(out), out);
});

test("whitespace-obfuscated javascript: URL is stripped", () => {
  const out = sanitizeHtml(`<a href="   javascript:alert(1)">x</a>`);
  assert.ok(!/href=/i.test(out), out);
});

test("vbscript: URL is stripped", () => {
  const out = sanitizeHtml(`<a href="vbscript:msgbox(1)">x</a>`);
  assert.ok(!/href=/i.test(out), out);
});

test("data:text/html image source is stripped", () => {
  const out = sanitizeHtml(`<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">`);
  assert.ok(!/src=/i.test(out), out);
});

test("data:image/svg+xml source is stripped", () => {
  const out = sanitizeHtml(`<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">`);
  assert.ok(!/src=/i.test(out), out);
});

test("protocol-relative URL is stripped", () => {
  const out = sanitizeHtml(`<a href="//evil.example/phish">x</a>`);
  assert.ok(!/href=/i.test(out), out);
});

test("plain http: URL is stripped (HTTPS-only policy)", () => {
  const out = sanitizeHtml(`<a href="http://example.com/page">x</a>`);
  assert.ok(!/href=/i.test(out), out);
});

test("iframe, object, embed and form elements are removed", () => {
  const out = sanitizeHtml(
    `<iframe src="https://evil.example"></iframe><object data="x.swf"></object><embed src="x.swf"><form action="https://evil.example"><input type="text"></form><p>ok</p>`
  );
  for (const tag of ["<iframe", "<object", "<embed", "<form", "<input"]) assert.ok(!out.includes(tag), `${tag} survived: ${out}`);
  assert.ok(out.includes("<p>ok</p>"), out);
});

test("event handlers on legitimate tags are stripped, tags kept", () => {
  const out = sanitizeHtml(`<p onclick="alert(1)">hi</p><h2 onmouseover="alert(2)">Title</h2>`);
  assert.ok(!out.includes("onclick"), out);
  assert.ok(!out.includes("onmouseover"), out);
  assert.ok(out.includes("<p>hi</p>"), out);
  assert.ok(out.includes("<h2>Title</h2>"), out);
});

test("style attributes are stripped", () => {
  const out = sanitizeHtml(`<p style="color:red; background:url(javascript:alert(1))">x</p>`);
  assert.ok(!out.includes("style"), out);
  assert.ok(out.includes("<p>x</p>"), out);
});

test("malformed script nesting cannot smuggle a script tag", () => {
  const out = sanitizeHtml(`<scr<script>ipt>alert(1)</scr` + `ipt>`);
  noScript(out);
});

test("legitimate blog formatting is preserved", () => {
  const html = [
    `<h2>Section</h2><h3>Sub</h3>`,
    `<p>Text with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s> and <b>b</b>/<i>i</i>.</p>`,
    `<ul><li>One</li><li>Two</li></ul><ol start="2"><li>Three</li></ol>`,
    `<blockquote><p>Quoted</p></blockquote>`,
    `<p><a href="https://example.com/guide" title="Guide">External</a> and <a href="/blog/">internal</a></p>`,
    `<img src="https://example.com/pic.jpg" alt="Pic" width="640" height="400">`,
    `<img src="/logo-header.png" alt="Logo">`,
    `<table><thead><tr><th colspan="2">Head</th></tr></thead><tbody><tr><td rowspan="1">A</td><td>B</td></tr></tbody></table>`,
    `<hr><pre><code>code()</code></pre>`,
  ].join("");
  const out = sanitizeHtml(html);
  for (const frag of [
    "<h2>Section</h2>", "<h3>Sub</h3>", "<strong>bold</strong>", "<em>italic</em>", "<u>underline</u>",
    "<ul>", "<ol", 'start="2"', "<blockquote>", 'href="https://example.com/guide"', 'href="/blog/"',
    'src="https://example.com/pic.jpg"', 'alt="Pic"', 'src="/logo-header.png"', "<table>", "<thead>",
    'colspan="2"', "<hr>", "<pre>", "<code>",
  ]) assert.ok(out.includes(frag), `missing ${frag} in: ${out}`);
});

test("target=_blank links gain rel=noopener noreferrer", () => {
  const out = sanitizeHtml(`<a href="https://example.com" target="_blank">x</a>`);
  assert.ok(out.includes('rel="noopener noreferrer"'), out);
});

test("uppercase HTTPS scheme and fragments survive", () => {
  const out = sanitizeHtml(`<a href="HTTPS://EXAMPLE.COM/P#Sec">x</a>`);
  assert.ok(/href="HTTPS:\/\/EXAMPLE\.COM\/P#Sec"/.test(out), out);
});

// ---- featuredImageUrl policy (separate validation, fix of 3 Nov) ----

test("isSafeImageUrl accepts HTTPS and safe relative URLs", () => {
  for (const u of [
    "https://example.com/pic.jpg",
    "HTTPS://cdn.example.com/a.png?w=800",
    "https://ymcvjghgyfipgwnsgfbj.supabase.co/storage/v1/object/public/media/x.jpg",
    "/logo-header.png",
    "/storage/pic.jpg",
    "./pic.jpg",
    "../pic.jpg",
  ]) assert.equal(isSafeImageUrl(u), true, u);
});

test("isSafeImageUrl rejects unsafe schemes and protocol-relative URLs", () => {
  for (const u of [
    "http://example.com/pic.jpg",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "   javascript:alert(1)",
    "data:image/png;base64,iVBORw0KGgo=",
    "data:text/html;base64,PHNjcmlwdD4=",
    "blob:https://example.com/1234",
    "//evil.example/pic.jpg",
    "/\\evil.example/pic.jpg",
    "vbscript:msgbox(1)",
    "ftp://example.com/pic.jpg",
  ]) assert.equal(isSafeImageUrl(u), false, u);
});

test("isSafeImageUrl rejects empty and non-string values", () => {
  for (const u of ["", "   ", null, undefined, 42, {}]) assert.equal(isSafeImageUrl(u), false, String(u));
});
