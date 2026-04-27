-- Ensure the "cheques" storage bucket exists.
-- The remote_schema dump captures bucket policies but not the bucket row,
-- so a fresh local Supabase stack has no "cheques" bucket and uploads fail
-- with "Bucket not found".
insert into storage.buckets (id, name, public)
values ('cheques', 'cheques', false)
on conflict (id) do nothing;
