-- =====================================================================
-- N92 Edu-Italia — Migration 014 ROLLBACK (student avatars)
-- ---------------------------------------------------------------------
-- Removes the five avatar policies, every object stored in the
-- `student-avatars` bucket, and the bucket itself.
-- WARNING: rolling back DELETES all uploaded student profile photos.
-- Nothing else in the database is touched.
-- =====================================================================

BEGIN;

DROP POLICY IF EXISTS "avatars: owner manage" ON storage.objects;
DROP POLICY IF EXISTS "avatars: student read own" ON storage.objects;
DROP POLICY IF EXISTS "avatars: student insert own" ON storage.objects;
DROP POLICY IF EXISTS "avatars: student update own" ON storage.objects;
DROP POLICY IF EXISTS "avatars: student delete own" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'student-avatars';
DELETE FROM storage.buckets WHERE id = 'student-avatars';

COMMIT;
