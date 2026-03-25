-- CRACK IT COACHING INSTITUTE - HEAVY DATA ENTRY SEED
-- Run this only after `database_schema.sql` on a non-production database.
-- This dataset is intentionally coherent and idempotent for local/demo use.

BEGIN;

-- ---------------------------------------------------------------------------
-- SECTION 1: AUTH USERS (Supabase managed)
-- ---------------------------------------------------------------------------

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

    ('22222222-2222-2222-2222-222222222221', 'authenticated', 'authenticated', 'nisha.kapoor@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nisha Kapoor"}', NOW(), NOW(), '', '', '', ''),
    ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rahul.sethi@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Sethi"}', NOW(), NOW(), '', '', '', ''),
    ('22222222-2222-2222-2222-222222222223', 'authenticated', 'authenticated', 'meenal.dsouza@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meenal Dsouza"}', NOW(), NOW(), '', '', '', ''),

    ('33333333-3333-3333-3333-333333333331', 'authenticated', 'authenticated', 'ishita.rao@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ishita Rao"}', NOW(), NOW(), '', '', '', ''),
    ('33333333-3333-3333-3333-333333333332', 'authenticated', 'authenticated', 'vivek.menon@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vivek Menon"}', NOW(), NOW(), '', '', '', ''),
    ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'pooja.krishnan@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pooja Krishnan"}', NOW(), NOW(), '', '', '', ''),

    ('44444444-4444-4444-4444-444444444441', 'authenticated', 'authenticated', 'aditi.rao@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aditi Rao"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444442', 'authenticated', 'authenticated', 'rohan.kulkarni@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Kulkarni"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444443', 'authenticated', 'authenticated', 'neha.thomas@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Neha Thomas"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'farhan.qureshi@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Farhan Qureshi"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444445', 'authenticated', 'authenticated', 'kavya.nair@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kavya Nair"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444446', 'authenticated', 'authenticated', 'manish.gupta@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Manish Gupta"}', NOW(), NOW(), '', '', '', ''),
    ('44444444-4444-4444-4444-444444444447', 'authenticated', 'authenticated', 'sonal.deshpande@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sonal Deshpande"}', NOW(), NOW(), '', '', '', ''),

    ('55555555-5555-5555-5555-555555555501', 'authenticated', 'authenticated', 'ananya.sharma@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ananya Sharma"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555502', 'authenticated', 'authenticated', 'vivaan.jain@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vivaan Jain"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555503', 'authenticated', 'authenticated', 'meera.singh@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Singh"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555504', 'authenticated', 'authenticated', 'arjun.malhotra@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arjun Malhotra"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555505', 'authenticated', 'authenticated', 'siya.verma@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Siya Verma"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555506', 'authenticated', 'authenticated', 'kabir.khan@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kabir Khan"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555507', 'authenticated', 'authenticated', 'diya.nair@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diya Nair"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555508', 'authenticated', 'authenticated', 'reyansh.patel@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Reyansh Patel"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555509', 'authenticated', 'authenticated', 'tara.iyer@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tara Iyer"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555510', 'authenticated', 'authenticated', 'advik.roy@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Advik Roy"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555511', 'authenticated', 'authenticated', 'ishaan.bose@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ishaan Bose"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555512', 'authenticated', 'authenticated', 'sanvi.chawla@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sanvi Chawla"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555513', 'authenticated', 'authenticated', 'riya.sabnis@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Riya Sabnis"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555514', 'authenticated', 'authenticated', 'atharv.kulshreshtha@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Atharv Kulshreshtha"}', NOW(), NOW(), '', '', '', ''),
    ('55555555-5555-5555-5555-555555555515', 'authenticated', 'authenticated', 'prisha.joshi@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Prisha Joshi"}', NOW(), NOW(), '', '', '', ''),

    ('66666666-6666-6666-6666-666666666661', 'authenticated', 'authenticated', 'arpit.sen@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arpit Sen"}', NOW(), NOW(), '', '', '', ''),
    ('66666666-6666-6666-6666-666666666662', 'authenticated', 'authenticated', 'niharika.bose@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Niharika Bose"}', NOW(), NOW(), '', '', '', ''),
    ('66666666-6666-6666-6666-666666666663', 'authenticated', 'authenticated', 'alok.saxena@crackit.test', '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiY7Q5rYzA9H9n1tFoZT3zh0ElBTt1K', NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alok Saxena"}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO UPDATE
SET aud = EXCLUDED.aud,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW(),
    confirmation_token = EXCLUDED.confirmation_token,
    email_change = EXCLUDED.email_change,
    email_change_token_new = EXCLUDED.email_change_token_new,
    recovery_token = EXCLUDED.recovery_token;

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

        ('22222222-2222-2222-2222-222222222221'::UUID, 'centre_head', 'Nisha Kapoor', 'nisha.kapoor@crackit.test', '9811001101', TRUE),
        ('22222222-2222-2222-2222-222222222222'::UUID, 'centre_head', 'Rahul Sethi', 'rahul.sethi@crackit.test', '9811001102', TRUE),
        ('22222222-2222-2222-2222-222222222223'::UUID, 'centre_head', 'Meenal Dsouza', 'meenal.dsouza@crackit.test', '9811001103', TRUE),

        ('33333333-3333-3333-3333-333333333331'::UUID, 'accountant', 'Ishita Rao', 'ishita.rao@crackit.test', '9811001201', TRUE),
        ('33333333-3333-3333-3333-333333333332'::UUID, 'accountant', 'Vivek Menon', 'vivek.menon@crackit.test', '9811001202', TRUE),
        ('33333333-3333-3333-3333-333333333333'::UUID, 'accountant', 'Pooja Krishnan', 'pooja.krishnan@crackit.test', '9811001203', TRUE),

        ('44444444-4444-4444-4444-444444444441'::UUID, 'teacher', 'Aditi Rao', 'aditi.rao@crackit.test', '9811002101', TRUE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'teacher', 'Rohan Kulkarni', 'rohan.kulkarni@crackit.test', '9811002102', TRUE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'teacher', 'Neha Thomas', 'neha.thomas@crackit.test', '9811002103', TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'teacher', 'Farhan Qureshi', 'farhan.qureshi@crackit.test', '9811002104', TRUE),
        ('44444444-4444-4444-4444-444444444445'::UUID, 'teacher', 'Kavya Nair', 'kavya.nair@crackit.test', '9811002105', TRUE),
        ('44444444-4444-4444-4444-444444444446'::UUID, 'teacher', 'Manish Gupta', 'manish.gupta@crackit.test', '9811002106', TRUE),
        ('44444444-4444-4444-4444-444444444447'::UUID, 'teacher', 'Sonal Deshpande', 'sonal.deshpande@crackit.test', '9811002107', TRUE),

        ('55555555-5555-5555-5555-555555555501'::UUID, 'student', 'Ananya Sharma', 'ananya.sharma@crackit.test', '9811003101', TRUE),
        ('55555555-5555-5555-5555-555555555502'::UUID, 'student', 'Vivaan Jain', 'vivaan.jain@crackit.test', '9811003102', TRUE),
        ('55555555-5555-5555-5555-555555555503'::UUID, 'student', 'Meera Singh', 'meera.singh@crackit.test', '9811003103', TRUE),
        ('55555555-5555-5555-5555-555555555504'::UUID, 'student', 'Arjun Malhotra', 'arjun.malhotra@crackit.test', '9811003104', TRUE),
        ('55555555-5555-5555-5555-555555555505'::UUID, 'student', 'Siya Verma', 'siya.verma@crackit.test', '9811003105', TRUE),
        ('55555555-5555-5555-5555-555555555506'::UUID, 'student', 'Kabir Khan', 'kabir.khan@crackit.test', '9811003106', TRUE),
        ('55555555-5555-5555-5555-555555555507'::UUID, 'student', 'Diya Nair', 'diya.nair@crackit.test', '9811003107', TRUE),
        ('55555555-5555-5555-5555-555555555508'::UUID, 'student', 'Reyansh Patel', 'reyansh.patel@crackit.test', '9811003108', TRUE),
        ('55555555-5555-5555-5555-555555555509'::UUID, 'student', 'Tara Iyer', 'tara.iyer@crackit.test', '9811003109', TRUE),
        ('55555555-5555-5555-5555-555555555510'::UUID, 'student', 'Advik Roy', 'advik.roy@crackit.test', '9811003110', TRUE),
        ('55555555-5555-5555-5555-555555555511'::UUID, 'student', 'Ishaan Bose', 'ishaan.bose@crackit.test', '9811003111', TRUE),
        ('55555555-5555-5555-5555-555555555512'::UUID, 'student', 'Sanvi Chawla', 'sanvi.chawla@crackit.test', '9811003112', TRUE),
        ('55555555-5555-5555-5555-555555555513'::UUID, 'student', 'Riya Sabnis', 'riya.sabnis@crackit.test', '9811003113', TRUE),
        ('55555555-5555-5555-5555-555555555514'::UUID, 'student', 'Atharv Kulshreshtha', 'atharv.kulshreshtha@crackit.test', '9811003114', TRUE),
        ('55555555-5555-5555-5555-555555555515'::UUID, 'student', 'Prisha Joshi', 'prisha.joshi@crackit.test', '9811003115', TRUE),

        ('66666666-6666-6666-6666-666666666661'::UUID, 'teacher', 'Arpit Sen', 'arpit.sen@crackit.test', '9811999001', FALSE),
        ('66666666-6666-6666-6666-666666666662'::UUID, 'student', 'Niharika Bose', 'niharika.bose@crackit.test', '9811999002', FALSE),
        ('66666666-6666-6666-6666-666666666663'::UUID, 'accountant', 'Alok Saxena', 'alok.saxena@crackit.test', '9811999003', FALSE)
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
SELECT mapping.user_id, c.id, mapping.is_primary, mapping.is_active
FROM (
    VALUES
        ('22222222-2222-2222-2222-222222222221'::UUID, 'NTH-001', TRUE, TRUE),
        ('22222222-2222-2222-2222-222222222222'::UUID, 'WST-001', TRUE, TRUE),
        ('22222222-2222-2222-2222-222222222223'::UUID, 'SOU-001', TRUE, TRUE),
        ('33333333-3333-3333-3333-333333333331'::UUID, 'NTH-001', TRUE, TRUE),
        ('33333333-3333-3333-3333-333333333332'::UUID, 'WST-001', TRUE, TRUE),
        ('33333333-3333-3333-3333-333333333333'::UUID, 'SOU-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444441'::UUID, 'NTH-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'NTH-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'WST-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'WST-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'SOU-001', FALSE, TRUE),
        ('44444444-4444-4444-4444-444444444445'::UUID, 'SOU-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444446'::UUID, 'WST-001', TRUE, TRUE),
        ('44444444-4444-4444-4444-444444444447'::UUID, 'SOU-001', TRUE, TRUE),
        ('66666666-6666-6666-6666-666666666661'::UUID, 'SOU-001', TRUE, TRUE),
        ('66666666-6666-6666-6666-666666666662'::UUID, 'SOU-001', TRUE, TRUE)
) AS mapping(user_id, centre_code, is_primary, is_active)
JOIN centres c ON c.centre_code = mapping.centre_code
ON CONFLICT (user_id, centre_id) DO UPDATE
SET is_primary = EXCLUDED.is_primary,
    is_active = EXCLUDED.is_active;

INSERT INTO user_approval_requests (
    id,
    user_id,
    centre_id,
    requested_role,
    status,
    reviewed_by,
    reviewed_at,
    rejection_reason,
    applicant_note
)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, seed.request_key),
    seed.user_id,
    c.id,
    seed.requested_role,
    seed.status,
    seed.reviewed_by,
    seed.reviewed_at,
    seed.rejection_reason,
    seed.applicant_note
FROM (
    VALUES
        ('approval:pending-teacher-arpit', '66666666-6666-6666-6666-666666666661'::UUID, 'SOU-001', 'teacher', 'pending', NULL::UUID, NULL::TIMESTAMPTZ, NULL::TEXT, 'Applied to support South campus chemistry and doubt-solving sessions.'),
        ('approval:pending-student-niharika', '66666666-6666-6666-6666-666666666662'::UUID, 'SOU-001', 'student', 'pending', NULL::UUID, NULL::TIMESTAMPTZ, NULL::TEXT, 'Requested admission to the South foundation weekend batch.'),
        ('approval:approved-west-accountant-vivek', '33333333-3333-3333-3333-333333333332'::UUID, NULL, 'accountant', 'approved', '11111111-1111-1111-1111-111111111111'::UUID, NOW() - INTERVAL '75 days', NULL::TEXT, 'Approved by CEO after finance onboarding review.'),
        ('approval:rejected-accountant-alok', '66666666-6666-6666-6666-666666666663'::UUID, NULL, 'accountant', 'rejected', '11111111-1111-1111-1111-111111111111'::UUID, NOW() - INTERVAL '18 days', 'Experience documents were incomplete.', 'Applied for shared finance support role.'),
        ('approval:approved-south-head-meenal', '22222222-2222-2222-2222-222222222223'::UUID, NULL, 'centre_head', 'approved', '11111111-1111-1111-1111-111111111111'::UUID, NOW() - INTERVAL '120 days', NULL::TEXT, 'Approved to lead South campus operations.')
) AS seed(request_key, user_id, centre_code, requested_role, status, reviewed_by, reviewed_at, rejection_reason, applicant_note)
LEFT JOIN centres c ON c.centre_code = seed.centre_code
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    rejection_reason = EXCLUDED.rejection_reason,
    applicant_note = EXCLUDED.applicant_note,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- SECTION 3: BATCHES, STUDENTS, ENROLLMENTS, AND TEACHER ASSIGNMENTS
-- ---------------------------------------------------------------------------

INSERT INTO batches (id, centre_id, batch_code, batch_name, academic_year, is_active)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'batch:' || seed.centre_code || ':' || seed.batch_code),
    c.id,
    seed.batch_code,
    seed.batch_name,
    seed.academic_year,
    TRUE
FROM (
    VALUES
        ('NTH-001', 'N11', 'North Class 11 - Medical Morning', '2025-26'),
        ('NTH-001', 'N12', 'North Class 12 - JEE Evening', '2025-26'),
        ('WST-001', 'W11', 'West Class 11 - Science Morning', '2025-26'),
        ('WST-001', 'W12', 'West Class 12 - Board Weekend', '2025-26'),
        ('SOU-001', 'S10', 'South Foundation - Weekday Morning', '2025-26'),
        ('SOU-001', 'S11', 'South Class 11 - Integrated Hybrid', '2025-26')
) AS seed(centre_code, batch_code, batch_name, academic_year)
JOIN centres c ON c.centre_code = seed.centre_code
ON CONFLICT (id) DO UPDATE
SET batch_name = EXCLUDED.batch_name,
    academic_year = EXCLUDED.academic_year,
    is_active = EXCLUDED.is_active,
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
    is_active
)
VALUES
    ('77777777-7777-7777-7777-777777777501', '55555555-5555-5555-5555-555555555501', '2009-04-18', 11, 'Pankaj Sharma', '9899000001', TRUE, NOW() - INTERVAL '95 days', '{"school":"Delhi Public Academy","stream":"Science","preferred_exam":"NEET"}', TRUE),
    ('77777777-7777-7777-7777-777777777502', '55555555-5555-5555-5555-555555555502', '2008-10-03', 12, 'Reema Jain', '9899000002', TRUE, NOW() - INTERVAL '90 days', '{"school":"Scholars Senior Secondary","stream":"Science","preferred_exam":"JEE Main"}', TRUE),
    ('77777777-7777-7777-7777-777777777503', '55555555-5555-5555-5555-555555555503', '2009-01-25', 11, 'Mahesh Singh', '9899000003', TRUE, NOW() - INTERVAL '88 days', '{"school":"City Scholars School","stream":"Science","preferred_exam":"NEET"}', TRUE),
    ('77777777-7777-7777-7777-777777777504', '55555555-5555-5555-5555-555555555504', '2008-06-11', 12, 'Sonal Malhotra', '9899000004', TRUE, NOW() - INTERVAL '84 days', '{"school":"Northline Public School","stream":"Science","preferred_exam":"JEE Advanced"}', TRUE),
    ('77777777-7777-7777-7777-777777777505', '55555555-5555-5555-5555-555555555505', '2009-08-07', 11, 'Alok Verma', '9899000005', TRUE, NOW() - INTERVAL '82 days', '{"school":"New Era High School","stream":"Science","preferred_exam":"JEE Main"}', TRUE),
    ('77777777-7777-7777-7777-777777777506', '55555555-5555-5555-5555-555555555506', '2009-02-14', 11, 'Sadia Khan', '9899000006', TRUE, NOW() - INTERVAL '80 days', '{"school":"Westfield Junior College","stream":"Science","preferred_exam":"NEET"}', TRUE),
    ('77777777-7777-7777-7777-777777777507', '55555555-5555-5555-5555-555555555507', '2008-03-29', 12, 'Ramesh Nair', '9899000007', TRUE, NOW() - INTERVAL '78 days', '{"school":"Harbor View High","stream":"Science","preferred_exam":"Board Focus"}', TRUE),
    ('77777777-7777-7777-7777-777777777508', '55555555-5555-5555-5555-555555555508', '2009-11-12', 11, 'Ketan Patel', '9899000008', TRUE, NOW() - INTERVAL '76 days', '{"school":"Seaside International School","stream":"Science","preferred_exam":"JEE Main"}', TRUE),
    ('77777777-7777-7777-7777-777777777509', '55555555-5555-5555-5555-555555555509', '2008-12-09', 12, 'Lakshmi Iyer', '9899000009', TRUE, NOW() - INTERVAL '74 days', '{"school":"Western Heights School","stream":"Science","preferred_exam":"NEET"}', TRUE),
    ('77777777-7777-7777-7777-777777777510', '55555555-5555-5555-5555-555555555510', '2009-05-16', 11, 'Pratik Roy', '9899000010', TRUE, NOW() - INTERVAL '72 days', '{"school":"Metro Science Academy","stream":"Science","preferred_exam":"JEE Main"}', TRUE),
    ('77777777-7777-7777-7777-777777777511', '55555555-5555-5555-5555-555555555511', '2010-07-21', 10, 'Subho Bose', '9899000011', TRUE, NOW() - INTERVAL '68 days', '{"school":"South Valley School","stream":"Foundation","preferred_exam":"NTSE"}', TRUE),
    ('77777777-7777-7777-7777-777777777512', '55555555-5555-5555-5555-555555555512', '2010-09-04', 10, 'Ritika Chawla', '9899000012', TRUE, NOW() - INTERVAL '66 days', '{"school":"Bengaluru Central School","stream":"Foundation","preferred_exam":"Olympiad"}', TRUE),
    ('77777777-7777-7777-7777-777777777513', '55555555-5555-5555-5555-555555555513', '2009-03-18', 11, 'Madhav Sabnis', '9899000013', TRUE, NOW() - INTERVAL '64 days', '{"school":"Green Hills PU College","stream":"Science","preferred_exam":"NEET"}', TRUE),
    ('77777777-7777-7777-7777-777777777514', '55555555-5555-5555-5555-555555555514', '2009-10-28', 11, 'Namita Kulshreshtha', '9899000014', TRUE, NOW() - INTERVAL '62 days', '{"school":"Southridge Academy","stream":"Science","preferred_exam":"JEE Main"}', TRUE),
    ('77777777-7777-7777-7777-777777777515', '55555555-5555-5555-5555-555555555515', '2009-06-01', 11, 'Rohit Joshi', '9899000015', TRUE, NOW() - INTERVAL '60 days', '{"school":"Future Path School","stream":"Science","preferred_exam":"NEET"}', TRUE)
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    date_of_birth = EXCLUDED.date_of_birth,
    class_level = EXCLUDED.class_level,
    parent_name = EXCLUDED.parent_name,
    parent_phone = EXCLUDED.parent_phone,
    declaration_accepted = EXCLUDED.declaration_accepted,
    declaration_accepted_at = EXCLUDED.declaration_accepted_at,
    admission_form_data = EXCLUDED.admission_form_data,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO student_batch_enrollments (id, student_id, batch_id, enrollment_date, monthly_fee, status)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'enrollment:' || seed.student_id::TEXT || ':' || seed.batch_code),
    seed.student_id,
    b.id,
    seed.enrollment_date,
    seed.monthly_fee,
    seed.status
FROM (
    VALUES
        ('77777777-7777-7777-7777-777777777501'::UUID, 'N11', '2026-01-08'::DATE, 4200.00, 'active'),
        ('77777777-7777-7777-7777-777777777502'::UUID, 'N12', '2026-01-06'::DATE, 4700.00, 'active'),
        ('77777777-7777-7777-7777-777777777503'::UUID, 'N11', '2026-01-10'::DATE, 4200.00, 'active'),
        ('77777777-7777-7777-7777-777777777504'::UUID, 'N12', '2026-01-12'::DATE, 4700.00, 'active'),
        ('77777777-7777-7777-7777-777777777505'::UUID, 'N11', '2026-02-03'::DATE, 4300.00, 'active'),
        ('77777777-7777-7777-7777-777777777506'::UUID, 'W11', '2026-01-09'::DATE, 4100.00, 'active'),
        ('77777777-7777-7777-7777-777777777507'::UUID, 'W12', '2026-01-11'::DATE, 4550.00, 'active'),
        ('77777777-7777-7777-7777-777777777508'::UUID, 'W11', '2026-01-14'::DATE, 4100.00, 'active'),
        ('77777777-7777-7777-7777-777777777509'::UUID, 'W12', '2026-02-02'::DATE, 4550.00, 'active'),
        ('77777777-7777-7777-7777-777777777510'::UUID, 'W11', '2026-02-05'::DATE, 4150.00, 'active'),
        ('77777777-7777-7777-7777-777777777511'::UUID, 'S10', '2026-01-13'::DATE, 3600.00, 'active'),
        ('77777777-7777-7777-7777-777777777512'::UUID, 'S10', '2026-01-17'::DATE, 3600.00, 'active'),
        ('77777777-7777-7777-7777-777777777513'::UUID, 'S11', '2026-02-01'::DATE, 3950.00, 'active'),
        ('77777777-7777-7777-7777-777777777514'::UUID, 'S11', '2026-02-04'::DATE, 3950.00, 'active'),
        ('77777777-7777-7777-7777-777777777515'::UUID, 'S11', '2026-02-08'::DATE, 3950.00, 'active')
) AS seed(student_id, batch_code, enrollment_date, monthly_fee, status)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT (id) DO UPDATE
SET enrollment_date = EXCLUDED.enrollment_date,
    monthly_fee = EXCLUDED.monthly_fee,
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO teacher_batch_assignments (
    id,
    user_id,
    batch_id,
    subject,
    monthly_salary,
    assignment_start_date,
    assignment_end_date,
    is_active
)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'teacher-assignment:' || seed.user_id::TEXT || ':' || seed.batch_code || ':' || seed.subject),
    seed.user_id,
    b.id,
    seed.subject,
    seed.monthly_salary,
    seed.assignment_start_date,
    seed.assignment_end_date,
    seed.is_active
FROM (
    VALUES
        ('44444444-4444-4444-4444-444444444441'::UUID, 'N11', 'Mathematics', 24500.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444441'::UUID, 'N12', 'Mathematics', 26500.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'N11', 'Physics', 23500.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444442'::UUID, 'N12', 'Physics', 25000.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'W11', 'Chemistry', 22500.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444443'::UUID, 'W12', 'Chemistry', 25500.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'W12', 'Biology', 23000.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444444'::UUID, 'S11', 'Biology', 21500.00, '2026-02-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444445'::UUID, 'S11', 'Mathematics', 24000.00, '2026-02-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444446'::UUID, 'W11', 'Physics', 22000.00, '2026-01-01'::DATE, NULL::DATE, TRUE),
        ('44444444-4444-4444-4444-444444444447'::UUID, 'S10', 'General Science', 20500.00, '2026-01-01'::DATE, NULL::DATE, TRUE)
) AS seed(user_id, batch_code, subject, monthly_salary, assignment_start_date, assignment_end_date, is_active)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT (id) DO UPDATE
SET monthly_salary = EXCLUDED.monthly_salary,
    assignment_start_date = EXCLUDED.assignment_start_date,
    assignment_end_date = EXCLUDED.assignment_end_date,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- SECTION 4: CONTENT, ATTENDANCE, EXAMS, AND MARKS
-- ---------------------------------------------------------------------------

INSERT INTO content (id, batch_id, title, content_url, content_type, remarks, uploaded_by, is_published)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'content:' || seed.content_key),
    b.id,
    seed.title,
    seed.content_url,
    seed.content_type,
    seed.remarks,
    seed.uploaded_by,
    seed.is_published
FROM (
    VALUES
        ('north-xi-maths-quadratics', 'N11', 'Quadratic Equations Revision Workshop', 'https://example.com/content/n11/quadratics-revision', 'video', 'Recorded problem-solving session for the morning batch.', '44444444-4444-4444-4444-444444444441'::UUID, TRUE),
        ('north-xii-physics-current-electricity', 'N12', 'Current Electricity Formula Sheet', 'https://example.com/content/n12/current-electricity-formulas', 'document', 'Quick revision notes before the unit test.', '44444444-4444-4444-4444-444444444442'::UUID, TRUE),
        ('west-xi-chem-atomic-structure', 'W11', 'Atomic Structure Practice Set', 'https://example.com/content/w11/atomic-structure-practice', 'document', 'Numerical worksheet with answer key.', '44444444-4444-4444-4444-444444444443'::UUID, TRUE),
        ('west-xii-bio-human-physiology', 'W12', 'Human Physiology Crash Session', 'https://example.com/content/w12/human-physiology-crash', 'video', 'Condensed session for board exam revision.', '44444444-4444-4444-4444-444444444444'::UUID, TRUE),
        ('south-foundation-motion-basics', 'S10', 'Motion and Measurement Basics', 'https://example.com/content/s10/motion-basics', 'video', 'Foundation bridge lesson for new joiners.', '44444444-4444-4444-4444-444444444447'::UUID, TRUE),
        ('south-xi-maths-sequences', 'S11', 'Sequences and Series Concept Notes', 'https://example.com/content/s11/sequences-notes', 'document', 'Hybrid batch notes shared after live class.', '44444444-4444-4444-4444-444444444445'::UUID, TRUE)
) AS seed(content_key, batch_code, title, content_url, content_type, remarks, uploaded_by, is_published)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    content_url = EXCLUDED.content_url,
    content_type = EXCLUDED.content_type,
    remarks = EXCLUDED.remarks,
    uploaded_by = EXCLUDED.uploaded_by,
    is_published = EXCLUDED.is_published;

INSERT INTO attendance (id, student_id, batch_id, attendance_date, status, marked_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'attendance:' || sbe.student_id::TEXT || ':' || sbe.batch_id::TEXT || ':' || generated.attendance_date::TEXT),
    sbe.student_id,
    sbe.batch_id,
    generated.attendance_date,
    CASE
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + ascii(right(s.student_code, 1))) % 8 IN (0, 5) THEN 'absent'
        ELSE 'present'
    END,
    teacher_assignment.user_id
FROM student_batch_enrollments sbe
JOIN students s ON s.id = sbe.student_id
JOIN LATERAL (
    SELECT gs::DATE AS attendance_date
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') gs
    WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
) generated ON TRUE
JOIN LATERAL (
    SELECT tba.user_id
    FROM teacher_batch_assignments tba
    WHERE tba.batch_id = sbe.batch_id AND tba.is_active = TRUE
    ORDER BY tba.created_at, tba.user_id
    LIMIT 1
) teacher_assignment ON TRUE
WHERE sbe.is_active = TRUE
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    marked_by = EXCLUDED.marked_by,
    marked_at = NOW();

INSERT INTO staff_attendance (id, user_id, centre_id, attendance_date, status, in_time, out_time, marked_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'staff-attendance:' || staff.user_id::TEXT || ':' || staff.centre_id::TEXT || ':' || generated.attendance_date::TEXT),
    staff.user_id,
    staff.centre_id,
    generated.attendance_date,
    CASE
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 10 = 0 THEN 'absent'
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 6 = 0 THEN 'partial'
        ELSE 'present'
    END,
    CASE
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 10 = 0 THEN NULL
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 6 = 0 THEN '10:20'::TIME
        ELSE '09:05'::TIME
    END,
    CASE
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 10 = 0 THEN NULL
        WHEN (EXTRACT(DAY FROM generated.attendance_date)::INTEGER + staff.seed_offset) % 6 = 0 THEN '13:10'::TIME
        ELSE '17:35'::TIME
    END,
    staff.marked_by
FROM (
    SELECT
        base.user_id,
        base.centre_id,
        ROW_NUMBER() OVER (ORDER BY base.user_id, base.centre_id) AS seed_offset,
        base.marked_by
    FROM (
        SELECT DISTINCT
            tba.user_id,
            b.centre_id,
            head.user_id AS marked_by
        FROM teacher_batch_assignments tba
        JOIN batches b ON b.id = tba.batch_id
        JOIN user_centre_assignments head ON head.centre_id = b.centre_id AND head.is_primary = TRUE
        JOIN users u ON u.id = head.user_id
        JOIN roles r ON r.id = u.role_id AND r.role_name = 'centre_head'
        WHERE tba.is_active = TRUE
    ) base
) staff
JOIN LATERAL (
    SELECT gs::DATE AS attendance_date
    FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day') gs
    WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 6
) generated ON TRUE
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    in_time = EXCLUDED.in_time,
    out_time = EXCLUDED.out_time,
    marked_by = EXCLUDED.marked_by,
    marked_at = NOW();

INSERT INTO exams (id, batch_id, exam_name, subject, exam_date, total_marks, passing_marks, results_published, created_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'exam:' || seed.exam_key),
    b.id,
    seed.exam_name,
    seed.subject,
    seed.exam_date,
    seed.total_marks,
    seed.passing_marks,
    seed.results_published,
    seed.created_by
FROM (
    VALUES
        ('north-xi-maths-unit-1', 'N11', 'North XI Mathematics Unit Test 1', 'Mathematics', CURRENT_DATE - INTERVAL '42 days', 100, 35, TRUE, '44444444-4444-4444-4444-444444444441'::UUID),
        ('north-xii-physics-current-electricity', 'N12', 'North XII Physics Current Electricity Test', 'Physics', CURRENT_DATE - INTERVAL '24 days', 80, 28, TRUE, '44444444-4444-4444-4444-444444444442'::UUID),
        ('west-xi-chemistry-weekly-test', 'W11', 'West XI Chemistry Weekly Test', 'Chemistry', CURRENT_DATE - INTERVAL '20 days', 75, 26, TRUE, '44444444-4444-4444-4444-444444444443'::UUID),
        ('west-xii-biology-board-prep', 'W12', 'West XII Biology Board Prep Test', 'Biology', CURRENT_DATE - INTERVAL '16 days', 100, 35, TRUE, '44444444-4444-4444-4444-444444444444'::UUID),
        ('south-x-foundation-science-quiz', 'S10', 'South Foundation Science Quiz', 'General Science', CURRENT_DATE - INTERVAL '14 days', 60, 20, TRUE, '44444444-4444-4444-4444-444444444447'::UUID),
        ('south-xi-maths-progress-check', 'S11', 'South XI Mathematics Progress Check', 'Mathematics', CURRENT_DATE - INTERVAL '10 days', 90, 30, TRUE, '44444444-4444-4444-4444-444444444445'::UUID),
        ('south-xi-biology-upcoming', 'S11', 'South XI Biology Monthly Assessment', 'Biology', CURRENT_DATE + INTERVAL '5 days', 100, 35, FALSE, '44444444-4444-4444-4444-444444444444'::UUID)
) AS seed(exam_key, batch_code, exam_name, subject, exam_date, total_marks, passing_marks, results_published, created_by)
JOIN batches b ON b.batch_code = seed.batch_code
ON CONFLICT (id) DO UPDATE
SET exam_name = EXCLUDED.exam_name,
    subject = EXCLUDED.subject,
    exam_date = EXCLUDED.exam_date,
    total_marks = EXCLUDED.total_marks,
    passing_marks = EXCLUDED.passing_marks,
    results_published = EXCLUDED.results_published,
    created_by = EXCLUDED.created_by,
    updated_at = NOW();

INSERT INTO student_marks (id, student_id, exam_id, marks_obtained, is_absent, entered_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'marks:' || sbe.student_id::TEXT || ':' || e.id::TEXT),
    sbe.student_id,
    e.id,
    CASE
        WHEN (ascii(right(s.student_code, 1)) + EXTRACT(DAY FROM e.exam_date)::INTEGER) % 12 = 0 THEN 0
        ELSE LEAST(e.total_marks, (e.passing_marks + 8) + ((ascii(right(s.student_code, 1)) * 9 + EXTRACT(DAY FROM e.exam_date)::INTEGER) % 38))
    END,
    ((ascii(right(s.student_code, 1)) + EXTRACT(DAY FROM e.exam_date)::INTEGER) % 12 = 0),
    e.created_by
FROM exams e
JOIN student_batch_enrollments sbe ON sbe.batch_id = e.batch_id AND sbe.is_active = TRUE
JOIN students s ON s.id = sbe.student_id
WHERE e.results_published = TRUE
ON CONFLICT (id) DO UPDATE
SET marks_obtained = EXCLUDED.marks_obtained,
    is_absent = EXCLUDED.is_absent,
    entered_by = EXCLUDED.entered_by,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- SECTION 5: FEES, EXPENSES, SALARIES, AND PAYMENTS
-- ---------------------------------------------------------------------------

SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, NULL);
SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, NULL);
SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE)::DATE, NULL);

INSERT INTO fee_transactions (id, student_invoice_id, payment_date, amount, payment_mode, collected_by, receipt_number)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'fee-transaction:' || si.id::TEXT),
    si.id,
    CASE
        WHEN EXTRACT(MONTH FROM si.month_year) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month') THEN si.month_year + INTERVAL '8 days'
        ELSE si.month_year + INTERVAL '11 days'
    END,
    CASE
        WHEN si.student_id = '77777777-7777-7777-7777-777777777505'::UUID AND si.month_year = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE THEN ROUND((si.amount_due * 0.60)::NUMERIC, 2)
        ELSE si.amount_due
    END,
    CASE WHEN ascii(right(sref.student_code, 1)) % 2 = 0 THEN 'online' ELSE 'cash' END,
    collector.user_id,
    'SEED-REC-' || TO_CHAR(si.month_year, 'YYYYMM') || '-' || UPPER(LEFT(REPLACE(si.id::TEXT, '-', ''), 8))
FROM student_invoices si
JOIN students s ON s.id = si.student_id
JOIN students sref ON sref.id = si.student_id
JOIN batches b ON b.id = si.batch_id
JOIN LATERAL (
    SELECT uca.user_id
    FROM user_centre_assignments uca
    JOIN users u ON u.id = uca.user_id
    JOIN roles r ON r.id = u.role_id AND r.role_name IN ('accountant', 'centre_head')
    WHERE uca.centre_id = b.centre_id AND uca.is_active = TRUE
    ORDER BY CASE WHEN r.role_name = 'accountant' THEN 0 ELSE 1 END, u.full_name
    LIMIT 1
) collector ON TRUE
WHERE si.month_year < DATE_TRUNC('month', CURRENT_DATE)::DATE
ON CONFLICT (id) DO NOTHING;

INSERT INTO centre_expenses (id, centre_id, month_year, category, amount, description, entered_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'centre-expense:' || seed.expense_key),
    c.id,
    seed.month_year,
    seed.category,
    seed.amount,
    seed.description,
    seed.entered_by
FROM (
    VALUES
        ('north-rent-jan', 'NTH-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, 'rent', 65000.00, 'North campus monthly rent for the academic block.', '33333333-3333-3333-3333-333333333331'::UUID),
        ('north-electricity-feb', 'NTH-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'electricity_bill', 9800.00, 'Air conditioning and evening batch electricity usage.', '33333333-3333-3333-3333-333333333331'::UUID),
        ('north-internet-mar', 'NTH-001', DATE_TRUNC('month', CURRENT_DATE)::DATE, 'internet_bill', 3400.00, 'Dedicated broadband plan for smart classrooms.', '33333333-3333-3333-3333-333333333331'::UUID),
        ('west-rent-jan', 'WST-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')::DATE, 'rent', 72000.00, 'West campus lease payment.', '33333333-3333-3333-3333-333333333332'::UUID),
        ('west-stationery-feb', 'WST-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'stationery', 6100.00, 'Assessment papers, marker pens, and answer sheets.', '33333333-3333-3333-3333-333333333332'::UUID),
        ('west-misc-mar', 'WST-001', DATE_TRUNC('month', CURRENT_DATE)::DATE, 'miscellaneous', 2800.00, 'Microscope maintenance and lab cleaning supplies.', '33333333-3333-3333-3333-333333333332'::UUID),
        ('south-rent-feb', 'SOU-001', DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'rent', 54000.00, 'South campus training hall rent.', '33333333-3333-3333-3333-333333333333'::UUID),
        ('south-internet-mar', 'SOU-001', DATE_TRUNC('month', CURRENT_DATE)::DATE, 'internet_bill', 2900.00, 'Hybrid classroom broadband recharge.', '33333333-3333-3333-3333-333333333333'::UUID)
) AS seed(expense_key, centre_code, month_year, category, amount, description, entered_by)
JOIN centres c ON c.centre_code = seed.centre_code
ON CONFLICT (id) DO NOTHING;

SELECT generate_staff_salaries_for_month(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, NULL);
SELECT generate_staff_salaries_for_month(DATE_TRUNC('month', CURRENT_DATE)::DATE, NULL);

INSERT INTO staff_salary_payments (id, staff_salary_id, payment_date, amount, description, recorded_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'staff-salary-payment:' || ss.id::TEXT),
    ss.id,
    ss.month_year + INTERVAL '10 days',
    CASE
        WHEN ss.month_year = DATE_TRUNC('month', CURRENT_DATE)::DATE THEN ROUND((ss.amount_due * 0.50)::NUMERIC, 2)
        ELSE ss.amount_due
    END,
    CASE
        WHEN ss.month_year = DATE_TRUNC('month', CURRENT_DATE)::DATE THEN 'Advance payout for the current month.'
        ELSE 'Full salary settled for the month.'
    END,
    recorder.user_id
FROM staff_salaries ss
JOIN LATERAL (
    SELECT uca.user_id
    FROM user_centre_assignments uca
    JOIN users u ON u.id = uca.user_id
    JOIN roles r ON r.id = u.role_id AND r.role_name IN ('accountant', 'centre_head')
    WHERE uca.centre_id = ss.centre_id AND uca.is_active = TRUE
    ORDER BY CASE WHEN r.role_name = 'accountant' THEN 0 ELSE 1 END, u.full_name
    LIMIT 1
) recorder ON TRUE
WHERE ss.month_year <= DATE_TRUNC('month', CURRENT_DATE)::DATE
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SECTION 6: REWARDS AND REDEMPTION
-- ---------------------------------------------------------------------------

INSERT INTO reward_rules (
    id,
    rule_name,
    description,
    trigger_type,
    award_frequency,
    scope_type,
    centre_id,
    batch_id,
    points_awarded,
    criteria,
    is_active,
    created_by,
    updated_by
)
VALUES
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'reward-rule:north-attendance-85'),
        'North attendance excellence',
        'Awards points to North campus students who maintain at least 85% attendance for the month.',
        'attendance',
        'monthly',
        'centre',
        (SELECT id FROM centres WHERE centre_code = 'NTH-001'),
        NULL,
        15,
        '{"minimum_percentage":85}',
        TRUE,
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'reward-rule:west-physics-performance'),
        'West chemistry performance achiever',
        'Rewards West XI learners scoring at least 75 percent in chemistry monthly assessments.',
        'performance',
        'monthly',
        'batch',
        NULL,
        (SELECT id FROM batches WHERE batch_code = 'W11'),
        20,
        '{"minimum_percentage":75,"subject":"Chemistry"}',
        TRUE,
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'reward-rule:timely-fee-payment'),
        'Timely fee champion',
        'Recognizes students who settle invoices before the configured monthly fee deadline.',
        'timely_fee_payment',
        'monthly',
        'global',
        NULL,
        NULL,
        10,
        '{"due_day_of_month":10}',
        TRUE,
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT (id) DO UPDATE
SET rule_name = EXCLUDED.rule_name,
    description = EXCLUDED.description,
    trigger_type = EXCLUDED.trigger_type,
    award_frequency = EXCLUDED.award_frequency,
    scope_type = EXCLUDED.scope_type,
    centre_id = EXCLUDED.centre_id,
    batch_id = EXCLUDED.batch_id,
    points_awarded = EXCLUDED.points_awarded,
    criteria = EXCLUDED.criteria,
    is_active = EXCLUDED.is_active,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW();

INSERT INTO points_transactions (id, student_id, points, reason, description, month_year, created_by)
VALUES
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'points:manual-adjustment:ananya'),
        '77777777-7777-7777-7777-777777777501',
        40,
        'manual_adjustment',
        'Manual bonus for leading a peer doubt-solving circle.',
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        '22222222-2222-2222-2222-222222222221'
    ),
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'points:manual-adjustment:kabir'),
        '77777777-7777-7777-7777-777777777506',
        25,
        'manual_adjustment',
        'Manual merit points for qualifying a district science contest shortlist.',
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        '22222222-2222-2222-2222-222222222222'
    ),
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'points:manual-adjustment:riya'),
        '77777777-7777-7777-7777-777777777513',
        15,
        'manual_adjustment',
        'Manual reward for volunteering in a parent orientation event.',
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        '22222222-2222-2222-2222-222222222223'
    ),
    (
        uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'points:redeemed:ananya-current-month'),
        '77777777-7777-7777-7777-777777777501',
        -20,
        'redeemed',
        'Redeemed reward points against the oldest outstanding invoice.',
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        '33333333-3333-3333-3333-333333333331'
    )
ON CONFLICT (id) DO NOTHING;

SELECT record_reward_rule_award(
    (SELECT id FROM reward_rules WHERE rule_name = 'North attendance excellence' LIMIT 1),
    '77777777-7777-7777-7777-777777777501'::UUID,
    15,
    'seed:north-attendance:ananya:' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'YYYY-MM-DD'),
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
    NULL,
    'Seeded award for strong attendance consistency in the North centre.',
    '11111111-1111-1111-1111-111111111111'::UUID,
    '{"seeded":true,"source":"heavy_data_seed"}'::JSONB
);

SELECT record_reward_rule_award(
    (SELECT id FROM reward_rules WHERE rule_name = 'West chemistry performance achiever' LIMIT 1),
    '77777777-7777-7777-7777-777777777508'::UUID,
    20,
    'seed:west-performance:reyansh:' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'YYYY-MM-DD'),
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
    NULL,
    'Seeded award for top chemistry test performance in West XI.',
    '11111111-1111-1111-1111-111111111111'::UUID,
    '{"seeded":true,"source":"heavy_data_seed"}'::JSONB
);

INSERT INTO reward_rule_executions (
    id,
    reward_rule_id,
    run_month,
    status,
    eligible_count,
    awarded_count,
    skipped_count,
    failed_count,
    started_at,
    completed_at,
    triggered_by,
    metadata
)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'reward-execution:' || rr.id::TEXT || ':' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE, 'YYYY-MM-DD')),
    rr.id,
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
    'success',
    CASE rr.rule_name
        WHEN 'North attendance excellence' THEN 5
        WHEN 'West chemistry performance achiever' THEN 3
        ELSE 12
    END,
    CASE rr.rule_name
        WHEN 'North attendance excellence' THEN 1
        WHEN 'West chemistry performance achiever' THEN 1
        ELSE 0
    END,
    CASE rr.rule_name
        WHEN 'North attendance excellence' THEN 4
        WHEN 'West chemistry performance achiever' THEN 2
        ELSE 12
    END,
    0,
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '14 days' + INTERVAL '3 minutes',
    '11111111-1111-1111-1111-111111111111',
    '{"seeded":true,"source":"heavy_data_seed"}'::JSONB
FROM reward_rules rr
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    eligible_count = EXCLUDED.eligible_count,
    awarded_count = EXCLUDED.awarded_count,
    skipped_count = EXCLUDED.skipped_count,
    failed_count = EXCLUDED.failed_count,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    triggered_by = EXCLUDED.triggered_by,
    metadata = EXCLUDED.metadata;

INSERT INTO invoice_reward_allocations (id, student_invoice_id, points_transaction_id, allocation_amount, created_by)
SELECT
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'invoice-reward-allocation:' || si.id::TEXT),
    si.id,
    pt.id,
    20.00,
    '33333333-3333-3333-3333-333333333331'::UUID
FROM student_invoices si
JOIN points_transactions pt ON pt.id = uuid_generate_v5('00000000-0000-0000-0000-000000000000'::UUID, 'points:redeemed:ananya-current-month')
WHERE si.student_id = '77777777-7777-7777-7777-777777777501'::UUID
  AND si.month_year = DATE_TRUNC('month', CURRENT_DATE)::DATE
ON CONFLICT (id) DO NOTHING;

COMMIT;
