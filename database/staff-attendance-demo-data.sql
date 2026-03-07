-- Generates 30 days of realistic staff attendance data for teachers at the primary centre.
-- Clears existing data before insertion to allow safe re-runs.

DO $$
DECLARE
    v_centre_id UUID;
    v_admin_user UUID;
    v_current_date DATE;
    v_start_date DATE;
    v_teacher RECORD;
    v_status VARCHAR;
    v_in_time TIME;
    v_out_time TIME;
    v_random INT;
BEGIN
    -- 1. Get the primary active centre
    SELECT id INTO v_centre_id FROM centres WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
    IF v_centre_id IS NULL THEN
        RAISE EXCEPTION 'No active centre found.';
    END IF;

    -- 2. Get an admin user to mark the attendance
    SELECT id INTO v_admin_user FROM users WHERE role_id IN (SELECT id FROM roles WHERE role_name IN ('ceo', 'centre_head')) LIMIT 1;

    -- 3. Set date range (last 30 days up to today)
    v_current_date := CURRENT_DATE;
    v_start_date := v_current_date - INTERVAL '29 days';

    -- 4. Clean up existing staff attendance data for this centre to avoid conflicts
    DELETE FROM staff_attendance WHERE centre_id = v_centre_id;

    -- 5. Loop through teachers assigned to this centre
    FOR v_teacher IN (
        SELECT u.id
        FROM users u
        JOIN user_centre_assignments uca ON u.id = uca.user_id
        JOIN roles r ON u.role_id = r.id
        WHERE uca.centre_id = v_centre_id AND r.role_name = 'teacher' AND u.is_active = TRUE
    )
    LOOP
        -- Loop through each day in the last 30 days
        FOR i IN 0..29 LOOP
            v_current_date := v_start_date + (i || ' days')::INTERVAL;

            -- Skip Sundays
            IF EXTRACT(DOW FROM v_current_date) = 0 THEN
                CONTINUE;
            END IF;

            -- Generate random attendance (80% present, 10% partial, 10% absent)
            v_random := FLOOR(RANDOM() * 100);
            
            IF v_random < 80 THEN
                v_status := 'present';
                -- Present: In between 8:30 and 9:15, Out between 16:30 and 17:30
                v_in_time := make_time(8, 30, 0) + (floor(random() * 45) || ' minutes')::interval;
                v_out_time := make_time(16, 30, 0) + (floor(random() * 60) || ' minutes')::interval;
            ELSIF v_random < 90 THEN
                v_status := 'partial';
                -- Partial: In between 9:00 and 10:00, Out between 13:00 and 14:00 (half day)
                v_in_time := make_time(9, 0, 0) + (floor(random() * 60) || ' minutes')::interval;
                v_out_time := make_time(13, 0, 0) + (floor(random() * 60) || ' minutes')::interval;
            ELSE
                v_status := 'absent';
                v_in_time := NULL;
                v_out_time := NULL;
            END IF;

            -- Insert the record
            INSERT INTO staff_attendance (
                user_id, centre_id, attendance_date, status, in_time, out_time, marked_by, marked_at
            ) VALUES (
                v_teacher.id, v_centre_id, v_current_date, v_status, v_in_time, v_out_time, v_admin_user, v_current_date + INTERVAL '9 hours'
            )
            ON CONFLICT DO NOTHING;
            
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Staff attendance demo data injected successfully for centre %', v_centre_id;
END $$;
