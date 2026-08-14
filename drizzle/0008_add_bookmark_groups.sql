-- Add group_name to bookmarks (folder/topic organization)
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS group_name text;
