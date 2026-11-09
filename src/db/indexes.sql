-- Shauoor Welfare Society — Database Indexes
-- Run once after drizzle-kit push to add performance indexes on all FK and frequently queried columns.
-- PostgreSQL does NOT auto-create indexes on FK columns (only on PKs).

-- Geography hierarchy
CREATE INDEX IF NOT EXISTS idx_provinces_country  ON provinces(country_id);
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts(province_id);
CREATE INDEX IF NOT EXISTS idx_cities_district    ON cities(district_id);
CREATE INDEX IF NOT EXISTS idx_areas_city         ON areas(city_id);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Donors
CREATE INDEX IF NOT EXISTS idx_donors_country       ON donors(country_id);
CREATE INDEX IF NOT EXISTS idx_donors_province      ON donors(province_id);
CREATE INDEX IF NOT EXISTS idx_donors_district      ON donors(district_id);
CREATE INDEX IF NOT EXISTS idx_donors_city          ON donors(city_id);
CREATE INDEX IF NOT EXISTS idx_donors_area          ON donors(area_id);
CREATE INDEX IF NOT EXISTS idx_donors_portal_email  ON donors(portal_email);

-- Donees
CREATE INDEX IF NOT EXISTS idx_donees_country   ON donees(country_id);
CREATE INDEX IF NOT EXISTS idx_donees_province  ON donees(province_id);
CREATE INDEX IF NOT EXISTS idx_donees_district  ON donees(district_id);
CREATE INDEX IF NOT EXISTS idx_donees_city      ON donees(city_id);
CREATE INDEX IF NOT EXISTS idx_donees_area      ON donees(area_id);
CREATE INDEX IF NOT EXISTS idx_donees_category  ON donees(category);
CREATE INDEX IF NOT EXISTS idx_donees_status    ON donees(status);

-- Donation receipts
CREATE INDEX IF NOT EXISTS idx_receipts_donor  ON donation_receipts(donor_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date   ON donation_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON donation_receipts(status);

-- Receipt lines
CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_donee   ON receipt_lines(donee_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_cat     ON receipt_lines(category_id);

-- Receipt distributions
CREATE INDEX IF NOT EXISTS idx_receipt_dist_receipt ON receipt_distributions(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_dist_donee   ON receipt_distributions(donee_id);
CREATE INDEX IF NOT EXISTS idx_receipt_dist_month   ON receipt_distributions(month);

-- Disbursement batches
CREATE INDEX IF NOT EXISTS idx_disb_batch_status ON disbursement_batches(status);

-- Disbursements
CREATE INDEX IF NOT EXISTS idx_disbursements_batch ON disbursements(batch_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_donee ON disbursements(donee_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_donor ON disbursements(donor_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_cat   ON disbursements(donee_category_id);

-- Vouchers
CREATE INDEX IF NOT EXISTS idx_vouchers_date   ON vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_type   ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- Voucher lines
CREATE INDEX IF NOT EXISTS idx_voucher_lines_voucher ON voucher_lines(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_account ON voucher_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_voucher_lines_partner ON voucher_lines(partner_type, partner_id);

-- Analytical distributions
CREATE INDEX IF NOT EXISTS idx_analytical_line ON analytical_distributions(voucher_line_id);
CREATE INDEX IF NOT EXISTS idx_analytical_cc   ON analytical_distributions(cost_center_id);

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_type    ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_control ON accounts(control_for);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_dept   ON employees(department);

-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON attendance(date);

-- Leaves
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status   ON leaves(status);

-- Salaries
CREATE INDEX IF NOT EXISTS idx_salaries_employee ON salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_month    ON salaries(month);

-- Advances
CREATE INDEX IF NOT EXISTS idx_advances_employee ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_status   ON advances(status);

-- Loans
CREATE INDEX IF NOT EXISTS idx_loans_employee ON loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_loans_status   ON loans(status);

-- Remote approvals
CREATE INDEX IF NOT EXISTS idx_remote_approvals_employee ON remote_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_remote_approvals_status   ON remote_approvals(status);

-- CRM
CREATE INDEX IF NOT EXISTS idx_leads_stage    ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_module  ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_record  ON audit_logs(record_id);

-- Media
CREATE INDEX IF NOT EXISTS idx_media_link ON media(link_type, link_id);

-- Missions
CREATE INDEX IF NOT EXISTS idx_missions_status  ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_country ON missions(country_id);

-- Mission assignments
CREATE INDEX IF NOT EXISTS idx_mission_assign_mission   ON mission_assignments(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_assign_volunteer ON mission_assignments(volunteer_id);

-- Mission results
CREATE INDEX IF NOT EXISTS idx_mission_results_mission   ON mission_results(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_results_volunteer ON mission_results(volunteer_id);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_category  ON posts(category);

-- Volunteers
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);

-- Contact messages
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contact_messages(created_at);
