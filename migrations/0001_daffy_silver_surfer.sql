CREATE TABLE "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"type" text NOT NULL,
	"previous_expiry_date" date,
	"new_expiry_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;