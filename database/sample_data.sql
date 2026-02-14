-- ============================================================================
-- SAMPLE DATA FOR TESTING - CRACK IT COACHING INSTITUTE
-- ============================================================================
-- Purpose: Populate database with realistic test data
-- Usage: Run after main schema is created
-- Note: This creates a complete test environment with 20 students, 3 teachers
-- ============================================================================

-- Clear existing data (if needed for fresh start)
-- TRUNCATE TABLE users CASCADE; -- Use with caution!

-- ============================================================================
-- SECTION 1: ORGANIZATIONAL DATA
-- ============================================================================

-- States (already inserted in main schema, but adding more)
INSERT INTO states (state_name, state_code) VALUES
('Gujarat', 'GJ'),
('Madhya Pradesh', 'MP'),
('Rajasthan', 'RJ')
ON CONFLICT (state_code) DO NOTHING;

-- Districts
INSERT INTO districts (state_id, district_name, district_code) VALUES
((SELECT id FROM states WHERE state_code = 'MH'), 'Pune', 'PUN'),
((SELECT id FROM states WHERE state_code = 'MH'), 'Mumbai', 'MUM'),
((SELECT id FROM states WHERE state_code = 'MH'), 'Nagpur', 'NAG'),
((SELECT id FROM states WHERE state_code = 'DL'), 'Central Delhi', 'CD'),
((SELECT id FROM states WHERE state_code = 'DL'), 'South Delhi', 'SD'),
((SELECT id FROM states WHERE state_code = 'KA'), 'Bangalore Urban', 'BLR');

-- Centers
INSERT INTO centers (district_id, center_code, center_name, address, city, pincode, phone, email, contact_person, contact_person_phone) VALUES
(
  (SELECT id FROM districts WHERE district_code = 'PUN'),
  'MH-PUN-001',
  'Crack It - Pune Kothrud',
  '123, Paud Road, Kothrud',
  'Pune',
  '411038',
  '+91-20-25384567',
  'pune.kothrud@crackit.com',
  'Rajesh Sharma',
  '+91-9876543210'
),
(
  (SELECT id FROM districts WHERE district_code = 'PUN'),
  'MH-PUN-002',
  'Crack It - Pune Deccan',
  '45, FC Road, Deccan Gymkhana',
  'Pune',
  '411004',
  '+91-20-25678901',
  'pune.deccan@crackit.com',
  'Priya Deshmukh',
  '+91-9876543211'
),
(
  (SELECT id FROM districts WHERE district_code = 'MUM'),
  'MH-MUM-001',
  'Crack It - Mumbai Andheri',
  '78, SV Road, Andheri West',
  'Mumbai',
  '400058',
  '+91-22-26733456',
  'mumbai.andheri@crackit.com',
  'Amit Patel',
  '+91-9876543212'
),
(
  (SELECT id FROM districts WHERE district_code = 'CD'),
  'DL-CD-001',
  'Crack It - Delhi Karol Bagh',
  '12, Pusa Road, Karol Bagh',
  'New Delhi',
  '110005',
  '+91-11-25843567',
  'delhi.karolbagh@crackit.com',
  'Vikram Singh',
  '+91-9876543213'
);

-- ============================================================================
-- SECTION 2: COURSES & SUBJECTS (Enhanced)
-- ============================================================================

-- Additional subjects
INSERT INTO subjects (subject_code, subject_name) VALUES
('CS', 'Computer Science'),
('EVS', 'Environmental Science'),
('ART', 'Art & Craft')
ON CONFLICT (subject_code) DO NOTHING;

-- Link subjects to courses
INSERT INTO course_subjects (course_id, subject_id, is_mandatory, weightage) VALUES
((SELECT id FROM courses WHERE course_code = 'IIT-JEE-11'), (SELECT id FROM subjects WHERE subject_code = 'PHY'), TRUE, 100),
((SELECT id FROM courses WHERE course_code = 'IIT-JEE-11'), (SELECT id FROM subjects WHERE subject_code = 'CHEM'), TRUE, 100),
((SELECT id FROM courses WHERE course_code = 'IIT-JEE-11'), (SELECT id FROM subjects WHERE subject_code = 'MATH'), TRUE, 100),

((SELECT id FROM courses WHERE course_code = 'IIT-JEE-12'), (SELECT id FROM subjects WHERE subject_code = 'PHY'), TRUE, 100),
((SELECT id FROM courses WHERE course_code = 'IIT-JEE-12'), (SELECT id FROM subjects WHERE subject_code = 'CHEM'), TRUE, 100),
((SELECT id FROM courses WHERE course_code = 'IIT-JEE-12'), (SELECT id FROM subjects WHERE subject_code = 'MATH'), TRUE, 100),

((SELECT id FROM courses WHERE course_code = 'NEET-11'), (SELECT id FROM subjects WHERE subject_code = 'PHY'), TRUE, 90),
((SELECT id FROM courses WHERE course_code = 'NEET-11'), (SELECT id FROM subjects WHERE subject_code = 'CHEM'), TRUE, 90),
((SELECT id FROM courses WHERE course_code = 'NEET-11'), (SELECT id FROM subjects WHERE subject_code = 'BIO'), TRUE, 120),

((SELECT id FROM courses WHERE course_code = 'OLYMPIAD'), (SELECT id FROM subjects WHERE subject_code = 'MATH'), TRUE, 100),
((SELECT id FROM courses WHERE course_code = 'OLYMPIAD'), (SELECT id FROM subjects WHERE subject_code = 'PHY'), FALSE, 80),
((SELECT id FROM courses WHERE course_code = 'OLYMPIAD'), (SELECT id FROM subjects WHERE subject_code = 'GK'), FALSE, 60)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 3: BATCHES
-- ============================================================================

-- Batch 1: IIT-JEE Class 11 at Pune Kothrud
INSERT INTO batches (center_id, course_id, batch_code, batch_name, class_level, academic_year, start_date, end_date, max_students, schedule) VALUES
(
  (SELECT id FROM centers WHERE center_code = 'MH-PUN-001'),
  (SELECT id FROM courses WHERE course_code = 'IIT-JEE-11'),
  'JEE11-MOR-A',
  'JEE Class 11 Morning Batch A',
  11,
  '2025-26',
  '2025-04-01',
  '2026-03-31',
  30,
  '{"monday": ["08:00-10:00", "10:15-12:15"], "tuesday": ["08:00-10:00", "10:15-12:15"], "wednesday": ["08:00-10:00", "10:15-12:15"], "thursday": ["08:00-10:00", "10:15-12:15"], "friday": ["08:00-10:00", "10:15-12:15"], "saturday": ["08:00-12:00"]}'::jsonb
);

-- Batch 2: NEET Class 11 at Pune Kothrud
INSERT INTO batches (center_id, course_id, batch_code, batch_name, class_level, academic_year, start_date, end_date, max_students) VALUES
(
  (SELECT id FROM centers WHERE center_code = 'MH-PUN-001'),
  (SELECT id FROM courses WHERE course_code = 'NEET-11'),
  'NEET11-AFT-A',
  'NEET Class 11 Afternoon Batch A',
  11,
  '2025-26',
  '2025-04-01',
  '2026-03-31',
  30
);

-- Batch 3: Olympiad at Pune Deccan
INSERT INTO batches (center_id, course_id, batch_code, batch_name, class_level, academic_year, start_date, max_students) VALUES
(
  (SELECT id FROM centers WHERE center_code = 'MH-PUN-002'),
  (SELECT id FROM courses WHERE course_code = 'OLYMPIAD'),
  'OLY9-WKE-A',
  'Olympiad Class 9 Weekend Batch',
  9,
  '2025-26',
  '2025-04-01',
  25
);

-- ============================================================================
-- SECTION 4: USERS (CEO, TEACHERS, STUDENTS)
-- ============================================================================

-- IMPORTANT: In real Supabase, users are created via Supabase Auth API first
-- This is for demonstration - assumes auth.users entries exist
-- In production: Use Supabase client.auth.signUp() to create users

-- CEO User
INSERT INTO users (id, role_id, full_name, email, phone) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE role_name = 'ceo'),
  'Aditya Mehta',
  'aditya.mehta@crackit.com',
  '+91-9876543200'
);

-- Centre Heads
INSERT INTO users (id, role_id, full_name, email, phone) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE role_name = 'centre_head'),
  'Rajesh Sharma',
  'rajesh.sharma@crackit.com',
  '+91-9876543210'
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM roles WHERE role_name = 'centre_head'),
  'Priya Deshmukh',
  'priya.deshmukh@crackit.com',
  '+91-9876543211'
);

-- Assign centre heads to centers
INSERT INTO user_center_assignments (user_id, center_id, is_primary) VALUES
('b0000000-0000-0000-0000-000000000001', (SELECT id FROM centers WHERE center_code = 'MH-PUN-001'), TRUE),
('b0000000-0000-0000-0000-000000000002', (SELECT id FROM centers WHERE center_code = 'MH-PUN-002'), TRUE);

-- Teachers
INSERT INTO users (id, role_id, full_name, email, phone) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE role_name = 'teacher'),
  'Dr. Ramesh Kumar',
  'ramesh.kumar@crackit.com',
  '+91-9876543220'
),
(
  'c0000000-0000-0000-0000-000000000002',
  (SELECT id FROM roles WHERE role_name = 'teacher'),
  'Prof. Sneha Joshi',
  'sneha.joshi@crackit.com',
  '+91-9876543221'
),
(
  'c0000000-0000-0000-0000-000000000003',
  (SELECT id FROM roles WHERE role_name = 'teacher'),
  'Dr. Arjun Nair',
  'arjun.nair@crackit.com',
  '+91-9876543222'
);

-- Assign teachers to centers
INSERT INTO user_center_assignments (user_id, center_id, is_primary) VALUES
('c0000000-0000-0000-0000-000000000001', (SELECT id FROM centers WHERE center_code = 'MH-PUN-001'), TRUE),
('c0000000-0000-0000-0000-000000000002', (SELECT id FROM centers WHERE center_code = 'MH-PUN-001'), TRUE),
('c0000000-0000-0000-0000-000000000003', (SELECT id FROM centers WHERE center_code = 'MH-PUN-002'), TRUE);

-- Assign teachers to batches with subjects
INSERT INTO batch_teachers (batch_id, user_id, subject_id, is_primary) VALUES
-- JEE Batch - Physics teacher
((SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'), 
 'c0000000-0000-0000-0000-000000000001',
 (SELECT id FROM subjects WHERE subject_code = 'PHY'),
 TRUE),

-- JEE Batch - Chemistry teacher
((SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
 'c0000000-0000-0000-0000-000000000002',
 (SELECT id FROM subjects WHERE subject_code = 'CHEM'),
 FALSE),

-- NEET Batch - Biology teacher
((SELECT id FROM batches WHERE batch_code = 'NEET11-AFT-A'),
 'c0000000-0000-0000-0000-000000000002',
 (SELECT id FROM subjects WHERE subject_code = 'BIO'),
 TRUE),

-- Olympiad Batch - Math teacher
((SELECT id FROM batches WHERE batch_code = 'OLY9-WKE-A'),
 'c0000000-0000-0000-0000-000000000003',
 (SELECT id FROM subjects WHERE subject_code = 'MATH'),
 TRUE);

-- Students (20 students)
INSERT INTO users (id, role_id, full_name, email, phone, address) VALUES
('d0000000-0000-0000-0000-000000000001', (SELECT id FROM roles WHERE role_name = 'student'), 'Aarav Patel', 'aarav.patel@example.com', '+91-9876543301', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000002', (SELECT id FROM roles WHERE role_name = 'student'), 'Vivaan Sharma', 'vivaan.sharma@example.com', '+91-9876543302', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000003', (SELECT id FROM roles WHERE role_name = 'student'), 'Aditya Singh', 'aditya.singh@example.com', '+91-9876543303', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000004', (SELECT id FROM roles WHERE role_name = 'student'), 'Vihaan Gupta', 'vihaan.gupta@example.com', '+91-9876543304', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000005', (SELECT id FROM roles WHERE role_name = 'student'), 'Arjun Kumar', 'arjun.kumar@example.com', '+91-9876543305', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000006', (SELECT id FROM roles WHERE role_name = 'student'), 'Sai Reddy', 'sai.reddy@example.com', '+91-9876543306', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000007', (SELECT id FROM roles WHERE role_name = 'student'), 'Ayaan Mehta', 'ayaan.mehta@example.com', '+91-9876543307', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000008', (SELECT id FROM roles WHERE role_name = 'student'), 'Krishna Das', 'krishna.das@example.com', '+91-9876543308', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000009', (SELECT id FROM roles WHERE role_name = 'student'), 'Reyansh Jain', 'reyansh.jain@example.com', '+91-9876543309', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000010', (SELECT id FROM roles WHERE role_name = 'student'), 'Aadhya Agarwal', 'aadhya.agarwal@example.com', '+91-9876543310', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000011', (SELECT id FROM roles WHERE role_name = 'student'), 'Diya Verma', 'diya.verma@example.com', '+91-9876543311', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000012', (SELECT id FROM roles WHERE role_name = 'student'), 'Ananya Malhotra', 'ananya.malhotra@example.com', '+91-9876543312', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000013', (SELECT id FROM roles WHERE role_name = 'student'), 'Sara Khan', 'sara.khan@example.com', '+91-9876543313', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000014', (SELECT id FROM roles WHERE role_name = 'student'), 'Pari Saxena', 'pari.saxena@example.com', '+91-9876543314', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000015', (SELECT id FROM roles WHERE role_name = 'student'), 'Navya Iyer', 'navya.iyer@example.com', '+91-9876543315', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000016', (SELECT id FROM roles WHERE role_name = 'student'), 'Ira Desai', 'ira.desai@example.com', '+91-9876543316', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000017', (SELECT id FROM roles WHERE role_name = 'student'), 'Myra Bhat', 'myra.bhat@example.com', '+91-9876543317', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000018', (SELECT id FROM roles WHERE role_name = 'student'), 'Kiara Rao', 'kiara.rao@example.com', '+91-9876543318', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000019', (SELECT id FROM roles WHERE role_name = 'student'), 'Zara Nambiar', 'zara.nambiar@example.com', '+91-9876543319', 'Pune, Maharashtra'),
('d0000000-0000-0000-0000-000000000020', (SELECT id FROM roles WHERE role_name = 'student'), 'Riya Pillai', 'riya.pillai@example.com', '+91-9876543320', 'Pune, Maharashtra');

-- Student Details
INSERT INTO students (user_id, student_code, date_of_birth, gender, class_level, parent_name, parent_phone, parent_email) VALUES
('d0000000-0000-0000-0000-000000000001', 'STU20250001', '2009-05-15', 'Male', 11, 'Rakesh Patel', '+91-9876543401', 'rakesh.patel@example.com'),
('d0000000-0000-0000-0000-000000000002', 'STU20250002', '2009-08-22', 'Male', 11, 'Suresh Sharma', '+91-9876543402', 'suresh.sharma@example.com'),
('d0000000-0000-0000-0000-000000000003', 'STU20250003', '2009-03-10', 'Male', 11, 'Vijay Singh', '+91-9876543403', 'vijay.singh@example.com'),
('d0000000-0000-0000-0000-000000000004', 'STU20250004', '2009-11-30', 'Male', 11, 'Manoj Gupta', '+91-9876543404', 'manoj.gupta@example.com'),
('d0000000-0000-0000-0000-000000000005', 'STU20250005', '2009-07-18', 'Male', 11, 'Rajesh Kumar', '+91-9876543405', 'rajesh.kumar@example.com'),
('d0000000-0000-0000-0000-000000000006', 'STU20250006', '2009-09-05', 'Male', 11, 'Srinivas Reddy', '+91-9876543406', 'srinivas.reddy@example.com'),
('d0000000-0000-0000-0000-000000000007', 'STU20250007', '2009-12-25', 'Male', 11, 'Amit Mehta', '+91-9876543407', 'amit.mehta@example.com'),
('d0000000-0000-0000-0000-000000000008', 'STU20250008', '2009-04-14', 'Male', 11, 'Anil Das', '+91-9876543408', 'anil.das@example.com'),
('d0000000-0000-0000-0000-000000000009', 'STU20250009', '2009-06-20', 'Male', 11, 'Deepak Jain', '+91-9876543409', 'deepak.jain@example.com'),
('d0000000-0000-0000-0000-000000000010', 'STU20250010', '2009-10-08', 'Female', 11, 'Ramesh Agarwal', '+91-9876543410', 'ramesh.agarwal@example.com'),
('d0000000-0000-0000-0000-000000000011', 'STU20250011', '2009-02-17', 'Female', 11, 'Ashok Verma', '+91-9876543411', 'ashok.verma@example.com'),
('d0000000-0000-0000-0000-000000000012', 'STU20250012', '2009-01-29', 'Female', 11, 'Sanjay Malhotra', '+91-9876543412', 'sanjay.malhotra@example.com'),
('d0000000-0000-0000-0000-000000000013', 'STU20250013', '2009-11-11', 'Female', 11, 'Aamir Khan', '+91-9876543413', 'aamir.khan@example.com'),
('d0000000-0000-0000-0000-000000000014', 'STU20250014', '2009-08-03', 'Female', 11, 'Rohit Saxena', '+91-9876543414', 'rohit.saxena@example.com'),
('d0000000-0000-0000-0000-000000000015', 'STU20250015', '2009-05-27', 'Female', 11, 'Krishnan Iyer', '+91-9876543415', 'krishnan.iyer@example.com'),
('d0000000-0000-0000-0000-000000000016', 'STU20250016', '2011-03-12', 'Female', 9, 'Nilesh Desai', '+91-9876543416', 'nilesh.desai@example.com'),
('d0000000-0000-0000-0000-000000000017', 'STU20250017', '2011-07-19', 'Female', 9, 'Sunil Bhat', '+91-9876543417', 'sunil.bhat@example.com'),
('d0000000-0000-0000-0000-000000000018', 'STU20250018', '2011-09-24', 'Female', 9, 'Prakash Rao', '+91-9876543418', 'prakash.rao@example.com'),
('d0000000-0000-0000-0000-000000000019', 'STU20250019', '2011-06-15', 'Female', 9, 'Ganesh Nambiar', '+91-9876543419', 'ganesh.nambiar@example.com'),
('d0000000-0000-0000-0000-000000000020', 'STU20250020', '2011-04-08', 'Female', 9, 'Murthy Pillai', '+91-9876543420', 'murthy.pillai@example.com');

-- Enroll students in batches
-- First 15 students in JEE batch
INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, status)
SELECT 
  s.id,
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  '2025-04-01',
  'active'
FROM students s
WHERE s.student_code IN (
  'STU20250001', 'STU20250002', 'STU20250003', 'STU20250004', 'STU20250005',
  'STU20250006', 'STU20250007', 'STU20250008', 'STU20250009', 'STU20250010',
  'STU20250011', 'STU20250012', 'STU20250013', 'STU20250014', 'STU20250015'
);

-- Last 5 students in Olympiad batch
INSERT INTO student_batch_enrollments (student_id, batch_id, enrollment_date, status)
SELECT 
  s.id,
  (SELECT id FROM batches WHERE batch_code = 'OLY9-WKE-A'),
  '2025-04-01',
  'active'
FROM students s
WHERE s.student_code IN (
  'STU20250016', 'STU20250017', 'STU20250018', 'STU20250019', 'STU20250020'
);

-- ============================================================================
-- SECTION 5: CONTENT
-- ============================================================================

-- Sample content for JEE Physics
INSERT INTO content (
  batch_id, subject_id, content_type_id, title, description,
  video_url, order_index, is_published, uploaded_by
) VALUES
(
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  (SELECT id FROM subjects WHERE subject_code = 'PHY'),
  (SELECT id FROM content_types WHERE type_code = 'video'),
  'Chapter 1: Units and Measurements - Introduction',
  'Fundamental concepts of units, dimensions, and measurement techniques',
  'https://bunny-cdn-placeholder/video-001',
  1,
  TRUE,
  'c0000000-0000-0000-0000-000000000001'
),
(
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  (SELECT id FROM subjects WHERE subject_code = 'PHY'),
  (SELECT id FROM content_types WHERE type_code = 'pdf'),
  'Chapter 1: Units and Measurements - Notes',
  'Comprehensive notes with formulas and solved examples',
  NULL,
  2,
  TRUE,
  'c0000000-0000-0000-0000-000000000001'
),
(
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  (SELECT id FROM subjects WHERE subject_code = 'PHY'),
  (SELECT id FROM content_types WHERE type_code = 'video'),
  'Chapter 1: Dimensional Analysis',
  'Applications of dimensional analysis in problem-solving',
  'https://bunny-cdn-placeholder/video-002',
  3,
  TRUE,
  'c0000000-0000-0000-0000-000000000001'
);

-- Sample content for Chemistry
INSERT INTO content (
  batch_id, subject_id, content_type_id, title, description,
  video_url, order_index, is_published, uploaded_by
) VALUES
(
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  (SELECT id FROM subjects WHERE subject_code = 'CHEM'),
  (SELECT id FROM content_types WHERE type_code = 'video'),
  'Chapter 1: Basic Concepts of Chemistry',
  'Introduction to atoms, molecules, and chemical reactions',
  'https://bunny-cdn-placeholder/video-003',
  1,
  TRUE,
  'c0000000-0000-0000-0000-000000000002'
);

-- ============================================================================
-- SECTION 6: EXAMS & MARKS
-- ============================================================================

-- Create a unit test
INSERT INTO exams (
  batch_id, subject_id, exam_type_id, exam_name, exam_date,
  total_marks, passing_marks, status, created_by
) VALUES
(
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  (SELECT id FROM subjects WHERE subject_code = 'PHY'),
  (SELECT id FROM exam_types WHERE type_code = 'unit_test'),
  'Physics Unit Test 1 - Units and Measurements',
  '2025-05-15',
  50,
  20,
  'completed',
  'c0000000-0000-0000-0000-000000000001'
);

-- Enter marks for students (random marks for demonstration)
INSERT INTO student_marks (student_id, exam_id, marks_obtained, total_marks, grade, entered_by) VALUES
((SELECT id FROM students WHERE student_code = 'STU20250001'), (SELECT id FROM exams LIMIT 1), 42, 50, 'A', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250002'), (SELECT id FROM exams LIMIT 1), 38, 50, 'B+', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250003'), (SELECT id FROM exams LIMIT 1), 45, 50, 'A+', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250004'), (SELECT id FROM exams LIMIT 1), 35, 50, 'B', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250005'), (SELECT id FROM exams LIMIT 1), 40, 50, 'A', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250006'), (SELECT id FROM exams LIMIT 1), 32, 50, 'B', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250007'), (SELECT id FROM exams LIMIT 1), 28, 50, 'C+', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250008'), (SELECT id FROM exams LIMIT 1), 46, 50, 'A+', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250009'), (SELECT id FROM exams LIMIT 1), 37, 50, 'B+', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250010'), (SELECT id FROM exams LIMIT 1), 44, 50, 'A', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250011'), (SELECT id FROM exams LIMIT 1), 41, 50, 'A', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250012'), (SELECT id FROM exams LIMIT 1), 39, 50, 'A-', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250013'), (SELECT id FROM exams LIMIT 1), 33, 50, 'B', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250014'), (SELECT id FROM exams LIMIT 1), 36, 50, 'B+', 'c0000000-0000-0000-0000-000000000001'),
((SELECT id FROM students WHERE student_code = 'STU20250015'), (SELECT id FROM exams LIMIT 1), 43, 50, 'A', 'c0000000-0000-0000-0000-000000000001');

-- ============================================================================
-- SECTION 7: ATTENDANCE
-- ============================================================================

-- Mark attendance for first 10 days of May 2025 (sample)
INSERT INTO attendance (student_id, batch_id, attendance_date, status, marked_by)
SELECT 
  s.id,
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  generate_series('2025-05-01'::date, '2025-05-10'::date, '1 day'::interval)::date,
  CASE 
    WHEN random() < 0.85 THEN 'present'  -- 85% attendance
    WHEN random() < 0.95 THEN 'absent'
    ELSE 'late'
  END,
  'c0000000-0000-0000-0000-000000000001'
FROM students s
WHERE s.student_code IN (
  'STU20250001', 'STU20250002', 'STU20250003', 'STU20250004', 'STU20250005',
  'STU20250006', 'STU20250007', 'STU20250008', 'STU20250009', 'STU20250010'
)
ON CONFLICT (student_id, batch_id, attendance_date) DO NOTHING;

-- ============================================================================
-- SECTION 8: FEES
-- ============================================================================

-- Create fee structure for JEE course
INSERT INTO fee_structures (course_id, center_id, fee_type, amount, frequency, valid_from) VALUES
((SELECT id FROM courses WHERE course_code = 'IIT-JEE-11'), 
 (SELECT id FROM centers WHERE center_code = 'MH-PUN-001'),
 'tuition', 3000, 'monthly', '2025-04-01');

-- Generate monthly fees for all JEE students
INSERT INTO student_fees (
  student_id, batch_id, fee_structure_id, fee_type,
  due_date, month_year, amount_due, payment_status
)
SELECT 
  s.id,
  (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A'),
  (SELECT id FROM fee_structures LIMIT 1),
  'tuition',
  '2025-05-10',
  '2025-05-01',
  3000,
  'pending'
FROM students s
JOIN student_batch_enrollments sbe ON s.id = sbe.student_id
WHERE sbe.batch_id = (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A');

-- Mark some fees as paid
UPDATE student_fees SET
  payment_status = 'paid',
  amount_paid = 3000,
  payment_date = '2025-05-08',
  payment_method = 'cash',
  receipt_number = 'REC-2025-' || LPAD((ROW_NUMBER() OVER())::TEXT, 5, '0')
WHERE student_id IN (
  SELECT id FROM students WHERE student_code IN (
    'STU20250001', 'STU20250002', 'STU20250003', 'STU20250004', 'STU20250005'
  )
);

-- ============================================================================
-- SECTION 9: NOTIFICATIONS
-- ============================================================================

-- Sample notifications
INSERT INTO notifications (
  user_id, notification_type_id, title, message, is_sent
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  (SELECT id FROM notification_types WHERE type_code = 'content_uploaded'),
  'New Physics Lecture Available',
  'Chapter 1: Units and Measurements - Introduction video has been uploaded.',
  TRUE
),
(
  'd0000000-0000-0000-0000-000000000001',
  (SELECT id FROM notification_types WHERE type_code = 'exam_reminder'),
  'Upcoming Physics Test',
  'Your Physics Unit Test 1 is scheduled on May 15, 2025. Prepare well!',
  TRUE
);

-- ============================================================================
-- SECTION 10: DEVICE SESSIONS (Sample)
-- ============================================================================

INSERT INTO device_sessions (
  user_id, device_id, device_name, device_type, device_os, is_active
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'android-device-12345',
  'Samsung Galaxy M31',
  'mobile',
  'Android 13',
  TRUE
),
(
  'd0000000-0000-0000-0000-000000000002',
  'android-device-67890',
  'Xiaomi Redmi Note 10',
  'mobile',
  'Android 12',
  TRUE
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check data insertion
SELECT 'Centers:', COUNT(*) FROM centers UNION ALL
SELECT 'Users:', COUNT(*) FROM users UNION ALL
SELECT 'Students:', COUNT(*) FROM students UNION ALL
SELECT 'Batches:', COUNT(*) FROM batches UNION ALL
SELECT 'Enrollments:', COUNT(*) FROM student_batch_enrollments UNION ALL
SELECT 'Content:', COUNT(*) FROM content UNION ALL
SELECT 'Exams:', COUNT(*) FROM exams UNION ALL
SELECT 'Student Marks:', COUNT(*) FROM student_marks UNION ALL
SELECT 'Attendance Records:', COUNT(*) FROM attendance UNION ALL
SELECT 'Student Fees:', COUNT(*) FROM student_fees;

-- Sample queries to test relationships

-- 1. Get all students in JEE batch with their marks
SELECT 
  u.full_name AS student_name,
  s.student_code,
  e.exam_name,
  sm.marks_obtained,
  sm.total_marks,
  sm.percentage,
  sm.grade
FROM students s
JOIN users u ON s.user_id = u.id
JOIN student_batch_enrollments sbe ON s.id = sbe.student_id
JOIN batches b ON sbe.batch_id = b.id
LEFT JOIN student_marks sm ON s.id = sm.student_id
LEFT JOIN exams e ON sm.exam_id = e.id
WHERE b.batch_code = 'JEE11-MOR-A'
ORDER BY sm.percentage DESC;

-- 2. Get attendance summary for a batch
SELECT 
  u.full_name,
  COUNT(*) as total_days,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
  ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percentage
FROM students s
JOIN users u ON s.user_id = u.id
JOIN attendance a ON s.id = a.student_id
WHERE a.batch_id = (SELECT id FROM batches WHERE batch_code = 'JEE11-MOR-A')
GROUP BY u.full_name
ORDER BY attendance_percentage DESC;

-- 3. Get fee status for all students
SELECT 
  u.full_name,
  sf.month_year,
  sf.amount_due,
  sf.amount_paid,
  sf.payment_status,
  sf.payment_date
FROM students s
JOIN users u ON s.user_id = u.id
JOIN student_fees sf ON s.id = sf.student_id
ORDER BY sf.payment_status, u.full_name;

-- ============================================================================
-- SAMPLE DATA INSERTION COMPLETE
-- ============================================================================

-- Summary
SELECT 
  '✅ Sample data inserted successfully!' as status,
  'You now have:' as description,
  '- 4 Centers across 2 states' as line1,
  '- 3 Batches (JEE, NEET, Olympiad)' as line2,
  '- 20 Students enrolled' as line3,
  '- 3 Teachers assigned' as line4,
  '- Sample content, exams, attendance, and fees' as line5,
  'Ready to test the system!' as line6;
