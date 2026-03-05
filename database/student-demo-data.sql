-- Demo student data for local development.
-- Creates courses, batches, students, and enrollments.
--
-- Run after: database_schema.sql

DO $$
DECLARE
  v_course_id UUID;
  v_centre_id UUID;
  v_batch_a UUID;
  v_batch_b UUID;
BEGIN
  -- Ensure one active course exists.
  SELECT id INTO v_course_id FROM courses WHERE is_active = TRUE ORDER BY created_at LIMIT 1;

  IF v_course_id IS NULL THEN
    INSERT INTO courses (course_name, target_exam, is_active)
    VALUES ('Foundation Program', 'Board + Entrance', TRUE)
    RETURNING id INTO v_course_id;
  END IF;

  -- Use the first active centre.
  SELECT id INTO v_centre_id FROM centres WHERE is_active = TRUE ORDER BY created_at LIMIT 1;

  IF v_centre_id IS NULL THEN
    RAISE EXCEPTION 'No active centre found. Run database_schema.sql first.';
  END IF;

  -- Create 2 demo batches.
  INSERT INTO batches (centre_id, course_id, batch_code, batch_name, academic_year, is_active)
  VALUES
    (v_centre_id, v_course_id, 'PERF-A', 'NEET 2027 Alpha (Morning)', '2026-27', TRUE),
    (v_centre_id, v_course_id, 'PERF-B', 'JEE 2027 Beta (Evening)', '2026-27', TRUE)
  ON CONFLICT (centre_id, batch_code) DO UPDATE
  SET batch_name = EXCLUDED.batch_name, course_id = EXCLUDED.course_id,
      academic_year = EXCLUDED.academic_year, is_active = TRUE, updated_at = NOW();

  SELECT id INTO v_batch_a FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-A';
  SELECT id INTO v_batch_b FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-B';

  -- Clean old demo students (safe to rerun).
  DELETE FROM students WHERE parent_phone IN (
    '9100000001','9100000002','9100000003','9100000004',
    '9100000005','9100000006','9100000007','9100000008'
  );

  -- Insert 8 demo students (no linked auth user - local demo only).
  INSERT INTO students (user_id, date_of_birth, class_level, parent_name, parent_phone,
    declaration_accepted, declaration_accepted_at, admission_form_data, is_active)
  VALUES
    (NULL, '2010-02-01', 10, 'Rajesh Sharma',  '9100000001', TRUE, NOW(), '{"student_name":"Aarav Sharma","guardian_relation":"Father"}'::jsonb, TRUE),
    (NULL, '2010-03-01', 10, 'Pooja Verma',    '9100000002', TRUE, NOW(), '{"student_name":"Diya Verma","guardian_relation":"Mother"}'::jsonb, TRUE),
    (NULL, '2010-04-01', 11, 'Manish Mehta',   '9100000003', TRUE, NOW(), '{"student_name":"Kabir Mehta","guardian_relation":"Father"}'::jsonb, TRUE),
    (NULL, '2010-05-01', 11, 'Neha Singh',     '9100000004', TRUE, NOW(), '{"student_name":"Anaya Singh","guardian_relation":"Mother"}'::jsonb, TRUE),
    (NULL, '2010-06-01', 10, 'Sanjay Gupta',   '9100000005', TRUE, NOW(), '{"student_name":"Rohan Gupta","guardian_relation":"Father"}'::jsonb, TRUE),
    (NULL, '2010-07-01', 11, 'Lakshmi Nair',   '9100000006', TRUE, NOW(), '{"student_name":"Ishita Nair","guardian_relation":"Mother"}'::jsonb, TRUE),
    (NULL, '2010-08-01', 12, 'Prateek Joshi',  '9100000007', TRUE, NOW(), '{"student_name":"Vivaan Joshi","guardian_relation":"Father"}'::jsonb, TRUE),
    (NULL, '2010-09-01', 12, 'Ritu Kapoor',    '9100000008', TRUE, NOW(), '{"student_name":"Myra Kapoor","guardian_relation":"Mother"}'::jsonb, TRUE);

  -- Enroll first 4 in batch A, next 4 in batch B.
  INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, status)
  SELECT s.id, v_batch_a, CURRENT_DATE - INTERVAL '90 days', 'active'
  FROM students s WHERE s.parent_phone IN ('9100000001','9100000002','9100000003','9100000004');

  INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, status)
  SELECT s.id, v_batch_b, CURRENT_DATE - INTERVAL '90 days', 'active'
  FROM students s WHERE s.parent_phone IN ('9100000005','9100000006','9100000007','9100000008');
END $$;
