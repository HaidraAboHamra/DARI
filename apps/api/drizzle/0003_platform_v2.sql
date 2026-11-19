CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."booking_unit" AS ENUM('slot', 'night');--> statement-breakpoint
CREATE TYPE "public"."coupon_kind" AS ENUM('percent', 'amount');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('event', 'trip');--> statement-breakpoint
CREATE TYPE "public"."favorite_type" AS ENUM('business', 'listing', 'event');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."listing_purpose" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'sold', 'rented', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'mobile_wallet');--> statement-breakpoint
CREATE TYPE "public"."plan_id" AS ENUM('free', 'starter', 'business', 'pro');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'land', 'shop', 'office', 'farm');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('appointment', 'court', 'room', 'venue', 'farm', 'table', 'seat');--> statement-breakpoint
CREATE TYPE "public"."service_request_status" AS ENUM('open', 'assigned', 'on_the_way', 'arrived', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_urgency" AS ENUM('now', 'today', 'scheduled');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('active', 'cancelled', 'checked_in');--> statement-breakpoint
CREATE TABLE "bookable_resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "resource_kind" NOT NULL,
	"unit" "booking_unit" NOT NULL,
	"slot_minutes" integer DEFAULT 60 NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"weekly_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_confirm" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"city_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"total" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "service_quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer NOT NULL,
	"eta_minutes" integer NOT NULL,
	"message" text,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"city_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"target_business_id" uuid,
	"provider_business_id" uuid,
	"area_id" uuid,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"urgency" "service_urgency" NOT NULL,
	"preferred_at" timestamp with time zone,
	"status" "service_request_status" DEFAULT 'open' NOT NULL,
	"final_price" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"city_id" uuid NOT NULL,
	"organizer_id" uuid NOT NULL,
	"business_id" uuid,
	"kind" "event_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"venue" text NOT NULL,
	"destination" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"capacity" integer NOT NULL,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"cover_url" text,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"quantity" integer NOT NULL,
	"total" integer NOT NULL,
	"status" "ticket_status" DEFAULT 'active' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "property_listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"city_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"business_id" uuid,
	"purpose" "listing_purpose" NOT NULL,
	"property_type" "property_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"area_id" uuid,
	"rooms" integer,
	"size_sqm" integer,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"featured_until" timestamp with time zone,
	"search_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewing_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"message" text,
	"preferred_time" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"kind" "coupon_kind" NOT NULL,
	"value" integer NOT NULL,
	"min_order" integer DEFAULT 0 NOT NULL,
	"max_discount" integer,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"entity_type" "favorite_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_entity_type_entity_id_pk" PRIMARY KEY("user_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "plan_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"plan" "plan_id" NOT NULL,
	"months" integer NOT NULL,
	"amount" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text,
	"recorded_by_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "plan" "plan_id" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "featured_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "bookable_resources" ADD CONSTRAINT "bookable_resources_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_bookable_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."bookable_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_target_business_id_businesses_id_fk" FOREIGN KEY ("target_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_provider_business_id_businesses_id_fk" FOREIGN KEY ("provider_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_listings" ADD CONSTRAINT "property_listings_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_listing_id_property_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."property_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_payments" ADD CONSTRAINT "plan_payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_payments" ADD CONSTRAINT "plan_payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookable_resources_business_id_index" ON "bookable_resources" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bookings_resource_id_starts_at_index" ON "bookings" USING btree ("resource_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_business_id_starts_at_index" ON "bookings" USING btree ("business_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_customer_id_id_index" ON "bookings" USING btree ("customer_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "service_quotes_request_id_business_id_index" ON "service_quotes" USING btree ("request_id","business_id");--> statement-breakpoint
CREATE INDEX "service_requests_city_id_category_id_status_id_index" ON "service_requests" USING btree ("city_id","category_id","status","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_requests_customer_id_id_index" ON "service_requests" USING btree ("customer_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_requests_provider_business_id_status_index" ON "service_requests" USING btree ("provider_business_id","status");--> statement-breakpoint
CREATE INDEX "service_requests_target_business_id_status_index" ON "service_requests" USING btree ("target_business_id","status");--> statement-breakpoint
CREATE INDEX "events_city_id_status_starts_at_index" ON "events" USING btree ("city_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "events_search_trgm_idx" ON "events" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "tickets_user_id_id_index" ON "tickets" USING btree ("user_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tickets_event_id_index" ON "tickets" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "property_listings_city_id_status_purpose_property_type_id_index" ON "property_listings" USING btree ("city_id","status","purpose","property_type","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "property_listings_owner_id_index" ON "property_listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "listings_search_trgm_idx" ON "property_listings" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "viewing_requests_listing_id_id_index" ON "viewing_requests" USING btree ("listing_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "viewing_requests_requester_id_index" ON "viewing_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "broadcasts_business_id_id_index" ON "broadcasts" USING btree ("business_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_business_id_code_index" ON "coupons" USING btree ("business_id","code");--> statement-breakpoint
CREATE INDEX "favorites_user_id_created_at_index" ON "favorites" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "media_owner_id_index" ON "media" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "plan_payments_business_id_id_index" ON "plan_payments" USING btree ("business_id","id" DESC NULLS LAST);