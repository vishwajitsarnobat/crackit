-- CRACK IT COACHING INSTITUTE - HEAVY DATA ENTRY SEED
-- Run this only after `database_schema.sql` on a non-production database.
-- This file adds realistic load data for centres, batches, staff, students,
-- attendance, exams, fees, salaries, expenses, approvals, and rewards.

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 1: AUTH USERS (Supabase managed)
-- ---------------------------------------------------------------------------

-- The auth insert shape below targets the standard Supabase auth.users layout.
-- If your hosted auth schema differs, adapt only this section and keep all UUIDs.

INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'ceo@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Mehta"}', NOW(), NOW(), '', '', '', ''),
    ('22222222-2222-2222-2222-222222222221', 'authenticated', 'authenticated', 'head.north@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nisha Kapoor"}', NOW(), NOW(), '', '', '', ''),
    ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'head.west@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Sethi"}', NOW(), NOW(), '', '', '', ''),
    ('33333333-3333-3333-3333-333333333331', 'authenticated', 'authenticated', 'accounts.north@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ishita Rao"}', NOW(), NOW(), '', '', '', ''),
    ('33333333-3333-3333-3333-333333333332', 'authenticated', 'authenticated', 'accounts.west@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vivek Menon"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444441', 'authenticated', 'authenticated', 'teacher.maths@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sharma"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444442', 'authenticated', 'authenticated', 'teacher.physics@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aditya Verma"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444443', 'authenticated', 'authenticated', 'teacher.chem@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sneha Iyer"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'teacher.bio@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kunal Batra"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555501', 'authenticated', 'authenticated', 'student.001@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Anaya Gupta"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555502', 'authenticated', 'authenticated', 'student.002@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kabir Jain"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555503', 'authenticated', 'authenticated', 'student.003@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Singh"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555504', 'authenticated', 'authenticated', 'student.004@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dev Malhotra"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555505', 'authenticated', 'authenticated', 'student.005@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Riya Nanda"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555506', 'authenticated', 'authenticated', 'student.006@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arjun Khanna"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555507', 'authenticated', 'authenticated', 'student.007@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Ali"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555508', 'authenticated', 'authenticated', 'student.008@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yash Arora"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555509', 'authenticated', 'authenticated', 'student.009@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ira Chawla"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555510', 'authenticated', 'authenticated', 'student.010@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rehan Das"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555511', 'authenticated', 'authenticated', 'student.011@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tara Bansal"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555512', 'authenticated', 'authenticated', 'student.012@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Neil Joshi"}', NOW(), NOW(), '', '', '', ''),
    ('66666666-6666-6666-6666-666666666661', 'authenticated', 'authenticated', 'pending.teacher@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pending Teacher"}', NOW(), NOW(), '', '', '', ''),
    ('66666666-6666-6666-6666-666666666662', 'authenticated', 'authenticated', 'pending.student@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pending Student"}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 2: APP USERS, CENTRES, ASSIGNMENTS, AND APPROVALS
-- ---------------------------------------------------------------------------

INSERT INTO centres (centre_code, centre_name, address, city, phone, is_active)
VALUES
    ('NTH-001', 'Crack It North Campus', '12 Scholar Avenue, Sector 19', 'Delhi', '9811000001', TRUE),
    ('WST-001', 'Crack It West Campus', '47 Knowledge Park, Link Road', 'Mumbai', '9811000002', TRUE),
    ('SOU-001', 'Crack It South Campus', '88 Academy Circle, Phase 2', 'Bengaluru', '9811000003', TRUE)
ON CONFLICT (centre_code) DO UPDATE
SET centre_name = EXCLUDED.centre_name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO users (id, role_id, full_name, email, phone, is_active)
SELECT seed.id, r.id, seed.full_name, seed.email, seed.phone, seed.is_active
FROM (
    VALUES
        ('11111111-1111-1111-1111-111111111111'::UUID, 'ceo', 'Aarav Mehta', 'ceo@crackit.test', '9811001000', TRUE),
        ('22222222-2222-2222-2222-222222222221'::UUID, 'centre_head', 'Nisha Kapoor', 'head.north@crackit.test', '9811001001', TRUE),
        ('22222222-2222-2222-2222-222222222222'::UUID, 'centre_head', 'Rahul Sethi', 'head.west@crackit.test', '9811001002', TRUE),
        ('33333333-3333-3333-3333-333333333331'::UUID, 'accountant', 'Ishita Rao', 'accounts.north@crackit.test', '9811001003', TRUE),
        ('33333333-3333-3333-3333-333333333332'::UUID, 'accountant', 'Vivek Menon', 'accounts.west@crackit.test', '9811001004', TRUE),
        ('44444444-4444-4444-4444-444444444441'::UUID, 'teacher', 'Priya Sharma', 'teacher.maths@crackit.test', '9811002001', TRUE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'teacher', 'Aditya Verma', 'teacher.physics@crackit.test', '9811002002', TRUE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'teacher', 'Sneha Iyer', 'teacher.chem@crackit.test', '9811002003', TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'teacher', 'Kunal Batra', 'teacher.bio@crackit.test', '9811002004', TRUE),
        ('55555555-5555-5555-5555-555555555501'::UUID, 'student', 'Anaya Gupta', 'student.001@crackit.test', '9811003001', TRUE),
        ('55555555-5555-5555-5555-555555555502'::UUID, 'student', 'Kabir Jain', 'student.002@crackit.test', '9811003002', TRUE),
        ('55555555-5555-5555-5555-555555555503'::UUID, 'student', 'Meera Singh', 'student.003@crackit.test', '9811003003', TRUE),
        ('55555555-5555-5555-5555-555555555504'::UUID, 'student', 'Dev Malhotra', 'student.004@crackit.test', '9811003004', TRUE),
        ('55555555-5555-5555-5555-555555555505'::UUID, 'student', 'Riya Nanda', 'student.005@crackit.test', '9811003005', TRUE),
        ('55555555-5555-5555-5555-555555555506'::UUID, 'student', 'Arjun Khanna', 'student.006@crackit.test', '9811003006', TRUE),
        ('55555555-5555-5555-5555-555555555507'::UUID, 'student', 'Sara Ali', 'student.007@crackit.test', '9811003007', TRUE),
        ('55555555-5555-5555-5555-555555555508'::UUID, 'student', 'Yash Arora', 'student.008@crackit.test', '9811003008', TRUE),
        ('55555555-5555-5555-5555-555555555509'::UUID, 'student', 'Ira Chawla', 'student.009@crackit.test', '9811003009', TRUE),
        ('55555555-5555-5555-5555-555555555510'::UUID, 'student', 'Rehan Das', 'student.010@crackit.test', '9811003010', TRUE),
        ('55555555-5555-5555-5555-555555555511'::UUID, 'student', 'Tara Bansal', 'student.011@crackit.test', '9811003011', TRUE),
        ('55555555-5555-5555-5555-555555555512'::UUID, 'student', 'Neil Joshi', 'student.012@crackit.test', '9811003012', TRUE),
        ('66666666-6666-6666-6666-666666666661'::UUID, 'teacher', 'Pending Teacher', 'pending.teacher@crackit.test', '9811999001', FALSE),
        ('66666666-6666-6666-6666-666666666662'::UUID, 'student', 'Pending Student', 'pending.student@crackit.test', '9811999002', FALSE)
) AS seed(id, role_name, full_name, email, phone, is_active)
JOIN roles r ON r.role_name = seed.role_name
ON CONFLICT (id) DO UPDATE
SET role_id = EXCLUDED.role_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO user_centre_assignments (user_id, centre_id, is_primary, is_active)
SELECT mapping.user_id, c.id, mapping.is_primary, TRUE
FROM (
    VALUES
        ('22222222-2222-2222-2222-222222222221'::UUID, 'NTH-001', TRUE),
        ('22222222-2222-2222-2222-222222222222'::UUID, 'WST-001', TRUE),
        ('33333333-3333-3333-3333-333333333331'::UUID, 'NTH-001', TRUE),
        ('33333333-3333-3333-3333-333333333332'::UUID, 'WST-001', TRUE),
        ('44444444-4444-4444-4444-444444444441'::UUID, 'NTH-001', TRUE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'NTH-001', TRUE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'WST-001', TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'WST-001', TRUE),
        ('66666666-6666-6666-6666-666666666661'::UUID, 'SOU-001', TRUE),
        ('66666666-6666-6666-6666-666666666662'::UUID, 'SOU-001', TRUE)
) AS mapping(user_id, centre_code, is_primary)
JOIN centres c ON c.centre_code = mapping.centre_code
ON CONFLICT (user_id, centre_id) DO UPDATE
SET is_primary = EXCLUDED.is_primary,
    is_active = TRUE;

INSERT INTO user_approval_requests (user_id, centre_id, requested_role, status, reviewed_by, reviewed_at, rejection_reason, applicant_note)
SELECT seed.user_id, c.id, seed.requested_role, seed.status, seed.reviewed_by, seed.reviewed_at, seed.rejection_reason, seed.applicant_note
FROM (
    VALUES
        ('66666666-6666-6666-6666-666666666661'::UUID, 'SOU-001', 'teacher', 'pending', NULL::UUID, NULL::TIMESTAMPTZ, NULL::TEXT, 'Awaiting approval for South campus chemistry support.'),
        ('66666666-6666-6666-6666-666666666662'::UUID, 'SOU-001', 'student', 'pending', NULL::UUID, NULL::TIMESTAMPTZ, NULL::TEXT, 'Ready to join foundation batch.'),
        ('33333333-3333-3333-3333-333333333332'::UUID, NULL, 'accountant', 'approved', '11111111-1111-1111-1111-111111111111'::UUID, NOW() - INTERVAL '20 days', NULL::TEXT, 'Handled by CEO for west campus finance support.')
) AS seed(user_id, centre_code, requested_role, status, reviewed_by, reviewed_at, rejection_reason, applicant_note)
LEFT JOIN centres c ON c.centre_code = seed.centre_code
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 3: BATCHES, STUDENTS, ENROLLMENTS, AND TEACHER ASSIGNMENTS
-- ---------------------------------------------------------------------------

INSERT INTO batches (centre_id, batch_code, batch_name, academic_year, is_active)
SELECT c.id, seed.batch_code, seed.batch_name, seed.academic_year, TRUE
FROM (
    VALUES
        ('NTH-001', 'N11', 'North Class 11 - Morning', '2025-26'),
        ('NTH-001', 'N12', 'North Class 12 - Evening', '2025-26'),
        ('WST-001', 'W11', 'West Class 11 - Morning', '2025-26'),
        ('WST-001', 'W12', 'West Class 12 - Weekend', '2025-26'),
        ('SOU-001', 'S10', 'South Foundation - Morning', '2025-26'),
        ('SOU-001', 'S11', 'South Class 11 - Hybrid', '2025-26')
) AS seed(centre_code, batch_code, batch_name, academic_year)
JOIN centres c ON c.centre_code = seed.centre_code
ON CONFLICT (centre_id, batch_code) DO UPDATE
SET batch_name = EXCLUDED.batch_name,
    academic_year = EXCLUDED.academic_year,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO students (
    id,
    user_id,
    date_of_birth,
    class_level,
    parent_name,
    parent_phone,
    declaration_accepted,
    declaration_accepted_at,
    admission_form_data,
    current_points,
    is_active
)
VALUES
    ('77777777-7777-7777-7777-777777777501', '55555555-5555-5555-5555-555555555501', '2009-05-14', 11, 'Rohan Gupta', '9899000001', TRUE, NOW() - INTERVAL '120 days', '{"school":"Springfield Public","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777502', '55555555-5555-5555-5555-555555555502', '2008-11-03', 12, 'Anita Jain', '9899000002', TRUE, NOW() - INTERVAL '110 days', '{"school":"Modern Academy","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777503', '55555555-5555-5555-5555-555555555503', '2009-01-25', 11, 'Mahesh Singh', '9899000003', TRUE, NOW() - INTERVAL '108 days', '{"school":"City Scholars","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777504', '55555555-5555-5555-5555-555555555504', '2008-07-09', 12, 'Pooja Malhotra', '9899000004', TRUE, NOW() - INTERVAL '106 days', '{"school":"Greenfield High","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777505', '55555555-5555-5555-5555-555555555505', '2009-06-18', 11, 'Deepak Nanda', '9899000005', TRUE, NOW() - INTERVAL '104 days', '{"school":"Mount View","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777506', '55555555-5555-5555-5555-555555555506', '2008-04-22', 12, 'Shalini Khanna', '9899000006', TRUE, NOW() - INTERVAL '102 days', '{"school":"National Model","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777507', '55555555-5555-5555-5555-555555555507', '2010-09-12', 10, 'Aamir Ali', '9899000007', TRUE, NOW() - INTERVAL '100 days', '{"school":"Riverdale School","stream":"Foundation"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777508', '55555555-5555-5555-5555-555555555508', '2009-08-28', 11, 'Puneet Arora', '9899000008', TRUE, NOW() - INTERVAL '98 days', '{"school":"Scholars Point","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777509', '55555555-5555-5555-5555-555555555509', '2009-10-06', 11, 'Rekha Chawla', '9899000009', TRUE, NOW() - INTERVAL '96 days', '{"school":"Central Heights","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777510', '55555555-5555-5555-5555-555555555510', '2008-02-19', 12, 'Harsh Das', '9899000010', TRUE, NOW() - INTERVAL '94 days', '{"school":"Future World","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777511', '55555555-5555-5555-5555-555555555511', '2009-03-15', 11, 'Komal Bansal', '9899000011', TRUE, NOW() - INTERVAL '92 days', '{"school":"North Star School","stream":"Science"}', 0, TRUE),
    ('77777777-7777-7777-7777-777777777512', '55555555-5555-5555-5555-555555555512', '2010-12-01', 10, 'Ritesh Joshi', '9899000012', TRUE, NOW() - INTERVAL '90 days', '{"school":"Blue Bells","stream":"Foundation"}', 0, TRUE)
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    class_level = EXCLUDED.class_level,
    parent_name = EXCLUDED.parent_name,
    parent_phone = EXCLUDED.parent_phone,
    declaration_accepted = EXCLUDED.declaration_accepted,
    declaration_accepted_at = EXCLUDED.declaration_accepted_at,
    admission_form_data = EXCLUDED.admission_form_data,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, monthly_fee, status)
SELECT seed.student_id, b.id, seed.enrollment_date, seed.monthly_fee, seed.status
FROM (
    VALUES
        ('77777777-7777-7777-7777-777777777501'::UUID, 'N11', '2026-01-10'::DATE, 4200.00, 'active'),
        ('77777777-7777-7777-7777-777777777502'::UUID, 'N12', '2026-01-08'::DATE, 4600.00, 'active'),
        ('77777777-7777-7777-7777-777777777503'::UUID, 'N11', '2026-01-12'::DATE, 4200.00, 'active'),
        ('77777777-7777-7777-7777-777777777504'::UUID, 'N12', '2026-01-14'::DATE, 4600.00, 'active'),
        ('77777777-7777-7777-7777-777777777505'::UUID, 'W11', '2026-01-09'::DATE, 4100.00, 'active'),
        ('77777777-7777-7777-7777-777777777506'::UUID, 'W12', '2026-01-11'::DATE, 4550.00, 'active'),
        ('77777777-7777-7777-7777-777777777507'::UUID, 'S10', '2026-01-15'::DATE, 3600.00, 'active'),
        ('77777777-7777-7777-7777-777777777508'::UUID, 'W11', '2026-01-16'::DATE, 4100.00, 'active'),
        ('77777777-7777-7777-7777-777777777509'::UUID, 'S11', '2026-01-18'::DATE, 3900.00, 'active'),
        ('77777777-7777-7777-7777-777777777510'::UUID, 'W12', '2026-01-13'::DATE, 4550.00, 'active'),
        ('77777777-7777-7777-7777-777777777511'::UUID, 'N11', '2026-01-20'::DATE, 4200.00, 'active'),
        ('77777777-7777-7777-7777-777777777512'::UUID, 'S10', '2026-01-17'::DATE, 3600.00, 'active'),
        ('77777777-7777-7777-7777-777777777507'::UUID, 'S11', '2026-02-01'::DATE, 3900.00, 'active')
) AS seed(student_id, batch_code, enrollment_date, monthly_fee, status)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT DO NOTHING;

INSERT INTO teacher_batch_assignments (user_id, batch_id, subject, monthly_salary, assignment_start_date, is_active)
SELECT seed.user_id, b.id, seed.subject, seed.monthly_salary, seed.assignment_start_date, TRUE
FROM (
    VALUES
        ('44444444-4444-4444-4444-444444444441'::UUID, 'N11', 'Mathematics', 24000.00, '2026-01-01'::DATE),
        ('44444444-4444-4444-4444-444444444441'::UUID, 'N12', 'Mathematics', 26000.00, '2026-01-01'::DATE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'N11', 'Physics', 23000.00, '2026-01-01'::DATE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'W11', 'Physics', 22000.00, '2026-01-01'::DATE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'W12', 'Chemistry', 25000.00, '2026-01-01'::DATE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'S11', 'Chemistry', 21000.00, '2026-02-01'::DATE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'S10', 'Biology', 20000.00, '2026-01-01'::DATE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'W12', 'Biology', 23500.00, '2026-01-01'::DATE)
) AS seed(user_id, batch_code, subject, monthly_salary, assignment_start_date)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 4: CONTENT, ATTENDANCE, EXAMS, AND MARKS
-- ---------------------------------------------------------------------------

INSERT INTO content (batch_id, title, content_url, content_type, remarks, uploaded_by, is_published)
SELECT b.id, seed.title, seed.content_url, seed.content_type, seed.remarks, seed.uploaded_by, seed.is_published
FROM (
    VALUES
        ('N11', 'Quadratic Equations Masterclass', 'https://example.com/content/n11-maths-1', 'video', 'Morning revision session', '44444444-4444-4444-4444-444444444441'::UUID, TRUE),
        ('N12', 'Organic Chemistry Reaction Sheet', 'https://example.com/content/n12-chem-1', 'document', 'Reaction summary notes', '44444444-4444-4444-4444-444444444443'::UUID, TRUE),
        ('W11', 'Physics Numericals Practice', 'https://example.com/content/w11-phy-1', 'document', 'Worksheet set A', '44444444-4444-4444-4444-444444444442'::UUID, TRUE),
        ('S10', 'Foundation Biology Basics', 'https://example.com/content/s10-bio-1', 'video', 'Introductory lecture', '44444444-4444-4444-4444-444444444444'::UUID, TRUE)
) AS seed(batch_code, title, content_url, content_type, remarks, uploaded_by, is_published)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT DO NOTHING;

INSERT INTO attendance (student_id, batch_id, attendance_date, status, marked_by)
SELECT
    sbe.student_id,
    sbe.batch_id,
    generated.attendance_date,
    CASE
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + ascii(right(s.student_code, 1))) % 7 IN (0, 6) THEN 'absent'
        ELSE 'present'
    END,
    teacher_assignment.user_id
FROM student_batch_enrollments sbe
JOIN students s ON s.id = sbe.student_id
JOIN LATERAL (
    SELECT gs::DATE AS attendance_date
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') gs
    WHERE EXTRACT(ISODOW FROM gs) < 7
) generated ON TRUE
JOIN LATERAL (
    SELECT tba.user_id
    FROM teacher_batch_assignments tba
    WHERE tba.batch_id = sbe.batch_id AND tba.is_active = TRUE
    ORDER BY tba.created_at
    LIMIT 1
) teacher_assignment ON TRUE
WHERE sbe.is_active = TRUE
ON CONFLICT DO NOTHING;

INSERT INTO staff_attendance (user_id, centre_id, attendance_date, status, in_time, out_time, marked_by)
SELECT
    staff.user_id,
    staff.centre_id,
    generated.attendance_date,
    CASE
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 9 = 0 THEN 'absent'
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 5 = 0 THEN 'partial'
        ELSE 'present'
    END,
    CASE WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 5 = 0 THEN '10:30'::TIME ELSE '09:00'::TIME END,
    CASE WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 5 = 0 THEN '13:00'::TIME ELSE '17:30'::TIME END,
    staff.marked_by
FROM (
    SELECT DISTINCT
        tba.user_id,
        b.centre_id,
        ROW_NUMBER() OVER (ORDER BY tba.user_id, b.centre_id) AS seed_offset,
        head.user_id AS marked_by
    FROM teacher_batch_assignments tba
    JOIN batches b ON b.id = tba.batch_id
    JOIN user_centre_assignments head ON head.centre_id = b.centre_id AND head.is_primary = TRUE
    JOIN users u ON u.id = head.user_id
    JOIN roles r ON r.id = u.role_id AND r.role_name = 'centre_head'
    WHERE tba.is_active = TRUE
) staff
JOIN LATERAL (
    SELECT gs::DATE AS attendance_date
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') gs
    WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
) generated ON TRUE
ON CONFLICT DO NOTHING;

INSERT INTO exams (batch_id, exam_name, subject, exam_date, total_marks, passing_marks, results_published, created_by)
SELECT b.id, seed.exam_name, seed.subject, seed.exam_date, seed.total_marks, seed.passing_marks, seed.results_published, seed.created_by
FROM (
    VALUES
        ('N11', 'North Class Test 1', 'Mathematics', CURRENT_DATE - INTERVAL '45 days', 100, 35, TRUE, '44444444-4444-4444-4444-444444444441'::UUID),
        ('N11', 'North Physics Drill', 'Physics', CURRENT_DATE - INTERVAL '20 days', 80, 28, TRUE, '44444444-4444-4444-4444-444444444442'::UUID),
        ('N12', 'North Board Prep 1', 'Mathematics', CURRENT_DATE - INTERVAL '30 days', 100, 35, TRUE, '44444444-4444-4444-4444-444444444441'::UUID),
        ('W11', 'West Mid-Term Physics', 'Physics', CURRENT_DATE - INTERVAL '26 days', 90, 30, TRUE, '44444444-4444-4444-4444-444444444442'::UUID),
        ('W12', 'West Chemistry Marathon', 'Chemistry', CURRENT_DATE - INTERVAL '18 days', 100, 35, TRUE, '44444444-4444-4444-4444-444444444443'::UUID),
        ('S10', 'Foundation Life Science Quiz', 'Biology', CURRENT_DATE - INTERVAL '15 days', 60, 20, TRUE, '44444444-4444-4444-4444-444444444444'::UUID),
        ('S11', 'South Chemistry Monthly', 'Chemistry', CURRENT_DATE + INTERVAL '5 days', 100, 35, FALSE, '44444444-4444-4444-4444-444444444443'::UUID)
) AS seed(batch_code, exam_name, subject, exam_date, total_marks, passing_marks, results_published, created_by)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT DO NOTHING;

INSERT INTO student_marks (student_id, exam_id, marks_obtained, is_absent, entered_by)
SELECT
    sbe.student_id,
    e.id,
    CASE WHEN (ascii(right(s.student_code, 1)) + EXTRACT(DAY FROM e.exam_date)::INTEGER) % 11 = 0 THEN 0 ELSE LEAST(e.total_marks, 42 + ((ascii(right(s.student_code, 1)) * 7 + EXTRACT(DAY FROM e.exam_date)::INTEGER) % 45)) END,
    ((ascii(right(s.student_code, 1)) + EXTRACT(DAY FROM e.exam_date)::INTEGER) % 11 = 0),
    e.created_by
FROM exams e
JOIN student_batch_enrollments sbe ON sbe.batch_id = e.batch_id AND sbe.is_active = TRUE
JOIN students s ON s.id = sbe.student_id
WHERE e.results_published = TRUE
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 5: FEES, EXPENSES, SALARIES, AND PAYMENTS
-- ---------------------------------------------------------------------------

SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, NULL);
SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, NULL);
SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE)::DATE, NULL);

INSERT INTO fee_transactions (student_invoice_id, payment_date, amount, payment_mode, collected_by)
SELECT
    si.id,
    CASE
        WHEN si.payment_status = 'paid' THEN si.month_year + INTERVAL '6 days'
        ELSE si.month_year + INTERVAL '12 days'
    END,
    CASE
        WHEN EXTRACT(MONTH FROM si.month_year) = EXTRACT(MONTH FROM CURRENT_DATE) THEN ROUND((si.amount_due * 0.55)::NUMERIC, 2)
        WHEN ascii(right(s.student_code, 1)) % 4 = 0 THEN ROUND((si.amount_due * 0.5)::NUMERIC, 2)
        ELSE si.amount_due
    END,
    CASE WHEN ascii(right(s.student_code, 1)) % 2 = 0 THEN 'online' ELSE 'cash' END,
    collector.user_id
FROM student_invoices si
JOIN students s ON s.id = si.student_id
JOIN batches b ON b.id = si.batch_id
JOIN user_centre_assignments collector_assignment ON collector_assignment.centre_id = b.centre_id AND collector_assignment.is_primary = TRUE
JOIN users collector_user ON collector_user.id = collector_assignment.user_id
JOIN roles collector_role ON collector_role.id = collector_user.role_id AND collector_role.role_name IN ('centre_head','accountant')
JOIN LATERAL (SELECT collector_user.id AS user_id) collector ON TRUE
WHERE si.month_year <= DATE_TRUNC('month', CURRENT_DATE)::DATE
  AND EXTRACT(MONTH FROM si.month_year) < EXTRACT(MONTH FROM CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO centre_expenses (centre_id, month_year, category, amount, description, entered_by)
SELECT c.id, seed.month_year, seed.category, seed.amount, seed.description, seed.entered_by
FROM (
    VALUES
        ('NTH-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, 'rent', 65000.00, 'North campus rent', '33333333-3333-3333-3333-333333333331'::UUID),
        ('NTH-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, 'electricity_bill', 9800.00, 'North campus electricity', '33333333-3333-3333-3333-333333333331'::UUID),
        ('NTH-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'internet_bill', 3200.00, 'North internet recharge', '33333333-3333-3333-3333-333333333331'::UUID),
        ('WST-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, 'rent', 72000.00, 'West campus rent', '33333333-3333-3333-3333-333333333332'::UUID),
        ('WST-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'stationery', 6100.00, 'West stationary restock', '33333333-3333-3333-3333-333333333332'::UUID),
        ('WST-001', DATE_TRUNC('month', CURRENT_DATE)::DATE, 'miscellaneous', 2500.00, 'Lab cleaning supplies', '33333333-3333-3333-3333-333333333332'::UUID),
        ('SOU-001', DATE_TRUNC('month', CURRENT_DATE)::DATE, 'internet_bill', 2800.00, 'South branch broadband', '22222222-2222-2222-2222-222222222222'::UUID)
) AS seed(centre_code, month_year, category, amount, description, entered_by)
JOIN centres c ON c.centre_code = seed.centre_code
ON CONFLICT DO NOTHING;

SELECT generate_staff_salaries_for_month(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, NULL);
SELECT generate_staff_salaries_for_month(DATE_TRUNC('month', CURRENT_DATE)::DATE, NULL);

INSERT INTO staff_salary_payments (staff_salary_id, payment_date, amount, description, recorded_by)
SELECT
    ss.id,
    ss.month_year + INTERVAL '10 days',
    CASE WHEN EXTRACT(MONTH FROM ss.month_year) = EXTRACT(MONTH FROM CURRENT_DATE) THEN ROUND((ss.amount_due * 0.50)::NUMERIC, 2) ELSE ss.amount_due END,
    CASE WHEN EXTRACT(MONTH FROM ss.month_year) = EXTRACT(MONTH FROM CURRENT_DATE) THEN 'Advance salary payout' ELSE 'Monthly salary settled' END,
    recorder.user_id
FROM staff_salaries ss
JOIN LATERAL (
    SELECT uca.user_id
    FROM user_centre_assignments uca
    JOIN users u ON u.id = uca.user_id
    JOIN roles r ON r.id = u.role_id AND r.role_name IN ('accountant','centre_head')
    WHERE uca.centre_id = ss.centre_id AND uca.is_active = TRUE
    ORDER BY CASE WHEN r.role_name = 'accountant' THEN 0 ELSE 1 END
    LIMIT 1
) recorder ON TRUE
WHERE ss.month_year <= DATE_TRUNC('month', CURRENT_DATE)::DATE
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 6: REWARDS AND REDEMPTION
-- ---------------------------------------------------------------------------

INSERT INTO reward_rules (rule_name, description, trigger_type, award_frequency, scope_type, centre_id, batch_id, points_awarded, criteria, is_active, created_by, updated_by)
VALUES
    ('North attendance excellence', 'Monthly points for 85%+ attendance in North campus.', 'attendance', 'monthly', 'centre', (SELECT id FROM centres WHERE centre_code = 'NTH-001'), NULL, 15, '{"minimum_percentage":85}', TRUE, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
    ('Physics performance achiever', 'Monthly points for strong physics performance in West class 11.', 'performance', 'monthly', 'batch', NULL, (SELECT id FROM batches WHERE batch_code = 'W11'), 20, '{"minimum_percentage":75,"subject":"Physics"}', TRUE, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
    ('Timely fee champion', 'Monthly points when fees are fully settled before the 10th.', 'timely_fee_payment', 'monthly', 'global', NULL, NULL, 10, '{"due_day_of_month":10}', TRUE, '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO points_transactions (student_id, points, reason, description, month_year, created_by)
VALUES
    ('77777777-7777-7777-7777-777777777501', 40, 'manual_adjustment', 'Seeded loyalty bonus for active participation.', DATE_TRUNC('month', CURRENT_DATE)::DATE, '22222222-2222-2222-2222-222222222221'),
    ('77777777-7777-7777-7777-777777777505', 25, 'manual_adjustment', 'Seeded merit points for olympiad shortlist.', DATE_TRUNC('month', CURRENT_DATE)::DATE, '22222222-2222-2222-2222-222222222222'),
    ('77777777-7777-7777-7777-777777777509', 15, 'manual_adjustment', 'Seeded punctuality points.', DATE_TRUNC('month', CURRENT_DATE)::DATE, '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

SELECT record_reward_rule_award(
    (SELECT id FROM reward_rules WHERE rule_name = 'North attendance excellence' LIMIT 1),
    '77777777-7777-7777-7777-777777777501'::UUID,
    15,
    'seed:north-attendance:student-1:' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'YYYY-MM-DD'),
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
    NULL,
    'Seeded attendance reward execution for heavy data testing.',
    '11111111-1111-1111-1111-111111111111'::UUID,
    '{"seeded":true,"source":"heavy_data_seed"}'::JSONB
);

SELECT record_reward_rule_award(
    (SELECT id FROM reward_rules WHERE rule_name = 'Physics performance achiever' LIMIT 1),
    '77777777-7777-7777-7777-777777777508'::UUID,
    20,
    'seed:physics-performance:student-8:' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'YYYY-MM-DD'),
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
    NULL,
    'Seeded performance reward execution for heavy data testing.',
    '11111111-1111-1111-1111-111111111111'::UUID,
    '{"seeded":true,"source":"heavy_data_seed"}'::JSONB
);

INSERT INTO reward_rule_executions (reward_rule_id, run_month, status, eligible_count, awarded_count, skipped_count, failed_count, started_at, completed_at, triggered_by, metadata)
SELECT id, DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'success', 6, 2, 4, 0, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '2 minutes', '11111111-1111-1111-1111-111111111111', '{"seeded":true}'::JSONB
FROM reward_rules
ON CONFLICT DO NOTHING;

INSERT INTO points_transactions (student_id, points, reason, description, month_year, created_by)
VALUES
    ('77777777-7777-7777-7777-777777777501', -20, 'redeemed', 'Seeded redemption against oldest pending invoices.', DATE_TRUNC('month', CURRENT_DATE)::DATE, '33333333-3333-3333-3333-333333333331')
ON CONFLICT DO NOTHING;

INSERT INTO invoice_reward_allocations (student_invoice_id, points_transaction_id, allocation_amount, created_by)
SELECT
    si.id,
    pt.id,
    CASE WHEN ROW_NUMBER() OVER (ORDER BY si.month_year) = 1 THEN 12 ELSE 8 END,
    '33333333-3333-3333-3333-333333333331'::UUID
FROM student_invoices si
JOIN points_transactions pt ON pt.student_id = si.student_id AND pt.reason = 'redeemed' AND pt.description = 'Seeded redemption against oldest pending invoices.'
WHERE si.student_id = '77777777-7777-7777-7777-777777777501'::UUID
  AND si.payment_status IN ('pending','partial')
ORDER BY si.month_year
LIMIT 2
ON CONFLICT DO NOTHING;

COMMIT;
