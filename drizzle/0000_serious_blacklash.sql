CREATE TABLE "module_staff_staff_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"role" text NOT NULL,
	"specialty" text,
	"license_number" text,
	"is_active" boolean NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
