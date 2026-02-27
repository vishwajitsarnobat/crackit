-- CRACK IT COACHING INSTITUTE — DATABASE SCHEMA
-- Version: 3.1
-- Database: PostgreSQL 14+ (Supabase)
-- Design: 3NF, UUIDs, RLS, Triggers, Views

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- SECTION 1: IDENTITY & ROLES

-- Roles define what a user can do. Permissions enforced via RLS, not this table.
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL
        CHECK (role_name IN ('ceo','centre_head','teacher','accountant','student')),
    display_name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL,  -- 1=CEO, 4=Centre Head, 5=Teacher/Accountant, 6=Student
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (role_name, display_name, level) VALUES
('ceo',         'CEO / Super Admin', 1),
('centre_head', 'Centre Head',       4),
('teacher',     'Teacher',           5),
('accountant',  'Accountant',        5),
('student',     'Student',           6);

-- All users share one table. is_active = FALSE until approved.
-- profile_photo_url stored here for all roles including students.
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT FALSE,  -- toggled TRUE on approval
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Stores FCM token for Firebase push notifications (absent alerts, etc.)
-- One row per user, one active device (single device login policy)
CREATE TABLE user_active_sessions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(200),
    fcm_token TEXT,               -- used for Firebase push (absent alert → parent/student)
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval inbox.
-- CEO approves: centre_head, accountant (center_id = NULL)
-- Centre head approves: teacher, student (center_id = their center)
CREATE TABLE user_approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,  -- NULL for CEO-level approvals
    requested_role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    applicant_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one pending request per user at a time. Rejected users can re-apply.
CREATE UNIQUE INDEX idx_one_pending_per_user
    ON user_approval_requests(user_id) WHERE status = 'pending';

CREATE INDEX idx_approval_status ON user_approval_requests(status);
CREATE INDEX idx_approval_center ON user_approval_requests(center_id);


-- SECTION 2: CENTERS

-- No states/districts — not required by any feature in scope.
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_code VARCHAR(20) UNIQUE NOT NULL,
    center_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: staff can serve multiple centers
CREATE TABLE user_center_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, center_id)
);

CREATE INDEX idx_uca_user ON user_center_assignments(user_id);
CREATE INDEX idx_uca_center ON user_center_assignments(center_id);


-- ============================================================
-- SECTION 3: ACADEMIC STRUCTURE
-- ============================================================

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name VARCHAR(200) NOT NULL,
    target_exam VARCHAR(100),  -- 'IIT-JEE', 'NEET', 'Olympiad'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO courses (course_name, target_exam) VALUES
('IIT-JEE Preparation', 'IIT-JEE'),
('NEET Preparation',    'NEET'),
('Olympiad Preparation','Olympiad');

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE RESTRICT,
    batch_code VARCHAR(50) NOT NULL,
    batch_name VARCHAR(200) NOT NULL,
    academic_year VARCHAR(10) NOT NULL,  -- '2025-26'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(center_id, batch_code)
);

CREATE INDEX idx_batches_center ON batches(center_id);
CREATE INDEX idx_batches_course ON batches(course_id);


-- ============================================================
-- SECTION 4: STUDENTS & ADMISSION
-- ============================================================

-- Student profile. parent_phone kept — useful contact even on shared account.
-- admission_form_data stores the full form as JSONB for PDF generation.
-- declaration_accepted is the mandatory checkbox before form submission.
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    student_code VARCHAR(50) UNIQUE NOT NULL,  -- auto-generated: STU20260001
    date_of_birth DATE,
    class_level INTEGER NOT NULL,
    parent_name VARCHAR(200),
    parent_phone VARCHAR(20),
    declaration_accepted BOOLEAN DEFAULT FALSE,
    declaration_accepted_at TIMESTAMPTZ,
    admission_form_data JSONB,   -- full payload; app generates PDF from this
    current_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_active ON students(is_active);

-- withdrawn_at captured for dropout rate calculation
CREATE TABLE student_batch_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active','withdrawn')),
    withdrawn_at DATE,           -- set when status → withdrawn; drives dropout rate view
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id)
);

CREATE INDEX idx_enrollments_student ON student_batch_enrollments(student_id);
CREATE INDEX idx_enrollments_batch ON student_batch_enrollments(batch_id);


-- ============================================================
-- SECTION 5: FINANCIAL MANAGEMENT
-- ============================================================

-- Monthly fee per batch. Accountant creates invoice manually on enrollment.
-- Pro-rated first month amount is calculated in app before INSERT.
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    monthly_fee DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_structures_batch ON fee_structures(batch_id);

-- One invoice per student per batch per month.
-- amount_discount used for reward point redemptions.
CREATE TABLE student_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    month_year DATE NOT NULL,             -- first day of month: '2025-01-01'
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_discount DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending','partial','paid','overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, month_year)
);

CREATE INDEX idx_invoices_student ON student_invoices(student_id);
CREATE INDEX idx_invoices_batch ON student_invoices(batch_id);
CREATE INDEX idx_invoices_status ON student_invoices(payment_status);
CREATE INDEX idx_invoices_month ON student_invoices(month_year);

-- Immutable payment log. Never updated or deleted — financial audit trail.
CREATE TABLE fee_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_invoice_id UUID REFERENCES student_invoices(id) ON DELETE CASCADE,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cash','online')),
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_number VARCHAR(50) UNIQUE,  -- auto-generated: REC-2026-00001
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_invoice ON fee_transactions(student_invoice_id);
CREATE INDEX idx_transactions_date ON fee_transactions(payment_date DESC);

-- Monthly expenses per center per category (exact categories from requirements)
CREATE TABLE center_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('rent','electricity_bill','stationery','internet_bill','miscellaneous')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(center_id, month_year, category)
);

CREATE INDEX idx_expenses_center ON center_expenses(center_id);
CREATE INDEX idx_expenses_month ON center_expenses(month_year);

-- Staff salary tracking per center per month
CREATE TABLE staff_salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid'
        CHECK (status IN ('paid','unpaid','partial')),
    payment_date DATE,
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, center_id, month_year)
);

CREATE INDEX idx_salaries_user ON staff_salaries(user_id);
CREATE INDEX idx_salaries_center ON staff_salaries(center_id);
CREATE INDEX idx_salaries_month ON staff_salaries(month_year);


-- ============================================================
-- SECTION 6: ATTENDANCE
-- ============================================================

-- Student attendance marked by teacher. Radio button: present/absent only.
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent')),
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, attendance_date)
);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_batch ON attendance(batch_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date DESC);

-- Staff attendance: teacher marked by centre_head; centre_head marked by CEO.
-- in_time and out_time required. out_time used for early leaving.
-- center_id in UNIQUE prevents constraint collision for multi-center staff.
CREATE TABLE staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent')),
    in_time TIME,
    out_time TIME,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, center_id, attendance_date)
);

CREATE INDEX idx_staff_attendance_user ON staff_attendance(user_id);
CREATE INDEX idx_staff_attendance_center ON staff_attendance(center_id);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(attendance_date DESC);


-- ============================================================
-- SECTION 7: CONTENT
-- ============================================================

-- Learning content (YouTube / Google Drive links) per batch.
-- Students can only see published content for their enrolled batches.
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    content_url TEXT NOT NULL,
    content_type VARCHAR(20) CHECK (content_type IN ('video','pdf','notes')),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_batch ON content(batch_id);
CREATE INDEX idx_content_published ON content(is_published);

-- Tracks when a student completes a content item.
-- completed_at drives revision reminder scheduling.
CREATE TABLE content_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    first_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_progress_student ON content_progress(student_id);
CREATE INDEX idx_progress_content ON content_progress(content_id);


-- ============================================================
-- SECTION 8: ASSESSMENTS
-- ============================================================

-- Offline exams, marks entered manually by teacher.
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    exam_name VARCHAR(300) NOT NULL,
    exam_date DATE NOT NULL,
    total_marks DECIMAL(10,2) NOT NULL,
    passing_marks DECIMAL(10,2),
    results_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_batch ON exams(batch_id);
CREATE INDEX idx_exams_date ON exams(exam_date DESC);

-- Marks per student per exam. is_absent = TRUE forces marks_obtained = 0.
CREATE TABLE student_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(10,2) NOT NULL CHECK (marks_obtained >= 0),
    is_absent BOOLEAN DEFAULT FALSE,
    CHECK (NOT is_absent OR marks_obtained = 0),
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_id)
);

CREATE INDEX idx_marks_student ON student_marks(student_id);
CREATE INDEX idx_marks_exam ON student_marks(exam_id);


-- ============================================================
-- SECTION 9: REWARDS
-- ============================================================

-- Immutable log of all point events.
-- Positive = earned, negative = redeemed against invoice (amount_discount).
-- reason drives which reward rule was triggered.
CREATE TABLE points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL
        CHECK (reason IN (
            'attendance_85',    -- 85%+ monthly attendance
            'timely_fees',      -- paid before due date
            'timely_revision',  -- completed revision reminder on time
            'performance',      -- exam score based
            'redeemed'          -- used against invoice
        )),
    reference_id UUID,          -- exam_id, invoice_id, or content_id depending on reason
    month_year DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_student ON points_transactions(student_id);
CREATE INDEX idx_points_month ON points_transactions(month_year DESC);

-- Spaced repetition reminders: 7, 21, 60 days after content completion.
-- next_reminder_date drives the daily cron query.
-- Auto-created when content_progress.is_completed flips to TRUE.
CREATE TABLE revision_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    reminder_7_sent BOOLEAN DEFAULT FALSE,
    reminder_7_sent_at TIMESTAMPTZ,
    reminder_21_sent BOOLEAN DEFAULT FALSE,
    reminder_21_sent_at TIMESTAMPTZ,
    reminder_60_sent BOOLEAN DEFAULT FALSE,
    reminder_60_sent_at TIMESTAMPTZ,
    next_reminder_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_reminders_student ON revision_reminders(student_id);
-- Partial index: only active reminders scanned by cron job
CREATE INDEX idx_reminders_next_date ON revision_reminders(next_reminder_date)
    WHERE is_active = TRUE;


-- ============================================================
-- SECTION 10: COMMUNICATION
-- ============================================================

-- Meeting requests raised by students, assigned to centre_head or teacher.
CREATE TABLE meeting_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','scheduled','completed')),
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_student ON meeting_requests(student_id);
CREATE INDEX idx_meetings_assigned ON meeting_requests(assigned_to);


-- ============================================================
-- SECTION 11: STUDENT OF THE MONTH
-- ============================================================

-- One winner per center per class level per month.
-- Manually declared by centre_head or CEO.
-- UNIQUE constraint prevents two winners for same class at same center in same month.
CREATE TABLE student_of_the_month (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    class_level INTEGER NOT NULL,
    month_year DATE NOT NULL,           -- first day of month: '2026-02-01'
    awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT,                       -- optional note from centre_head/CEO
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(center_id, class_level, month_year)
);

CREATE INDEX idx_sotm_center ON student_of_the_month(center_id);
CREATE INDEX idx_sotm_student ON student_of_the_month(student_id);
CREATE INDEX idx_sotm_month ON student_of_the_month(month_year DESC);


-- ============================================================
-- SECTION 12: FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_user_active_sessions_updated_at
    BEFORE UPDATE ON user_active_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_user_approval_requests_updated_at
    BEFORE UPDATE ON user_approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_centers_updated_at
    BEFORE UPDATE ON centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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

-- Auto-generate student code: STU20260001 (resets per year)
CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_count INTEGER;
BEGIN
    IF NEW.student_code IS NULL THEN
        v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
        SELECT COUNT(*) + 1 INTO v_count
        FROM students WHERE student_code LIKE 'STU' || v_year || '%';
        NEW.student_code := 'STU' || v_year || LPAD(v_count::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_student_code
    BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION generate_student_code();

-- Auto-generate receipt number: REC-2026-00001 (resets per year)
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_count INTEGER;
BEGIN
    IF NEW.receipt_number IS NULL THEN
        v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
        SELECT COUNT(*) + 1 INTO v_count
        FROM fee_transactions WHERE receipt_number LIKE 'REC-' || v_year || '%';
        NEW.receipt_number := 'REC-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_receipt_number
    BEFORE INSERT ON fee_transactions FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- Recalculate invoice amount_paid and payment_status after every payment INSERT.
-- Uses variables to avoid stale-value bug in CASE expressions.
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10,2);
    v_amount_due DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM fee_transactions WHERE student_invoice_id = NEW.student_invoice_id;

    SELECT amount_due - amount_discount INTO v_amount_due
    FROM student_invoices WHERE id = NEW.student_invoice_id;

    UPDATE student_invoices SET
        amount_paid = v_total_paid,
        payment_status = CASE
            WHEN v_total_paid >= v_amount_due THEN 'paid'
            WHEN v_total_paid > 0             THEN 'partial'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = NEW.student_invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fee_payment
    AFTER INSERT ON fee_transactions FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- Flip pending/partial invoices to overdue daily at midnight.
SELECT cron.schedule('mark-overdue', '0 0 * * *', $$
    UPDATE student_invoices
    SET payment_status = 'overdue', updated_at = NOW()
    WHERE payment_status IN ('pending','partial')
    AND month_year < DATE_TRUNC('month', CURRENT_DATE);
$$);

-- Auto-create revision reminder when student completes content.
-- Re-completing resets all reminder stages.
CREATE OR REPLACE FUNCTION create_revision_reminder()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = TRUE AND (OLD IS NULL OR OLD.is_completed = FALSE) THEN
        INSERT INTO revision_reminders (
            student_id, content_id, completed_date, next_reminder_date
        ) VALUES (
            NEW.student_id,
            NEW.content_id,
            NEW.completed_at::DATE,
            (NEW.completed_at::DATE + INTERVAL '7 days')::DATE
        )
        ON CONFLICT (student_id, content_id) DO UPDATE SET
            completed_date     = EXCLUDED.completed_date,
            next_reminder_date = (EXCLUDED.completed_date + INTERVAL '7 days')::DATE,
            reminder_7_sent    = FALSE,
            reminder_7_sent_at = NULL,
            reminder_21_sent   = FALSE,
            reminder_21_sent_at= NULL,
            reminder_60_sent   = FALSE,
            reminder_60_sent_at= NULL,
            is_active          = TRUE,
            updated_at         = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_revision_reminder
    AFTER INSERT OR UPDATE ON content_progress
    FOR EACH ROW EXECUTE FUNCTION create_revision_reminder();

-- Advance reminder stage when a reminder is marked sent.
-- Sets sent_at timestamp, calculates next_reminder_date, deactivates after 60-day stage.
CREATE OR REPLACE FUNCTION advance_revision_stage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reminder_7_sent = TRUE AND OLD.reminder_7_sent = FALSE THEN
        NEW.reminder_7_sent_at  := NOW();
        NEW.next_reminder_date  := (NEW.completed_date + INTERVAL '21 days')::DATE;

    ELSIF NEW.reminder_21_sent = TRUE AND OLD.reminder_21_sent = FALSE THEN
        NEW.reminder_21_sent_at := NOW();
        NEW.next_reminder_date  := (NEW.completed_date + INTERVAL '60 days')::DATE;

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

-- Sync is_active with status on enrollment changes
CREATE OR REPLACE FUNCTION sync_enrollment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'withdrawn' THEN
        NEW.is_active    := FALSE;
        NEW.withdrawn_at := CURRENT_DATE;
    ELSIF NEW.status = 'active' THEN
        NEW.is_active    := TRUE;
        NEW.withdrawn_at := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_enrollment_status
    BEFORE UPDATE ON student_batch_enrollments
    FOR EACH ROW EXECUTE FUNCTION sync_enrollment_status();

-- Prevent future-date attendance
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

-- Prevent marks exceeding exam total
CREATE OR REPLACE FUNCTION validate_marks()
RETURNS TRIGGER AS $$
DECLARE v_total DECIMAL(10,2);
BEGIN
    SELECT total_marks INTO v_total FROM exams WHERE id = NEW.exam_id;
    IF NEW.marks_obtained > v_total THEN
        RAISE EXCEPTION 'Marks (%) cannot exceed total marks (%)', NEW.marks_obtained, v_total;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_marks
    BEFORE INSERT OR UPDATE ON student_marks
    FOR EACH ROW EXECUTE FUNCTION validate_marks();


-- ============================================================
-- SECTION 13: VIEWS
-- ============================================================

-- Net profit per center per month.
-- UNION calendar ensures months with expenses but no revenue still appear.
CREATE OR REPLACE VIEW v_center_monthly_profit AS
SELECT
    c.id AS center_id,
    c.center_name,
    cal.month_year,
    COALESCE(rev.total_revenue,  0) AS total_revenue,
    COALESCE(exp.total_expenses, 0) AS total_expenses,
    COALESCE(sal.total_salaries, 0) AS total_salaries,
    COALESCE(rev.total_revenue,  0)
        - COALESCE(exp.total_expenses, 0)
        - COALESCE(sal.total_salaries, 0) AS net_profit
FROM centers c
CROSS JOIN (
    SELECT DISTINCT month_year FROM center_expenses
    UNION
    SELECT DISTINCT month_year FROM staff_salaries
    UNION
    SELECT DISTINCT DATE_TRUNC('month', ft.payment_date)::DATE
    FROM fee_transactions ft
    JOIN student_invoices si ON si.id = ft.student_invoice_id
    JOIN batches b ON b.id = si.batch_id
) cal(month_year)
LEFT JOIN (
    SELECT b.center_id,
           DATE_TRUNC('month', ft.payment_date)::DATE AS month_year,
           SUM(ft.amount) AS total_revenue
    FROM fee_transactions ft
    JOIN student_invoices si ON si.id = ft.student_invoice_id
    JOIN batches b ON b.id = si.batch_id
    GROUP BY b.center_id, DATE_TRUNC('month', ft.payment_date)::DATE
) rev ON rev.center_id = c.id AND rev.month_year = cal.month_year
LEFT JOIN (
    SELECT center_id, month_year, SUM(amount) AS total_expenses
    FROM center_expenses GROUP BY center_id, month_year
) exp ON exp.center_id = c.id AND exp.month_year = cal.month_year
LEFT JOIN (
    SELECT center_id, month_year, SUM(amount_paid) AS total_salaries
    FROM staff_salaries GROUP BY center_id, month_year
) sal ON sal.center_id = c.id AND sal.month_year = cal.month_year
WHERE c.is_active = TRUE;

-- Combined institute-level profit across all centers
CREATE OR REPLACE VIEW v_institute_monthly_profit AS
SELECT
    month_year,
    SUM(total_revenue)  AS total_revenue,
    SUM(total_expenses) AS total_expenses,
    SUM(total_salaries) AS total_salaries,
    SUM(net_profit)     AS net_profit
FROM v_center_monthly_profit
GROUP BY month_year
ORDER BY month_year DESC;

-- Annual rollup (filter by year in app; this covers institute level)
CREATE OR REPLACE VIEW v_institute_annual_profit AS
SELECT
    DATE_TRUNC('year', month_year)::DATE AS year,
    SUM(total_revenue)  AS total_revenue,
    SUM(total_expenses) AS total_expenses,
    SUM(total_salaries) AS total_salaries,
    SUM(net_profit)     AS net_profit
FROM v_institute_monthly_profit
GROUP BY DATE_TRUNC('year', month_year)
ORDER BY year DESC;

-- Current month snapshot for analytics dashboard
CREATE OR REPLACE VIEW v_analytics_dashboard AS
SELECT
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS month_year,
    (SELECT COALESCE(SUM(ft.amount), 0)
     FROM fee_transactions ft
     WHERE DATE_TRUNC('month', ft.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    ) AS revenue,
    (SELECT COALESCE(SUM(amount), 0)
     FROM center_expenses
     WHERE month_year = DATE_TRUNC('month', CURRENT_DATE)
    ) AS expenses,
    (SELECT COALESCE(SUM(amount_paid), 0)
     FROM staff_salaries
     WHERE month_year = DATE_TRUNC('month', CURRENT_DATE)
    ) AS salaries,
    (SELECT COALESCE(SUM(ft.amount), 0)
     FROM fee_transactions ft
     WHERE DATE_TRUNC('month', ft.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    ) - (SELECT COALESCE(SUM(amount), 0)
         FROM center_expenses
         WHERE month_year = DATE_TRUNC('month', CURRENT_DATE)
    ) - (SELECT COALESCE(SUM(amount_paid), 0)
         FROM staff_salaries
         WHERE month_year = DATE_TRUNC('month', CURRENT_DATE)
    ) AS net_profit,
    (SELECT COUNT(DISTINCT student_id)
     FROM student_batch_enrollments
     WHERE is_active = TRUE
    ) AS active_students;

-- Pending fees by batch (student-wise and batch-wise)
CREATE OR REPLACE VIEW v_pending_fees AS
SELECT
    si.id AS invoice_id,
    u.full_name AS student_name,
    s.student_code,
    b.batch_name,
    c.center_name,
    si.month_year,
    si.amount_due,
    si.amount_paid,
    si.amount_due - si.amount_paid - si.amount_discount AS balance_due,
    si.payment_status
FROM student_invoices si
JOIN students s ON s.id = si.student_id
JOIN users u ON u.id = s.user_id
JOIN batches b ON b.id = si.batch_id
JOIN centers c ON c.id = b.center_id
WHERE si.payment_status IN ('pending','partial','overdue')
ORDER BY si.month_year, c.center_name, b.batch_name;

-- Monthly student attendance report
CREATE OR REPLACE VIEW v_student_attendance_report AS
SELECT
    s.student_code,
    u.full_name AS student_name,
    b.batch_name,
    c.center_name,
    DATE_TRUNC('month', a.attendance_date)::DATE AS month_year,
    COUNT(*) AS total_days,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_days,
    ROUND(
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2
    ) AS attendance_percentage
FROM attendance a
JOIN students s ON s.id = a.student_id
JOIN users u ON u.id = s.user_id
JOIN batches b ON b.id = a.batch_id
JOIN centers c ON c.id = b.center_id
GROUP BY s.id, s.student_code, u.full_name, b.id, b.batch_name, c.center_name,
         DATE_TRUNC('month', a.attendance_date)
ORDER BY month_year DESC, attendance_percentage;

-- Monthly staff attendance report
CREATE OR REPLACE VIEW v_staff_attendance_report AS
SELECT
    u.full_name AS staff_name,
    r.role_name,
    c.center_name,
    DATE_TRUNC('month', sa.attendance_date)::DATE AS month_year,
    COUNT(*) AS total_days,
    SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS present_days,
    ROUND(
        SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 2
    ) AS attendance_percentage
FROM staff_attendance sa
JOIN users u ON u.id = sa.user_id
JOIN roles r ON r.id = u.role_id
JOIN centers c ON c.id = sa.center_id
GROUP BY u.id, u.full_name, r.role_name, c.id, c.center_name,
         DATE_TRUNC('month', sa.attendance_date)
ORDER BY month_year DESC;

-- Student performance report: exam-wise marks and percentage
CREATE OR REPLACE VIEW v_student_performance_report AS
SELECT
    s.student_code,
    u.full_name AS student_name,
    b.batch_name,
    c.center_name,
    e.exam_name,
    e.exam_date,
    e.total_marks,
    sm.marks_obtained,
    sm.is_absent,
    CASE
        WHEN sm.is_absent THEN NULL
        ELSE ROUND((sm.marks_obtained / e.total_marks) * 100, 2)
    END AS percentage,
    CASE
        WHEN sm.is_absent THEN 'AB'
        WHEN (sm.marks_obtained / e.total_marks) * 100 >= 90 THEN 'A+'
        WHEN (sm.marks_obtained / e.total_marks) * 100 >= 80 THEN 'A'
        WHEN (sm.marks_obtained / e.total_marks) * 100 >= 70 THEN 'B+'
        WHEN (sm.marks_obtained / e.total_marks) * 100 >= 60 THEN 'B'
        WHEN (sm.marks_obtained / e.total_marks) * 100 >= 50 THEN 'C'
        ELSE 'F'
    END AS grade,
    RANK() OVER (
        PARTITION BY e.id
        ORDER BY CASE WHEN sm.is_absent THEN -1 ELSE sm.marks_obtained END DESC
    ) AS rank_in_batch
FROM student_marks sm
JOIN students s ON s.id = sm.student_id
JOIN users u ON u.id = s.user_id
JOIN exams e ON e.id = sm.exam_id
JOIN batches b ON b.id = e.batch_id
JOIN centers c ON c.id = b.center_id
WHERE e.results_published = TRUE;

-- Monthly dropout rate per batch
CREATE OR REPLACE VIEW v_monthly_dropout_rate AS
SELECT
    b.batch_name,
    c.center_name,
    DATE_TRUNC('month', sbe.withdrawn_at)::DATE AS month_year,
    COUNT(*) AS dropouts,
    (SELECT COUNT(*) FROM student_batch_enrollments
     WHERE batch_id = b.id AND is_active = TRUE) AS currently_active,
    ROUND(
        COUNT(*)::DECIMAL /
        NULLIF((SELECT COUNT(*) FROM student_batch_enrollments WHERE batch_id = b.id), 0) * 100, 2
    ) AS dropout_rate_percent
FROM student_batch_enrollments sbe
JOIN batches b ON b.id = sbe.batch_id
JOIN centers c ON c.id = b.center_id
WHERE sbe.status = 'withdrawn'
AND sbe.withdrawn_at IS NOT NULL
GROUP BY b.id, b.batch_name, c.center_name,
         DATE_TRUNC('month', sbe.withdrawn_at)
ORDER BY month_year DESC, dropout_rate_percent DESC;

-- Fee collection analytics: monthly and annual per center
CREATE OR REPLACE VIEW v_fee_collection_analytics AS
SELECT
    c.center_name,
    DATE_TRUNC('month', ft.payment_date)::DATE AS month_year,
    DATE_TRUNC('year', ft.payment_date)::DATE AS year,
    SUM(ft.amount) AS collected,
    COUNT(DISTINCT si.student_id) AS paying_students,
    SUM(CASE WHEN ft.payment_mode = 'cash'   THEN ft.amount ELSE 0 END) AS cash_collected,
    SUM(CASE WHEN ft.payment_mode = 'online' THEN ft.amount ELSE 0 END) AS online_collected
FROM fee_transactions ft
JOIN student_invoices si ON si.id = ft.student_invoice_id
JOIN batches b ON b.id = si.batch_id
JOIN centers c ON c.id = b.center_id
GROUP BY c.id, c.center_name,
         DATE_TRUNC('month', ft.payment_date),
         DATE_TRUNC('year', ft.payment_date)
ORDER BY month_year DESC;


-- Winners display: current and past, all centers
CREATE OR REPLACE VIEW v_student_of_the_month AS
SELECT
    sotm.month_year,
    sotm.class_level,
    c.center_name,
    u.full_name AS student_name,
    s.student_code,
    u.profile_photo_url,
    awarder.full_name AS awarded_by_name,
    sotm.remarks
FROM student_of_the_month sotm
JOIN students s ON s.id = sotm.student_id
JOIN users u ON u.id = s.user_id
JOIN centers c ON c.id = sotm.center_id
JOIN users awarder ON awarder.id = sotm.awarded_by
ORDER BY sotm.month_year DESC, c.center_name, sotm.class_level;


-- ============================================================
-- SECTION 14: ROW LEVEL SECURITY
-- ============================================================

-- Returns current user's role. NULL for unapproved/inactive users.
-- is_active = TRUE gate blocks all pending approvals from every policy.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
    SELECT r.role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns center UUIDs assigned to current user. Used in all center-scoped policies.
CREATE OR REPLACE FUNCTION get_my_center_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY_AGG(center_id)
    FROM user_center_assignments
    WHERE user_id = auth.uid()
    AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_approval_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_center_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE students                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_batch_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures           ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salaries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance               ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_of_the_month     ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- CEO: full access everywhere
-- fee_transactions: SELECT only (immutable audit trail)
-- ─────────────────────────────────────────
CREATE POLICY "ceo_all" ON users                     FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_active_sessions      FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_approval_requests    FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON user_center_assignments   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON centers                   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON batches                   FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON students                  FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON student_batch_enrollments FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON fee_structures            FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON student_invoices          FOR ALL    USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_sel" ON fee_transactions          FOR SELECT USING (get_my_role() = 'ceo');
CREATE POLICY "ceo_all" ON center_expenses           FOR ALL    USING (get_my_role() = 'ceo');
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
CREATE POLICY "ceo_all" ON student_of_the_month     FOR ALL    USING (get_my_role() = 'ceo');

-- ─────────────────────────────────────────
-- CENTRE HEAD: scoped to their assigned centers
-- ─────────────────────────────────────────
CREATE POLICY "ch_centers" ON centers
    FOR SELECT USING (id = ANY(get_my_center_ids()));

CREATE POLICY "ch_approval_requests" ON user_approval_requests
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "ch_uca" ON user_center_assignments
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "ch_batches" ON batches
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "ch_students" ON students
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            JOIN batches b ON b.id = sbe.batch_id
            WHERE sbe.student_id = students.id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_enrollments" ON student_batch_enrollments
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_batch_enrollments.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_fee_structures" ON fee_structures
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = fee_structures.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_invoices" ON student_invoices
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_invoices.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_expenses" ON center_expenses
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "ch_salaries" ON staff_salaries
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "ch_attendance" ON attendance
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = attendance.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_staff_attendance" ON staff_attendance
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "ch_content" ON content
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = content.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_exams" ON exams
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = exams.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_marks" ON student_marks
    FOR SELECT USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM exams e
            JOIN batches b ON b.id = e.batch_id
            WHERE e.id = student_marks.exam_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "ch_meeting_requests" ON meeting_requests
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND assigned_to = auth.uid()
    );

CREATE POLICY "ch_sotm" ON student_of_the_month
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND center_id = ANY(get_my_center_ids())
    );

-- ─────────────────────────────────────────
-- ACCOUNTANT: fees, expenses, salaries for their centers
-- fee_transactions: INSERT + SELECT only (no modify/delete)
-- ─────────────────────────────────────────
CREATE POLICY "acc_invoices" ON student_invoices
    FOR ALL USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = student_invoices.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "acc_insert_transactions" ON fee_transactions
    FOR INSERT WITH CHECK (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = fee_transactions.student_invoice_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "acc_view_transactions" ON fee_transactions
    FOR SELECT USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM student_invoices si
            JOIN batches b ON b.id = si.batch_id
            WHERE si.id = fee_transactions.student_invoice_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "acc_fee_structures" ON fee_structures
    FOR SELECT USING (
        get_my_role() = 'accountant'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = fee_structures.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "acc_expenses" ON center_expenses
    FOR ALL USING (
        get_my_role() = 'accountant'
        AND center_id = ANY(get_my_center_ids())
    );

CREATE POLICY "acc_salaries" ON staff_salaries
    FOR ALL USING (
        get_my_role() = 'accountant'
        AND center_id = ANY(get_my_center_ids())
    );

-- ─────────────────────────────────────────
-- TEACHER: attendance and content for their centers
-- ─────────────────────────────────────────
CREATE POLICY "teacher_attendance" ON attendance
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = attendance.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "teacher_content" ON content
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = content.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "teacher_exams" ON exams
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = exams.batch_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

CREATE POLICY "teacher_marks" ON student_marks
    FOR ALL USING (
        get_my_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM exams e
            JOIN batches b ON b.id = e.batch_id
            WHERE e.id = student_marks.exam_id
            AND b.center_id = ANY(get_my_center_ids())
        )
    );

-- ─────────────────────────────────────────
-- STUDENT: own data only
-- ─────────────────────────────────────────
CREATE POLICY "student_profile" ON students
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "student_enrollments" ON student_batch_enrollments
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_invoices" ON student_invoices
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_attendance" ON attendance
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_content" ON content
    FOR SELECT USING (
        get_my_role() = 'student'
        AND is_published = TRUE
        AND batch_id IN (
            SELECT sbe.batch_id FROM student_batch_enrollments sbe
            JOIN students s ON s.id = sbe.student_id
            WHERE s.user_id = auth.uid() AND sbe.is_active = TRUE
        )
    );

CREATE POLICY "student_progress" ON content_progress
    FOR ALL USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_exams" ON exams
    FOR SELECT USING (
        get_my_role() = 'student'
        AND results_published = TRUE
        AND batch_id IN (
            SELECT sbe.batch_id FROM student_batch_enrollments sbe
            JOIN students s ON s.id = sbe.student_id
            WHERE s.user_id = auth.uid() AND sbe.is_active = TRUE
        )
    );

CREATE POLICY "student_marks" ON student_marks
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_points" ON points_transactions
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_reminders" ON revision_reminders
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_meetings" ON meeting_requests
    FOR ALL USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_sotm" ON student_of_the_month
    FOR SELECT USING (
        student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
    );

CREATE POLICY "student_approval_status" ON user_approval_requests
    FOR SELECT USING (user_id = auth.uid());

-- ─────────────────────────────────────────
-- ALL AUTHENTICATED USERS
-- ─────────────────────────────────────────

-- Every user manages their own session (FCM token updates, last_active_at)
CREATE POLICY "own_session" ON user_active_sessions
    FOR ALL USING (user_id = auth.uid());

-- Every user views their own center assignments
CREATE POLICY "own_uca" ON user_center_assignments
    FOR SELECT USING (user_id = auth.uid());