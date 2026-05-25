-- Support "Adesão Extra" (extra addon payments) on payment_history
ALTER TABLE "payment_history" ALTER COLUMN "new_expiry_date" DROP NOT NULL;
ALTER TABLE "payment_history" ADD COLUMN IF NOT EXISTS "description" text;
