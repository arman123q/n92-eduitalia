-- =====================================================================
-- N92 Edu-Italia — Migration 014 VERIFICATION (read-only SELECTs)
-- Run AFTER Migration_014_Student_Avatars.sql. Expected results are
-- written above each query.
-- =====================================================================

-- V1 — expect exactly 1 row: student-avatars, public = false,
-- file_size_limit = 3145728, mime types image/jpeg|png|webp.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'student-avatars';

-- V2 — expect exactly 5 rows, all for bucket student-avatars:
-- owner manage (ALL), student read own (SELECT), student insert own
-- (INSERT), student update own (UPDATE), student delete own (DELETE).
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'avatars:%'
ORDER BY policyname;

-- V3 — bucket census: media (public) and student-documents (private)
-- must still be present and unchanged alongside student-avatars.
SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;
