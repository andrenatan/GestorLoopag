CREATE TABLE "plans" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "billing_period" text NOT NULL,
        "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
        "is_popular" boolean DEFAULT false NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
-- Add columns as nullable first to avoid constraint violations with existing data
ALTER TABLE "users" ADD COLUMN "name" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_id" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Seed initial plans
INSERT INTO "plans" ("name", "price", "billing_period", "features", "is_popular", "is_active") VALUES 
('Mensal', 60.00, 'monthly', '["Clientes ilimitados", "Cobranças Automáticas ilimitadas", "Servidores ilimitados", "Captação ilimitada", "1 WhatsApp Conectado"]'::jsonb, false, true),
('Trimestral', 150.00, 'quarterly', '["Clientes ilimitados", "Cobranças Automáticas ilimitadas", "Servidores ilimitados", "Captação ilimitada", "1 WhatsApp Conectado"]'::jsonb, true, true),
('Anual', 890.00, 'yearly', '["Clientes ilimitados", "Cobranças Automáticas ilimitadas", "Servidores ilimitados", "Captação ilimitada", "1 WhatsApp Conectado"]'::jsonb, false, true);