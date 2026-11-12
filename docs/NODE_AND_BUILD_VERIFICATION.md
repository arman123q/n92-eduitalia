# Node Version & Clean-Build Verification — 12 Nov 2026

## Exact Node.js requirement

The lockfile (`package-lock.json`, lockfileVersion 3) contains
packages whose declared `engines` set the floor for the whole
project:

- `jsdom` 30.1.3 — `^22.22.2 || ^24.15.0 || >=26.0.0`
- `isomorphic-dompurify` 4.6.0 — `^22.22.2 || ^24.15.0 || >=26.0.0`
- `@asamuzakjp/css-color` 7.1.9, `@asamuzakjp/dom-selector` 10.0.5,
  `w3c-xmlserializer` 6.0.0 — same range

**Supported Node.js: 22.22.2+ (22.x), 24.15.0+ (24.x), or 26+.**
Node 22.16.0 satisfies none of these ranges, which is why
`npm ci` could not complete on it. `package.json` itself declares
no `engines` field; the requirement comes from these dependencies.

## Cloudflare Pages build environment

- Cloudflare Pages does **not** read the `engines` field of
  `package.json`. It selects Node from `.nvmrc` / `.node-version`
  first, then the `NODE_VERSION` environment variable, then the
  build-image default.
- This package includes `.nvmrc` containing `22.22.2`, so the
  existing Pages project will build with exactly Node 22.22.2 on
  the next push — no dashboard change is needed. (The project's
  existing `NODE_VERSION=22` also resolves to a supported 22.x
  as a fallback.)

## Clean-room verification (from the delivered ZIP itself)

Environment: fresh extraction of the final ZIP into an empty
directory; Node **v22.22.2**, npm **10.9.7**; the two existing
public env vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) provided, as §3 of
INSTALL_AND_DEPLOY.md requires.

| Step | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | **exit 0** |
| Unit tests | `npm test` | **118 tests, 118 pass, 0 fail** |
| Production build | `npm run build` | **exit 0**; static export written to `out/` (140 HTML pages) |

Note on the count: the current suite contains 118 tests. The
November upgrade report's "119" figure is superseded by this
verified count — the repository suite itself also reports 118
tests, all passing, when run today.

## What changed in this package revision (12 Nov 2026)

- ADDED: `.nvmrc` (pins Node 22.22.2).
- EDITED: `docs/INSTALL_AND_DEPLOY.md` (exact Node requirement,
  `npm ci` instruction, corrected test/build expectations).
- ADDED: this verification record.
- No application code, no dependency, no lockfile entry, no SQL
  and no database policy was changed. Nothing was deployed and
  Migration 014 was not executed.
