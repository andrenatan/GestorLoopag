CREATE TABLE "automation_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"automation_type" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"scheduled_time" text NOT NULL,
	"whatsapp_instance_id" integer,
	"sub_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"webhook_url" text NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "automation_configs_automation_type_unique" UNIQUE("automation_type")
);
--> statement-breakpoint
CREATE TABLE "billing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"instance_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"system" text NOT NULL,
	"subscription_status" text DEFAULT 'Ativa' NOT NULL,
	"payment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"activation_date" date NOT NULL,
	"expiry_date" date NOT NULL,
	"payment_status" text DEFAULT 'Pago' NOT NULL,
	"plan" text NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"referral_source" text,
	"referred_by_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"birth_date" date,
	"address" text,
	"position" text NOT NULL,
	"salary" numeric(10, 2),
	"hire_date" date NOT NULL,
	"photo" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "systems_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'operator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"instance_id" text,
	"qr_code" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"webhook_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_instances_instance_id_unique" UNIQUE("instance_id")
);
--> statement-breakpoint
ALTER TABLE "automation_configs" ADD CONSTRAINT "automation_configs_whatsapp_instance_id_whatsapp_instances_id_fk" FOREIGN KEY ("whatsapp_instance_id") REFERENCES "public"."whatsapp_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_instance_id_whatsapp_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."whatsapp_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_history" ADD CONSTRAINT "billing_history_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE no action ON UPDATE no action;