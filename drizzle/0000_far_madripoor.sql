CREATE TABLE "about_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(60) NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "about_content_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(40) NOT NULL,
	"parent_id" integer,
	"opening_balance" numeric(14, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"is_control" boolean DEFAULT false,
	"control_for" varchar(20),
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "advances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"purpose" text,
	"date" date NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"advance_type" varchar(30) DEFAULT 'for-month',
	"approved_by" integer,
	"approved_at" timestamp,
	"voucher_id" integer,
	"voucher_no" varchar(60)
);
--> statement-breakpoint
CREATE TABLE "analytical_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_line_id" integer NOT NULL,
	"cost_center_id" integer NOT NULL,
	"percent" numeric(5, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"city_id" integer
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) NOT NULL,
	"check_in" varchar(10),
	"check_out" varchar(10),
	"notes" text,
	"mode" varchar(20) DEFAULT 'office',
	"remote_approval_id" integer
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" varchar(200),
	"module" varchar(80) NOT NULL,
	"record_id" integer,
	"action" varchar(30) NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb,
	"ip_address" varchar(60),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(40),
	"start_date" date,
	"end_date" date,
	"target" numeric(14, 2),
	"raised" numeric(14, 2) DEFAULT '0',
	"status" varchar(30) DEFAULT 'planned',
	"description" text,
	"image_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"district_id" integer
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"tagline" varchar(255),
	"email" varchar(200),
	"phone" varchar(60),
	"address" text,
	"city" varchar(120),
	"country" varchar(120),
	"reg_number" varchar(120),
	"ntn" varchar(80),
	"logo_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"phone" varchar(40),
	"subject" varchar(200),
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(40),
	"description" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(10) NOT NULL,
	"phone_code" varchar(10),
	CONSTRAINT "countries_name_unique" UNIQUE("name"),
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "custom_mission_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"proposed_by" varchar(120),
	"approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disbursement_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_no" varchar(60) NOT NULL,
	"title" varchar(200) NOT NULL,
	"date" date NOT NULL,
	"fund" varchar(100) NOT NULL,
	"cost_center_id" integer,
	"status" varchar(30) DEFAULT 'draft',
	"voucher_no" varchar(60),
	"voucher_type" varchar(30),
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "disbursement_batches_batch_no_unique" UNIQUE("batch_no")
);
--> statement-breakpoint
CREATE TABLE "disbursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"donor_receipt_no" varchar(60),
	"donor_serial_no" integer,
	"donor_receipt_date" date,
	"donor_id" integer,
	"donee_id" integer,
	"donee_name" varchar(200),
	"donee_category_id" integer,
	"program" varchar(120),
	"instrument_no" varchar(120),
	"instrument_date" date,
	"paid_amount" numeric(14, 2) NOT NULL,
	"remarks" text,
	"generated_by" integer,
	"generate_date" timestamp DEFAULT now(),
	"approved_by" integer,
	"approve_date" timestamp,
	"proceeded_by" integer,
	"proceed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"province_id" integer
);
--> statement-breakpoint
CREATE TABLE "donation_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_no" varchar(60) NOT NULL,
	"receipt_date" date NOT NULL,
	"donation_date" date NOT NULL,
	"donor_id" integer,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"restrict_use_in_fund" boolean DEFAULT false,
	"instrument_no" varchar(120),
	"instrument_date" date,
	"voucher_no" varchar(60),
	"voucher_type" varchar(30),
	"remarks" text,
	"status" varchar(20) DEFAULT 'active',
	"issued_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donation_receipts_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "donees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"donee_type" varchar(40),
	"category" varchar(60),
	"status" varchar(30) DEFAULT 'active',
	"cnic" varchar(30),
	"father_name" varchar(200),
	"gender" varchar(20),
	"date_of_birth" date,
	"religion" varchar(60),
	"nationality" varchar(80),
	"qualification" varchar(120),
	"occupation" varchar(120),
	"contact_person" varchar(200),
	"stn_no" varchar(60),
	"ntn_no" varchar(60),
	"phone" varchar(40),
	"email" varchar(200),
	"address" text,
	"city" varchar(120),
	"home_status" varchar(40),
	"family_size" integer,
	"men_members" integer,
	"women_members" integer,
	"boy_members" integer,
	"girl_members" integer,
	"monthly_income" numeric(14, 2),
	"personal_income" numeric(14, 2),
	"work_ability" varchar(40),
	"problem_type" varchar(80),
	"case_history" text,
	"introducer_name" varchar(200),
	"introducer_phone" varchar(40),
	"registered_no" varchar(60),
	"case_coordinator" varchar(200),
	"bank_account_title" varchar(200),
	"bank_account_no" varchar(60),
	"bank_name" varchar(120),
	"country_id" integer,
	"province_id" integer,
	"district_id" integer,
	"city_id" integer,
	"area_id" integer,
	"area" varchar(150),
	"photo_url" varchar(600),
	"remarks" text,
	"verified_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"donor_type" varchar(30) DEFAULT 'individual',
	"is_anonymous" boolean DEFAULT false,
	"membership_no" varchar(60),
	"membership_date" date,
	"registered_no" varchar(60),
	"stn_no" varchar(60),
	"ntn_no" varchar(60),
	"cnic" varchar(30),
	"father_name" varchar(200),
	"gender" varchar(20),
	"date_of_birth" date,
	"occupation" varchar(120),
	"religion" varchar(60),
	"blood_group" varchar(10),
	"contact_person" varchar(200),
	"phone" varchar(40),
	"mobile_no" varchar(40),
	"email" varchar(200),
	"address" text,
	"permanent_address" text,
	"city" varchar(120),
	"country" varchar(120),
	"introducer_name" varchar(200),
	"support_type" varchar(40),
	"support_through" varchar(40),
	"name_of_destitute" varchar(200),
	"destitute_address" text,
	"destitute_contact" varchar(60),
	"country_id" integer,
	"province_id" integer,
	"district_id" integer,
	"city_id" integer,
	"area_id" integer,
	"area" varchar(150),
	"photo_url" varchar(600),
	"status" varchar(20) DEFAULT 'active',
	"remarks" text,
	"portal_email" varchar(200),
	"password_hash" varchar(255),
	"portal_active" boolean DEFAULT false,
	"last_portal_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"to_email" varchar(200) NOT NULL,
	"to_name" varchar(200),
	"subject" varchar(300) NOT NULL,
	"body" text,
	"attachment_name" varchar(300),
	"record_type" varchar(40),
	"record_id" integer,
	"status" varchar(20) DEFAULT 'sent',
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_code" varchar(40),
	"full_name" varchar(200) NOT NULL,
	"cnic" varchar(30),
	"phone" varchar(40),
	"email" varchar(200),
	"designation" varchar(120),
	"department" varchar(120),
	"date_of_joining" date,
	"salary" numeric(14, 2),
	"status" varchar(30) DEFAULT 'active',
	"surname" varchar(120),
	"father_name" varchar(200),
	"date_of_birth" date,
	"gender" varchar(20),
	"current_address" text,
	"permanent_address" text,
	"resign_date" date,
	"resign_reason" text,
	"rejoin_date" date,
	"rejoin_reason" text,
	"commission_honor" numeric(14, 2),
	"transferred_from_dept" varchar(120),
	"previous_designation" varchar(120),
	"probation_months" integer DEFAULT 3,
	"time_in" varchar(10),
	"time_out" varchar(10),
	"cnic_verified" boolean DEFAULT false,
	"employment_history" jsonb DEFAULT '[]'::jsonb,
	"qualifications" jsonb DEFAULT '[]'::jsonb,
	"experiences" jsonb DEFAULT '[]'::jsonb,
	"children_info" jsonb DEFAULT '[]'::jsonb,
	"siblings_info" jsonb DEFAULT '[]'::jsonb,
	"parents_info" jsonb DEFAULT '[]'::jsonb,
	"salary_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "hr_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(60) NOT NULL,
	"value" varchar(60) NOT NULL,
	CONSTRAINT "hr_policies_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(40),
	"email" varchar(200),
	"source" varchar(60),
	"campaign_id" integer,
	"stage" varchar(40) DEFAULT 'new',
	"notes" text,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type" varchar(40) NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"days" numeric(5, 1),
	"reason" text,
	"status" varchar(30) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"installments" integer,
	"monthly_deduction" numeric(14, 2),
	"start_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200),
	"caption" text,
	"media_type" varchar(10) NOT NULL,
	"url" varchar(600) NOT NULL,
	"link_type" varchar(20),
	"link_id" integer,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"volunteer_id" integer NOT NULL,
	"note" text,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mission_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"volunteer_id" integer,
	"feedback" text,
	"outcome" varchar(20) DEFAULT 'pending',
	"location" varchar(200),
	"share_publicly" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(250) NOT NULL,
	"mission_type" varchar(30) DEFAULT 'child-rescue',
	"description" text,
	"location" varchar(200),
	"urgency" varchar(10) DEFAULT 'medium',
	"status" varchar(20) DEFAULT 'open',
	"share_on_website" boolean DEFAULT false,
	"thumbnail" varchar(600),
	"assigned_by" integer,
	"due_date" date,
	"country_id" integer,
	"province_id" integer,
	"district_id" integer,
	"city_id" integer,
	"area" varchar(200),
	"max_helpers" integer,
	"other_type_label" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nadra_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"cnic" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"father_name" varchar(200),
	"date_of_birth" date,
	"gender" varchar(20),
	"address" text,
	CONSTRAINT "nadra_records_cnic_unique" UNIQUE("cnic")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(250) NOT NULL,
	"slug" varchar(250) NOT NULL,
	"excerpt" text,
	"body" text,
	"cover_image" varchar(600),
	"category" varchar(30) DEFAULT 'update',
	"author" varchar(120),
	"is_published" boolean DEFAULT true,
	"published_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "provinces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"country_id" integer
);
--> statement-breakpoint
CREATE TABLE "public_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"summary" text,
	"description" text,
	"goal" numeric(14, 2),
	"raised" numeric(14, 2) DEFAULT '0',
	"image_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "receipt_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"serial_no" integer NOT NULL,
	"month" varchar(7),
	"donee_id" integer,
	"category_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"remarks" text,
	"from_date" date,
	"to_date" date
);
--> statement-breakpoint
CREATE TABLE "receipt_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"serial_no" integer NOT NULL,
	"donee_id" integer,
	"category_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"remarks" text,
	"from_date" date,
	"to_date" date
);
--> statement-breakpoint
CREATE TABLE "remote_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"location" varchar(200),
	"reason" text,
	"status" varchar(20) DEFAULT 'pending',
	"approved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "salaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"month" varchar(10) NOT NULL,
	"basic" numeric(14, 2),
	"allowances" numeric(14, 2) DEFAULT '0',
	"deductions" numeric(14, 2) DEFAULT '0',
	"net" numeric(14, 2),
	"status" varchar(20) DEFAULT 'draft',
	"paid_at" timestamp,
	"other_deductions" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "tax_slabs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slab_order" integer NOT NULL,
	"min_amount" numeric(16, 2) NOT NULL,
	"max_amount" numeric(16, 2),
	"fixed_tax" numeric(16, 2) DEFAULT '0',
	"rate_percent" numeric(6, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role_id" integer,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"vendor_type" varchar(40),
	"cnic" varchar(30),
	"ntn_no" varchar(60),
	"phone" varchar(40),
	"email" varchar(200),
	"address" text,
	"city" varchar(120),
	"opening_balance" numeric(14, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"phone" varchar(40),
	"cnic" varchar(30),
	"city" varchar(120),
	"volunteer_type" varchar(30) DEFAULT 'citizen',
	"skills" text,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "volunteers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voucher_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"cost_center_id" integer,
	"debit" numeric(14, 2) DEFAULT '0',
	"credit" numeric(14, 2) DEFAULT '0',
	"narration" text,
	"partner_type" varchar(20),
	"partner_id" integer
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_no" varchar(60) NOT NULL,
	"date" date NOT NULL,
	"type" varchar(30) NOT NULL,
	"narration" text,
	"total_amount" numeric(14, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'posted',
	"posted_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_voucher_no_unique" UNIQUE("voucher_no")
);
--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytical_distributions" ADD CONSTRAINT "analytical_distributions_voucher_line_id_voucher_lines_id_fk" FOREIGN KEY ("voucher_line_id") REFERENCES "public"."voucher_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytical_distributions" ADD CONSTRAINT "analytical_distributions_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_batches" ADD CONSTRAINT "disbursement_batches_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_batches" ADD CONSTRAINT "disbursement_batches_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_batch_id_disbursement_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."disbursement_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_donee_id_donees_id_fk" FOREIGN KEY ("donee_id") REFERENCES "public"."donees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_donee_category_id_cost_centers_id_fk" FOREIGN KEY ("donee_category_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_proceeded_by_users_id_fk" FOREIGN KEY ("proceeded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_receipts" ADD CONSTRAINT "donation_receipts_donor_id_donors_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_receipts" ADD CONSTRAINT "donation_receipts_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donees" ADD CONSTRAINT "donees_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donees" ADD CONSTRAINT "donees_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donees" ADD CONSTRAINT "donees_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donees" ADD CONSTRAINT "donees_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donees" ADD CONSTRAINT "donees_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donees" ADD CONSTRAINT "donees_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_results" ADD CONSTRAINT "mission_results_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_results" ADD CONSTRAINT "mission_results_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_province_id_provinces_id_fk" FOREIGN KEY ("province_id") REFERENCES "public"."provinces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_distributions" ADD CONSTRAINT "receipt_distributions_receipt_id_donation_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."donation_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_distributions" ADD CONSTRAINT "receipt_distributions_donee_id_donees_id_fk" FOREIGN KEY ("donee_id") REFERENCES "public"."donees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_distributions" ADD CONSTRAINT "receipt_distributions_category_id_cost_centers_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_receipt_id_donation_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."donation_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_donee_id_donees_id_fk" FOREIGN KEY ("donee_id") REFERENCES "public"."donees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_category_id_cost_centers_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_approvals" ADD CONSTRAINT "remote_approvals_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remote_approvals" ADD CONSTRAINT "remote_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_lines" ADD CONSTRAINT "voucher_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;