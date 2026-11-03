/**
 * sanitize.js — the ONE sanitizer for blog article HTML, used at
 * BOTH points required by the security review (3 Nov 2026):
 *   1. SAVE time — components/admin/BlogManager sanitises editor
 *      output with this before anything reaches the database.
 *   2. RENDER time — components/ArticleView (public article page AND
 *      admin preview, so both show the identical sanitised output)
 *      sanitises again before dangerouslySetInnerHTML. Stored content
 *      is therefore never trusted, however it got into the database.
 *
 * Implementation: DOMPurify (via isomorphic-dompurify, so the same
 * code runs in the browser and in the Node build) with a STRICT,
 * EXPLICIT allowlist — the previous regex-based scrub was removed on
 * review: regexes cannot safely parse HTML.
 *
 * Policy:
 *   - Only the tags a blog article legitimately needs (headings,
 *     paragraphs, emphasis, lists, blockquotes, links, images,
 *     tables, horizontal rules). SVG, MathML, iframe, object, embed,
 *     forms and every other element are dropped.
 *   - Only a handful of attributes; every on* handler and style is
 *     dropped (neither is in the allowlist).
 *   - URLs (href/src) must be HTTPS or relative. DOMPurify's own
 *     URI handling already rejects javascript:, vbscript: and other
 *     script schemes after normalising entities, casing and control
 *     characters. The stricter HTTPS/relative-only policy is then
 *     enforced with an uponSanitizeAttribute hook that drops any
 *     href/src not matching it — which also closes DOMPurify's
 *     built-in allowance for data: image sources (data:text/html
 *     and data:image/svg+xml included). NOTE: a custom
 *     ALLOWED_URI_REGEXP is deliberately NOT used: in DOMPurify
 *     3.4.x setting one was observed (and regression-tested here) to
 *     also strip unrelated allowlisted attributes (target, start,
 *     colspan) — the hook path does not have that defect.
 *   - Links opened in a new tab get rel="noopener noreferrer".
 */
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "a", "b", "blockquote", "br", "code", "em", "h2", "h3", "h4", "hr",
  "i", "img", "li", "ol", "p", "pre", "s", "strong", "sub", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
];

const ALLOWED_ATTR = [
  "href", "title", "target", "rel", // links
  "src", "alt", "width", "height", // images
  "colspan", "rowspan", // table cells
  "start", // ordered lists
];

// https://…, root-relative /… (but NOT protocol-relative //host or
// /\host), ./ or ../ relative, #fragment, ?query. Everything else —
// javascript:, vbscript:, data:, http:, blob:, etc. — is rejected.
const SAFE_URI = /^(?:https:\/\/|\/(?![/\\])|\.\/|\.\.\/|#|\?)/i;

// Enforce the HTTPS/relative-only policy on every URL attribute.
// DOMPurify has already decoded entities and normalised the value
// by the time this hook runs, so obfuscated forms cannot slip past.
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if ((data.attrName === "href" || data.attrName === "src") && !SAFE_URI.test(data.attrValue.trim())) {
    data.keepAttr = false;
  }
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Standalone URL check against the same policy, for URLs that are
 * rendered OUTSIDE article HTML — currently the featured image,
 * which is stored as a plain field and used as an <img src> and an
 * Open Graph image. Validated separately at save time (admin) and
 * again at render time, so a value that reached the database by any
 * route is still never rendered unless it is HTTPS or a safe
 * relative URL. http:, javascript:, data:, blob: and
 * protocol-relative URLs are all rejected.
 */
export function isSafeImageUrl(url) {
  if (typeof url !== "string") return false;
  const v = url.trim();
  return v.length > 0 && SAFE_URI.test(v);
}
