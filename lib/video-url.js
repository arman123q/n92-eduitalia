/**
 * parseVideoUrl — classify an admin-entered tutorial video URL
 * into a SAFE embeddable form. Used by the public tutorial modal
 * and the admin preview, so both always agree.
 *
 *   YouTube (watch / youtu.be / embed / shorts / live)
 *     -> { type: "youtube", embedUrl } on youtube-nocookie
 *   Direct media file (.mp4/.webm/.ogg over HTTPS)
 *     -> { type: "file", url } for a native <video> element
 *   Any other HTTPS URL
 *     -> { type: "external", url } shown as an external link card
 *        (arbitrary third-party iframes are never embedded)
 *   Anything else (http, javascript:, malformed)
 *     -> null
 */
export function parseVideoUrl(raw) {
  if (typeof raw !== "string") return null;
  const input = raw.trim();
  if (!input) return null;
  let u;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\.|^m\./, "");
  let videoId = null;
  if (host === "youtu.be") {
    videoId = u.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") videoId = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/);
      if (m) videoId = m[2];
    }
  }
  if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return { type: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}` };
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    return null; // a YouTube URL we cannot safely normalise
  }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname + u.search)) {
    return { type: "file", url: u.toString() };
  }
  return { type: "external", url: u.toString() };
}
