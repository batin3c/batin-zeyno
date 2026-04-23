-- baze storage bucket for avatars + location photos
-- run after schema.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'baze-media',
  'baze-media',
  true,
  20971520, -- 20 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- no RLS policies needed: we only access via service_role server-side
