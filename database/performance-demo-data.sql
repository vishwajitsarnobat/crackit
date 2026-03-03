-- Simple demo seed for Performance dashboard.
-- Creates in the CURRENT active centre:
-- 1) 2 demo batches (NEET and JEE)
-- 2) 8 demo students (4 in each batch)
-- 3) 4 exams per batch + randomly varying marks
--
-- Run after:
-- - database_schema.sql
-- - database/dummy-data.sql

DO $$
DECLARE
  v_course_id UUID;
  v_centre_id UUID;
  v_batch_a UUID;
  v_batch_b UUID;
BEGIN
  -- Ensure counters used by triggers exist.
  INSERT INTO id_counters (name, year, last_value)
  VALUES
    ('student_code', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0),
    ('receipt_number', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0)
  ON CONFLICT (name) DO UPDATE
  SET year = EXCLUDED.year;

  -- Ensure one active course exists.
  SELECT id INTO v_course_id
  FROM courses
  WHERE is_active = TRUE
  ORDER BY created_at
  LIMIT 1;

  IF v_course_id IS NULL THEN
    INSERT INTO courses (course_name, target_exam, is_active)
    VALUES ('Foundation Program', 'Board + Entrance', TRUE)
    RETURNING id INTO v_course_id;
  END IF;

  -- Use one current active centre (do not create new centre).
  SELECT id INTO v_centre_id
  FROM centres
  WHERE is_active = TRUE
  ORDER BY created_at
  LIMIT 1;

  IF v_centre_id IS NULL THEN
    RAISE EXCEPTION 'No active centre found. Create one centre first.';
  END IF;

  -- Create/update 2 demo batches in the same centre.
  INSERT INTO batches (centre_id, course_id, batch_code, batch_name, academic_year, is_active)
  VALUES
    (v_centre_id, v_course_id, 'PERF-A', 'NEET 2027 Alpha (Morning)', '2026-27', TRUE),
    (v_centre_id, v_course_id, 'PERF-B', 'JEE 2027 Beta (Evening)', '2026-27', TRUE)
  ON CONFLICT (centre_id, batch_code) DO UPDATE
  SET
    batch_name = EXCLUDED.batch_name,
    course_id = EXCLUDED.course_id,
    academic_year = EXCLUDED.academic_year,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_batch_a FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-A';
  SELECT id INTO v_batch_b FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-B';

  -- Clean old demo rows (safe to rerun).
  DELETE FROM student_marks sm
  USING exams e
  WHERE sm.exam_id = e.id
    AND e.batch_id IN (v_batch_a, v_batch_b)
    AND e.exam_name IN (
      'Physics Unit Test',
      'Chemistry Unit Test',
      'Maths Midterm',
      'Full Syllabus Mock'
    );

  DELETE FROM exams
  WHERE batch_id IN (v_batch_a, v_batch_b)
    AND exam_name IN (
      'Physics Unit Test',
      'Chemistry Unit Test',
      'Maths Midterm',
      'Full Syllabus Mock'
    );

  DELETE FROM students
  WHERE parent_phone IN (
    '9100000001',
    '9100000002',
    '9100000003',
    '9100000004',
    '9100000005',
    '9100000006',
    '9100000007',
    '9100000008'
  );

  -- Insert 8 demo students.
  -- Note: students are created without linked auth users for quick local demo,
  -- so `parent_name` carries student display names for analytics preview.
  INSERT INTO students (
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
    (
      NULL,
      DATE '2010-02-01',
      10,
      'Rajesh Sharma',
      '9100000001',
      TRUE,
      NOW(),
      '{"student_name":"Aarav Sharma","guardian_relation":"Father"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-03-01',
      10,
      'Pooja Verma',
      '9100000002',
      TRUE,
      NOW(),
      '{"student_name":"Diya Verma","guardian_relation":"Mother"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-04-01',
      11,
      'Manish Mehta',
      '9100000003',
      TRUE,
      NOW(),
      '{"student_name":"Kabir Mehta","guardian_relation":"Father"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-05-01',
      11,
      'Neha Singh',
      '9100000004',
      TRUE,
      NOW(),
      '{"student_name":"Anaya Singh","guardian_relation":"Mother"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-06-01',
      10,
      'Sanjay Gupta',
      '9100000005',
      TRUE,
      NOW(),
      '{"student_name":"Rohan Gupta","guardian_relation":"Father"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-07-01',
      11,
      'Lakshmi Nair',
      '9100000006',
      TRUE,
      NOW(),
      '{"student_name":"Ishita Nair","guardian_relation":"Mother"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-08-01',
      12,
      'Prateek Joshi',
      '9100000007',
      TRUE,
      NOW(),
      '{"student_name":"Vivaan Joshi","guardian_relation":"Father"}'::jsonb,
      TRUE
    ),
    (
      NULL,
      DATE '2010-09-01',
      12,
      'Ritu Kapoor',
      '9100000008',
      TRUE,
      NOW(),
      '{"student_name":"Myra Kapoor","guardian_relation":"Mother"}'::jsonb,
      TRUE
    );

  -- Enroll first 4 in batch A, next 4 in batch B.
  INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, status)
  SELECT s.id, v_batch_a, CURRENT_DATE - INTERVAL '90 days', 'active'
  FROM students s
  WHERE s.parent_phone IN ('9100000001', '9100000002', '9100000003', '9100000004');

  INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, status)
  SELECT s.id, v_batch_b, CURRENT_DATE - INTERVAL '90 days', 'active'
  FROM students s
  WHERE s.parent_phone IN ('9100000005', '9100000006', '9100000007', '9100000008');

  -- Insert 4 exams per batch.
  INSERT INTO exams (batch_id, exam_name, exam_date, total_marks, passing_marks, results_published)
  VALUES
    (v_batch_a, 'Physics Unit Test', CURRENT_DATE - INTERVAL '56 days', 100, 35, TRUE),
    (v_batch_a, 'Chemistry Unit Test', CURRENT_DATE - INTERVAL '42 days', 100, 35, TRUE),
    (v_batch_a, 'Maths Midterm', CURRENT_DATE - INTERVAL '28 days', 100, 35, TRUE),
    (v_batch_a, 'Full Syllabus Mock', CURRENT_DATE - INTERVAL '14 days', 100, 35, TRUE),
    (v_batch_b, 'Physics Unit Test', CURRENT_DATE - INTERVAL '56 days', 100, 35, TRUE),
    (v_batch_b, 'Chemistry Unit Test', CURRENT_DATE - INTERVAL '42 days', 100, 35, TRUE),
    (v_batch_b, 'Maths Midterm', CURRENT_DATE - INTERVAL '28 days', 100, 35, TRUE),
    (v_batch_b, 'Full Syllabus Mock', CURRENT_DATE - INTERVAL '14 days', 100, 35, TRUE);

  -- Insert random varying marks for batch A students (generally improving trend).
  INSERT INTO student_marks (student_id, exam_id, marks_obtained, is_absent)
  SELECT
    s.id,
    e.id,
    CASE WHEN rnd.is_absent THEN 0 ELSE rnd.score END AS marks_obtained,
    rnd.is_absent
  FROM students s
  JOIN student_batch_enrollments sbe ON sbe.student_id = s.id
  JOIN exams e ON e.batch_id = sbe.batch_id
  CROSS JOIN LATERAL (
    SELECT
      (random() < 0.07) AS is_absent,
      ROUND(
        LEAST(
          100,
          GREATEST(
            30,
            48 +
            (RIGHT(s.parent_phone, 1)::INT * 4) +
            CASE
              WHEN e.exam_name = 'Physics Unit Test' THEN 0
              WHEN e.exam_name = 'Chemistry Unit Test' THEN 5
              WHEN e.exam_name = 'Maths Midterm' THEN 9
              ELSE 13
            END +
            (random() * 10 - 5)
          )
        )::NUMERIC,
        2
      ) AS score
  ) rnd
  WHERE s.parent_phone IN ('9100000001', '9100000002', '9100000003', '9100000004')
    AND sbe.batch_id = v_batch_a
  ON CONFLICT (student_id, exam_id) DO UPDATE
  SET
    marks_obtained = EXCLUDED.marks_obtained,
    is_absent = EXCLUDED.is_absent,
    updated_at = NOW();

  -- Insert random varying marks for batch B students (mixed trend and more volatility).
  INSERT INTO student_marks (student_id, exam_id, marks_obtained, is_absent)
  SELECT
    s.id,
    e.id,
    CASE WHEN rnd.is_absent THEN 0 ELSE rnd.score END AS marks_obtained,
    rnd.is_absent
  FROM students s
  JOIN student_batch_enrollments sbe ON sbe.student_id = s.id
  JOIN exams e ON e.batch_id = sbe.batch_id
  CROSS JOIN LATERAL (
    SELECT
      (random() < 0.12) AS is_absent,
      ROUND(
        LEAST(
          100,
          GREATEST(
            25,
            44 +
            (RIGHT(s.parent_phone, 1)::INT * 3.5) +
            CASE
              WHEN e.exam_name = 'Physics Unit Test' THEN 0
              WHEN e.exam_name = 'Chemistry Unit Test' THEN 3
              WHEN e.exam_name = 'Maths Midterm' THEN 1
              ELSE 6
            END +
            (random() * 18 - 9)
          )
        )::NUMERIC,
        2
      ) AS score
  ) rnd
  WHERE s.parent_phone IN ('9100000005', '9100000006', '9100000007', '9100000008')
    AND sbe.batch_id = v_batch_b
  ON CONFLICT (student_id, exam_id) DO UPDATE
  SET
    marks_obtained = EXCLUDED.marks_obtained,
    is_absent = EXCLUDED.is_absent,
    updated_at = NOW();
END $$;
