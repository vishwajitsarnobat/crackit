-- CRACK IT COACHING INSTITUTE - DATABASE SCHEMA v3.6
-- PostgreSQL 14+ (Supabase) | 3NF | UUIDs | RLS | Triggers | Views

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- SECTION 1: SERIAL COUNTERS
-- Replaces COUNT(*)+1 pattern - race-condition-safe via row lock.
-- One row per named counter; year column triggers reset each year.

CREATE TABLE id_counters (
    name       VARCHAR(50) PRIMARY KEY,
    year       INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    last_value INTEGER NOT NULL DEFAULT 0
);


-- SECTION 2: ROLES & USERS

-- Role hierarchy: lower level = more authority.
-- level values are contiguous 1–5.
CREATE TABLE roles (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name    VARCHAR(50) UNIQUE NOT NULL
                     CHECK (role_name IN ('ceo','centre_head','teacher','accountant','student')),
    display_name VARCHAR(100) NOT NULL,
    level        INTEGER NOT NULL,  -- 1=CEO, 2=Centre Head, 3=Teacher, 4-Accountant, 5=Student
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- is_active defaults FALSE; set TRUE on approval.
CREATE TABLE users (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id           UUID NOT NULL REFERENCES roles(id),
    full_name         VARCHAR(200) NOT NULL,
    email             VARCHAR(255) UNIQUE,
    phone             VARCHAR(20),
    profile_photo_url TEXT,
    is_active         BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role   ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Single active device per user; stores FCM token for push notifications.
CREATE TABLE user_active_sessions (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    device_id     VARCHAR(255) NOT NULL,
    device_name   VARCHAR(200),
    fcm_token     TEXT,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- SECTION 3: CENTRES

CREATE TABLE centres (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_code VARCHAR(20) UNIQUE NOT NULL,
    centre_name VARCHAR(200) NOT NULL,
    address     TEXT NOT NULL,
    city        VARCHAR(100),
    phone       VARCHAR(20),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Staff can serve multiple centres.
CREATE TABLE user_centre_assignments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    centre_id  UUID REFERENCES centres(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, centre_id)
);

CREATE INDEX idx_uca_user   ON user_centre_assignments(user_id);
CREATE INDEX idx_uca_centre ON user_centre_assignments(centre_id);

-- Approval inbox.
-- CEO approves: centre_head, accountant (centre_id = NULL).
-- Centre head approves: teacher, student (centre_id = their centre).
-- SET NULL on centre delete preserves audit history.
CREATE TABLE user_approval_requests (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
    centre_id        UUID REFERENCES centres(id) ON DELETE SET NULL,
    requested_role   VARCHAR(50) NOT NULL,
    status           VARCHAR(20) DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
    reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    applicant_note   TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Only one pending request per user at a time.
CREATE UNIQUE INDEX idx_one_pending_per_user ON user_approval_requests(user_id)
    WHERE status = 'pending';

CREATE INDEX idx_approval_status ON user_approval_requests(status);
CREATE INDEX idx_approval_centre ON user_approval_requests(centre_id);


-- SECTION 4: ACADEMIC STRUCTURE

CREATE TABLE batches (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_id     UUID REFERENCES centres(id) ON DELETE CASCADE,
    batch_code    VARCHAR(50) NOT NULL,
    batch_name    VARCHAR(200) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(centre_id, batch_code)
);

CREATE INDEX idx_batches_centre ON batches(centre_id);

-- Teachers are assigned to specific batches within their centres.
-- This must appear after batches because batch_id is a foreign key.
CREATE TABLE teacher_batch_assignments (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id              UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject               VARCHAR(100),
    monthly_salary        DECIMAL(10,2) NOT NULL CHECK (monthly_salary >= 0),
    assignment_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assignment_end_date   DATE,
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    CHECK (assignment_end_date IS NULL OR assignment_end_date >= assignment_start_date)
);

CREATE INDEX idx_tba_user ON teacher_batch_assignments(user_id);
CREATE INDEX idx_tba_batch ON teacher_batch_assignments(batch_id);
CREATE INDEX idx_tba_active ON teacher_batch_assignments(is_active);
CREATE UNIQUE INDEX uq_tba_active_subject
    ON teacher_batch_assignments (user_id, batch_id, COALESCE(subject, ''))
    WHERE is_active = TRUE;
CREATE UNIQUE INDEX uq_tba_assignment_window
    ON teacher_batch_assignments (user_id, batch_id, COALESCE(subject, ''), assignment_start_date);


-- SECTION 5: STUDENTS & ADMISSION

-- student_code auto-generated via trigger (STU20260001).
-- admission_form_data holds full form payload for PDF generation.
CREATE TABLE students (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_code            VARCHAR(50) UNIQUE,
    date_of_birth           DATE,
    class_level             INTEGER NOT NULL,
    parent_name             VARCHAR(200),
    parent_phone            VARCHAR(20),
    declaration_accepted    BOOLEAN DEFAULT FALSE,
    declaration_accepted_at TIMESTAMPTZ,
    admission_form_data     JSONB,
    current_points          INTEGER DEFAULT 0,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_user   ON students(user_id);
CREATE INDEX idx_students_active ON students(is_active);

-- is_active is derived from status - no sync trigger needed.
-- withdrawn_at auto-set by trigger when status changes to 'withdrawn'.
CREATE TABLE student_batch_enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id        UUID REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    monthly_fee     DECIMAL(10,2) NOT NULL CHECK (monthly_fee >= 0),
    status          VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','withdrawn')),
    withdrawn_at    DATE,
    is_active       BOOLEAN GENERATED ALWAYS AS (status = 'active') STORED,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrollments_student ON student_batch_enrollments(student_id);
CREATE INDEX idx_enrollments_batch   ON student_batch_enrollments(batch_id);
CREATE UNIQUE INDEX uq_active_student_batch_enrollment
    ON student_batch_enrollments(student_id, batch_id)
    WHERE status = 'active';


-- SECTION 6: FINANCIAL MANAGEMENT

-- monthly_fee = recurring amount used by cron to generate next month's invoice.
-- amount_due  = actual owed (pro-rated on first month, = monthly_fee thereafter).
-- payment_status recalculated by trigger on fee insert and on discount change.
CREATE TABLE student_invoices (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id     UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id       UUID REFERENCES batches(id) ON DELETE CASCADE,
    month_year     DATE NOT NULL,
    monthly_fee    DECIMAL(10,2) NOT NULL,
    amount_due     DECIMAL(10,2) NOT NULL,
    amount_paid    DECIMAL(10,2) DEFAULT 0,
    amount_discount DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending'
                       CHECK (payment_status IN ('pending','partial','paid','overdue')),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, month_year)
);

CREATE INDEX idx_invoices_student ON student_invoices(student_id);
CREATE INDEX idx_invoices_batch   ON student_invoices(batch_id);
CREATE INDEX idx_invoices_status  ON student_invoices(payment_status);
CREATE INDEX idx_invoices_month   ON student_invoices(month_year);

-- Immutable audit log - never updated or deleted.
-- receipt_number auto-generated via trigger (REC-2026-00001).
CREATE TABLE fee_transactions (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_invoice_id UUID REFERENCES student_invoices(id) ON DELETE CASCADE,
    payment_date       DATE DEFAULT CURRENT_DATE,
    amount             DECIMAL(10,2) NOT NULL,
    payment_mode       VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash','online')),
    collected_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_number     VARCHAR(50) UNIQUE,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_invoice ON fee_transactions(student_invoice_id);
CREATE INDEX idx_transactions_date    ON fee_transactions(payment_date DESC);

CREATE TABLE invoice_reward_allocations (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_invoice_id    UUID NOT NULL REFERENCES student_invoices(id) ON DELETE CASCADE,
    points_transaction_id UUID,
    allocation_amount     DECIMAL(10,2) NOT NULL CHECK (allocation_amount <> 0),
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_reward_allocations_invoice ON invoice_reward_allocations(student_invoice_id);
CREATE INDEX idx_invoice_reward_allocations_points  ON invoice_reward_allocations(points_transaction_id);

-- One row per centre per month per category.
CREATE TABLE centre_expenses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_id   UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    month_year  DATE NOT NULL,
    category    VARCHAR(50) NOT NULL
                    CHECK (category IN ('rent','electricity_bill','stationery','internet_bill','miscellaneous')),
    amount      DECIMAL(10,2) NOT NULL,
    description TEXT,
    entered_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_centre ON centre_expenses(centre_id);
CREATE INDEX idx_expenses_month  ON centre_expenses(month_year);
CREATE INDEX idx_expenses_category ON centre_expenses(category);

CREATE TABLE staff_salaries (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id    UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    month_year   DATE NOT NULL,
    amount_due   DECIMAL(10,2) NOT NULL,
    amount_paid  DECIMAL(10,2) DEFAULT 0,
    status       VARCHAR(20) DEFAULT 'unpaid'
                     CHECK (status IN ('paid','unpaid','partial')),
    assignment_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,
    payment_date DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, centre_id, month_year)
);

CREATE INDEX idx_salaries_user   ON staff_salaries(user_id);
CREATE INDEX idx_salaries_centre ON staff_salaries(centre_id);
CREATE INDEX idx_salaries_month  ON staff_salaries(month_year);

CREATE TABLE staff_salary_payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_salary_id UUID NOT NULL REFERENCES staff_salaries(id) ON DELETE CASCADE,
    payment_date    DATE DEFAULT CURRENT_DATE,
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description     TEXT,
    recorded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_salary_payments_salary ON staff_salary_payments(staff_salary_id);
CREATE INDEX idx_salary_payments_date   ON staff_salary_payments(payment_date DESC);


-- SECTION 7: ATTENDANCE

-- Radio button: present / absent only. Future dates blocked by trigger.
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id        UUID REFERENCES batches(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('present','absent')),
    marked_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, attendance_date)
);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_batch   ON attendance(batch_id);
CREATE INDEX idx_attendance_date    ON attendance(attendance_date DESC);

-- centre_id in UNIQUE prevents collision for multi-centre staff.
-- in_time / out_time used to detect late arrival or early departure.
CREATE TABLE staff_attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    centre_id       UUID REFERENCES centres(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','partial')),
    in_time         TIME,
    out_time        TIME,
    marked_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, centre_id, attendance_date)
);

CREATE INDEX idx_staff_attendance_user   ON staff_attendance(user_id);
CREATE INDEX idx_staff_attendance_centre ON staff_attendance(centre_id);
CREATE INDEX idx_staff_attendance_date   ON staff_attendance(attendance_date DESC);


-- SECTION 8: CONTENT

-- YouTube / Drive links per batch. Students see only published content.
CREATE TABLE content (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id     UUID REFERENCES batches(id) ON DELETE CASCADE,
    title        VARCHAR(300) NOT NULL,
    content_url  TEXT NOT NULL,
    content_type VARCHAR(20) CHECK (content_type IN ('video','document')),
    remarks      TEXT,
    uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_batch     ON content(batch_id);
CREATE INDEX idx_content_published ON content(is_published);

-- SECTION 9: ASSESSMENTS

-- Offline exams; marks entered manually by teacher.
CREATE TABLE exams (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id         UUID REFERENCES batches(id) ON DELETE CASCADE,
    exam_name        VARCHAR(300) NOT NULL,
    subject          VARCHAR(100),
    exam_date        DATE NOT NULL,
    total_marks      DECIMAL(10,2) NOT NULL CHECK (total_marks > 0),
    passing_marks    DECIMAL(10,2),
    results_published BOOLEAN DEFAULT FALSE,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_batch ON exams(batch_id);
CREATE INDEX idx_exams_date  ON exams(exam_date DESC);

-- is_absent = TRUE forces marks_obtained = 0 (CHECK constraint).
-- Marks validated against exam total by trigger.
CREATE TABLE student_marks (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id     UUID REFERENCES students(id) ON DELETE CASCADE,
    exam_id        UUID REFERENCES exams(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10,2) NOT NULL CHECK (marks_obtained >= 0),
    is_absent      BOOLEAN DEFAULT FALSE,
    CHECK (NOT is_absent OR marks_obtained = 0),
    entered_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_id)
);

CREATE INDEX idx_marks_student ON student_marks(student_id);
CREATE INDEX idx_marks_exam    ON student_marks(exam_id);


-- SECTION 10: REWARDS

CREATE TABLE reward_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name       VARCHAR(200) NOT NULL,
    description     TEXT,
    trigger_type    VARCHAR(50) NOT NULL
                       CHECK (trigger_type IN ('attendance','perfect_attendance','attendance_streak','performance','timely_fee_payment')),
    award_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly'
                       CHECK (award_frequency IN ('monthly')),
    scope_type      VARCHAR(20) NOT NULL DEFAULT 'global'
                       CHECK (scope_type IN ('global','centre','batch')),
    centre_id       UUID REFERENCES centres(id) ON DELETE CASCADE,
    batch_id        UUID REFERENCES batches(id) ON DELETE CASCADE,
    points_awarded  INTEGER NOT NULL CHECK (points_awarded > 0),
    criteria        JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (scope_type = 'global' AND centre_id IS NULL AND batch_id IS NULL)
        OR (scope_type = 'centre' AND centre_id IS NOT NULL AND batch_id IS NULL)
        OR (scope_type = 'batch' AND batch_id IS NOT NULL)
    )
);

CREATE INDEX idx_reward_rules_active ON reward_rules(is_active);
CREATE INDEX idx_reward_rules_scope  ON reward_rules(scope_type, centre_id, batch_id);

-- Immutable points log. Positive = earned; negative = redeemed or deducted.
CREATE TABLE points_transactions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    points     INTEGER NOT NULL,
    reason     VARCHAR(50) NOT NULL
                   CHECK (reason IN (
                       'rule_award','manual_adjustment','manual_deduction',
                       'redeemed','redeemed_reversal'
                   )),
    description TEXT,
    reward_rule_id UUID REFERENCES reward_rules(id) ON DELETE SET NULL,
    reference_id UUID,   -- exam_id, invoice_id, or content_id depending on reason
    month_year   DATE,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_student ON points_transactions(student_id);
CREATE INDEX idx_points_month   ON points_transactions(month_year DESC);
CREATE INDEX idx_points_rule    ON points_transactions(reward_rule_id);

CREATE TABLE reward_rule_awards (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_rule_id        UUID NOT NULL REFERENCES reward_rules(id) ON DELETE CASCADE,
    student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    points_transaction_id UUID NOT NULL UNIQUE REFERENCES points_transactions(id) ON DELETE CASCADE,
    award_key             TEXT NOT NULL UNIQUE,
    source_month          DATE,
    source_reference_id   UUID,
    metadata              JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_awards_rule    ON reward_rule_awards(reward_rule_id);
CREATE INDEX idx_reward_awards_student ON reward_rule_awards(student_id);

CREATE TABLE reward_rule_executions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_rule_id UUID NOT NULL REFERENCES reward_rules(id) ON DELETE CASCADE,
    run_month      DATE NOT NULL,
    status         VARCHAR(20) NOT NULL
                     CHECK (status IN ('running','success','partial','failed')),
    eligible_count INTEGER NOT NULL DEFAULT 0 CHECK (eligible_count >= 0),
    awarded_count  INTEGER NOT NULL DEFAULT 0 CHECK (awarded_count >= 0),
    skipped_count  INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
    failed_count   INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMPTZ,
    triggered_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    error_message  TEXT,
    metadata       JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX idx_reward_exec_rule  ON reward_rule_executions(reward_rule_id);
CREATE INDEX idx_reward_exec_month ON reward_rule_executions(run_month DESC);
CREATE INDEX idx_reward_exec_time  ON reward_rule_executions(started_at DESC);

ALTER TABLE invoice_reward_allocations
    ADD CONSTRAINT fk_invoice_reward_allocations_points_transaction
    FOREIGN KEY (points_transaction_id)
    REFERENCES points_transactions(id)
    ON DELETE SET NULL;


-- SECTION 13: FUNCTIONS & TRIGGERS

-- Generic updated_at stamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_user_approval_requests_updated_at
    BEFORE UPDATE ON user_approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_centres_updated_at
    BEFORE UPDATE ON centres FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_batches_updated_at
    BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reward_rules_updated_at
    BEFORE UPDATE ON reward_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_enrollments_updated_at
    BEFORE UPDATE ON student_batch_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_student_invoices_updated_at
    BEFORE UPDATE ON student_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_student_marks_updated_at
    BEFORE UPDATE ON student_marks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate student code STU20260001 - counter-table approach avoids race conditions.
CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_next INTEGER;
BEGIN
    IF NEW.student_code IS NULL THEN
        v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

        INSERT INTO id_counters (name, year, last_value)
        VALUES ('student_code', v_year::INTEGER, 0)
        ON CONFLICT (name) DO NOTHING;

        UPDATE id_counters
        SET last_value = CASE WHEN year = v_year::INTEGER THEN last_value + 1 ELSE 1 END,
            year       = v_year::INTEGER
        WHERE name = 'student_code'
        RETURNING last_value INTO v_next;

        IF v_next IS NULL THEN
            RAISE EXCEPTION 'Could not allocate next student_code counter value.';
        END IF;

        NEW.student_code := 'STU' || v_year || LPAD(v_next::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_student_code
    BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION generate_student_code();

-- Auto-generate receipt number REC-2026-00001 - same counter-table approach.
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_next INTEGER;
BEGIN
    IF NEW.receipt_number IS NULL THEN
        v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

        INSERT INTO id_counters (name, year, last_value)
        VALUES ('receipt_number', v_year::INTEGER, 0)
        ON CONFLICT (name) DO NOTHING;

        UPDATE id_counters
        SET last_value = CASE WHEN year = v_year::INTEGER THEN last_value + 1 ELSE 1 END,
            year       = v_year::INTEGER
        WHERE name = 'receipt_number'
        RETURNING last_value INTO v_next;

        IF v_next IS NULL THEN
            RAISE EXCEPTION 'Could not allocate next receipt_number counter value.';
        END IF;

        NEW.receipt_number := 'REC-' || v_year || '-' || LPAD(v_next::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_receipt_number
    BEFORE INSERT ON fee_transactions FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

CREATE OR REPLACE FUNCTION sync_student_points_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE students
    SET current_points = COALESCE(current_points, 0) + NEW.points
    WHERE id = NEW.student_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_student_points_on_insert
    AFTER INSERT ON points_transactions
    FOR EACH ROW EXECUTE FUNCTION sync_student_points_on_insert();

CREATE OR REPLACE FUNCTION prevent_points_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Points transactions are immutable. Add a new transaction instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_points_transaction_update
    BEFORE UPDATE ON points_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_points_transaction_mutation();

CREATE TRIGGER trg_prevent_points_transaction_delete
    BEFORE DELETE ON points_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_points_transaction_mutation();

CREATE OR REPLACE FUNCTION prevent_centre_expense_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Centre expenses are append-only. Add a compensating entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_centre_expense_update
    BEFORE UPDATE ON centre_expenses
    FOR EACH ROW EXECUTE FUNCTION prevent_centre_expense_mutation();

CREATE TRIGGER trg_prevent_centre_expense_delete
    BEFORE DELETE ON centre_expenses
    FOR EACH ROW EXECUTE FUNCTION prevent_centre_expense_mutation();

CREATE OR REPLACE FUNCTION record_reward_rule_award(
    p_reward_rule_id UUID,
    p_student_id UUID,
    p_points INTEGER,
    p_award_key TEXT,
    p_source_month DATE,
    p_source_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_points_transaction_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM reward_rule_awards WHERE award_key = p_award_key
    ) THEN
        RETURN NULL;
    END IF;

    INSERT INTO points_transactions (
        student_id,
        points,
        reason,
        description,
        reward_rule_id,
        reference_id,
        month_year,
        created_by
    ) VALUES (
        p_student_id,
        p_points,
        'rule_award',
        p_description,
        p_reward_rule_id,
        p_source_reference_id,
        p_source_month,
        p_created_by
    ) RETURNING id INTO v_points_transaction_id;

    INSERT INTO reward_rule_awards (
        reward_rule_id,
        student_id,
        points_transaction_id,
        award_key,
        source_month,
        source_reference_id,
        metadata
    ) VALUES (
        p_reward_rule_id,
        p_student_id,
        v_points_transaction_id,
        p_award_key,
        p_source_month,
        p_source_reference_id,
        p_metadata
    );

    RETURN v_points_transaction_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_fee_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Fee transactions are immutable. Add a new payment entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_fee_transaction_update
    BEFORE UPDATE ON fee_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_fee_transaction_mutation();

CREATE TRIGGER trg_prevent_fee_transaction_delete
    BEFORE DELETE ON fee_transactions
    FOR EACH ROW EXECUTE FUNCTION prevent_fee_transaction_mutation();

CREATE OR REPLACE FUNCTION prevent_invoice_reward_allocation_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Invoice reward allocations are immutable. Add a new allocation entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_invoice_reward_allocation_update
    BEFORE UPDATE ON invoice_reward_allocations
    FOR EACH ROW EXECUTE FUNCTION prevent_invoice_reward_allocation_mutation();

CREATE TRIGGER trg_prevent_invoice_reward_allocation_delete
    BEFORE DELETE ON invoice_reward_allocations
    FOR EACH ROW EXECUTE FUNCTION prevent_invoice_reward_allocation_mutation();

CREATE OR REPLACE FUNCTION validate_invoice_reward_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_total DECIMAL(10,2);
    v_amount_due DECIMAL(10,2);
    v_amount_paid DECIMAL(10,2);
    v_allowed_total DECIMAL(10,2);
    v_next_total DECIMAL(10,2);
    v_points_reason VARCHAR(50);
BEGIN
    SELECT COALESCE(SUM(allocation_amount), 0)
    INTO v_existing_total
    FROM invoice_reward_allocations
    WHERE student_invoice_id = NEW.student_invoice_id;

    SELECT amount_due, amount_paid
    INTO v_amount_due, v_amount_paid
    FROM student_invoices
    WHERE id = NEW.student_invoice_id;

    IF v_amount_due IS NULL THEN
        RAISE EXCEPTION 'Student invoice not found for reward allocation.';
    END IF;

    v_allowed_total := GREATEST(0, v_amount_due - COALESCE(v_amount_paid, 0));
    v_next_total := v_existing_total + NEW.allocation_amount;

    IF v_next_total < 0 THEN
        RAISE EXCEPTION 'Reward allocation reversal cannot reduce invoice discount below zero.';
    END IF;

    IF v_next_total > v_allowed_total THEN
        RAISE EXCEPTION 'Reward allocation cannot exceed the invoice''s remaining outstanding amount.';
    END IF;

    IF NEW.points_transaction_id IS NOT NULL THEN
        SELECT reason INTO v_points_reason
        FROM points_transactions
        WHERE id = NEW.points_transaction_id;

        IF NEW.allocation_amount > 0 AND v_points_reason <> 'redeemed' THEN
            RAISE EXCEPTION 'Positive reward allocations must link to a redeemed points transaction.';
        END IF;

        IF NEW.allocation_amount < 0 AND v_points_reason <> 'redeemed_reversal' THEN
            RAISE EXCEPTION 'Negative reward allocations must link to a redeemed_reversal points transaction.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_invoice_reward_allocation
    BEFORE INSERT ON invoice_reward_allocations
    FOR EACH ROW EXECUTE FUNCTION validate_invoice_reward_allocation();

CREATE OR REPLACE FUNCTION sync_invoice_discount_from_allocations()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_discount DECIMAL(10,2);
BEGIN
    v_invoice_id := NEW.student_invoice_id;

    SELECT COALESCE(SUM(allocation_amount), 0)
    INTO v_total_discount
    FROM invoice_reward_allocations
    WHERE student_invoice_id = v_invoice_id;

    IF v_total_discount < 0 THEN
        RAISE EXCEPTION 'Invoice reward discount cannot become negative.';
    END IF;

    UPDATE student_invoices
    SET amount_discount = v_total_discount,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_invoice_discount_from_allocations
    AFTER INSERT ON invoice_reward_allocations
    FOR EACH ROW EXECUTE FUNCTION sync_invoice_discount_from_allocations();

-- Recalculate invoice payment_status after each payment INSERT.
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_net_due    DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM fee_transactions WHERE student_invoice_id = NEW.student_invoice_id;

    SELECT amount_due - COALESCE(amount_discount, 0) INTO v_net_due
    FROM student_invoices WHERE id = NEW.student_invoice_id;

    UPDATE student_invoices SET
        amount_paid    = v_total_paid,
        payment_status = CASE
            WHEN v_total_paid >= v_net_due THEN 'paid'
            WHEN v_total_paid > 0          THEN 'partial'
            ELSE                                'pending'
        END,
        updated_at = NOW()
    WHERE id = NEW.student_invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fee_payment
    AFTER INSERT ON fee_transactions
    FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();

-- Recalculate payment_status when a discount is applied or changed.
CREATE OR REPLACE FUNCTION update_invoice_on_discount()
RETURNS TRIGGER AS $$
DECLARE v_net_due DECIMAL(10,2);
BEGIN
    IF NEW.amount_discount IS DISTINCT FROM OLD.amount_discount THEN
        v_net_due := NEW.amount_due - COALESCE(NEW.amount_discount, 0);
        NEW.payment_status := CASE
            WHEN v_net_due <= 0 THEN 'paid'
            WHEN NEW.amount_paid >= v_net_due THEN 'paid'
            WHEN NEW.amount_paid > 0                             THEN 'partial'
            ELSE                                                      'pending'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_discount_change
    BEFORE UPDATE OF amount_discount ON student_invoices
    FOR EACH ROW EXECUTE FUNCTION update_invoice_on_discount();

CREATE OR REPLACE FUNCTION generate_student_invoices_for_month(
    p_month_year DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_batch_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
BEGIN
    v_month_start := DATE_TRUNC('month', p_month_year)::DATE;
    v_month_end := (DATE_TRUNC('month', p_month_year) + INTERVAL '1 month - 1 day')::DATE;

    INSERT INTO student_invoices (student_id, batch_id, month_year, monthly_fee, amount_due, amount_discount, amount_paid, payment_status)
    SELECT
        sbe.student_id,
        sbe.batch_id,
        v_month_start,
        sbe.monthly_fee,
        sbe.monthly_fee,
        0,
        0,
        'pending'
    FROM student_batch_enrollments sbe
    WHERE sbe.is_active = TRUE
      AND sbe.enrollment_date <= v_month_end
      AND (p_batch_id IS NULL OR sbe.batch_id = p_batch_id)
      AND NOT EXISTS (
          SELECT 1 FROM student_invoices existing_invoice
          WHERE existing_invoice.student_id = sbe.student_id
            AND existing_invoice.batch_id = sbe.batch_id
            AND existing_invoice.month_year = v_month_start
      )
    ON CONFLICT (student_id, batch_id, month_year) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_initial_student_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_month_year DATE;
    v_days_in_month INTEGER;
    v_remaining_days INTEGER;
    v_amount_due DECIMAL(10,2);
BEGIN
    IF NEW.status <> 'active' THEN
        RETURN NEW;
    END IF;

    v_month_year := DATE_TRUNC('month', NEW.enrollment_date)::DATE;
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', NEW.enrollment_date) + INTERVAL '1 month - 1 day'))::INTEGER;
    v_remaining_days := v_days_in_month - EXTRACT(DAY FROM NEW.enrollment_date)::INTEGER + 1;
    v_amount_due := ROUND(((NEW.monthly_fee * v_remaining_days) / v_days_in_month)::NUMERIC, 2);

    INSERT INTO student_invoices (
        student_id,
        batch_id,
        month_year,
        monthly_fee,
        amount_due,
        amount_discount,
        amount_paid,
        payment_status
    )
    VALUES (
        NEW.student_id,
        NEW.batch_id,
        v_month_year,
        NEW.monthly_fee,
        v_amount_due,
        0,
        0,
        'pending'
    )
    ON CONFLICT (student_id, batch_id, month_year) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_initial_student_invoice
    AFTER INSERT ON student_batch_enrollments
    FOR EACH ROW EXECUTE FUNCTION create_initial_student_invoice();

-- Sets withdrawn_at when enrollment status changes to 'withdrawn'.
-- is_active is a generated column - no need to set it here.
CREATE OR REPLACE FUNCTION set_withdrawn_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'withdrawn' AND OLD.status = 'active' THEN
        NEW.withdrawn_at := CURRENT_DATE;
    ELSIF NEW.status = 'active' THEN
        NEW.withdrawn_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_withdrawn_at
    BEFORE UPDATE ON student_batch_enrollments
    FOR EACH ROW EXECUTE FUNCTION set_withdrawn_at();

-- Reject future-date attendance on both tables.
CREATE OR REPLACE FUNCTION validate_attendance_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot mark attendance for future dates';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_student_attendance_date
    BEFORE INSERT OR UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION validate_attendance_date();

CREATE TRIGGER trg_validate_staff_attendance_date
    BEFORE INSERT OR UPDATE ON staff_attendance
    FOR EACH ROW EXECUTE FUNCTION validate_attendance_date();

-- Reject marks exceeding the exam total.
CREATE OR REPLACE FUNCTION validate_marks()
RETURNS TRIGGER AS $$
DECLARE v_total DECIMAL(10,2);
BEGIN
    SELECT total_marks INTO v_total FROM exams WHERE id = NEW.exam_id;
    IF NEW.marks_obtained > v_total THEN
        RAISE EXCEPTION 'Marks (%) exceed total marks (%) for exam', NEW.marks_obtained, v_total;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_marks
    BEFORE INSERT OR UPDATE ON student_marks
    FOR EACH ROW EXECUTE FUNCTION validate_marks();

CREATE OR REPLACE FUNCTION recalculate_staff_salary_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_salary_id UUID;
    v_total_paid DECIMAL(10,2);
    v_amount_due DECIMAL(10,2);
BEGIN
    v_salary_id := COALESCE(NEW.staff_salary_id, OLD.staff_salary_id);

    SELECT amount_due INTO v_amount_due
    FROM staff_salaries
    WHERE id = v_salary_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM staff_salary_payments
    WHERE staff_salary_id = v_salary_id;

    UPDATE staff_salaries
    SET amount_paid = v_total_paid,
        payment_date = (
            SELECT MAX(payment_date)
            FROM staff_salary_payments
            WHERE staff_salary_id = v_salary_id
        ),
        status = CASE
            WHEN v_total_paid >= v_amount_due THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW()
    WHERE id = v_salary_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_staff_salary_totals
    AFTER INSERT OR UPDATE OR DELETE ON staff_salary_payments
    FOR EACH ROW EXECUTE FUNCTION recalculate_staff_salary_totals();

CREATE OR REPLACE FUNCTION prevent_staff_salary_payment_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Staff salary payments are immutable. Add a new payment entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_staff_salary_payment_update
    BEFORE UPDATE ON staff_salary_payments
    FOR EACH ROW EXECUTE FUNCTION prevent_staff_salary_payment_mutation();

CREATE TRIGGER trg_prevent_staff_salary_payment_delete
    BEFORE DELETE ON staff_salary_payments
    FOR EACH ROW EXECUTE FUNCTION prevent_staff_salary_payment_mutation();

CREATE OR REPLACE FUNCTION generate_staff_salaries_for_month(
    p_month_year DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_centre_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO staff_salaries (
        user_id,
        centre_id,
        month_year,
        amount_due,
        amount_paid,
        status,
        assignment_snapshot,
        payment_date,
        created_at,
        updated_at
    )
    SELECT
        assignment_rows.user_id,
        assignment_rows.centre_id,
        p_month_year,
        assignment_rows.amount_due,
        COALESCE(existing.amount_paid, 0),
        CASE
            WHEN COALESCE(existing.amount_paid, 0) >= assignment_rows.amount_due THEN 'paid'
            WHEN COALESCE(existing.amount_paid, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        assignment_rows.assignment_snapshot,
        existing.payment_date,
        COALESCE(existing.created_at, NOW()),
        NOW()
    FROM (
        SELECT
            tba.user_id,
            b.centre_id,
            SUM(tba.monthly_salary)::DECIMAL(10,2) AS amount_due,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'assignment_id', tba.id,
                    'batch_id', b.id,
                    'batch_name', b.batch_name,
                    'subject', tba.subject,
                    'monthly_salary', tba.monthly_salary,
                    'assignment_start_date', tba.assignment_start_date,
                    'assignment_end_date', tba.assignment_end_date
                )
                ORDER BY b.batch_name, COALESCE(tba.subject, '')
            ) AS assignment_snapshot
        FROM teacher_batch_assignments tba
        JOIN batches b ON b.id = tba.batch_id
        WHERE (p_centre_id IS NULL OR b.centre_id = p_centre_id)
          AND tba.assignment_start_date <= (DATE_TRUNC('month', p_month_year) + INTERVAL '1 month - 1 day')::DATE
          AND (tba.assignment_end_date IS NULL OR tba.assignment_end_date >= DATE_TRUNC('month', p_month_year)::DATE)
        GROUP BY tba.user_id, b.centre_id
    ) AS assignment_rows
    LEFT JOIN staff_salaries existing
      ON existing.user_id = assignment_rows.user_id
     AND existing.centre_id = assignment_rows.centre_id
     AND existing.month_year = p_month_year
    ON CONFLICT (user_id, centre_id, month_year) DO UPDATE
    SET amount_due = EXCLUDED.amount_due,
        assignment_snapshot = EXCLUDED.assignment_snapshot,
        status = CASE
            WHEN staff_salaries.amount_paid >= EXCLUDED.amount_due THEN 'paid'
            WHEN staff_salaries.amount_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_staff_salary_for_month(
    p_user_id UUID,
    p_centre_id UUID,
    p_month_year DATE
)
RETURNS VOID AS $$
DECLARE
    v_month_start DATE;
    v_amount_due DECIMAL(10,2);
    v_assignment_snapshot JSONB;
BEGIN
    v_month_start := DATE_TRUNC('month', p_month_year)::DATE;

    SELECT
        COALESCE(SUM(tba.monthly_salary), 0)::DECIMAL(10,2),
        COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'assignment_id', tba.id,
                    'batch_id', b.id,
                    'batch_name', b.batch_name,
                    'subject', tba.subject,
                    'monthly_salary', tba.monthly_salary,
                    'assignment_start_date', tba.assignment_start_date,
                    'assignment_end_date', tba.assignment_end_date
                )
                ORDER BY b.batch_name, COALESCE(tba.subject, '')
            ),
            '[]'::JSONB
        )
    INTO v_amount_due, v_assignment_snapshot
    FROM teacher_batch_assignments tba
    JOIN batches b ON b.id = tba.batch_id
    WHERE tba.user_id = p_user_id
      AND b.centre_id = p_centre_id
      AND tba.assignment_start_date <= (DATE_TRUNC('month', v_month_start) + INTERVAL '1 month - 1 day')::DATE
      AND (tba.assignment_end_date IS NULL OR tba.assignment_end_date >= v_month_start);

    IF jsonb_array_length(v_assignment_snapshot) = 0 THEN
        DELETE FROM staff_salaries ss
        WHERE ss.user_id = p_user_id
          AND ss.centre_id = p_centre_id
          AND ss.month_year = v_month_start
          AND NOT EXISTS (
              SELECT 1
              FROM staff_salary_payments payment
              WHERE payment.staff_salary_id = ss.id
          );
        RETURN;
    END IF;

    INSERT INTO staff_salaries (
        user_id,
        centre_id,
        month_year,
        amount_due,
        amount_paid,
        status,
        assignment_snapshot,
        payment_date,
        created_at,
        updated_at
    )
    SELECT
        p_user_id,
        p_centre_id,
        v_month_start,
        v_amount_due,
        COALESCE(existing.amount_paid, 0),
        CASE
            WHEN COALESCE(existing.amount_paid, 0) >= v_amount_due THEN 'paid'
            WHEN COALESCE(existing.amount_paid, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        v_assignment_snapshot,
        existing.payment_date,
        COALESCE(existing.created_at, NOW()),
        NOW()
    FROM (
        SELECT *
        FROM staff_salaries
        WHERE user_id = p_user_id
          AND centre_id = p_centre_id
          AND month_year = v_month_start
    ) existing
    RIGHT JOIN (SELECT 1 AS seed) seed ON TRUE
    ON CONFLICT (user_id, centre_id, month_year) DO UPDATE
    SET amount_due = EXCLUDED.amount_due,
        assignment_snapshot = EXCLUDED.assignment_snapshot,
        status = CASE
            WHEN staff_salaries.amount_paid >= EXCLUDED.amount_due THEN 'paid'
            WHEN staff_salaries.amount_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_staff_salaries_for_teacher_centre(
    p_user_id UUID,
    p_centre_id UUID,
    p_from_month DATE,
    p_to_month DATE
)
RETURNS VOID AS $$
DECLARE
    v_current_month DATE;
BEGIN
    v_current_month := DATE_TRUNC('month', p_from_month)::DATE;

    WHILE v_current_month <= DATE_TRUNC('month', p_to_month)::DATE LOOP
        PERFORM sync_staff_salary_for_month(p_user_id, p_centre_id, v_current_month);
        v_current_month := (v_current_month + INTERVAL '1 month')::DATE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_staff_salary_on_assignment_change()
RETURNS TRIGGER AS $$
DECLARE
    v_current_month DATE;
    v_old_centre_id UUID;
    v_new_centre_id UUID;
    v_existing_max_month DATE;
    v_from_month DATE;
    v_to_month DATE;
    v_candidate DATE;
    v_user_id UUID;
    v_old_user_id UUID;
BEGIN
    v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

    IF TG_OP <> 'DELETE' THEN
        v_user_id := NEW.user_id;
        SELECT centre_id INTO v_new_centre_id FROM batches WHERE id = NEW.batch_id;
    END IF;

    IF TG_OP <> 'INSERT' THEN
        v_old_user_id := OLD.user_id;
        SELECT centre_id INTO v_old_centre_id FROM batches WHERE id = OLD.batch_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_from_month := LEAST(DATE_TRUNC('month', NEW.assignment_start_date)::DATE, v_current_month);
        SELECT COALESCE(MAX(month_year), GREATEST(DATE_TRUNC('month', NEW.assignment_start_date)::DATE, v_current_month))
        INTO v_to_month
        FROM staff_salaries
        WHERE user_id = NEW.user_id AND centre_id = v_new_centre_id;

        PERFORM refresh_staff_salaries_for_teacher_centre(NEW.user_id, v_new_centre_id, v_from_month, v_to_month);
        RETURN NEW;
    END IF;

    FOR v_candidate IN
        SELECT DISTINCT centre_id
        FROM unnest(ARRAY[v_old_centre_id, v_new_centre_id]) AS centre_id
        WHERE centre_id IS NOT NULL
    LOOP

        v_from_month := v_current_month;
        IF v_candidate = v_old_centre_id THEN
            v_from_month := LEAST(v_from_month, DATE_TRUNC('month', COALESCE(OLD.assignment_start_date, CURRENT_DATE))::DATE);
            IF NEW IS NOT NULL AND OLD.user_id = NEW.user_id AND v_old_centre_id = v_new_centre_id THEN
                v_from_month := LEAST(v_from_month, DATE_TRUNC('month', COALESCE(NEW.assignment_start_date, CURRENT_DATE))::DATE);
            END IF;
            v_user_id := v_old_user_id;
        ELSE
            v_from_month := LEAST(v_from_month, DATE_TRUNC('month', COALESCE(NEW.assignment_start_date, CURRENT_DATE))::DATE);
            v_user_id := NEW.user_id;
        END IF;

        SELECT MAX(month_year)
        INTO v_existing_max_month
        FROM staff_salaries
        WHERE user_id = v_user_id AND centre_id = v_candidate;

        v_to_month := GREATEST(v_current_month, COALESCE(v_existing_max_month, v_current_month));

        IF TG_OP <> 'DELETE' AND v_candidate = v_new_centre_id THEN
            v_to_month := GREATEST(v_to_month, DATE_TRUNC('month', COALESCE(NEW.assignment_start_date, CURRENT_DATE))::DATE);
            IF NEW.assignment_end_date IS NOT NULL THEN
                v_to_month := GREATEST(v_to_month, DATE_TRUNC('month', NEW.assignment_end_date)::DATE);
            END IF;
        END IF;

        IF TG_OP <> 'INSERT' AND v_candidate = v_old_centre_id AND OLD.assignment_end_date IS NOT NULL THEN
            v_to_month := GREATEST(v_to_month, DATE_TRUNC('month', OLD.assignment_end_date)::DATE);
        END IF;

        PERFORM refresh_staff_salaries_for_teacher_centre(v_user_id, v_candidate, v_from_month, v_to_month);
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_staff_salary_on_assignment_insert ON teacher_batch_assignments;

CREATE TRIGGER trg_sync_staff_salary_on_assignment_change
    AFTER INSERT OR UPDATE OR DELETE ON teacher_batch_assignments
    FOR EACH ROW EXECUTE FUNCTION sync_staff_salary_on_assignment_change();


-- SECTION 14: CRON JOBS

-- Run on the 1st of each month at 01:00 - copies last invoice to new month for active enrollments.
SELECT cron.schedule('create-monthly-invoices', '0 1 1 * *', $$
    SELECT generate_student_invoices_for_month(DATE_TRUNC('month', CURRENT_DATE)::DATE, NULL);
$$);

SELECT cron.schedule('create-monthly-staff-salaries', '5 1 1 * *', $$
    SELECT generate_staff_salaries_for_month(DATE_TRUNC('month', CURRENT_DATE)::DATE, NULL);
$$);

-- SECTION 16: ROW LEVEL SECURITY

-- Returns role_name for the current authenticated active user.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
    SELECT r.role_name FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND u.is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns array of centre UUIDs the current user is assigned to.
CREATE OR REPLACE FUNCTION get_my_centre_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY_AGG(centre_id) FROM user_centre_assignments
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_teacher_batch_ids()
RETURNS UUID[] AS $$
    SELECT COALESCE(ARRAY_AGG(batch_id), ARRAY[]::UUID[])
    FROM teacher_batch_assignments
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns current user's student IDs (usually one), bypassing RLS recursion.
CREATE OR REPLACE FUNCTION get_my_student_ids()
RETURNS UUID[] AS $$
    SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::UUID[])
    FROM students
    WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Atomic approval decision write path.
-- Keeps request status + user activation + assignment consistent.
CREATE OR REPLACE FUNCTION process_approval_decision(
    p_approval_id UUID,
    p_action TEXT,
    p_reviewer_id UUID,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_request user_approval_requests%ROWTYPE;
BEGIN
    IF p_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid action: %', p_action;
    END IF;

    SELECT * INTO v_request
    FROM user_approval_requests
    WHERE id = p_approval_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found.';
    END IF;

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'Approval request already processed.';
    END IF;

    IF p_action = 'approve' THEN
        UPDATE user_approval_requests
        SET status = 'approved',
            reviewed_by = p_reviewer_id,
            reviewed_at = NOW(),
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE id = p_approval_id;

        UPDATE users
        SET is_active = TRUE,
            updated_at = NOW()
        WHERE id = v_request.user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User not found for approval request.';
        END IF;

        IF v_request.centre_id IS NOT NULL THEN
            INSERT INTO user_centre_assignments (
                user_id,
                centre_id,
                is_active,
                is_primary
            )
            VALUES (
                v_request.user_id,
                v_request.centre_id,
                TRUE,
                TRUE
            )
            ON CONFLICT (user_id, centre_id) DO UPDATE
            SET is_active = TRUE,
                is_primary = TRUE;
        END IF;
    ELSE
        UPDATE user_approval_requests
        SET status = 'rejected',
            reviewed_by = p_reviewer_id,
            reviewed_at = NOW(),
            rejection_reason = NULLIF(BTRIM(COALESCE(p_rejection_reason, '')), ''),
            updated_at = NOW()
        WHERE id = p_approval_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_approval_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_centre_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_batch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE centres                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batch_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reward_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salaries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salary_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE content                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rule_awards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rule_executions    ENABLE ROW LEVEL SECURITY;

-- CEO: full access everywhere; fee_transactions SELECT only (immutable log).
CREATE POLICY "ceo_all" ON users                     FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_active_sessions      FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_approval_requests    FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_centre_assignments   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON teacher_batch_assignments FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON centres                   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON batches                   FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON students                  FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON student_batch_enrollments FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON student_invoices          FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_sel" ON fee_transactions          FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON invoice_reward_allocations FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON centre_expenses           FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON staff_salaries            FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_salary_payments_sel" ON staff_salary_payments FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON attendance                FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON staff_attendance          FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON content                   FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON exams                     FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON student_marks             FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON reward_rules              FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON points_transactions       FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_read" ON reward_rule_awards        FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON reward_rule_executions     FOR ALL    USING (get_my_role() = 'ceo');

-- ALL AUTHENTICATED USERS
-- users: any authenticated user can read (needed for all view JOINs).
-- Inactive users can read own row (needed pre-approval).
CREATE POLICY "users_read" ON users
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Each user manages their own session.
CREATE POLICY "own_session" ON user_active_sessions
    FOR ALL USING (user_id = auth.uid());

-- Each user can see their own centre assignments.
CREATE POLICY "own_uca" ON user_centre_assignments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_teacher_assignments" ON teacher_batch_assignments
    FOR SELECT USING (user_id = auth.uid());

-- Inactive (unapproved) users must be able to submit and check their own approval request.
CREATE POLICY "self_apply_insert" ON user_approval_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "self_apply_read" ON user_approval_requests
    FOR SELECT USING (user_id = auth.uid());

-- CENTRE HEAD: scoped to assigned centres.
CREATE POLICY "ch_centres" ON centres
    FOR SELECT USING (id = ANY(get_my_centre_ids()));

CREATE POLICY "ch_approval_requests" ON user_approval_requests
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "ch_uca" ON user_centre_assignments
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "ch_teacher_assignments" ON teacher_batch_assignments
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = teacher_batch_assignments.batch_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_batches" ON batches
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "ch_students" ON students
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            JOIN batches b ON b.id = sbe.batch_id
            WHERE sbe.student_id = students.id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_enrollments" ON student_batch_enrollments
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_batch_enrollments.batch_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "teacher_batches" ON batches
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND id = ANY(get_my_teacher_batch_ids())
    );

CREATE POLICY "teacher_students" ON students
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            WHERE sbe.student_id = students.id
            AND sbe.batch_id = ANY(get_my_teacher_batch_ids())
        )
    );

CREATE POLICY "teacher_enrollments" ON student_batch_enrollments
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND batch_id = ANY(get_my_teacher_batch_ids())
    );

CREATE POLICY "ch_invoices" ON student_invoices
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_invoices.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_insert_transactions" ON fee_transactions
    FOR INSERT WITH CHECK (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = fee_transactions.student_invoice_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_view_transactions" ON fee_transactions
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = fee_transactions.student_invoice_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_invoice_reward_allocations" ON invoice_reward_allocations
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = invoice_reward_allocations.student_invoice_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_expenses" ON centre_expenses
    FOR ALL USING (
        get_my_role() = 'centre_head' AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "ch_salaries" ON staff_salaries
    FOR ALL USING (
        get_my_role() = 'centre_head' AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "ch_salary_payments_select" ON staff_salary_payments
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM staff_salaries ss
            WHERE ss.id = staff_salary_payments.staff_salary_id
            AND ss.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_salary_payments_insert" ON staff_salary_payments
    FOR INSERT WITH CHECK (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM staff_salaries ss
            WHERE ss.id = staff_salary_payments.staff_salary_id
            AND ss.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_attendance" ON attendance
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = attendance.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_staff_attendance" ON staff_attendance
    FOR ALL USING (
        get_my_role() = 'centre_head' AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "ch_content" ON content
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = content.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_exams" ON exams
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = exams.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_marks" ON student_marks
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM exams e
            JOIN batches b ON b.id = e.batch_id
            WHERE e.id = student_marks.exam_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_points" ON points_transactions
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM students s
            JOIN student_batch_enrollments sbe ON sbe.student_id = s.id
            JOIN batches b ON b.id = sbe.batch_id
            WHERE s.id = points_transactions.student_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_reward_awards" ON reward_rule_awards
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM students s
            JOIN student_batch_enrollments sbe ON sbe.student_id = s.id
            JOIN batches b ON b.id = sbe.batch_id
            WHERE s.id = reward_rule_awards.student_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

-- ACCOUNTANT: fees, expenses, salaries for assigned centres.
-- fee_transactions: INSERT + SELECT only (immutable).
CREATE POLICY "acc_invoices" ON student_invoices
    FOR ALL USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_invoices.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "acc_insert_transactions" ON fee_transactions
    FOR INSERT WITH CHECK (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = fee_transactions.student_invoice_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "acc_view_transactions" ON fee_transactions
    FOR SELECT USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = fee_transactions.student_invoice_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "acc_invoice_reward_allocations" ON invoice_reward_allocations
    FOR ALL USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = invoice_reward_allocations.student_invoice_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "acc_expenses" ON centre_expenses
    FOR ALL USING (
        get_my_role() = 'accountant' AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "acc_salaries" ON staff_salaries
    FOR ALL USING (
        get_my_role() = 'accountant' AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "acc_salary_payments_select" ON staff_salary_payments
    FOR SELECT USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM staff_salaries ss
            WHERE ss.id = staff_salary_payments.staff_salary_id
            AND ss.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "acc_salary_payments_insert" ON staff_salary_payments
    FOR INSERT WITH CHECK (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM staff_salaries ss
            WHERE ss.id = staff_salary_payments.staff_salary_id
            AND ss.centre_id = ANY(get_my_centre_ids())
        )
    );

-- TEACHER: attendance, content, exams, marks for assigned centres.
CREATE POLICY "teacher_attendance" ON attendance
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND attendance.batch_id = ANY(get_my_teacher_batch_ids())
    );

CREATE POLICY "teacher_content" ON content
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND content.batch_id = ANY(get_my_teacher_batch_ids())
    );

CREATE POLICY "teacher_exams" ON exams
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND exams.batch_id = ANY(get_my_teacher_batch_ids())
    );

CREATE POLICY "teacher_marks" ON student_marks
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM exams e
            WHERE e.id = student_marks.exam_id
            AND e.batch_id = ANY(get_my_teacher_batch_ids())
        )
    );

CREATE POLICY "teacher_staff_attendance" ON staff_attendance
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND user_id = auth.uid()
    );

-- STUDENT: own data only.
CREATE POLICY "student_profile" ON students
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "student_enrollments" ON student_batch_enrollments
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_invoices" ON student_invoices
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_attendance" ON attendance
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_content" ON content
    FOR SELECT USING (
        get_my_role() = 'student'
        AND is_published = TRUE
        AND batch_id IN (
            SELECT sbe.batch_id
            FROM student_batch_enrollments sbe
            WHERE sbe.student_id = ANY(get_my_student_ids())
            AND sbe.is_active = TRUE
        )
    );

CREATE POLICY "student_exams" ON exams
    FOR SELECT USING (
        get_my_role() = 'student'
        AND results_published = TRUE
        AND batch_id IN (
            SELECT sbe.batch_id
            FROM student_batch_enrollments sbe
            WHERE sbe.student_id = ANY(get_my_student_ids())
            AND sbe.is_active = TRUE
        )
    );

CREATE POLICY "student_marks" ON student_marks
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_points" ON points_transactions
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_reward_awards" ON reward_rule_awards
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

-- SECTION 17: ESSENTIAL SEED DATA
-- Required for app to function. Run once on fresh database.

-- Counter rows used by code-generation triggers.
INSERT INTO id_counters (name, year, last_value)
VALUES
  ('student_code', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0),
  ('receipt_number', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 0)
ON CONFLICT (name) DO UPDATE
SET year = EXCLUDED.year;

-- Role definitions (must match CHECK constraint on roles.role_name).
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

-- Default development centre.
INSERT INTO centres (centre_code, centre_name, address, city, phone, is_active)
VALUES ('DEV-001', 'Crack It Dev Centre', 'Test Address', 'Test City', '0000000000', TRUE)
ON CONFLICT (centre_code) DO NOTHING;
