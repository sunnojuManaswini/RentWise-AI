-- RentWise Initial Seed Data Script
-- Test Accounts:
-- Owner: owner@rentwise.com / Password123!
-- Tenant: tenant@rentwise.com / Password123!

-- Password Hash for 'Password123!'
-- $2a$10$E5XQj4.xQZ2tQ0pW2V9Yze.RkL0F8tK0gH1Z1jX2Y3Z4A5B6C7D8E

INSERT IGNORE INTO users (id, full_name, email, password_hash, role, phone) VALUES 
('u-owner-001', 'Rajesh Sharma (Property Owner)', 'owner@rentwise.com', '$2b$10$63.eFh5F9.H73B1tY723l.1oU3J7H04W1uR8aT6eY7Z8x9A0b1C2d', 'OWNER', '+91 98765 43210'),
('u-tenant-001', 'Rahul Verma (Tenant)', 'tenant@rentwise.com', '$2b$10$63.eFh5F9.H73B1tY723l.1oU3J7H04W1uR8aT6eY7Z8x9A0b1C2d', 'TENANT', '+91 91234 56789'),
('u-tenant-002', 'Priya Patel (Tenant)', 'priya@rentwise.com', '$2b$10$63.eFh5F9.H73B1tY723l.1oU3J7H04W1uR8aT6eY7Z8x9A0b1C2d', 'TENANT', '+91 99887 76655');

-- Properties
INSERT IGNORE INTO properties (id, owner_id, name, property_type, house_flat_no, block, street, road, locality, city, state, country, pin_code, latitude, longitude, bedrooms, bathrooms, area_sqft, parking_available, elevator_available, furnishing_status) VALUES
('p-hyd-001', 'u-owner-001', 'Green Heights Residency', 'APARTMENT', 'Plot 42', 'Block A', 'Road No. 12', 'Banjara Hills Main Road', 'Banjara Hills', 'Hyderabad', 'Telangana', 'India', '500034', 17.4156, 78.4347, 3, 3, 1850, TRUE, TRUE, 'FULLY_FURNISHED'),
('p-blr-001', 'u-owner-001', 'Silicon Tech Villas', 'INDEPENDENT_HOUSE', 'Villa 14', 'Phase 1', '100 Feet Road', 'Indiranagar 12th Main', 'Indiranagar', 'Bengaluru', 'Karnataka', 'India', '560038', 12.9784, 77.6408, 2, 2, 1200, TRUE, FALSE, 'SEMI_FURNISHED');

-- Buildings
INSERT IGNORE INTO buildings (id, property_id, name, description) VALUES
('b-hyd-a', 'p-hyd-001', 'Tower A - Executive Suites', 'Luxury residential tower with elevator and 24/7 security'),
('b-hyd-b', 'p-hyd-001', 'Tower B - Premium Apartments', 'Modern residential block with basement parking'),
('b-blr-v1', 'p-blr-001', 'Villa Block 1', 'Private quiet community block');

-- Floors
INSERT IGNORE INTO floors (id, building_id, floor_number, name) VALUES
('f-hyd-a-g', 'b-hyd-a', 0, 'Ground Floor'),
('f-hyd-a-1', 'b-hyd-a', 1, 'First Floor'),
('f-hyd-a-2', 'b-hyd-a', 2, 'Second Floor'),
('f-blr-v1-1', 'b-blr-v1', 1, 'First Floor');

-- Units
INSERT IGNORE INTO units (id, floor_id, unit_number, bedrooms, bathrooms, area_sqft, monthly_rent, maintenance_charge, security_deposit, rent_due_day, status) VALUES
('u-hyd-g01', 'f-hyd-a-g', 'Unit G01', 2, 2, 1100, 15000.00, 1500.00, 30000.00, 5, 'OCCUPIED'),
('u-hyd-101', 'f-hyd-a-1', 'Unit 101', 3, 3, 1600, 25000.00, 2000.00, 50000.00, 5, 'OCCUPIED'),
('u-hyd-201', 'f-hyd-a-2', 'Unit 201', 3, 3, 1650, 26000.00, 2000.00, 52000.00, 5, 'VACANT'),
('u-blr-101', 'f-blr-v1-1', 'Villa Unit 101', 2, 2, 1200, 22000.00, 1800.00, 44000.00, 1, 'VACANT');

-- Tenants Mapping
INSERT IGNORE INTO tenants (id, user_id, unit_id, owner_id, status, move_in_date) VALUES
('t-rahul-001', 'u-tenant-001', 'u-hyd-g01', 'u-owner-001', 'ACTIVE', '2026-01-01'),
('t-priya-001', 'u-tenant-002', 'u-hyd-101', 'u-owner-001', 'ACTIVE', '2026-03-01');

-- Agreements
INSERT IGNORE INTO rental_agreements (id, unit_id, tenant_id, owner_id, start_date, end_date, monthly_rent, security_deposit, notice_period_days, agreement_status, document_url, extracted_terms_json) VALUES
('ag-rahul-001', 'u-hyd-g01', 't-rahul-001', 'u-owner-001', '2026-01-01', '2026-12-31', 15000.00, 30000.00, 30, 'ACTIVE', '/uploads/agreements/rahul_green_heights.pdf', '{"monthly_rent": 15000, "security_deposit": 30000, "notice_period_days": 30, "lock_in_months": 6, "late_fee_percentage": 5, "electricity_by": "Tenant", "water_included": true, "pet_policy": "Not Allowed"}'),
('ag-priya-001', 'u-hyd-101', 't-priya-001', 'u-owner-001', '2026-03-01', '2027-02-28', 25000.00, 50000.00, 60, 'ACTIVE', '/uploads/agreements/priya_green_heights.pdf', '{"monthly_rent": 25000, "security_deposit": 50000, "notice_period_days": 60, "lock_in_months": 11, "electricity_by": "Tenant", "water_included": false, "pet_policy": "Allowed with consent"}');

-- Rent Obligations
INSERT IGNORE INTO rent_obligations (id, unit_id, tenant_id, owner_id, period_month, due_date, rent_amount, maintenance_charge, total_due, status, notes) VALUES
('ro-2026-09-rahul', 'u-hyd-g01', 't-rahul-001', 'u-owner-001', '2026-09', '2026-09-05', 15000.00, 1500.00, 16500.00, 'PAID', 'September 2026 Rent & Maintenance'),
('ro-2026-10-rahul', 'u-hyd-g01', 't-rahul-001', 'u-owner-001', '2026-10', '2026-10-05', 15000.00, 1500.00, 16500.00, 'PARTIAL', 'October 2026 Rent - Partial Payment Received'),
('ro-2026-10-priya', 'u-hyd-101', 't-priya-001', 'u-owner-001', '2026-10', '2026-10-05', 25000.00, 2000.00, 27000.00, 'OVERDUE', 'October 2026 Rent Pending');

-- Payments (Demonstrates Partial & Full Payments)
INSERT IGNORE INTO rent_payments (id, obligation_id, tenant_id, owner_id, amount_paid, payment_date, payment_method, transaction_id, status, notes, receipt_url) VALUES
('pmt-sep-full', 'ro-2026-09-rahul', 't-rahul-001', 'u-owner-001', 16500.00, '2026-09-03', 'UPI', 'UPI/20260903/89123', 'VERIFIED', 'Paid in full via GPay', '/uploads/receipts/sep_receipt_rahul.pdf'),
('pmt-oct-part1', 'ro-2026-10-rahul', 't-rahul-001', 'u-owner-001', 5000.00, '2026-10-02', 'UPI', 'UPI/20261002/11223', 'VERIFIED', 'First partial payment for Oct', '/uploads/receipts/oct_part1_rahul.jpg'),
('pmt-oct-part2', 'ro-2026-10-rahul', 't-rahul-001', 'u-owner-001', 5000.00, '2026-10-06', 'BANK_TRANSFER', 'NEFT/20261006/44556', 'VERIFIED', 'Second partial payment for Oct', '/uploads/receipts/oct_part2_rahul.jpg');

-- Deposit Settlement Record
INSERT IGNORE INTO deposit_transactions (id, unit_id, tenant_id, owner_id, original_deposit, wall_repair_deduction, outstanding_rent_deduction, other_deductions, deduction_reasons, final_refund_amount, settlement_status) VALUES
('dep-rahul-001', 'u-hyd-g01', 't-rahul-001', 'u-owner-001', 30000.00, 3000.00, 0.00, 2000.00, 'Wall paint touch-up (₹3,000) and deep cleaning fee (₹2,000)', 25000.00, 'PENDING');

-- Maintenance Requests
INSERT IGNORE INTO maintenance_requests (id, unit_id, tenant_id, owner_id, title, description, category, priority, status, reported_date) VALUES
('maint-001', 'u-hyd-g01', 't-rahul-001', 'u-owner-001', 'Master Bathroom Pipe Leakage', 'Water seepage under the vanity washbasin causing floor wetness.', 'PLUMBING', 'HIGH', 'IN_PROGRESS', '2026-10-03'),
('maint-002', 'u-hyd-101', 't-priya-001', 'u-owner-001', 'Living Room AC Cooling Issue', 'Split AC compressor not turning on in the afternoon.', 'APPLIANCE', 'MEDIUM', 'REPORTED', '2026-10-06');

-- Evidence
INSERT IGNORE INTO evidence (id, maintenance_id, payment_id, user_id, title, description, file_url, file_type) VALUES
('ev-001', 'maint-001', NULL, 'u-tenant-001', 'Leaking pipe photo', 'Close up of damaged connector under sink', '/uploads/evidence/sink_leak.jpg', 'IMAGE'),
('ev-002', NULL, 'pmt-oct-part1', 'u-tenant-001', 'GPay Transaction Receipt', 'Screenshot of ₹5,000 transfer', '/uploads/evidence/gpay_oct_part1.png', 'IMAGE');

-- Notifications
INSERT IGNORE INTO notifications (id, user_id, title, message, type, is_read) VALUES
('notif-001', 'u-tenant-001', 'Rent Due Reminder', 'Your October rent balance of ₹6,500 is due.', 'RENT_DUE', FALSE),
('notif-002', 'u-owner-001', 'Partial Payment Received', 'Rahul Verma paid ₹5,000 for October rent.', 'GENERAL', FALSE),
('notif-003', 'u-owner-001', 'New Maintenance Request', 'Priya Patel reported AC cooling issue in Unit 101.', 'MAINTENANCE_UPDATE', FALSE);
