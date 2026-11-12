-- =====================================================================
-- N92 Edu-Italia — Migration 014: Student profile photos (avatars)
-- ---------------------------------------------------------------------
-- STATUS: FOR OWNER REVIEW. Do NOT run without the owner's explicit
-- approval. Nothing else in the database is changed by this file.
--
-- WHY THIS MIGRATION EXISTS
-- The portal needs a place to store student profile photographs.
-- The two existing buckets cannot be used safely:
--   * `media` is PUBLIC — anyone with the URL could view a photo.
--   * `student-documents` is private, but its policies give students
--     read-only access (uploads are owner-only by design), so a
--     student cannot upload their own photo there.
-- This migration therefore creates ONE new private bucket with
-- folder-scoped policies that mirror the proven student-documents
-- pattern, plus the account_status gate from Migration 013.1.
--
-- WHAT IT DOES
--   1. Creates the private bucket `student-avatars`
--      (public = false, 3 MB limit, JPEG/PNG/WebP only).
--   2. Adds five storage policies for that bucket ONLY:
--        - owner can manage every object (read for the admin panel);
--        - an ACTIVE student can read / insert / update / delete
--          objects inside their OWN folder (`<user_id>/...`) only.
--   Photos are stored at the deterministic path
--   `<user_id>/profile-photo`, so NO table or column changes are
--   needed anywhere.
--
-- WHAT IT DOES NOT DO
--   * No changes to any table, column, RLS policy on tables, auth
--     settings, signup/OAuth settings, or existing buckets/policies.
--   * Migration 013.1 is a prerequisite and is NOT re-run.
--
-- Idempotent: safe to run twice (bucket insert is ON CONFLICT DO
-- NOTHING; policies are dropped and recreated).
-- =====================================================================

BEGIN;

-- Preflight: the 013.1 helper functions must exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'n92_is_owner') THEN
    RAISE EXCEPTION 'n92_is_owner() is missing — apply Migration 013.1 first.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'n92_is_active_student') THEN
    RAISE EXCEPTION 'n92_is_active_student() is missing — apply Migration 013.1 first.';
  END IF;
END $$;

-- 1) The private bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-avatars', 'student-avatars', false, 3145728,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2) Policies (this bucket only).
DROP POLICY IF EXISTS "avatars: owner manage" ON storage.objects;
CREATE POLICY "avatars: owner manage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'student-avatars' AND public.n92_is_owner())
  WITH CHECK (bucket_id = 'student-avatars' AND public.n92_is_owner());

DROP POLICY IF EXISTS "avatars: student read own" ON storage.objects;
CREATE POLICY "avatars: student read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student-avatars'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND public.n92_is_active_student());

DROP POLICY IF EXISTS "avatars: student insert own" ON storage.objects;
CREATE POLICY "avatars: student insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-avatars'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND public.n92_is_active_student());

DROP POLICY IF EXISTS "avatars: student update own" ON storage.objects;
CREATE POLICY "avatars: student update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'student-avatars'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND public.n92_is_active_student())
  WITH CHECK (bucket_id = 'student-avatars'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND public.n92_is_active_student());

DROP POLICY IF EXISTS "avatars: student delete own" ON storage.objects;
CREATE POLICY "avatars: student delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'student-avatars'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND public.n92_is_active_student());

COMMIT;
