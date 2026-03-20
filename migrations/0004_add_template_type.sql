-- Add type column to message_templates for Baileys/Official API separation
ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'baileys';
