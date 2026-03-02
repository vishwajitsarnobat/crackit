-- Minimal bootstrap data for local development.
-- Run after database_schema.sql

-- Required by code-generation triggers.
INSERT INTO id_counters (name, year, last_value)
VALUES
  ('student_code', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0),
  ('receipt_number', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0)
ON CONFLICT (name) DO UPDATE
SET year = EXCLUDED.year;

-- Required for signup API (`roles` lookup by role_name).
INSERT INTO roles (role_name, display_name, level)
VALUES
  ('ceo', 'CEO / Super Admin', 1),
  ('centre_head', 'Centre Head', 2),
  ('teacher', 'Teacher', 3),
  ('accountant', 'Accountant', 4),
  ('student', 'Student', 5)
ON CONFLICT (role_name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  level = EXCLUDED.level,
  is_active = TRUE,
  updated_at = NOW();

-- Optional seed centre for teacher signup tests.
INSERT INTO centres (centre_code, centre_name, address, city, phone, is_active)
VALUES ('DEV-001', 'Crack It Dev Centre', 'Test Address', 'Test City', '0000000000', TRUE)
ON CONFLICT (centre_code) DO NOTHING;
