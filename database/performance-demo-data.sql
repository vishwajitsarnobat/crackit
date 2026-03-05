-- Performance demo data: exams and marks.
-- Creates 4 exams per batch with subject-wise tagging and random marks.
--
-- Run after: student-demo-data.sql

DO $$
DECLARE
  v_centre_id UUID;
  v_batch_a UUID;
  v_batch_b UUID;
BEGIN
  SELECT id INTO v_centre_id FROM centres WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
  SELECT id INTO v_batch_a FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-A';
  SELECT id INTO v_batch_b FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-B';

  IF v_batch_a IS NULL OR v_batch_b IS NULL THEN
    RAISE EXCEPTION 'Demo batches not found. Run student-demo-data.sql first.';
  END IF;

  -- Clean old demo exam data (safe to rerun).
  DELETE FROM student_marks sm USING exams e
  WHERE sm.exam_id = e.id AND e.batch_id IN (v_batch_a, v_batch_b)
    AND e.exam_name IN ('Physics Unit Test','Chemistry Unit Test','Maths Midterm','Full Syllabus Mock');

  DELETE FROM exams
  WHERE batch_id IN (v_batch_a, v_batch_b)
    AND exam_name IN ('Physics Unit Test','Chemistry Unit Test','Maths Midterm','Full Syllabus Mock');

  -- Insert 4 exams per batch (with subject for subject-wise analysis).
  INSERT INTO exams (batch_id, exam_name, exam_date, total_marks, passing_marks, results_published, subject)
  VALUES
    (v_batch_a, 'Physics Unit Test',   CURRENT_DATE - INTERVAL '56 days', 100, 35, TRUE, 'Physics'),
    (v_batch_a, 'Chemistry Unit Test', CURRENT_DATE - INTERVAL '42 days', 100, 35, TRUE, 'Chemistry'),
    (v_batch_a, 'Maths Midterm',       CURRENT_DATE - INTERVAL '28 days', 100, 35, TRUE, 'Mathematics'),
    (v_batch_a, 'Full Syllabus Mock',  CURRENT_DATE - INTERVAL '14 days', 100, 35, TRUE, 'General'),
    (v_batch_b, 'Physics Unit Test',   CURRENT_DATE - INTERVAL '56 days', 100, 35, TRUE, 'Physics'),
    (v_batch_b, 'Chemistry Unit Test', CURRENT_DATE - INTERVAL '42 days', 100, 35, TRUE, 'Chemistry'),
    (v_batch_b, 'Maths Midterm',       CURRENT_DATE - INTERVAL '28 days', 100, 35, TRUE, 'Mathematics'),
    (v_batch_b, 'Full Syllabus Mock',  CURRENT_DATE - INTERVAL '14 days', 100, 35, TRUE, 'General');

  -- Marks for batch A (generally improving trend).
  INSERT INTO student_marks (student_id, exam_id, marks_obtained, is_absent)
  SELECT s.id, e.id,
    CASE WHEN rnd.is_absent THEN 0 ELSE rnd.score END,
    rnd.is_absent
  FROM students s
  JOIN student_batch_enrollments sbe ON sbe.student_id = s.id AND sbe.batch_id = v_batch_a
  JOIN exams e ON e.batch_id = v_batch_a
  CROSS JOIN LATERAL (
    SELECT
      (random() < 0.07) AS is_absent,
      ROUND(LEAST(100, GREATEST(30,
        48 + (RIGHT(s.parent_phone, 1)::INT * 4)
        + CASE
            WHEN e.exam_name = 'Physics Unit Test' THEN 0
            WHEN e.exam_name = 'Chemistry Unit Test' THEN 5
            WHEN e.exam_name = 'Maths Midterm' THEN 9
            ELSE 13
          END
        + (random() * 10 - 5)
      ))::NUMERIC, 2) AS score
  ) rnd
  WHERE s.parent_phone IN ('9100000001','9100000002','9100000003','9100000004')
  ON CONFLICT (student_id, exam_id) DO UPDATE
  SET marks_obtained = EXCLUDED.marks_obtained, is_absent = EXCLUDED.is_absent, updated_at = NOW();

  -- Marks for batch B (mixed trend, more volatility).
  INSERT INTO student_marks (student_id, exam_id, marks_obtained, is_absent)
  SELECT s.id, e.id,
    CASE WHEN rnd.is_absent THEN 0 ELSE rnd.score END,
    rnd.is_absent
  FROM students s
  JOIN student_batch_enrollments sbe ON sbe.student_id = s.id AND sbe.batch_id = v_batch_b
  JOIN exams e ON e.batch_id = v_batch_b
  CROSS JOIN LATERAL (
    SELECT
      (random() < 0.12) AS is_absent,
      ROUND(LEAST(100, GREATEST(25,
        44 + (RIGHT(s.parent_phone, 1)::INT * 3.5)
        + CASE
            WHEN e.exam_name = 'Physics Unit Test' THEN 0
            WHEN e.exam_name = 'Chemistry Unit Test' THEN 3
            WHEN e.exam_name = 'Maths Midterm' THEN 1
            ELSE 6
          END
        + (random() * 18 - 9)
      ))::NUMERIC, 2) AS score
  ) rnd
  WHERE s.parent_phone IN ('9100000005','9100000006','9100000007','9100000008')
  ON CONFLICT (student_id, exam_id) DO UPDATE
  SET marks_obtained = EXCLUDED.marks_obtained, is_absent = EXCLUDED.is_absent, updated_at = NOW();
END $$;
