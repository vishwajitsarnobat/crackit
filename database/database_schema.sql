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
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SECTION 1: CORE IDENTITY & ACCESS CONTROL

-- Table: roles
-- Purpose: Define all system roles (extensible for new roles)
-- Flexibility: New roles can be added without schema changes
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'ceo', 'state_admin', 'district_admin', 'centre_head', 'teacher', 'student', 'parent', 'accountant'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- Hierarchical level: 1=CEO, 2=State, 3=District, 4=Centre, 5=Teacher, 6=Student
    permissions JSONB DEFAULT '{}', -- Flexible permissions: {"can_view_all_centers": true, "can_manage_fees": true}
    is_active BOOLEAN DEFAULT TRUE,
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
('parent', 'Parent', 6, '{"can_view_child_progress": true, "can_request_meeting": true}');

-- ----------------------------------------------------------------------------
-- Table: users (extends Supabase auth.users)
-- Purpose: Core user information for all user types
-- Note: Links to Supabase auth.users via id
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    address TEXT,
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}', -- Flexible field for additional data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- SECTION 2: ORGANIZATIONAL HIERARCHY
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: states
-- Purpose: State-level organization (for future state admin feature)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: districts
-- Purpose: District-level organization
-- ----------------------------------------------------------------------------
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID REFERENCES states(id) ON DELETE CASCADE,
    district_name VARCHAR(100) NOT NULL,
    district_code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, district_code)
);

CREATE INDEX idx_districts_state ON districts(state_id);

-- ----------------------------------------------------------------------------
-- Table: centers
-- Purpose: Individual coaching centers
-- ----------------------------------------------------------------------------
CREATE TABLE centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
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
CREATE INDEX idx_centers_active ON centers(is_active);

-- ----------------------------------------------------------------------------
-- Table: user_center_assignments
-- Purpose: Many-to-many relationship between users and centers
-- Flexibility: Users (especially teachers/admins) can work at multiple centers
-- ----------------------------------------------------------------------------
CREATE TABLE user_center_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary center for the user
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, center_id)
);

CREATE INDEX idx_user_center_user ON user_center_assignments(user_id);
CREATE INDEX idx_user_center_center ON user_center_assignments(center_id);

-- ============================================================================
-- SECTION 3: ACADEMIC STRUCTURE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: courses
-- Purpose: Different course offerings (IIT-JEE, NEET, Olympiad, etc.)
-- ----------------------------------------------------------------------------
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

-- Sample data
INSERT INTO courses (course_code, course_name, target_exam, class_levels, fees_structure) VALUES
('IIT-JEE-11', 'IIT-JEE Preparation Class 11', 'IIT-JEE', ARRAY[11], '{"monthly": 3000, "yearly": 30000}'),
('IIT-JEE-12', 'IIT-JEE Preparation Class 12', 'IIT-JEE', ARRAY[12], '{"monthly": 3500, "yearly": 35000}'),
('NEET-11', 'NEET Preparation Class 11', 'NEET', ARRAY[11], '{"monthly": 3000, "yearly": 30000}'),
('OLYMPIAD', 'Olympiad Preparation', 'Olympiad', ARRAY[8,9,10], '{"monthly": 2000, "yearly": 20000}');

CREATE INDEX idx_courses_active ON courses(is_active);

-- ----------------------------------------------------------------------------
-- Table: subjects
-- Purpose: Subjects within courses
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: course_subjects
-- Purpose: Many-to-many relationship between courses and subjects
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: batches
-- Purpose: Physical batches/sections within a center
-- ----------------------------------------------------------------------------
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
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

-- ----------------------------------------------------------------------------
-- Table: batch_teachers
-- Purpose: Many-to-many relationship between batches and teachers
-- Flexibility: Multiple teachers can teach a batch, a teacher can teach multiple batches
-- ----------------------------------------------------------------------------
CREATE TABLE batch_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary teacher for the batch
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(batch_id, user_id, subject_id)
);

CREATE INDEX idx_batch_teachers_batch ON batch_teachers(batch_id);
CREATE INDEX idx_batch_teachers_user ON batch_teachers(user_id);

-- ============================================================================
-- SECTION 4: STUDENT MANAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: students
-- Purpose: Student-specific information
-- ----------------------------------------------------------------------------
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    student_code VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated unique ID
    date_of_birth DATE,
    gender VARCHAR(10), -- 'Male', 'Female', 'Other'
    blood_group VARCHAR(5),
    class_level INTEGER NOT NULL,
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

-- ----------------------------------------------------------------------------
-- Table: student_batch_enrollments
-- Purpose: Many-to-many relationship between students and batches
-- Flexibility: Students can enroll in multiple courses/batches
-- ----------------------------------------------------------------------------
CREATE TABLE student_batch_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'withdrawn', 'suspended'
    withdrawal_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id)
);

CREATE INDEX idx_student_enrollments_student ON student_batch_enrollments(student_id);
CREATE INDEX idx_student_enrollments_batch ON student_batch_enrollments(batch_id);
CREATE INDEX idx_student_enrollments_status ON student_batch_enrollments(status);

-- ============================================================================
-- SECTION 5: CONTENT MANAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: content_types
-- Purpose: Define different types of content (extensible for new types)
-- Flexibility: Easy to add new content types like 'quiz', 'simulation', etc.
-- ----------------------------------------------------------------------------
CREATE TABLE content_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) UNIQUE NOT NULL, -- 'video', 'pdf', 'notes', 'quiz', 'mcq_test'
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name for UI
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO content_types (type_code, type_name, icon) VALUES
('video', 'Video Lecture', 'play_circle'),
('pdf', 'PDF Document', 'picture_as_pdf'),
('notes', 'Study Notes', 'note'),
('quiz', 'Practice Quiz', 'quiz'),
('mcq_test', 'MCQ Test', 'assignment');

-- ----------------------------------------------------------------------------
-- Table: content
-- Purpose: All learning content (videos, PDFs, notes, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    content_type_id UUID REFERENCES content_types(id) NOT NULL,
    
    -- Basic Info
    title VARCHAR(300) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0, -- For sorting content
    
    -- Content Storage
    video_url TEXT, -- Bunny.net URL or video ID
    file_url TEXT, -- Supabase Storage path for PDFs/docs
    external_url TEXT, -- For external resources
    thumbnail_url TEXT,
    
    -- Metadata
    duration_seconds INTEGER, -- For videos
    file_size_bytes BIGINT,
    tags TEXT[], -- Array of tags for searchability
    
    -- Access Control
    is_free BOOLEAN DEFAULT FALSE, -- Free preview content
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    
    -- Tracking
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    view_count INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}', -- Flexible field: transcript, chapters, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_batch ON content(batch_id);
CREATE INDEX idx_content_subject ON content(subject_id);
CREATE INDEX idx_content_type ON content(content_type_id);
CREATE INDEX idx_content_published ON content(is_published);
CREATE INDEX idx_content_order ON content(batch_id, subject_id, order_index);

-- ----------------------------------------------------------------------------
-- Table: content_prerequisites
-- Purpose: Define content dependencies (e.g., must watch Video A before Video B)
-- Flexibility: Supports complex learning paths
-- ----------------------------------------------------------------------------
CREATE TABLE content_prerequisites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    prerequisite_content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_id, prerequisite_content_id)
);

CREATE INDEX idx_prerequisites_content ON content_prerequisites(content_id);

-- ----------------------------------------------------------------------------
-- Table: content_progress
-- Purpose: Track student progress on each content item
-- ----------------------------------------------------------------------------
CREATE TABLE content_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    
    -- Progress Tracking
    is_started BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER DEFAULT 0, -- 0-100
    
    -- Timestamps
    first_accessed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Video-specific
    watch_time_seconds INTEGER DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    
    -- Engagement
    times_accessed INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, content_id)
);

CREATE INDEX idx_content_progress_student ON content_progress(student_id);
CREATE INDEX idx_content_progress_content ON content_progress(content_id);
CREATE INDEX idx_content_progress_completion ON content_progress(student_id, is_completed);

-- ============================================================================
-- SECTION 6: ASSESSMENT SYSTEM (FLEXIBLE FOR MULTIPLE EXAM TYPES)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: exam_types
-- Purpose: Define different types of assessments
-- Flexibility: Easy to add new exam types (MCQ, subjective, practical, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE exam_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) UNIQUE NOT NULL, -- 'unit_test', 'chapter_test', 'mcq_test', 'mock_test', 'final_exam'
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    default_weightage INTEGER DEFAULT 100, -- For grade calculation
    allows_negative_marking BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}', -- Additional config
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO exam_types (type_code, type_name, allows_negative_marking) VALUES
('unit_test', 'Unit Test', FALSE),
('chapter_test', 'Chapter Test', FALSE),
('mcq_test', 'MCQ Test', TRUE),
('mock_test', 'Mock Test', TRUE),
('monthly_test', 'Monthly Test', FALSE),
('final_exam', 'Final Exam', FALSE);

-- ----------------------------------------------------------------------------
-- Table: exams
-- Purpose: Individual exam instances
-- Flexibility: Supports all types of exams with extensible structure
-- ----------------------------------------------------------------------------
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_type_id UUID REFERENCES exam_types(id) NOT NULL,
    
    -- Basic Info
    exam_code VARCHAR(50),
    exam_name VARCHAR(300) NOT NULL,
    description TEXT,
    
    -- Scheduling
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,
    
    -- Marking Scheme
    total_marks DECIMAL(10, 2) NOT NULL,
    passing_marks DECIMAL(10, 2),
    negative_marking_ratio DECIMAL(5, 2) DEFAULT 0, -- e.g., 0.25 for -1/4 per wrong answer
    
    -- Exam Structure (for MCQ/online tests)
    total_questions INTEGER,
    question_paper_url TEXT, -- For uploaded question papers
    answer_key_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'ongoing', 'completed', 'cancelled'
    
    -- Access Control
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    publish_results_date DATE,
    
    metadata JSONB DEFAULT '{}', -- Section-wise marks, instructions, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_batch ON exams(batch_id);
CREATE INDEX idx_exams_subject ON exams(subject_id);
CREATE INDEX idx_exams_type ON exams(exam_type_id);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_exams_status ON exams(status);

-- ----------------------------------------------------------------------------
-- Table: exam_sections (for MCQ tests with multiple sections)
-- Purpose: Define sections within an exam (e.g., Physics, Chemistry, Maths in JEE)
-- Flexibility: Supports complex exam structures
-- ----------------------------------------------------------------------------
CREATE TABLE exam_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    section_order INTEGER DEFAULT 1,
    total_questions INTEGER NOT NULL,
    marks_per_question DECIMAL(5, 2) NOT NULL,
    negative_marks DECIMAL(5, 2) DEFAULT 0,
    duration_minutes INTEGER,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exam_sections_exam ON exam_sections(exam_id);

-- ----------------------------------------------------------------------------
-- Table: mcq_questions
-- Purpose: Store MCQ questions for online tests
-- Flexibility: Reusable question bank
-- ----------------------------------------------------------------------------
CREATE TABLE mcq_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Question Content
    question_text TEXT NOT NULL,
    question_image_url TEXT,
    
    -- Options (stored as JSONB for flexibility)
    options JSONB NOT NULL, -- [{"key": "A", "text": "...", "image": "..."}, ...]
    correct_answer VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D' or '1,3' for multiple correct
    
    -- Metadata
    difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
    topic VARCHAR(200),
    explanation TEXT,
    marks DECIMAL(5, 2) DEFAULT 1,
    negative_marks DECIMAL(5, 2) DEFAULT 0,
    
    -- Tracking
    times_used INTEGER DEFAULT 0,
    average_score DECIMAL(5, 2),
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcq_questions_subject ON mcq_questions(subject_id);
CREATE INDEX idx_mcq_questions_difficulty ON mcq_questions(difficulty_level);
CREATE INDEX idx_mcq_questions_topic ON mcq_questions(topic);

-- ----------------------------------------------------------------------------
-- Table: exam_questions
-- Purpose: Link questions to specific exams
-- ----------------------------------------------------------------------------
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    exam_section_id UUID REFERENCES exam_sections(id) ON DELETE CASCADE,
    mcq_question_id UUID REFERENCES mcq_questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    marks_override DECIMAL(5, 2), -- Override question's default marks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, question_order)
);

CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX idx_exam_questions_section ON exam_questions(exam_section_id);

-- ----------------------------------------------------------------------------
-- Table: student_marks
-- Purpose: Store student marks for all types of exams
-- Flexibility: Supports both traditional and MCQ-based exams
-- ----------------------------------------------------------------------------
CREATE TABLE student_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    
    -- Marks
    marks_obtained DECIMAL(10, 2),
    total_marks DECIMAL(10, 2),
    percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_marks > 0 THEN (marks_obtained * 100.0 / total_marks)
            ELSE 0 
        END
    ) STORED,
    grade VARCHAR(5), -- A+, A, B+, B, C, etc.
    rank_in_batch INTEGER,
    
    -- MCQ-specific
    correct_answers INTEGER,
    incorrect_answers INTEGER,
    unanswered INTEGER,
    
    -- Status
    is_absent BOOLEAN DEFAULT FALSE,
    submission_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'submitted', 'evaluated'
    
    -- Tracking
    entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ,
    remarks TEXT,
    
    metadata JSONB DEFAULT '{}', -- Section-wise breakdown, time taken, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_id)
);

CREATE INDEX idx_student_marks_student ON student_marks(student_id);
CREATE INDEX idx_student_marks_exam ON student_marks(exam_id);
CREATE INDEX idx_student_marks_percentage ON student_marks(percentage DESC);

-- ----------------------------------------------------------------------------
-- Table: student_mcq_responses
-- Purpose: Store individual MCQ responses for detailed analysis
-- ----------------------------------------------------------------------------
CREATE TABLE student_mcq_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    mcq_question_id UUID REFERENCES mcq_questions(id) ON DELETE CASCADE,
    
    -- Response
    selected_answer VARCHAR(10), -- 'A', 'B', 'C', 'D' or NULL if unanswered
    is_correct BOOLEAN,
    marks_awarded DECIMAL(5, 2),
    time_taken_seconds INTEGER,
    
    -- Metadata
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcq_responses_student ON student_mcq_responses(student_id, exam_id);
CREATE INDEX idx_mcq_responses_question ON student_mcq_responses(mcq_question_id);

-- ============================================================================
-- SECTION 7: ATTENDANCE MANAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: attendance
-- Purpose: Daily attendance records
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: attendance_summary
-- Purpose: Cached monthly attendance statistics (for performance)
-- Note: Updated by triggers or cron jobs
-- ----------------------------------------------------------------------------
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
            WHEN total_days > 0 THEN (present_days * 100.0 / total_days)
            ELSE 0 
        END
    ) STORED,
    
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, month_year)
);

CREATE INDEX idx_attendance_summary_student ON attendance_summary(student_id);
CREATE INDEX idx_attendance_summary_month ON attendance_summary(month_year DESC);

-- ============================================================================
-- SECTION 8: FEE MANAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: fee_structures
-- Purpose: Define fee structure for courses/batches
-- Flexibility: Supports different fee types and installment plans
-- ----------------------------------------------------------------------------
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    
    -- Fee Details
    fee_type VARCHAR(50) NOT NULL, -- 'admission', 'tuition', 'exam', 'material'
    amount DECIMAL(10, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'one_time'
    
    -- Validity
    valid_from DATE NOT NULL,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    metadata JSONB DEFAULT '{}', -- Discounts, late fee rules, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_structures_course ON fee_structures(course_id);
CREATE INDEX idx_fee_structures_center ON fee_structures(center_id);

-- ----------------------------------------------------------------------------
-- Table: student_fees
-- Purpose: Fee records for individual students
-- ----------------------------------------------------------------------------
CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    
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
    
    -- Payment Details
    payment_date DATE,
    payment_method VARCHAR(50), -- 'cash', 'online', 'cheque', 'card'
    transaction_reference VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE,
    
    -- Points
    points_redeemed INTEGER DEFAULT 0,
    
    -- Tracking
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_fees_student ON student_fees(student_id);
CREATE INDEX idx_student_fees_batch ON student_fees(batch_id);
CREATE INDEX idx_student_fees_status ON student_fees(payment_status);
CREATE INDEX idx_student_fees_due_date ON student_fees(due_date);
CREATE INDEX idx_student_fees_month ON student_fees(month_year);

-- ----------------------------------------------------------------------------
-- Table: fee_payment_history
-- Purpose: Detailed payment transaction log
-- ----------------------------------------------------------------------------
CREATE TABLE fee_payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    
    -- Payment Details
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(100),
    
    -- Tracking
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_history_student_fee ON fee_payment_history(student_fee_id);
CREATE INDEX idx_fee_history_date ON fee_payment_history(payment_date DESC);

-- ============================================================================
-- SECTION 9: POINTS & REWARDS SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: points_rules
-- Purpose: Define rules for earning/redeeming points
-- Flexibility: Easy to modify point calculation logic
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: points_transactions
-- Purpose: Log of all points earned and redeemed
-- ----------------------------------------------------------------------------
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
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    metadata JSONB DEFAULT '{}', -- Calculation breakdown
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_trans_student ON points_transactions(student_id);
CREATE INDEX idx_points_trans_type ON points_transactions(transaction_type);
CREATE INDEX idx_points_trans_month ON points_transactions(month_year DESC);

-- ============================================================================
-- SECTION 10: COMMUNICATION & NOTIFICATIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: notification_types
-- Purpose: Define different types of notifications
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: notifications
-- Purpose: Individual notification records
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type_id UUID REFERENCES notification_types(id) NOT NULL,
    
    -- Content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- Deep link or URL
    
    -- Delivery
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
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

-- ----------------------------------------------------------------------------
-- Table: user_notification_preferences
-- Purpose: User preferences for notification types
-- ----------------------------------------------------------------------------
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type_id UUID REFERENCES notification_types(id) ON DELETE CASCADE,
    
    is_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_type_id)
);

CREATE INDEX idx_notif_prefs_user ON user_notification_preferences(user_id);

-- ----------------------------------------------------------------------------
-- Table: meeting_requests
-- Purpose: Parent-teacher meeting requests
-- ----------------------------------------------------------------------------
CREATE TABLE meeting_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    
    -- Request Details
    requested_by UUID REFERENCES users(id) ON DELETE CASCADE, -- Parent or student
    requested_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Centre head or teacher
    
    request_type VARCHAR(50) DEFAULT 'parent_teacher', -- 'parent_teacher', 'counseling', 'academic'
    subject VARCHAR(200),
    message TEXT,
    preferred_dates DATE[], -- Array of preferred dates
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed', 'cancelled'
    
    -- Scheduled Details
    scheduled_date DATE,
    scheduled_time TIME,
    meeting_mode VARCHAR(20), -- 'in_person', 'online', 'phone'
    meeting_link TEXT, -- For online meetings
    
    -- Response
    response_message TEXT,
    responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    
    -- Completion
    meeting_notes TEXT,
    completed_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meeting_requests_student ON meeting_requests(student_id);
CREATE INDEX idx_meeting_requests_center ON meeting_requests(center_id);
CREATE INDEX idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX idx_meeting_requests_date ON meeting_requests(scheduled_date);

-- ----------------------------------------------------------------------------
-- Table: announcements
-- Purpose: Center-wide or batch-specific announcements
-- ----------------------------------------------------------------------------
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Scope
    scope VARCHAR(20) NOT NULL, -- 'all', 'center', 'batch', 'course'
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(50), -- 'info', 'warning', 'success', 'holiday'
    
    -- Media
    attachment_url TEXT,
    image_url TEXT,
    
    -- Visibility
    is_pinned BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    publish_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    
    -- Targeting
    target_roles VARCHAR(20)[], -- Array: {'student', 'parent', 'teacher'}
    
    -- Tracking
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    view_count INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_scope ON announcements(scope);
CREATE INDEX idx_announcements_center ON announcements(center_id);
CREATE INDEX idx_announcements_batch ON announcements(batch_id);
CREATE INDEX idx_announcements_published ON announcements(is_published, publish_date);

-- ============================================================================
-- SECTION 11: DEVICE & SESSION MANAGEMENT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: device_sessions
-- Purpose: Track user device sessions for single-device login
-- ----------------------------------------------------------------------------
CREATE TABLE device_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device Info
    device_id VARCHAR(255) NOT NULL, -- Unique device identifier
    device_name VARCHAR(200),
    device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
    device_os VARCHAR(50),
    device_os_version VARCHAR(50),
    app_version VARCHAR(20),
    
    -- Location (optional)
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Session
    fcm_token TEXT, -- For push notifications
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_device_sessions_user ON device_sessions(user_id);
CREATE INDEX idx_device_sessions_active ON device_sessions(user_id, is_active);
CREATE INDEX idx_device_sessions_last_active ON device_sessions(last_active_at);

-- ============================================================================
-- SECTION 12: REVISION & LEARNING REMINDERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: revision_reminders
-- Purpose: Schedule revision reminders based on spaced repetition
-- ----------------------------------------------------------------------------
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
CREATE INDEX idx_revision_reminders_next_date ON revision_reminders(next_reminder_date) 
    WHERE is_active = TRUE;

-- ============================================================================
-- SECTION 13: PERFORMANCE ANALYTICS (CACHED)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: student_performance_summary
-- Purpose: Cached monthly performance metrics for fast dashboard loading
-- Note: Updated by triggers or scheduled jobs
-- ----------------------------------------------------------------------------
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
    rank_in_batch INTEGER,
    
    -- Subject-wise (JSONB for flexibility)
    subject_wise_performance JSONB, -- {"PHY": {"avg": 85, "rank": 3}, "CHEM": {...}}
    
    -- Engagement
    content_completed INTEGER,
    content_pending INTEGER,
    total_study_time_minutes INTEGER,
    
    -- Points
    points_earned INTEGER,
    points_redeemed INTEGER,
    
    -- Status
    status VARCHAR(50), -- 'excellent', 'good', 'average', 'needs_improvement'
    remarks TEXT,
    
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, batch_id, month_year)
);

CREATE INDEX idx_performance_summary_student ON student_performance_summary(student_id);
CREATE INDEX idx_performance_summary_batch ON student_performance_summary(batch_id);
CREATE INDEX idx_performance_summary_month ON student_performance_summary(month_year DESC);

-- ============================================================================
-- SECTION 14: AUDIT & LOGGING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: audit_logs
-- Purpose: Track all important system actions for security and debugging
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Table: system_errors
-- Purpose: Log application errors for monitoring
-- ----------------------------------------------------------------------------
CREATE TABLE system_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Error Details
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_path TEXT,
    request_method VARCHAR(10),
    request_body JSONB,
    
    -- Environment
    environment VARCHAR(20), -- 'development', 'staging', 'production'
    app_version VARCHAR(20),
    
    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_errors_resolved ON system_errors(is_resolved);
CREATE INDEX idx_system_errors_created ON system_errors(created_at DESC);

-- ============================================================================
-- SECTION 15: DATABASE FUNCTIONS & TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: Update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add more triggers for other tables as needed

-- ----------------------------------------------------------------------------
-- Function: Calculate student points balance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_student_points(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER;
BEGIN
    SELECT COALESCE(SUM(points), 0) 
    INTO total_points
    FROM points_transactions
    WHERE student_id = p_student_id;
    
    -- Update student record
    UPDATE students 
    SET current_points = total_points 
    WHERE id = p_student_id;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: Update attendance summary
-- ----------------------------------------------------------------------------
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
    AND DATE_TRUNC('month', attendance_date) = p_month_year;
    
    INSERT INTO attendance_summary (
        student_id, batch_id, month_year,
        total_days, present_days, absent_days, late_days, leave_days
    ) VALUES (
        p_student_id, p_batch_id, p_month_year,
        v_total, v_present, v_absent, v_late, v_leave
    )
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

-- ----------------------------------------------------------------------------
-- Trigger: Auto-update attendance summary on attendance change
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_update_attendance_summary()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_attendance_summary(
        NEW.student_id,
        NEW.batch_id,
        DATE_TRUNC('month', NEW.attendance_date)::DATE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_attendance_summary
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION trigger_update_attendance_summary();

-- ============================================================================
-- SECTION 16: ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Sample RLS Policies (CEO has full access)
CREATE POLICY "ceo_full_access" ON content
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'ceo'
        )
    );

-- Students can only see content from their enrolled batches
CREATE POLICY "students_view_enrolled_content" ON content
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM student_batch_enrollments sbe
            JOIN students s ON sbe.student_id = s.id
            WHERE s.user_id = auth.uid()
            AND sbe.batch_id = content.batch_id
            AND sbe.is_active = TRUE
        )
    );

-- Teachers can view/edit content for their batches
CREATE POLICY "teachers_manage_batch_content" ON content
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM batch_teachers bt
            WHERE bt.user_id = auth.uid()
            AND bt.batch_id = content.batch_id
            AND bt.is_active = TRUE
        )
    );

-- Add more RLS policies for other tables following similar patterns

-- ============================================================================
-- SECTION 17: VIEWS FOR COMMON QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: Student Dashboard Summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_dashboard AS
SELECT 
    s.id AS student_id,
    s.student_code,
    u.full_name,
    u.email,
    s.class_level,
    s.current_points,
    
    -- Enrolled batches
    (SELECT COUNT(*) FROM student_batch_enrollments 
     WHERE student_id = s.id AND is_active = TRUE) AS enrolled_batches,
    
    -- Attendance
    (SELECT AVG(attendance_percentage) FROM attendance_summary 
     WHERE student_id = s.id) AS overall_attendance_percentage,
    
    -- Academic
    (SELECT AVG(percentage) FROM student_marks sm
     JOIN exams e ON sm.exam_id = e.id
     WHERE sm.student_id = s.id AND e.status = 'completed') AS average_marks,
    
    -- Content Progress
    (SELECT COUNT(*) FROM content_progress 
     WHERE student_id = s.id AND is_completed = TRUE) AS content_completed,
    (SELECT COUNT(*) FROM content_progress 
     WHERE student_id = s.id AND is_completed = FALSE) AS content_pending,
    
    -- Fees
    (SELECT COUNT(*) FROM student_fees 
     WHERE student_id = s.id AND payment_status = 'pending') AS pending_fees
    
FROM students s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = TRUE;

-- ----------------------------------------------------------------------------
-- View: Batch Performance Summary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_batch_performance AS
SELECT 
    b.id AS batch_id,
    b.batch_name,
    c.center_name,
    co.course_name,
    
    -- Student Count
    (SELECT COUNT(*) FROM student_batch_enrollments 
     WHERE batch_id = b.id AND is_active = TRUE) AS total_students,
    
    -- Attendance
    (SELECT AVG(attendance_percentage) FROM attendance_summary 
     WHERE batch_id = b.id) AS avg_attendance,
    
    -- Academic
    (SELECT AVG(sm.percentage) FROM student_marks sm
     JOIN exams e ON sm.exam_id = e.id
     WHERE e.batch_id = b.id) AS avg_marks,
    
    -- Content
    (SELECT COUNT(*) FROM content 
     WHERE batch_id = b.id AND is_published = TRUE) AS total_content
    
FROM batches b
JOIN centers c ON b.center_id = c.id
JOIN courses co ON b.course_id = co.id
WHERE b.is_active = TRUE;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Performance Notes:
-- 1. All foreign keys are indexed automatically
-- 2. Additional indexes created for frequent query patterns
-- 3. Composite indexes for multi-column queries
-- 4. JSONB fields use GIN indexes where needed (add as required)
-- 5. Partial indexes for filtered queries (is_active = TRUE)

-- Scalability Notes:
-- 1. UUID primary keys support horizontal partitioning
-- 2. JSONB fields allow schema flexibility without migrations
-- 3. Separate audit/logs tables prevent bloat in main tables
-- 4. Materialized views can be added for heavy analytical queries
-- 5. Partitioning by date can be added to attendance, audit_logs

-- Flexibility Notes:
-- 1. Roles table allows adding new roles without code changes
-- 2. Exam types support multiple assessment formats
-- 3. Content types extensible for new media
-- 4. Notification types easily expandable
-- 5. JSONB metadata fields in most tables for future needs

-- Next Steps:
-- 1. Add specific GIN indexes for JSONB fields if needed
-- 2. Create additional views for complex reports
-- 3. Set up database backup schedule
-- 4. Configure connection pooling (Supabase handles this)
-- 5. Monitor query performance and add indexes as needed
