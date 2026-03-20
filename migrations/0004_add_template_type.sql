-- Add type column to message_templates for Baileys/Official API separation
ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'baileys';

-- Backfill: all pre-existing templates were created via the Official API templates page
-- The Baileys templates page is new, so existing rows belong to 'official'
UPDATE "message_templates" SET "type" = 'official' WHERE "type" = 'baileys';

-- Reset default to 'baileys' for future rows (new Baileys templates)
ALTER TABLE "message_templates" ALTER COLUMN "type" SET DEFAULT 'baileys';
