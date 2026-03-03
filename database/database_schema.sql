-- CRACK IT COACHING INSTITUTE — DATABASE SCHEMA v3.2
-- PostgreSQL 14+ (Supabase) | 3NF | UUIDs | RLS | Triggers | Views

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- SECTION 1: SERIAL COUNTERS
-- Replaces COUNT(*)+1 pattern — race-condition-safe via row lock.
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

CREATE TABLE courses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name VARCHAR(200) NOT NULL,
    target_exam VARCHAR(100),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batches (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_id     UUID REFERENCES centres(id) ON DELETE CASCADE,
    course_id     UUID REFERENCES courses(id) ON DELETE RESTRICT,
    batch_code    VARCHAR(50) NOT NULL,
    batch_name    VARCHAR(200) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(centre_id, batch_code)
);

CREATE INDEX idx_batches_centre ON batches(centre_id);
CREATE INDEX idx_batches_course ON batches(course_id);


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

-- is_active is derived from status — no sync trigger needed.
-- withdrawn_at auto-set by trigger when status changes to 'withdrawn'.
CREATE TABLE student_batch_enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id        UUID REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status          VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','withdrawn')),
    withdrawn_at    DATE,
    is_active       BOOLEAN GENERATED ALWAYS AS (status = 'active') STORED,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id)
);

CREATE INDEX idx_enrollments_student ON student_batch_enrollments(student_id);
CREATE INDEX idx_enrollments_batch   ON student_batch_enrollments(batch_id);


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

-- Immutable audit log — never updated or deleted.
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
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(centre_id, month_year, category)
);

CREATE INDEX idx_expenses_centre ON centre_expenses(centre_id);
CREATE INDEX idx_expenses_month  ON centre_expenses(month_year);

CREATE TABLE staff_salaries (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id    UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    month_year   DATE NOT NULL,
    amount_due   DECIMAL(10,2) NOT NULL,
    amount_paid  DECIMAL(10,2) DEFAULT 0,
    status       VARCHAR(20) DEFAULT 'unpaid'
                     CHECK (status IN ('paid','unpaid','partial')),
    payment_date DATE,
    entered_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, centre_id, month_year)
);

CREATE INDEX idx_salaries_user   ON staff_salaries(user_id);
CREATE INDEX idx_salaries_centre ON staff_salaries(centre_id);
CREATE INDEX idx_salaries_month  ON staff_salaries(month_year);


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
    content_type VARCHAR(20) CHECK (content_type IN ('video','pdf','notes')),
    uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_batch     ON content(batch_id);
CREATE INDEX idx_content_published ON content(is_published);

-- completed_at auto-set by trigger when is_completed flips to TRUE.
-- Drives revision reminder scheduling.
CREATE TABLE content_progress (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id       UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id       UUID REFERENCES content(id) ON DELETE CASCADE,
    is_completed     BOOLEAN DEFAULT FALSE,
    first_accessed_at TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_progress_student ON content_progress(student_id);
CREATE INDEX idx_progress_content ON content_progress(content_id);


-- SECTION 9: ASSESSMENTS

-- Offline exams; marks entered manually by teacher.
CREATE TABLE exams (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id         UUID REFERENCES batches(id) ON DELETE CASCADE,
    exam_name        VARCHAR(300) NOT NULL,
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

-- Immutable points log. Positive = earned; negative = redeemed (discount on invoice).
CREATE TABLE points_transactions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    points     INTEGER NOT NULL,
    reason     VARCHAR(50) NOT NULL
                   CHECK (reason IN (
                       'attendance_85','timely_fees','timely_revision','performance','redeemed'
                   )),
    reference_id UUID,   -- exam_id, invoice_id, or content_id depending on reason
    month_year   DATE,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_student ON points_transactions(student_id);
CREATE INDEX idx_points_month   ON points_transactions(month_year DESC);

-- Spaced repetition: reminders at 7, 21, 60 days after content completion.
-- Auto-created by trigger when content_progress.is_completed flips TRUE.
-- Partial index: only active reminders scanned by cron.
CREATE TABLE revision_reminders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id          UUID REFERENCES content(id) ON DELETE CASCADE,
    completed_date      DATE NOT NULL,
    reminder_7_sent     BOOLEAN DEFAULT FALSE,
    reminder_7_sent_at  TIMESTAMPTZ,
    reminder_21_sent    BOOLEAN DEFAULT FALSE,
    reminder_21_sent_at TIMESTAMPTZ,
    reminder_60_sent    BOOLEAN DEFAULT FALSE,
    reminder_60_sent_at TIMESTAMPTZ,
    next_reminder_date  DATE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_reminders_student   ON revision_reminders(student_id);
CREATE INDEX idx_reminders_next_date ON revision_reminders(next_reminder_date)
    WHERE is_active = TRUE;


-- SECTION 11: COMMUNICATION

CREATE TABLE meeting_requests (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id   UUID REFERENCES students(id) ON DELETE CASCADE,
    assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
    subject      VARCHAR(200) NOT NULL,
    description  TEXT,
    status       VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending','scheduled','completed')),
    scheduled_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_student  ON meeting_requests(student_id);
CREATE INDEX idx_meetings_assigned ON meeting_requests(assigned_to);


-- SECTION 12: STUDENT OF THE MONTH

-- One winner per centre per class level per month.
-- month_year always stored as first day of month.
CREATE TABLE student_of_the_month (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_id   UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_level INTEGER NOT NULL,
    month_year  DATE NOT NULL,
    awarded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(centre_id, class_level, month_year)
);

CREATE INDEX idx_sotm_centre  ON student_of_the_month(centre_id);
CREATE INDEX idx_sotm_student ON student_of_the_month(student_id);
CREATE INDEX idx_sotm_month   ON student_of_the_month(month_year DESC);


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
CREATE TRIGGER trg_user_active_sessions_updated_at
    BEFORE UPDATE ON user_active_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_user_approval_requests_updated_at
    BEFORE UPDATE ON user_approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_centres_updated_at
    BEFORE UPDATE ON centres FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_batches_updated_at
    BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_student_invoices_updated_at
    BEFORE UPDATE ON student_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_content_progress_updated_at
    BEFORE UPDATE ON content_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_exams_updated_at
    BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_student_marks_updated_at
    BEFORE UPDATE ON student_marks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_revision_reminders_updated_at
    BEFORE UPDATE ON revision_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_meeting_requests_updated_at
    BEFORE UPDATE ON meeting_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate student code STU20260001 — counter-table approach avoids race conditions.
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

-- Auto-generate receipt number REC-2026-00001 — same counter-table approach.
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

-- Auto-set completed_at, then create/reset revision reminder.
CREATE OR REPLACE FUNCTION handle_content_completion()
RETURNS TRIGGER AS $$
DECLARE v_completed_date DATE;
BEGIN
    IF NEW.is_completed = TRUE AND (OLD IS NULL OR OLD.is_completed = FALSE) THEN
        -- Guarantee completed_at is set even if app forgot
        NEW.completed_at := COALESCE(NEW.completed_at, NOW());
        v_completed_date := NEW.completed_at::DATE;

        INSERT INTO revision_reminders (
            student_id, content_id, completed_date, next_reminder_date
        ) VALUES (
            NEW.student_id, NEW.content_id,
            v_completed_date,
            v_completed_date + INTERVAL '7 days'
        )
        ON CONFLICT (student_id, content_id) DO UPDATE SET
            completed_date      = EXCLUDED.completed_date,
            next_reminder_date  = EXCLUDED.completed_date + INTERVAL '7 days',
            reminder_7_sent     = FALSE,  reminder_7_sent_at  = NULL,
            reminder_21_sent    = FALSE,  reminder_21_sent_at = NULL,
            reminder_60_sent    = FALSE,  reminder_60_sent_at = NULL,
            is_active           = TRUE,
            updated_at          = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_completion
    BEFORE INSERT OR UPDATE ON content_progress
    FOR EACH ROW EXECUTE FUNCTION handle_content_completion();

-- Advance reminder stage and compute next_reminder_date.
-- Cron marks a reminder sent by setting reminder_N_sent = TRUE.
-- Deactivates record after the 60-day stage.
CREATE OR REPLACE FUNCTION advance_revision_stage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reminder_7_sent = TRUE AND OLD.reminder_7_sent = FALSE THEN
        NEW.reminder_7_sent_at := NOW();
        NEW.next_reminder_date := NEW.completed_date + INTERVAL '21 days';

    ELSIF NEW.reminder_21_sent = TRUE AND OLD.reminder_21_sent = FALSE THEN
        NEW.reminder_21_sent_at := NOW();
        NEW.next_reminder_date  := NEW.completed_date + INTERVAL '60 days';

    ELSIF NEW.reminder_60_sent = TRUE AND OLD.reminder_60_sent = FALSE THEN
        NEW.reminder_60_sent_at := NOW();
        NEW.next_reminder_date  := NULL;
        NEW.is_active           := FALSE;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_advance_revision_stage
    BEFORE UPDATE ON revision_reminders
    FOR EACH ROW EXECUTE FUNCTION advance_revision_stage();

-- Sets withdrawn_at when enrollment status changes to 'withdrawn'.
-- is_active is a generated column — no need to set it here.
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


-- SECTION 14: CRON JOBS

-- Run on the 1st of each month at 01:00 — copies last invoice to new month for active enrollments.
SELECT cron.schedule('create-monthly-invoices', '0 1 1 * *', $$
    INSERT INTO student_invoices (student_id, batch_id, month_year, monthly_fee, amount_due)
    SELECT
        si.student_id,
        si.batch_id,
        DATE_TRUNC('month', CURRENT_DATE)::DATE,
        si.monthly_fee,
        si.monthly_fee
    FROM student_invoices si
    JOIN student_batch_enrollments sbe
        ON sbe.student_id = si.student_id AND sbe.batch_id = si.batch_id
    WHERE sbe.is_active = TRUE
    AND si.month_year = (
        SELECT MAX(si2.month_year) FROM student_invoices si2
        WHERE si2.student_id = si.student_id AND si2.batch_id = si.batch_id
    )
    AND NOT EXISTS (
        SELECT 1 FROM student_invoices si3
        WHERE si3.student_id = si.student_id AND si3.batch_id = si.batch_id
        AND si3.month_year = DATE_TRUNC('month', CURRENT_DATE)::DATE
    )
    ON CONFLICT (student_id, batch_id, month_year) DO NOTHING;
$$);

-- Daily at midnight — mark unpaid invoices from prior months as overdue.
SELECT cron.schedule('mark-overdue', '0 0 * * *', $$
    UPDATE student_invoices
    SET payment_status = 'overdue', updated_at = NOW()
    WHERE payment_status IN ('pending','partial')
    AND month_year < DATE_TRUNC('month', CURRENT_DATE);
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
                is_primary = TRUE,
                updated_at = NOW();
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
ALTER TABLE centres                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batch_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salaries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE content                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_reminders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_of_the_month      ENABLE ROW LEVEL SECURITY;

-- CEO: full access everywhere; fee_transactions SELECT only (immutable log).
CREATE POLICY "ceo_all" ON users                     FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_active_sessions      FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_approval_requests    FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_centre_assignments   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON centres                   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON batches                   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON students                  FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON student_batch_enrollments FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON student_invoices          FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_sel" ON fee_transactions          FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON centre_expenses           FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON staff_salaries            FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON attendance                FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON staff_attendance          FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON content                   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON content_progress          FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON exams                     FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON student_marks             FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON points_transactions       FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON revision_reminders        FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON meeting_requests          FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON student_of_the_month      FOR ALL    USING (get_my_role() = 'ceo');

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
        AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "teacher_students" ON students
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            JOIN batches b ON b.id = sbe.batch_id
            WHERE sbe.student_id = students.id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "teacher_enrollments" ON student_batch_enrollments
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_batch_enrollments.batch_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "ch_invoices" ON student_invoices
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_invoices.batch_id AND b.centre_id = ANY(get_my_centre_ids())
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

CREATE POLICY "ch_meeting_requests" ON meeting_requests
    FOR ALL USING (
        get_my_role() = 'centre_head' AND assigned_to = auth.uid()
    );

CREATE POLICY "ch_sotm" ON student_of_the_month
    FOR ALL USING (
        get_my_role() = 'centre_head' AND centre_id = ANY(get_my_centre_ids())
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

CREATE POLICY "acc_expenses" ON centre_expenses
    FOR ALL USING (
        get_my_role() = 'accountant' AND centre_id = ANY(get_my_centre_ids())
    );

CREATE POLICY "acc_salaries" ON staff_salaries
    FOR ALL USING (
        get_my_role() = 'accountant' AND centre_id = ANY(get_my_centre_ids())
    );

-- TEACHER: attendance, content, exams, marks for assigned centres.
-- teachers can award points (performance, attendance_85 reasons).
CREATE POLICY "teacher_attendance" ON attendance
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = attendance.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "teacher_content" ON content
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = content.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "teacher_exams" ON exams
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = exams.batch_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "teacher_marks" ON student_marks
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM exams e
            JOIN batches b ON b.id = e.batch_id
            WHERE e.id = student_marks.exam_id AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

CREATE POLICY "teacher_points" ON points_transactions
    FOR INSERT WITH CHECK (
        get_my_role() = 'teacher'
        AND reason IN ('attendance_85','performance')
        AND EXISTS (
            SELECT 1 FROM students s
            JOIN student_batch_enrollments sbe ON sbe.student_id = s.id
            JOIN batches b ON b.id = sbe.batch_id
            WHERE s.id = points_transactions.student_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
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

CREATE POLICY "student_progress" ON content_progress
    FOR ALL USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
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

CREATE POLICY "student_reminders" ON revision_reminders
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_meetings" ON meeting_requests
    FOR ALL USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );

CREATE POLICY "student_sotm" ON student_of_the_month
    FOR SELECT USING (
        get_my_role() = 'student'
        AND student_id = ANY(get_my_student_ids())
    );
