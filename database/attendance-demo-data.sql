-- Attendance demo data for the analytics dashboard.
-- Generates ~30 days of attendance with ~85% present rate (weekdays only).
--
-- Run after: student-demo-data.sql

DO $$
DECLARE
  v_centre_id UUID;
  v_batch_a UUID;
  v_batch_b UUID;
  v_day DATE;
  v_start DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  SELECT id INTO v_centre_id FROM centres WHERE is_active = TRUE ORDER BY created_at LIMIT 1;

  IF v_centre_id IS NULL THEN
    RAISE EXCEPTION 'No active centre found.';
  END IF;

  SELECT id INTO v_batch_a FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-A';
  SELECT id INTO v_batch_b FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-B';

  IF v_batch_a IS NULL OR v_batch_b IS NULL THEN
    RAISE EXCEPTION 'Demo batches not found. Run performance-demo-data.sql first.';
  END IF;

  -- Clean old demo attendance for these batches.
  DELETE FROM attendance WHERE batch_id IN (v_batch_a, v_batch_b);

  -- Generate attendance for each weekday in the last 30 days.
  v_day := v_start;
  WHILE v_day <= CURRENT_DATE LOOP
    -- Skip weekends.
    IF EXTRACT(DOW FROM v_day) NOT IN (0, 6) THEN

      -- Batch A students.
      INSERT INTO attendance (student_id, batch_id, attendance_date, status)
      SELECT
        s.id,
        v_batch_a,
        v_day,
        CASE WHEN random() < 0.85 THEN 'present' ELSE 'absent' END
      FROM students s
      WHERE s.parent_phone IN ('9100000001', '9100000002', '9100000003', '9100000004')
      ON CONFLICT (student_id, batch_id, attendance_date) DO UPDATE
      SET status = EXCLUDED.status, marked_at = NOW();

      -- Batch B students.
      INSERT INTO attendance (student_id, batch_id, attendance_date, status)
      SELECT
        s.id,
        v_batch_b,
        v_day,
        CASE WHEN random() < 0.80 THEN 'present' ELSE 'absent' END
      FROM students s
      WHERE s.parent_phone IN ('9100000005', '9100000006', '9100000007', '9100000008')
      ON CONFLICT (student_id, batch_id, attendance_date) DO UPDATE
      SET status = EXCLUDED.status, marked_at = NOW();

    END IF;

    v_day := v_day + INTERVAL '1 day';
  END LOOP;
END $$;
