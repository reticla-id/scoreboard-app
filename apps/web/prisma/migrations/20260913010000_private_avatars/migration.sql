-- User avatars live in a private bucket. Paths are scoped to the authenticated user.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reticla-avatars', 'reticla-avatars', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Reticla users read own avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'reticla-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Reticla users upload own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reticla-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY "Reticla users remove own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'reticla-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
