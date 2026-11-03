import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVideoUrl } from "../lib/video-url.js";

const ID = "dQw4w9WgXcQ";
const EMBED = { type: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${ID}` };

test("YouTube watch URLs normalise to nocookie embeds", () => {
  assert.deepEqual(parseVideoUrl(`https://www.youtube.com/watch?v=${ID}`), EMBED);
  assert.deepEqual(parseVideoUrl(`https://www.youtube.com/watch?v=${ID}&t=42s&list=PLx`), EMBED);
  assert.deepEqual(parseVideoUrl(`https://m.youtube.com/watch?v=${ID}`), EMBED);
});

test("youtu.be, embed, shorts and live URLs normalise", () => {
  assert.deepEqual(parseVideoUrl(`https://youtu.be/${ID}`), EMBED);
  assert.deepEqual(parseVideoUrl(`https://youtu.be/${ID}?si=abc`), EMBED);
  assert.deepEqual(parseVideoUrl(`https://www.youtube.com/embed/${ID}`), EMBED);
  assert.deepEqual(parseVideoUrl(`https://www.youtube.com/shorts/${ID}`), EMBED);
  assert.deepEqual(parseVideoUrl(`https://www.youtube.com/live/${ID}`), EMBED);
});

test("direct media files play natively", () => {
  assert.deepEqual(parseVideoUrl("https://cdn.example.com/guide.mp4"), { type: "file", url: "https://cdn.example.com/guide.mp4" });
  assert.deepEqual(parseVideoUrl("https://cdn.example.com/guide.webm?x=1"), { type: "file", url: "https://cdn.example.com/guide.webm?x=1" });
});

test("other HTTPS URLs become external links, never iframes", () => {
  assert.deepEqual(parseVideoUrl("https://vimeo.com/12345"), { type: "external", url: "https://vimeo.com/12345" });
});

test("unsafe or malformed input is rejected", () => {
  assert.equal(parseVideoUrl("http://www.youtube.com/watch?v=" + ID), null);
  assert.equal(parseVideoUrl("javascript:alert(1)"), null);
  assert.equal(parseVideoUrl("https://www.youtube.com/watch?v=short"), null);
  assert.equal(parseVideoUrl("https://youtube.com/feed/subscriptions"), null);
  assert.equal(parseVideoUrl("not a url"), null);
  assert.equal(parseVideoUrl(""), null);
  assert.equal(parseVideoUrl(null), null);
});
