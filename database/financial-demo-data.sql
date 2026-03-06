-- Demo financial data for local development.
-- Creates invoices (for all enrolled demo students), centre expenses, and staff salaries.
--
-- Run after: database_schema.sql and student-demo-data.sql

DO $$
DECLARE
    v_centre_id   UUID;
    v_batch_a     UUID;
    v_batch_b     UUID;
    v_ceo_id      UUID;
    v_teacher_row RECORD;
    v_enroll_row  RECORD;
    v_invoice_id  UUID;
    v_fee         NUMERIC;
    v_status      TEXT;
    v_paid        NUMERIC;
    v_idx         INT;
BEGIN
    -- ── Lookups ──────────────────────────────────────────
    SELECT id INTO v_centre_id FROM centres WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
    IF v_centre_id IS NULL THEN
        RAISE EXCEPTION 'No active centre found. Run database_schema.sql first.';
    END IF;

    SELECT id INTO v_batch_a FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-A' LIMIT 1;
    SELECT id INTO v_batch_b FROM batches WHERE centre_id = v_centre_id AND batch_code = 'PERF-B' LIMIT 1;
    IF v_batch_a IS NULL OR v_batch_b IS NULL THEN
        RAISE EXCEPTION 'Demo batches not found. Run student-demo-data.sql first.';
    END IF;

    SELECT id INTO v_ceo_id FROM users
        WHERE role_id = (SELECT id FROM roles WHERE role_name = 'ceo') LIMIT 1;


    -- ═══════════════════════════════════════════════════════════════
    -- 1. CENTRE EXPENSES  (past 6 months, 5 categories)
    -- ═══════════════════════════════════════════════════════════════
    FOR i IN 0..5 LOOP
        INSERT INTO centre_expenses (centre_id, month_year, category, amount, description, entered_by)
        VALUES
            (v_centre_id, DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
             'rent', 50000, 'Monthly building rent', v_ceo_id),
            (v_centre_id, DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
             'electricity_bill', 12000 + (RANDOM() * 3000)::INT, 'Electricity bill', v_ceo_id),
            (v_centre_id, DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
             'internet_bill', 2000, 'Internet connection', v_ceo_id),
            (v_centre_id, DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
             'stationery', 5000 + (RANDOM() * 2000)::INT, 'Whiteboard markers, paper, chalk', v_ceo_id),
            (v_centre_id, DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
             'miscellaneous', 3000 + (RANDOM() * 2000)::INT, 'Tea, cleaning, maintenance', v_ceo_id)
        ON CONFLICT (centre_id, month_year, category) DO NOTHING;
    END LOOP;


    -- ═══════════════════════════════════════════════════════════════
    -- 2. STAFF SALARIES  (CEO + all active teachers, past 6 months)
    -- ═══════════════════════════════════════════════════════════════

    -- 2a. CEO salary — ₹80,000/month, current month unpaid
    IF v_ceo_id IS NOT NULL THEN
        FOR i IN 0..5 LOOP
            INSERT INTO staff_salaries
                (user_id, centre_id, month_year, amount_due, amount_paid, status, payment_date, entered_by)
            VALUES (
                v_ceo_id, v_centre_id,
                DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
                80000,
                CASE WHEN i = 0 THEN 0 ELSE 80000 END,
                CASE WHEN i = 0 THEN 'unpaid' ELSE 'paid' END,
                CASE WHEN i = 0 THEN NULL
                     ELSE (DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE + 28)
                END,
                v_ceo_id
            )
            ON CONFLICT (user_id, centre_id, month_year) DO NOTHING;
        END LOOP;
    END IF;

    -- 2b. Teacher salaries — ₹35k-₹55k/month, varied statuses
    v_idx := 0;
    FOR v_teacher_row IN
        SELECT u.id AS user_id
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.role_name = 'teacher' AND u.is_active = TRUE
        ORDER BY u.created_at
        LIMIT 5
    LOOP
        v_idx := v_idx + 1;
        FOR i IN 0..5 LOOP
            v_fee := 35000 + (v_idx * 5000);

            IF i = 0 THEN
                IF v_idx = 1 THEN v_status := 'partial'; v_paid := v_fee * 0.5;
                ELSIF v_idx = 2 THEN v_status := 'unpaid'; v_paid := 0;
                ELSE v_status := 'paid'; v_paid := v_fee;
                END IF;
            ELSE
                v_status := 'paid'; v_paid := v_fee;
            END IF;

            INSERT INTO staff_salaries
                (user_id, centre_id, month_year, amount_due, amount_paid, status, payment_date, entered_by)
            VALUES (
                v_teacher_row.user_id, v_centre_id,
                DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
                v_fee, v_paid, v_status,
                CASE WHEN v_status IN ('unpaid') THEN NULL
                     ELSE (DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE + 28)
                END,
                v_ceo_id
            )
            ON CONFLICT (user_id, centre_id, month_year) DO NOTHING;
        END LOOP;
    END LOOP;


    -- ═══════════════════════════════════════════════════════════════
    -- 3. STUDENT INVOICES & FEE TRANSACTIONS
    --    Uses student_batch_enrollments (no phone number dependency).
    --    Batch A fee: ₹5,000     Batch B fee: ₹6,000
    --    Payment scenarios rotate by student index.
    -- ═══════════════════════════════════════════════════════════════

    v_idx := 0;
    FOR v_enroll_row IN
        SELECT sbe.student_id, sbe.batch_id
        FROM student_batch_enrollments sbe
        JOIN batches b ON b.id = sbe.batch_id
        WHERE b.centre_id = v_centre_id
          AND sbe.is_active = TRUE
          AND sbe.batch_id IN (v_batch_a, v_batch_b)
        ORDER BY sbe.created_at
    LOOP
        v_idx := v_idx + 1;
        v_fee := CASE WHEN v_enroll_row.batch_id = v_batch_a THEN 5000 ELSE 6000 END;

        FOR i IN 0..5 LOOP
            -- Assign payment scenario based on student index (1-8 cycling)
            -- 1,3,6,8 → always paid  |  2,7 → partial current month
            -- 4 → pending current     |  5 → overdue last month + pending current
            CASE (v_idx % 8)
                WHEN 1, 3, 6, 0 THEN  -- student 1,3,6,8: always paid
                    v_status := 'paid'; v_paid := v_fee;
                WHEN 2, 7 THEN         -- student 2,7: partial current month
                    IF i = 0 THEN v_status := 'partial'; v_paid := ROUND(v_fee * 0.5);
                    ELSE v_status := 'paid'; v_paid := v_fee; END IF;
                WHEN 4 THEN            -- student 4: pending current month
                    IF i = 0 THEN v_status := 'pending'; v_paid := 0;
                    ELSE v_status := 'paid'; v_paid := v_fee; END IF;
                WHEN 5 THEN            -- student 5: overdue last month, pending current
                    IF i = 0 THEN v_status := 'pending'; v_paid := 0;
                    ELSIF i = 1 THEN v_status := 'overdue'; v_paid := 0;
                    ELSE v_status := 'paid'; v_paid := v_fee; END IF;
                ELSE
                    v_status := 'paid'; v_paid := v_fee;
            END CASE;

            -- Insert invoice
            INSERT INTO student_invoices
                (id, student_id, batch_id, month_year, monthly_fee, amount_due, amount_paid, payment_status)
            VALUES (
                uuid_generate_v4(),
                v_enroll_row.student_id,
                v_enroll_row.batch_id,
                DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE,
                v_fee, v_fee, v_paid, v_status
            )
            ON CONFLICT (student_id, batch_id, month_year) DO NOTHING
            RETURNING id INTO v_invoice_id;

            -- Insert fee transaction for any payment made
            IF v_invoice_id IS NOT NULL AND v_paid > 0 THEN
                INSERT INTO fee_transactions
                    (student_invoice_id, payment_date, amount, payment_mode, collected_by)
                VALUES (
                    v_invoice_id,
                    DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE + 5,
                    v_paid,
                    CASE WHEN RANDOM() < 0.5 THEN 'online' ELSE 'cash' END,
                    v_ceo_id
                );
            END IF;
        END LOOP;
    END LOOP;

END $$;
