# Migration 014 — Student Avatars: Test Report & Approval Package

**Status: AWAITING OWNER APPROVAL. Not run on the live database.**

## Why a migration is needed at all

Student profile photos cannot be stored safely in either existing bucket:

- `media` is **public** — a photo URL would be viewable by anyone.
- `student-documents` is private, but students have **read-only** access by
  design (owner uploads documents) — a student cannot upload a photo there.

Migration 014 therefore creates one new **private** bucket,
`student-avatars`, with folder-scoped policies mirroring the proven
student-documents pattern plus the Migration 013.1 activation gate.
Photos live at the deterministic path `<user_id>/profile-photo`, so
**no table or column changes are needed**.

## What the migration does

1. Bucket `student-avatars`: private, 3 MB limit, JPEG/PNG/WebP only.
2. Five storage policies, for that bucket only:
   - owner manages all objects (admin panel viewing);
   - an **active** student can read/insert/update/delete only inside
     their own `<user_id>/` folder.
3. Nothing else: no table/RLS/auth/signup changes; 013.1 is not re-run.
   The file is idempotent (safe to run twice).

## Rig test results (local PostgreSQL fixture, 2026-11-09)

Fixture = audited pre-013 database → Migration 013.1 applied → Migration
014 applied → assertions as owner / active student A / active student B /
pending student P / anonymous:

**17/17 PASSED** — bucket private + limits correct (V1), exactly 5
policies (V2), A uploads to own folder (AV1), A cannot write B's folder
(AV2), A and B each read only their own objects (AV3–AV4), pending
student blocked from insert and read by the activation gate (AV5–AV6),
owner reads all (AV7), A updates/deletes own only, never B's
(AV8–AV11), anonymous reads nothing (AV12), existing documents bucket
behaviour unchanged (AV13), second run idempotent (AV14), rollback
removes bucket + policies cleanly (RB1).

## What is NOT proven

- Live Supabase Storage API behaviour (upload/sign/list over HTTP) —
  the portal code uses the same endpoints already proven live for
  documents; photo display/upload will be verified after approval.
- Until 014 is applied, the profile-photo UI shows a "being set up"
  state instead of upload controls; all other features work.

## To approve and apply

1. Supabase Dashboard → SQL Editor → paste `Migration_014_Student_Avatars.sql` → Run.
2. Run `Migration_014_Verification.sql` and share the output.
3. `Migration_014_Rollback.sql` is included in case it is ever needed
   (it deletes the bucket and all uploaded photos — nothing else).
