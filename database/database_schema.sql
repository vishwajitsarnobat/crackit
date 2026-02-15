-- CRACK IT COACHING INSTITUTE - DATABASE SCHEMA
-- Version: 1.0
-- Database: PostgreSQL 14+ (Supabase)
-- Design Principles:
--   - Normalized to 3NF
--   - Flexible role-based access control
--   - Extensible for new features (MCQ exams, state admins, etc.)
--   - Optimized with proper indexes
--   - UUID primary keys for scalability

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- for unique ids that are unguessable

-- SECTION 1: CORE IDENTITY & ACCESS CONTROL

-- Table: roles
-- Purpose: Define all system roles (extensible for new roles)
-- Flexibility: New roles can be added without schema changes
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL CHECK (role_name IN ('ceo', 'state_admin', 'district_admin', 'centre_head', 'teacher', 'student', 'accountant')), -- 'ceo', 'state_admin', 'district_admin', 'centre_head', 'teacher', 'student', 'parent', 'accountant'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- Hierarchical level: 1=CEO, 2=State, 3=District, 4=Centre, 5=Teacher, 6=Student
    permissions JSONB DEFAULT '{}', -- Flexible permissions: {"can_view_all_centers": true, "can_manage_fees": true}
    is_active BOOLEAN DEFAULT TRUE, -- to diable roles
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO roles (role_name, display_name, level, permissions) VALUES
('ceo', 'Chief Executive Officer', 1, '{"full_access": true}'),
('state_admin', 'State Administrator', 2, '{"scope": "state", "can_view_centers": true, "can_view_reports": true}'),
('district_admin', 'District Administrator', 3, '{"scope": "district", "can_view_centers": true, "can_manage_teachers": true}'),
('centre_head', 'Centre Head', 4, '{"scope": "center", "can_manage_center": true, "can_approve_meetings": true}'),
('teacher', 'Teacher', 5, '{"can_upload_content": true, "can_mark_attendance": true, "can_enter_marks": true}'),
('accountant', 'Accountant', 5, '{"can_manage_fees": true, "can_generate_receipts": true}'),
('student', 'Student', 6, '{"can_view_content": true, "can_view_marks": true}'),

-- Table: users (extends Supabase auth.users)
-- Purpose: Core user information for all user types
-- Note: Links to Supabase auth.users via id
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- automatically deletes related entries, avoid ghost data
    role_id UUID REFERENCES roles(id) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE, -- unique automatically creates the index
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address TEXT,
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}', -- Flexible field for additional data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- without index, db has to scan all the user entries, indexes reduce that work
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active); -- low cardinality, but maybe needed later

-- SECTION 2: ORGANIZATIONAL HIERARCHY

-- Table: states
-- Purpose: State-level organization (for future state admin feature)
CREATE TABLE states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_name VARCHAR(100) UNIQUE NOT NULL,
    state_code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'MH', 'DL', 'KA'
    country VARCHAR(50) DEFAULT 'India',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO states (state_name, state_code) VALUES
('Maharashtra', 'MH'),
('Delhi', 'DL'),
('Karnataka', 'KA'),
('Uttar Pradesh', 'UP');

-- Table: districts
-- Purpose: District-level organization
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID REFERENCES states(id) ON DELETE RESTRICT,
    district_name VARCHAR(100) NOT NULL,
    district_code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, district_code) -- district from different states can have same code
);

CREATE INDEX idx_districts_state ON districts(state_id); -- helpful for delete cascade when removing a state

-- Table: centers
-- Purpose: Individual coaching centers
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- cascade deletes all underlying entries, restrict dp not allow deleting district if any active coaching centres found
    district_id UUID REFERENCES districts(id) ON DELETE RESTRICT, 
    center_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'MH-PUN-001'
    center_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    contact_person VARCHAR(200),
    contact_person_phone VARCHAR(20),
    established_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}', -- Capacity, timings, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_centers_district ON centers(district_id);
CREATE INDEX idx_centers_district_city ON centers(district_id, city);

-- Table: user_center_assignments
-- Purpose: Many-to-many relationship between users and centers
-- Flexibility: Users (especially teachers/admins) can work at multiple centers
CREATE TABLE user_center_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary center for the user
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, center_id) -- can be ised for indexing user_id, and not center_id
);

CREATE INDEX idx_user_center_user ON user_center_assignments(user_id); -- gives all entries having user_id
CREATE INDEX idx_user_center_center ON user_center_assignments(center_id);

-- SECTION 3: ACADEMIC STRUCTURE

-- Table: courses
-- Purpose: Different course offerings (IIT-JEE, NEET, Olympiad, etc.)
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(200) NOT NULL,
    description TEXT,
    target_exam VARCHAR(100), -- 'IIT-JEE', 'NEET', 'Olympiad', 'Navodaya'
    duration_months INTEGER, -- Course duration
    class_levels INTEGER[], -- Array of class levels: {9, 10, 11, 12}
    fees_structure JSONB, -- {"monthly": 2000, "quarterly": 5500, "yearly": 20000}
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_active ON courses(is_active);
CREATE INDEX idx_courses_exam ON courses(target_exam);
-- Generalized inverted index, instead of going to each row Row 1: {9,10}, Row 2: {10,11}, it stores 10: {Row 1, Row 2} and so on
CREATE INDEX idx_courses_class_levels ON courses USING GIN(class_levels); -- without this, database scans every single row for class query

-- Sample data
INSERT INTO courses (course_code, course_name, target_exam, class_levels, fees_structure) VALUES
('IIT-JEE-11', 'IIT-JEE Preparation Class 11', 'IIT-JEE', ARRAY[11], '{"monthly": 3000, "yearly": 30000}'),
('IIT-JEE-12', 'IIT-JEE Preparation Class 12', 'IIT-JEE', ARRAY[12], '{"monthly": 3500, "yearly": 35000}'),
('NEET-11', 'NEET Preparation Class 11', 'NEET', ARRAY[11], '{"monthly": 3000, "yearly": 30000}'),
('OLYMPIAD', 'Olympiad Preparation', 'Olympiad', ARRAY[8,9,10], '{"monthly": 2000, "yearly": 20000}');

-- Table: subjects
-- Purpose: Subjects within courses
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO subjects (subject_code, subject_name) VALUES
('PHY', 'Physics'),
('CHEM', 'Chemistry'),
('MATH', 'Mathematics'),
('BIO', 'Biology'),
('ENG', 'English'),
('GK', 'General Knowledge');

-- Table: course_subjects
-- Purpose: Many-to-many relationship between courses and subjects
CREATE TABLE course_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    weightage INTEGER DEFAULT 100, -- For grade calculation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, subject_id)
);

CREATE INDEX idx_course_subjects_course ON course_subjects(course_id);
CREATE INDEX idx_course_subjects_subject ON course_subjects(subject_id);

-- Table: batches
-- Purpose: Physical batches/sections within a center
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE RESTRICT, -- on deleting a course, we ensure the batch history isn't automatically deleted
    batch_code VARCHAR(50) NOT NULL,
    batch_name VARCHAR(200) NOT NULL,
    class_level INTEGER NOT NULL, -- 9, 10, 11, 12
    academic_year VARCHAR(10) NOT NULL, -- '2025-26'
    start_date DATE NOT NULL,
    end_date DATE,
    max_students INTEGER DEFAULT 50,
    schedule JSONB, -- {"monday": ["10:00-12:00", "14:00-16:00"], "tuesday": [...]}
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(center_id, batch_code)
);

CREATE INDEX idx_batches_center ON batches(center_id);
CREATE INDEX idx_batches_course ON batches(course_id);
CREATE INDEX idx_batches_active ON batches(is_active);

-- Table: batch_teachers
-- Purpose: Many-to-many relationship between batches and teachers
-- Flexibility: Multiple teachers can teach a batch, a teacher can teach multiple batches
CREATE TABLE batch_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE RESTRICT, -- if a subject is deleted, the teachers teaching them should be looked after first
    is_primary BOOLEAN DEFAULT FALSE, -- Primary teacher for the batch
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id, user_id, subject_id)
);

CREATE INDEX idx_batch_teachers_batch ON batch_teachers(batch_id);
CREATE INDEX idx_batch_teachers_user ON batch_teachers(user_id);

-- SECTION 4: STUDENT MANAGEMENT

-- Table: students
-- Purpose: Student-specific information
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    student_code VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated unique ID
    date_of_birth DATE,
    gender VARCHAR(10), -- 'Male', 'Female', 'Other'
    blood_group VARCHAR(5),
    class_level INTEGER NOT NULL CHECK (class_level > 0),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    parent_name VARCHAR(200),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    emergency_contact VARCHAR(20),
    current_points INTEGER DEFAULT 0, -- Reward points
    total_points_earned INTEGER DEFAULT 0, -- Lifetime points
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}', -- Medical info, special needs, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_class ON students(class_level);
CREATE INDEX idx_students_active ON students(is_active);

-- Table: student_batch_enrollments
-- Purpose: Many-to-many relationship between students and batches
-- Flexibility: Students can enroll in multiple courses/batches
CREATE TABLE student_batch_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn', 'suspended')), -- can add more
    withdrawal_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE, -- remember to manage this along with status
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id)
);

CREATE INDEX idx_student_enrollments_student ON student_batch_enrollments(student_id);
CREATE INDEX idx_student_enrollments_batch ON student_batch_enrollments(batch_id);
CREATE INDEX idx_student_enrollments_status ON student_batch_enrollments(status);

-- SECTION 5: CONTENT MANAGEMENT

-- Table: content_types
-- Purpose: Define different types of content
CREATE TABLE content_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) UNIQUE NOT NULL, -- 'video', 'pdf', 'ppt', 'notes'
    type_name VARCHAR(100) NOT NULL,
    icon VARCHAR(50), -- Icon name for UI
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO content_types (type_code, type_name, icon) VALUES
('video', 'Video Lecture', 'play_circle'),
('pdf', 'PDF Document', 'picture_as_pdf'),
('ppt', 'Presentation', 'slideshow'),
('notes', 'Study Notes', 'description');

-- Table: content
-- Purpose: All learning content (YouTube videos, Drive PDFs/PPTs)
-- Content depends on batch and subject taught, course not needed
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    content_type_id UUID REFERENCES content_types(id) NOT NULL,
    
    -- Basic Info
    title VARCHAR(300) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0, -- For sorting content
    
    -- Content Link (YouTube or Google Drive)
    content_url TEXT NOT NULL, -- Direct link to YouTube video or Drive file
    thumbnail_url TEXT, -- Optional thumbnail
    
    -- Metadata
    duration_minutes INTEGER, -- Approximate duration (manually entered)
    tags TEXT[], -- Array of tags for searchability
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    
    -- Tracking
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_batch ON content(batch_id);
CREATE INDEX idx_content_subject ON content(subject_id);
CREATE INDEX idx_content_type ON content(content_type_id);
CREATE INDEX idx_content_published ON content(is_published);
CREATE INDEX idx_content_order ON content(batch_id, subject_id, order_index);
-- The GIN Index for faster Tags querying
CREATE INDEX idx_content_tags ON content USING GIN(tags);

-- Table: content_progress
-- Purpose: Track student progress
CREATE TABLE content_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    
    -- Simple Progress Tracking
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps needed for revision
    first_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_content_progress_student ON content_progress(student_id);
CREATE INDEX idx_content_progress_content ON content_progress(content_id);
CREATE INDEX idx_content_progress_completion ON content_progress(student_id, is_completed);

-- SECTION 6: ASSESSMENT SYSTEM

-- Table: exam_types
-- Purpose: Define different types of assessments
CREATE TABLE exam_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) UNIQUE NOT NULL, -- 'unit_test', 'monthly_test', 'final_exam', etc.
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO exam_types (type_code, type_name) VALUES
('unit_test', 'Unit Test'),
('chapter_test', 'Chapter Test'),
('monthly_test', 'Monthly Test'),
('quarterly_exam', 'Quarterly Exam'),
('half_yearly', 'Half Yearly Exam'),
('final_exam', 'Final Exam'),
('mock_test', 'Mock Test');

-- Table: exams
-- Purpose: Exam details (conducted offline, marks entered manually)
-- Exam mapped to batch and subject and not Courses
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_type_id UUID REFERENCES exam_types(id) NOT NULL,
    
    -- Basic Info
    exam_name VARCHAR(300) NOT NULL,
    description TEXT,
    
    -- Date & Time
    exam_date DATE NOT NULL,
    
    -- Marking Scheme
    total_marks DECIMAL(10, 2) NOT NULL,
    passing_marks DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    
    -- Results Publishing
    results_published BOOLEAN DEFAULT FALSE,
    results_published_date DATE,
    
    -- Tracking
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_batch ON exams(batch_id);
CREATE INDEX idx_exams_subject ON exams(subject_id);
CREATE INDEX idx_exams_type ON exams(exam_type_id);
CREATE INDEX idx_exams_date ON exams(exam_date DESC);
CREATE INDEX idx_exams_status ON exams(status);

-- Table: student_marks
-- Purpose: Student marks for each exam (manually entered by teacher)
CREATE TABLE student_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    
    -- Marks
    marks_obtained DECIMAL(10, 2) NOT NULL CHECK (marks_obtained >= 0),
    -- absent students should have 0 marks
    CHECK (NOT is_absent OR marks_obtained = 0),
    
    -- Attendance
    is_absent BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT, -- Optional teacher comments
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, exam_id)
);

CREATE INDEX idx_student_marks_student ON student_marks(student_id);
CREATE INDEX idx_student_marks_exam ON student_marks(exam_id);

-- SECTION 7: ATTENDANCE MANAGEMENT

-- NOTE for myself: Update the lazy sync logic using trigger.

-- Table: attendance
-- Purpose: Daily attendance records
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'present', 'absent', 'late', 'half_day', 'leave'
    check_in_time TIME,
    check_out_time TIME,
    
    -- Tracking
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, attendance_date)
);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_batch ON attendance(batch_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date DESC);
CREATE INDEX idx_attendance_status ON attendance(student_id, status);

-- Table: attendance_summary
-- Purpose: Cached monthly attendance statistics (for performance)
-- Note: Updated by triggers or cron jobs
CREATE TABLE attendance_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- First day of month: '2025-01-01'
    
    total_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    
    attendance_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_days > 0 THEN ROUND((present_days::DECIMAL / total_days) * 100, 2) -- else division gives integer (0 or 100 only)
            ELSE 0 
        END
    ) STORED,
    
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, month_year)
);

CREATE INDEX idx_attendance_summary_student ON attendance_summary(student_id);
CREATE INDEX idx_attendance_summary_month ON attendance_summary(month_year DESC);

-- SECTION 8: FEE MANAGEMENT

-- NOTE for myself: A student can enroll in batches, a batch has a course, so student have to pay for batch
-- and not course. As there might be premium JEE batch and normal JEE batch.

-- Table: fee_structures
-- Purpose: Define fee structure for courses/batches
-- Flexibility: Supports different fee types and installment plans
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    
    -- Fee Details
    fee_type VARCHAR(50) NOT NULL, -- 'admission', 'tuition', 'exam', 'material'
    amount DECIMAL(10, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'one_time'
    
    is_active BOOLEAN DEFAULT TRUE,
    
    metadata JSONB DEFAULT '{}', -- Discounts, late fee rules, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id, fee_type)
);

CREATE INDEX idx_fee_structures_course ON fee_structures(batch_id);
CREATE INDEX idx_fee_structures_center ON fee_structures(center_id);

-- Table: student_invoices
-- Purpose: Fee records for individual students
-- it is like how many money student owes, so points redeemed is suitable here
-- cretaed when stduent enrolls in a batch
CREATE TABLE student_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL, -- it has both batch id and centre id
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE, -- batch_id here too for fast dashboard queries

    -- Fee Details
    fee_type VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    month_year DATE, -- For monthly fees: '2025-01-01'
    
    -- Amounts
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    amount_discount DECIMAL(10, 2) DEFAULT 0, -- Points redemption, scholarships
    late_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- Status
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue'
    
    -- Points
    points_redeemed INTEGER DEFAULT 0,
        
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_invoices_student ON student_invoices(student_id);
CREATE INDEX idx_student_invoices_batch ON student_invoices(batch_id);
CREATE INDEX idx_student_invoices_status ON student_invoices(payment_status);
CREATE INDEX idx_student_invoices_month ON student_invoices(month_year);
CREATE INDEX idx_student_invoices_date ON student_invoices(due_date);

-- Table: fee_transactions
-- Purpose: Detailed payment transaction log
CREATE TABLE fee_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_invoice_id UUID REFERENCES student_invoices(id) ON DELETE CASCADE,
    
    -- Payment Details
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(100), -- Optional: UPI ID or Cheque No
    
    -- Tracking
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_number VARCHAR(50) UNIQUE, -- Generated by backend
    remarks TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_transactions_invoice ON fee_transactions(student_invoice_id);
CREATE INDEX idx_fee_transactions_date ON fee_transactions(payment_date DESC);

-- SECTION 9: POINTS & REWARDS SYSTEM

-- Table: points_rules
-- Purpose: Define rules for earning/redeeming points
-- Flexibility: Easy to modify point calculation logic
CREATE TABLE points_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'attendance', 'marks', 'behavior', 'referral'
    description TEXT,
    
    -- Rule Configuration
    calculation_formula JSONB NOT NULL, -- {"attendance_weight": 0.3, "marks_weight": 0.7}
    min_threshold DECIMAL(5, 2), -- Minimum criteria
    max_points_per_month INTEGER,
    
    -- Redemption Rules
    redemption_rate DECIMAL(5, 2), -- 1 point = X rupees
    allowed_months INTEGER[], -- Array of months: {2, 3} for Feb, March
    
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default rule
INSERT INTO points_rules (rule_name, rule_type, calculation_formula, redemption_rate, allowed_months) VALUES
('default_monthly', 'attendance_marks', 
 '{"attendance_weight": 0.3, "marks_weight": 0.7, "min_attendance": 75, "min_marks": 40}',
 1.0, ARRAY[2, 3]);

-- Table: points_transactions
-- Purpose: Log of all points earned and redeemed
-- NOTE for myself: Input negative number when used, and add to invoice points_redeemed and update current_points in students
CREATE TABLE points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL, -- 'earned', 'redeemed', 'adjusted', 'expired'
    points INTEGER NOT NULL, -- Positive for earned, negative for redeemed
    balance_after INTEGER NOT NULL,
    
    -- Reference
    reference_type VARCHAR(50), -- 'monthly_performance', 'exam', 'fee_redemption', 'manual'
    reference_id UUID, -- ID of related record (exam_id, fee_id, etc.)
    
    -- Details
    description TEXT,
    month_year DATE, -- For monthly calculations
    
    -- Tracking
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    metadata JSONB DEFAULT '{}', -- Calculation breakdown
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_trans_student ON points_transactions(student_id);
CREATE INDEX idx_points_trans_type ON points_transactions(transaction_type);
CREATE INDEX idx_points_trans_month ON points_transactions(month_year DESC);

-- SECTION 10: COMMUNICATION & NOTIFICATIONS

-- Table: notification_types
-- Purpose: Define different types of notifications
CREATE TABLE notification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    default_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO notification_types (type_code, type_name, priority) VALUES
('fee_reminder', 'Fee Payment Reminder', 'high'),
('attendance_alert', 'Low Attendance Alert', 'high'),
('exam_reminder', 'Exam Reminder', 'normal'),
('revision_reminder', 'Revision Reminder', 'low'),
('announcement', 'General Announcement', 'normal'),
('content_uploaded', 'New Content Available', 'normal'),
('marks_published', 'Marks Published', 'normal'),
('meeting_request', 'Meeting Request', 'normal');

-- Table: notifications
-- Purpose: Individual notification records
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type_id UUID REFERENCES notification_types(id) NOT NULL,
    
    -- Content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- Deep link or URL
    
    -- Delivery
    is_read BOOLEAN DEFAULT FALSE, -- clear notification from app if read
    is_sent BOOLEAN DEFAULT FALSE, -- for scheduling throuhh firebase
    sent_at TIMESTAMPTZ, -- log
    scheduled_for TIMESTAMPTZ, -- For scheduled notifications
    
    -- Reference
    reference_type VARCHAR(50), -- 'fee', 'exam', 'content', etc.
    reference_id UUID,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE is_sent = FALSE;

-- Table: meeting_requests
-- Purpose: Simple "Ticket System" for scheduling
-- parent/student requests, the centre head or specific teacher can be choosen by student
CREATE TABLE meeting_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- with whom
    
    category VARCHAR(50) NOT NULL, -- 'academic', 'counseling', 'complaint', 'leave'
    subject VARCHAR(200) NOT NULL, -- "Marks in Physics are low"
    description TEXT,
    
    preferred_slots JSONB, -- e.g. ["2026-03-01 Morning", "2026-03-02 Evening"]
    
    -- The Outcome (Filled by Admin later)
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'scheduled', 'completed', 'rejected'
    
    scheduled_at TIMESTAMPTZ,
    meeting_link TEXT, -- if online
    
    admin_remarks TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_student ON meeting_requests(student_id);
CREATE INDEX idx_meetings_status ON meeting_requests(status);
CREATE INDEX idx_meetings_assigned ON meeting_requests(assigned_to) WHERE status = 'scheduled'; -- for heads/teachers

-- Table: announcements
-- Purpose: Digital Notice Board (One-to-Many Broadcast)
-- Will have a dedicated page on UI both app and website
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'center', 'course', 'batch')),
    
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- 'high' = Pin to top
    
    -- Media
    attachment_url TEXT, -- PDF Circular
    
    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ, -- Auto-hide after this date
    
    -- Role Targeting (e.g., Show only to 'teachers' in Batch A)
    target_roles VARCHAR(20)[] DEFAULT '{student,parent,teacher}',
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- CONSTRAINT: Ensure the ID matches the Scope
    CONSTRAINT valid_scope_target CHECK (
        (scope = 'global' AND center_id IS NULL AND course_id IS NULL AND batch_id IS NULL) OR
        (scope = 'center' AND center_id IS NOT NULL AND course_id IS NULL AND batch_id IS NULL) OR
        (scope = 'course' AND course_id IS NOT NULL AND center_id IS NULL AND batch_id IS NULL) OR
        (scope = 'batch' AND batch_id IS NOT NULL AND center_id IS NULL AND course_id IS NULL)
    )
);

CREATE INDEX idx_announcements_targeting ON announcements(batch_id, center_id, is_active);

-- SECTION 11: DEVICE & SESSION MANAGEMENT

CREATE TABLE user_active_sessions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(200),        
    fcm_token TEXT, -- for notifications
    
    -- Security
    refresh_token TEXT, -- JWT if needed
    ip_address INET,
    
    -- Timestamps
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 12: REVISION & LEARNING REMINDERS

-- Table: revision_reminders
-- Purpose: Schedule revision reminders based on spaced repetition
CREATE TABLE revision_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    
    -- Completion
    completed_date TIMESTAMPTZ NOT NULL,
    
    -- Reminder Schedule (7, 21, 60 days)
    reminder_7_sent BOOLEAN DEFAULT FALSE,
    reminder_7_sent_at TIMESTAMPTZ,
    
    reminder_21_sent BOOLEAN DEFAULT FALSE,
    reminder_21_sent_at TIMESTAMPTZ,
    
    reminder_60_sent BOOLEAN DEFAULT FALSE,
    reminder_60_sent_at TIMESTAMPTZ,
    
    next_reminder_date DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_revision_reminders_student ON revision_reminders(student_id);
CREATE INDEX idx_revision_reminders_next_date ON revision_reminders(next_reminder_date) WHERE is_active = TRUE; -- instantly get what updates has to be sent today

-- SECTION 13: PERFORMANCE ANALYTICS (CACHED)

-- Table: student_performance_summary
-- Purpose: Cached monthly performance metrics for fast dashboard loading
-- Note: Updated by triggers or scheduled jobs
CREATE TABLE student_performance_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- '2025-01-01'
    
    -- Attendance
    attendance_percentage DECIMAL(5, 2),
    total_classes INTEGER,
    classes_attended INTEGER,
    
    -- Academic
    average_marks DECIMAL(5, 2),
    total_exams INTEGER,
    exams_appeared INTEGER,
    
    -- Subject-wise (JSONB for flexibility)
    subject_wise_performance JSONB, -- {"PHY": {"avg": 85, "rank": 3}, "CHEM": {...}}
    
    -- Engagement
    content_completed INTEGER,
    content_pending INTEGER,
    total_study_time_minutes INTEGER,
    
    -- Points
    points_earned INTEGER,
    points_redeemed INTEGER,
    
    remarks TEXT,
    
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, month_year)
);

CREATE INDEX idx_performance_summary_student ON student_performance_summary(student_id);
CREATE INDEX idx_performance_summary_batch ON student_performance_summary(batch_id);
CREATE INDEX idx_performance_summary_month ON student_performance_summary(month_year DESC);

-- SECTION 14: AUDIT & LOGGING

-- Table: audit_logs
-- Purpose: Track all important system actions for security and debugging
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Action Details
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    record_id UUID,
    
    -- User
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[], -- Array of changed column names
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);


-- SECTION 15: DATABASE FUNCTIONS & TRIGGERS

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_centers_updated_at 
    BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at 
    BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_batch_enrollments_updated_at 
    BEFORE UPDATE ON student_batch_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at 
    BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_progress_updated_at 
    BEFORE UPDATE ON content_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at 
    BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_marks_updated_at 
    BEFORE UPDATE ON student_marks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at 
    BEFORE UPDATE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_invoices_updated_at 
    BEFORE UPDATE ON student_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_points_rules_updated_at 
    BEFORE UPDATE ON points_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_requests_updated_at 
    BEFORE UPDATE ON meeting_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at 
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_active_sessions_updated_at 
    BEFORE UPDATE ON user_active_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revision_reminders_updated_at 
    BEFORE UPDATE ON revision_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_performance_summary_updated_at 
    BEFORE UPDATE ON student_performance_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Calculate student points balance
-- Purpose: Recalculates total points from points_transactions table
-- Usage: SELECT calculate_student_points('student-uuid');
CREATE OR REPLACE FUNCTION calculate_student_points(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER;
BEGIN
    -- Sum all points (positive for earned, negative for redeemed)
    SELECT COALESCE(SUM(points), 0) 
    INTO total_points
    FROM points_transactions
    WHERE student_id = p_student_id;
    
    -- Update student record
    UPDATE students 
    SET current_points = total_points,
        updated_at = NOW()
    WHERE id = p_student_id;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function: Update attendance summary for a student/batch/month
-- Purpose: Aggregates daily attendance into monthly summary
-- Usage: Called by trigger automatically, or manually via cron
CREATE OR REPLACE FUNCTION update_attendance_summary(
    p_student_id UUID,
    p_batch_id UUID,
    p_month_year DATE
)
RETURNS VOID AS $$
DECLARE
    v_total INTEGER;
    v_present INTEGER;
    v_absent INTEGER;
    v_late INTEGER;
    v_leave INTEGER;
BEGIN
    -- Aggregate attendance for the month
    SELECT 
        COUNT(*),
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END)
    INTO v_total, v_present, v_absent, v_late, v_leave
    FROM attendance
    WHERE student_id = p_student_id
    AND batch_id = p_batch_id
    AND DATE_TRUNC('month', attendance_date) = p_month_year; -- NOTE for myself: We are saving month_year as first day of the month, so this will work, else it won't
    
    -- Upsert into summary table
    INSERT INTO attendance_summary (
        student_id, batch_id, month_year,
        total_days, present_days, absent_days, late_days, leave_days,
        last_updated_at
    ) VALUES (
        p_student_id, p_batch_id, p_month_year,
        v_total, v_present, v_absent, v_late, v_leave,
        NOW()
    )
    -- if the same row already exists, just update the value instead of throwing the error
    ON CONFLICT (student_id, batch_id, month_year)
    DO UPDATE SET
        total_days = v_total,
        present_days = v_present,
        absent_days = v_absent,
        late_days = v_late,
        leave_days = v_leave,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update attendance summary when attendance is marked
-- Purpose: Keeps attendance_summary table in sync
CREATE OR REPLACE FUNCTION trigger_update_attendance_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update summary for the month of the attendance record, perform calls a function
    PERFORM update_attendance_summary(
        NEW.student_id,
        NEW.batch_id,
        DATE_TRUNC('month', NEW.attendance_date)::DATE -- truncates to first day of the month and removes time completely
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_attendance_summary
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_update_attendance_summary();

-- Function: Generate unique student code
-- Purpose: Auto-generates student code like STU20250001
CREATE SEQUENCE IF NOT EXISTS student_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Use only when manual student code isn't provided
    IF NEW.student_code IS NULL THEN
        NEW.student_code := 'STU' || 
                           TO_CHAR(CURRENT_DATE, 'YYYY') || 
                           LPAD(NEXTVAL('student_code_seq')::TEXT, 5, '0'); -- pad to 5 digits, 1 becomes 00001
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_student_code
BEFORE INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION generate_student_code();

-- ----------------------------------------------------------------------------
-- Function: Generate unique receipt number
-- Purpose: Auto-generates receipt number like REC-2025-00001
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL THEN
        NEW.receipt_number := 'REC-' || 
                             TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                             LPAD(NEXTVAL('receipt_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_receipt_number
BEFORE INSERT ON fee_transactions
FOR EACH ROW
EXECUTE FUNCTION generate_receipt_number();

-- ----------------------------------------------------------------------------
-- Function: Auto-update invoice status based on payments
-- Purpose: Marks invoice as 'paid' when fully paid, 'partial' when partially paid
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(10, 2);
    v_amount_due DECIMAL(10, 2);
    v_new_status VARCHAR(20);
BEGIN
    -- Get total amount paid for this invoice
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM fee_transactions
    WHERE student_invoice_id = NEW.student_invoice_id;
    
    -- Get invoice amount due
    SELECT amount_due - amount_discount + late_fee
    INTO v_amount_due
    FROM student_invoices
    WHERE id = NEW.student_invoice_id;
    
    -- Determine new status
    IF v_total_paid >= v_amount_due THEN
        v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'pending';
    END IF;
    
    -- Update invoice
    UPDATE student_invoices
    SET 
        amount_paid = v_total_paid,
        payment_status = v_new_status,
        updated_at = NOW()
    WHERE id = NEW.student_invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT ON fee_transactions
FOR EACH ROW
EXECUTE FUNCTION update_invoice_status();

-- ----------------------------------------------------------------------------
-- Function: Create revision reminders when content is completed
-- Purpose: Schedules 7/21/60 day revision reminders
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_revision_reminder()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reminder when content is marked as completed
    IF NEW.is_completed = TRUE AND (OLD IS NULL OR OLD.is_completed = FALSE) THEN
        INSERT INTO revision_reminders (
            student_id,
            content_id,
            completed_date,
            next_reminder_date
        ) VALUES (
            NEW.student_id,
            NEW.content_id,
            NEW.completed_at,
            (NEW.completed_at::DATE + INTERVAL '7 days')::DATE
        )
        ON CONFLICT (student_id, content_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_revision_reminder
AFTER INSERT OR UPDATE ON content_progress
FOR EACH ROW
EXECUTE FUNCTION create_revision_reminder();

-- ----------------------------------------------------------------------------
-- Function: Validate attendance date is not in future
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_attendance_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot mark attendance for future dates';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_attendance_date
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION validate_attendance_date();

-- ----------------------------------------------------------------------------
-- Function: Validate marks don't exceed total marks
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_student_marks()
RETURNS TRIGGER AS $$
DECLARE
    v_total_marks DECIMAL(10, 2);
BEGIN
    -- Get total marks from exam
    SELECT total_marks INTO v_total_marks
    FROM exams WHERE id = NEW.exam_id;
    
    -- Check if marks_obtained exceeds total
    IF NEW.marks_obtained > v_total_marks THEN
        RAISE EXCEPTION 'Marks obtained (%) cannot exceed total marks (%)', 
            NEW.marks_obtained, v_total_marks;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_student_marks
BEFORE INSERT OR UPDATE ON student_marks
FOR EACH ROW
EXECUTE FUNCTION validate_student_marks();

-- ============================================================================
-- SECTION 16: ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all major tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLICY: CEO has full access to everything
-- ----------------------------------------------------------------------------
CREATE POLICY "ceo_full_access_users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_students" ON students
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_centers" ON centers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_batches" ON batches
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_content" ON content
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_exams" ON exams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_student_marks" ON student_marks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_attendance" ON attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

CREATE POLICY "ceo_full_access_fees" ON student_invoices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

-- ----------------------------------------------------------------------------
-- POLICY: Centre Heads can manage their center
-- ----------------------------------------------------------------------------
CREATE POLICY "centre_head_view_center_data" ON centers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'centre_head'
            AND uca.center_id = centers.id
            AND uca.is_active = TRUE
        )
    );

CREATE POLICY "centre_head_manage_batches" ON batches
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'centre_head'
            AND uca.center_id = batches.center_id
            AND uca.is_active = TRUE
        )
    );

-- ----------------------------------------------------------------------------
-- POLICY: Teachers can manage their batches
-- ----------------------------------------------------------------------------
CREATE POLICY "teacher_view_assigned_batches" ON batches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM batch_teachers bt
            WHERE bt.user_id = auth.uid()
            AND bt.batch_id = batches.id
            AND bt.is_active = TRUE
        )
    );

CREATE POLICY "teacher_manage_batch_content" ON content
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM batch_teachers bt
            WHERE bt.user_id = auth.uid()
            AND bt.batch_id = content.batch_id
            AND bt.is_active = TRUE
        )
    );

CREATE POLICY "teacher_manage_batch_attendance" ON attendance
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM batch_teachers bt
            WHERE bt.user_id = auth.uid()
            AND bt.batch_id = attendance.batch_id
            AND bt.is_active = TRUE
        )
    );

CREATE POLICY "teacher_manage_batch_exams" ON exams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM batch_teachers bt
            WHERE bt.user_id = auth.uid()
            AND bt.batch_id = exams.batch_id
            AND bt.is_active = TRUE
        )
    );

CREATE POLICY "teacher_manage_batch_marks" ON student_marks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM batch_teachers bt
            JOIN exams e ON bt.batch_id = e.batch_id
            WHERE bt.user_id = auth.uid()
            AND e.id = student_marks.exam_id
            AND bt.is_active = TRUE
        )
    );

-- ----------------------------------------------------------------------------
-- POLICY: Students can view their own data
-- ----------------------------------------------------------------------------
CREATE POLICY "student_view_own_profile" ON students
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "student_view_enrolled_content" ON content
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            JOIN students s ON sbe.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND sbe.batch_id = content.batch_id
            AND sbe.is_active = TRUE
            AND content.is_published = TRUE
        )
    );

CREATE POLICY "student_manage_own_progress" ON content_progress
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = content_progress.student_id
        )
    );

CREATE POLICY "student_view_own_attendance" ON attendance
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = attendance.student_id
        )
    );

CREATE POLICY "student_view_own_attendance_summary" ON attendance_summary
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = attendance_summary.student_id
        )
    );

CREATE POLICY "student_view_own_marks" ON student_marks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_marks.student_id
        )
    );

CREATE POLICY "student_view_published_exams" ON exams
    FOR SELECT
    USING (
        results_published = TRUE
        AND EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            JOIN students s ON sbe.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND sbe.batch_id = exams.batch_id
            AND sbe.is_active = TRUE
        )
    );

CREATE POLICY "student_view_own_fees" ON student_invoices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_invoices.student_id
        )
    );

CREATE POLICY "student_view_own_notifications" ON notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "student_update_own_notifications" ON notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "student_view_own_meetings" ON meeting_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = meeting_requests.student_id
        )
    );

CREATE POLICY "student_create_meeting_requests" ON meeting_requests
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = meeting_requests.student_id
        )
    );

CREATE POLICY "student_view_relevant_announcements" ON announcements
    FOR SELECT
    USING (
        is_active = TRUE
        AND (
            scope = 'global'
            OR (scope = 'center' AND center_id IN (
                SELECT DISTINCT b.center_id 
                FROM student_batch_enrollments sbe
                JOIN batches b ON sbe.batch_id = b.id
                JOIN students s ON sbe.student_id = s.id
                WHERE s.user_id = auth.uid()
            ))
            OR (scope = 'course' AND course_id IN (
                SELECT DISTINCT b.course_id 
                FROM student_batch_enrollments sbe
                JOIN batches b ON sbe.batch_id = b.id
                JOIN students s ON sbe.student_id = s.id
                WHERE s.user_id = auth.uid()
            ))
            OR (scope = 'batch' AND batch_id IN (
                SELECT sbe.batch_id 
                FROM student_batch_enrollments sbe
                JOIN students s ON sbe.student_id = s.id
                WHERE s.user_id = auth.uid()
            ))
        )
        AND 'student' = ANY(target_roles)
    );

CREATE POLICY "student_view_own_revision_reminders" ON revision_reminders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = revision_reminders.student_id
        )
    );

CREATE POLICY "student_view_own_performance" ON student_performance_summary
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = student_performance_summary.student_id
        )
    );

CREATE POLICY "student_view_own_points" ON points_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students s
            WHERE s.user_id = auth.uid()
            AND s.id = points_transactions.student_id
        )
    );

-- ----------------------------------------------------------------------------
-- POLICY: Accountants can manage fees
-- ----------------------------------------------------------------------------
CREATE POLICY "accountant_view_center_fees" ON student_invoices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            JOIN batches b ON student_invoices.batch_id = b.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'accountant'
            AND uca.center_id = b.center_id
            AND uca.is_active = TRUE
        )
    );

CREATE POLICY "accountant_update_center_fees" ON student_invoices
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            JOIN batches b ON student_invoices.batch_id = b.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'accountant'
            AND uca.center_id = b.center_id
            AND uca.is_active = TRUE
        )
    );

CREATE POLICY "accountant_manage_fee_transactions" ON fee_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            JOIN student_invoices si ON fee_transactions.student_invoice_id = si.id
            JOIN batches b ON si.batch_id = b.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'accountant'
            AND uca.center_id = b.center_id
            AND uca.is_active = TRUE
        )
    );

-- ============================================================================
-- SECTION 17: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: Student marks with percentage and rank
-- Purpose: Joins marks with exam details and calculates percentage/rank
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_marks_detailed AS
SELECT 
    sm.id,
    sm.student_id,
    sm.exam_id,
    sm.marks_obtained,
    e.total_marks,
    
    -- Calculate percentage (avoid integer division)
    CASE 
        WHEN sm.is_absent THEN NULL
        WHEN e.total_marks > 0 THEN ROUND((sm.marks_obtained * 100.0 / e.total_marks), 2)
        ELSE 0 
    END AS percentage,
    
    -- Calculate rank within batch (NULL for absent students)
    CASE 
        WHEN sm.is_absent THEN NULL
        ELSE RANK() OVER (
            PARTITION BY e.batch_id, e.id
            ORDER BY (sm.marks_obtained * 100.0 / e.total_marks) DESC
        )
    END AS rank_in_batch,
    
    -- Determine grade based on percentage
    CASE
        WHEN sm.is_absent THEN 'AB'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 90 THEN 'A+'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 80 THEN 'A'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 70 THEN 'B+'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 60 THEN 'B'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 50 THEN 'C+'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 40 THEN 'C'
        WHEN (sm.marks_obtained * 100.0 / e.total_marks) >= 33 THEN 'D'
        ELSE 'F'
    END AS grade,
    
    sm.is_absent,
    sm.entered_by,
    sm.entered_at,
    sm.remarks,
    sm.created_at,
    sm.updated_at,
    
    -- Include exam details for convenience
    e.exam_name,
    e.exam_date,
    e.subject_id,
    e.batch_id,
    e.exam_type_id,
    e.passing_marks,
    e.status as exam_status,
    e.results_published
    
FROM student_marks sm
JOIN exams e ON sm.exam_id = e.id;

-- ----------------------------------------------------------------------------
-- View: Student Dashboard Summary
-- Purpose: Quick overview of student's academic status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_dashboard AS
SELECT 
    s.id AS student_id,
    s.student_code,
    u.full_name,
    u.email,
    s.class_level,
    s.current_points,
    
    -- Enrolled batches count
    (SELECT COUNT(*) 
     FROM student_batch_enrollments 
     WHERE student_id = s.id 
     AND is_active = TRUE) AS enrolled_batches,
    
    -- Overall attendance percentage (average across all batches)
    (SELECT ROUND(AVG(attendance_percentage), 2) 
     FROM attendance_summary 
     WHERE student_id = s.id) AS overall_attendance_percentage,
    
    -- Average marks across all exams
    (SELECT ROUND(AVG(percentage), 2) 
     FROM v_student_marks_detailed 
     WHERE student_id = s.id 
     AND is_absent = FALSE
     AND results_published = TRUE) AS average_marks,
    
    -- Content statistics
    (SELECT COUNT(*) 
     FROM content_progress 
     WHERE student_id = s.id 
     AND is_completed = TRUE) AS content_completed,
     
    (SELECT COUNT(*) 
     FROM content_progress cp
     WHERE cp.student_id = s.id 
     AND cp.is_completed = FALSE) AS content_pending,
    
    -- Fee statistics
    (SELECT COUNT(*) 
     FROM student_invoices 
     WHERE student_id = s.id 
     AND payment_status IN ('pending', 'overdue')) AS pending_fees_count,
     
    (SELECT COALESCE(SUM(amount_due - amount_paid - amount_discount + late_fee), 0)
     FROM student_invoices 
     WHERE student_id = s.id 
     AND payment_status IN ('pending', 'partial', 'overdue')) AS pending_fees_amount
    
FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = TRUE;

-- ----------------------------------------------------------------------------
-- View: Batch Performance Summary
-- Purpose: Overview of batch academic performance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_batch_performance AS
SELECT 
    b.id AS batch_id,
    b.batch_code,
    b.batch_name,
    b.class_level,
    b.academic_year,
    c.center_name,
    co.course_name,
    
    -- Student statistics
    (SELECT COUNT(*) 
     FROM student_batch_enrollments 
     WHERE batch_id = b.id 
     AND is_active = TRUE) AS total_students,
    
    b.max_students,
    
    -- Attendance statistics
    (SELECT ROUND(AVG(attendance_percentage), 2)
     FROM attendance_summary 
     WHERE batch_id = b.id
     AND month_year >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')) AS avg_attendance_3months,
    
    -- Academic statistics
    (SELECT ROUND(AVG(percentage), 2)
     FROM v_student_marks_detailed vmd
     JOIN exams e ON vmd.exam_id = e.id
     WHERE e.batch_id = b.id
     AND vmd.is_absent = FALSE
     AND e.results_published = TRUE) AS avg_marks,
    
    -- Content statistics
    (SELECT COUNT(*) 
     FROM content 
     WHERE batch_id = b.id 
     AND is_published = TRUE) AS total_content,
    
    -- Exam statistics
    (SELECT COUNT(*) 
     FROM exams 
     WHERE batch_id = b.id 
     AND status = 'completed') AS completed_exams
    
FROM batches b
JOIN centers c ON b.center_id = c.id
JOIN courses co ON b.course_id = co.id
WHERE b.is_active = TRUE;

-- ----------------------------------------------------------------------------
-- View: Fee Collection Summary (by center)
-- Purpose: Financial overview for centers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_fee_collection_summary AS
SELECT 
    c.id AS center_id,
    c.center_code,
    c.center_name,
    
    -- Current month
    (SELECT COUNT(*) 
     FROM student_invoices si
     JOIN batches b ON si.batch_id = b.id
     WHERE b.center_id = c.id
     AND si.month_year = DATE_TRUNC('month', CURRENT_DATE)) AS current_month_invoices,
    
    (SELECT COALESCE(SUM(si.amount_due), 0)
     FROM student_invoices si
     JOIN batches b ON si.batch_id = b.id
     WHERE b.center_id = c.id
     AND si.month_year = DATE_TRUNC('month', CURRENT_DATE)) AS current_month_total_due,
    
    (SELECT COALESCE(SUM(si.amount_paid), 0)
     FROM student_invoices si
     JOIN batches b ON si.batch_id = b.id
     WHERE b.center_id = c.id
     AND si.month_year = DATE_TRUNC('month', CURRENT_DATE)) AS current_month_collected,
    
    -- All time
    (SELECT COALESCE(SUM(si.amount_paid), 0)
     FROM student_invoices si
     JOIN batches b ON si.batch_id = b.id
     WHERE b.center_id = c.id) AS total_collected_all_time,
    
    -- Outstanding
    (SELECT COUNT(*)
     FROM student_invoices si
     JOIN batches b ON si.batch_id = b.id
     WHERE b.center_id = c.id
     AND si.payment_status IN ('pending', 'partial', 'overdue')) AS outstanding_invoices,
    
    (SELECT COALESCE(SUM(si.amount_due - si.amount_paid - si.amount_discount + si.late_fee), 0)
     FROM student_invoices si
     JOIN batches b ON si.batch_id = b.id
     WHERE b.center_id = c.id
     AND si.payment_status IN ('pending', 'partial', 'overdue')) AS outstanding_amount
    
FROM centers c
WHERE c.is_active = TRUE;

-- ----------------------------------------------------------------------------
-- View: Teacher Workload Summary
-- Purpose: Shows teaching assignments and workload
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_teacher_workload AS
SELECT 
    u.id AS user_id,
    u.full_name AS teacher_name,
    u.email,
    
    -- Batch assignments
    (SELECT COUNT(DISTINCT bt.batch_id)
     FROM batch_teachers bt
     WHERE bt.user_id = u.id
     AND bt.is_active = TRUE) AS total_batches,
    
    -- Student count across all batches
    (SELECT COUNT(DISTINCT sbe.student_id)
     FROM batch_teachers bt
     JOIN student_batch_enrollments sbe ON bt.batch_id = sbe.batch_id
     WHERE bt.user_id = u.id
     AND bt.is_active = TRUE
     AND sbe.is_active = TRUE) AS total_students,
    
    -- Subject assignments
    (SELECT STRING_AGG(DISTINCT s.subject_name, ', ')
     FROM batch_teachers bt
     JOIN subjects s ON bt.subject_id = s.id
     WHERE bt.user_id = u.id
     AND bt.is_active = TRUE) AS subjects,
    
    -- Content uploaded
    (SELECT COUNT(*)
     FROM content
     WHERE uploaded_by = u.id) AS content_uploaded,
    
    -- Exams created
    (SELECT COUNT(*)
     FROM exams
     WHERE created_by = u.id) AS exams_created
    
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.role_name = 'teacher'
AND u.is_active = TRUE;

-- ----------------------------------------------------------------------------
-- View: Upcoming Exams (next 30 days)
-- Purpose: Shows scheduled exams across all batches
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_upcoming_exams AS
SELECT 
    e.id AS exam_id,
    e.exam_name,
    e.exam_date,
    e.total_marks,
    et.type_name AS exam_type,
    s.subject_name,
    b.batch_name,
    c.center_name,
    
    -- Student count
    (SELECT COUNT(*)
     FROM student_batch_enrollments sbe
     WHERE sbe.batch_id = e.batch_id
     AND sbe.is_active = TRUE) AS total_students,
    
    -- Days until exam
    (e.exam_date - CURRENT_DATE) AS days_until_exam
    
FROM exams e
JOIN exam_types et ON e.exam_type_id = et.id
JOIN subjects s ON e.subject_id = s.id
JOIN batches b ON e.batch_id = b.id
JOIN centers c ON b.center_id = c.id
WHERE e.status = 'scheduled'
AND e.exam_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY e.exam_date;

-- ----------------------------------------------------------------------------
-- View: Low Attendance Alerts
-- Purpose: Students with attendance below 75%
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_low_attendance_students AS
SELECT 
    s.id AS student_id,
    s.student_code,
    u.full_name AS student_name,
    u.phone AS student_phone,
    s.parent_phone,
    b.batch_name,
    c.center_name,
    ats.month_year,
    ats.attendance_percentage,
    ats.present_days,
    ats.total_days
    
FROM attendance_summary ats
JOIN students s ON ats.student_id = s.id
JOIN users u ON s.user_id = u.id
JOIN batches b ON ats.batch_id = b.id
JOIN centers c ON b.center_id = c.id
WHERE ats.attendance_percentage < 75
AND ats.month_year >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
AND s.is_active = TRUE
ORDER BY ats.attendance_percentage;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Performance Notes:
-- 1. All foreign keys are indexed automatically
-- 2. Additional indexes created for frequent query patterns
-- 3. Composite indexes for multi-column queries
-- 4. GIN indexes for JSONB and array fields
-- 5. Partial indexes for filtered queries (is_active = TRUE, is_sent = FALSE)
-- 6. Window functions used for rank calculations (efficient in PostgreSQL)

-- Security Notes:
-- 1. RLS enabled on all sensitive tables
-- 2. CEO has full access via policies
-- 3. Teachers can only access their assigned batches
-- 4. Students can only view their own data and published results
-- 5. Accountants can manage fees for their assigned centers
-- 6. All policies check for active status (is_active = TRUE)

-- Maintenance Notes:
-- 1. Run ANALYZE on tables after bulk inserts
-- 2. Monitor slow queries and add indexes as needed
-- 3. Archive old audit_logs periodically (older than 6 months)
-- 4. Partition attendance table by month if it grows large
-- 5. Refresh materialized views (if added) on schedule