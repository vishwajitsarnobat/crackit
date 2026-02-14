# DATABASE QUICK REFERENCE
## Key Tables & Relationships

---

## CORE ENTITIES (17 Main Tables)

### 1. Identity & Access
```
roles (8 roles: CEO, State Admin, District Admin, Centre Head, Teacher, Accountant, Student, Parent)
  └─ users (links to auth.users)
      ├─ students (student_code, class_level, current_points)
      └─ user_center_assignments (many-to-many: users ↔ centers)
```

### 2. Organizational Hierarchy
```
states (MH, DL, KA, UP...)
  └─ districts
      └─ centers (center_code: MH-PUN-001)
```

### 3. Academic Structure
```
courses (IIT-JEE, NEET, Olympiad)
  └─ course_subjects ←→ subjects (PHY, CHEM, MATH, BIO...)
      └─ batches (physical classes at centers)
          ├─ batch_teachers (teachers assigned to batch)
          └─ student_batch_enrollments (students enrolled)
```

### 4. Content Management
```
content_types (video, pdf, notes, quiz, mcq_test)
  └─ content (learning materials)
      ├─ content_prerequisites (learning path)
      ├─ content_progress (student tracking)
      └─ revision_reminders (7/21/60 day cycle)
```

### 5. Assessment System
```
exam_types (unit_test, chapter_test, mcq_test, mock_test...)
  └─ exams
      ├─ exam_sections (for multi-section exams)
      ├─ exam_questions ←→ mcq_questions (question bank)
      ├─ student_marks
      └─ student_mcq_responses (detailed answer tracking)
```

### 6. Operations
```
attendance (daily records)
  └─ attendance_summary (monthly cache)

fee_structures (pricing)
  └─ student_fees (individual invoices)
      └─ fee_payment_history (transaction log)

points_rules (calculation logic)
  └─ points_transactions (earn/redeem log)
```

### 7. Communication
```
notification_types (8 types: fee, attendance, exam, revision...)
  ├─ notifications (individual messages)
  └─ user_notification_preferences

meeting_requests (parent-teacher)
announcements (center/batch-wide)
device_sessions (single-device login)
```

---

## KEY RELATIONSHIPS

### Many-to-One
```
users → roles
students → users
centers → districts → states
batches → centers
batches → courses
content → batches
content → subjects
exams → batches
student_marks → exams
attendance → students
student_fees → students
```

### Many-to-Many (via Junction Tables)
```
users ↔ centers (user_center_assignments)
courses ↔ subjects (course_subjects)
students ↔ batches (student_batch_enrollments)
batches ↔ teachers (batch_teachers)
exams ↔ questions (exam_questions)
content ↔ content (content_prerequisites) [self-referencing]
```

---

## CRITICAL FIELDS

### Students Table
```sql
student_code        -- STU20250001 (unique identifier)
class_level         -- 1-12
current_points      -- Cached reward points
enrollment_date     -- When joined
is_active           -- Soft delete flag
```

### Content Table
```sql
content_type_id     -- video/pdf/quiz
video_url           -- Bunny.net URL
file_url            -- Supabase Storage path
order_index         -- Sorting order
is_published        -- Visibility control
uploaded_by         -- Teacher reference
```

### Exams Table
```sql
exam_type_id            -- Type of assessment
total_marks             -- Maximum score
negative_marking_ratio  -- For MCQs (e.g., 0.25)
status                  -- scheduled/ongoing/completed
```

### Student Marks Table
```sql
marks_obtained      -- Score achieved
percentage          -- Auto-calculated
grade               -- A+, A, B+, etc.
rank_in_batch       -- Position in class
```

### Attendance Table
```sql
status              -- present/absent/late/leave
attendance_date     -- Date of record
UNIQUE(student_id, batch_id, attendance_date) -- Prevent duplicates
```

---

## INDEXES STRATEGY

### Automatic (Primary Keys & Unique)
- All `id` columns (UUID)
- `student_code`, `center_code`, `batch_code`
- `email` (users)

### Foreign Keys (Created)
```sql
idx_students_user       ON students(user_id)
idx_content_batch       ON content(batch_id)
idx_attendance_student  ON attendance(student_id)
idx_exams_batch         ON exams(batch_id)
```

### Composite (Multi-column Queries)
```sql
idx_attendance_student_date     ON attendance(student_id, attendance_date)
idx_content_batch_subject       ON content(batch_id, subject_id, order_index)
idx_student_marks_covering      ON student_marks(student_id, exam_id) INCLUDE (marks_obtained)
```

### Partial (Filtered Indexes)
```sql
idx_active_students         ON students(id) WHERE is_active = TRUE
idx_pending_fees            ON student_fees(student_id) WHERE payment_status = 'pending'
idx_notifications_unread    ON notifications(user_id) WHERE is_read = FALSE
```

---

## JSONB FIELDS (Flexible Data)

### roles.permissions
```json
{
  "scope": "state",
  "can_view_reports": true,
  "can_manage_centers": false,
  "state_ids": ["uuid1", "uuid2"]
}
```

### content.metadata
```json
{
  "chapters": [
    {"title": "Intro", "start": 0, "end": 120},
    {"title": "Main", "start": 120, "end": 600}
  ],
  "transcript_url": "https://...",
  "quality_options": ["720p", "1080p"]
}
```

### exams.metadata
```json
{
  "sections": [
    {"name": "Physics", "instructions": "No negative marking"},
    {"name": "Chemistry", "instructions": "-0.25 per wrong"}
  ],
  "allowed_tools": ["calculator"]
}
```

---

## ROW LEVEL SECURITY (RLS)

### Policy Examples

**CEO - Full Access:**
```sql
CREATE POLICY "ceo_full_access" ON content
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.role_name = 'ceo'
  )
);
```

**Students - Own Data:**
```sql
CREATE POLICY "students_view_own_marks" ON student_marks
FOR SELECT USING (
  student_id = (SELECT id FROM students WHERE user_id = auth.uid())
);
```

**Teachers - Batch Data:**
```sql
CREATE POLICY "teachers_view_batch_content" ON content
FOR SELECT USING (
  batch_id IN (
    SELECT batch_id FROM batch_teachers 
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);
```

---

## TRIGGERS & FUNCTIONS

### Auto-Update Timestamp
```sql
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-Calculate Attendance Summary
```sql
CREATE TRIGGER auto_update_attendance_summary
AFTER INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION trigger_update_attendance_summary();
```

### Calculate Student Points
```sql
SELECT calculate_student_points('student-uuid');
-- Updates students.current_points based on points_transactions
```

---

## COMMON QUERIES

### Get Student Dashboard Data
```sql
SELECT * FROM v_student_dashboard 
WHERE student_id = 'uuid';
```

### Get Batch Performance
```sql
SELECT * FROM v_batch_performance 
WHERE batch_id = 'uuid';
```

### Find Students with Low Attendance
```sql
SELECT u.full_name, ats.attendance_percentage
FROM attendance_summary ats
JOIN students s ON ats.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE ats.attendance_percentage < 75
  AND ats.month_year = DATE_TRUNC('month', CURRENT_DATE);
```

### Fee Defaulters Report
```sql
SELECT u.full_name, sf.amount_due, sf.due_date
FROM student_fees sf
JOIN students s ON sf.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE sf.payment_status = 'pending'
  AND sf.due_date < CURRENT_DATE
ORDER BY sf.due_date;
```

---

## EXTENSIBILITY PATTERNS

### Adding New Role
```sql
-- Step 1: Add role
INSERT INTO roles (role_name, display_name, level, permissions) VALUES
('state_admin', 'State Administrator', 2, '{"scope": "state"}');

-- Step 2: Add RLS policy
CREATE POLICY "state_admin_access" ON centers
FOR SELECT USING (...);

-- Step 3: Assign users
UPDATE users SET role_id = (SELECT id FROM roles WHERE role_name = 'state_admin')
WHERE id = 'user-uuid';
```

### Adding New Exam Type
```sql
-- Just insert into lookup table
INSERT INTO exam_types (type_code, type_name) 
VALUES ('practical', 'Practical Exam');

-- Use immediately in exams
INSERT INTO exams (exam_type_id, ...) 
VALUES ((SELECT id FROM exam_types WHERE type_code = 'practical'), ...);
```

### Adding New Content Type
```sql
-- Add type
INSERT INTO content_types (type_code, type_name) 
VALUES ('simulation', 'Interactive Simulation');

-- Upload content
INSERT INTO content (content_type_id, ...) 
VALUES ((SELECT id FROM content_types WHERE type_code = 'simulation'), ...);
```

---

## PERFORMANCE TIPS

1. **Use Prepared Statements**
   - Prevents SQL injection
   - Improves query planning

2. **Batch Operations**
   ```sql
   -- Instead of 100 INSERTs, use:
   INSERT INTO attendance VALUES (...), (...), (...);
   ```

3. **Pagination**
   ```sql
   SELECT * FROM content 
   WHERE batch_id = 'uuid'
   ORDER BY order_index
   LIMIT 20 OFFSET 0;
   ```

4. **Materialized Views for Reports**
   ```sql
   CREATE MATERIALIZED VIEW mv_monthly_performance AS
   SELECT ... complex aggregations ...;
   
   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_performance;
   ```

---

## MIGRATION CHECKLIST

When making schema changes:

- [ ] Create versioned migration file (YYYYMMDD_HHMM_description.sql)
- [ ] Test on development database first
- [ ] Wrap in transaction (BEGIN...COMMIT)
- [ ] Add rollback script
- [ ] Update RLS policies if needed
- [ ] Update indexes if needed
- [ ] Document changes
- [ ] Notify team

---

## BACKUP STRATEGY

**Daily:**
- Automated Supabase backup (Pro plan)
- Or pg_dump via cron

**Weekly:**
- Full database export
- Store offsite (AWS S3 / Google Cloud)

**Monthly:**
- Archive old partitions (attendance, audit_logs)
- Test restore procedure

---

## TABLE SUMMARY

**Total Tables:** 45+
- Core Entities: 17
- Junction Tables: 13
- Lookup Tables: 4
- Summary/Cache Tables: 3
- Audit/Tracking: 2
- System: 6+

**Total Indexes:** 50+
**Total RLS Policies:** 20+ (3-5 per major table)
**Total Functions:** 10+
**Total Triggers:** 15+

---

## NORMALIZATION LEVEL

✅ **1NF** - Atomic values, no repeating groups  
✅ **2NF** - No partial dependencies  
✅ **3NF** - No transitive dependencies  

**Strategic Denormalization:**
- `students.current_points` (cached)
- `attendance_summary` (pre-calculated)
- `student_performance_summary` (cached analytics)

---

## SCALABILITY NOTES

**Current Capacity:** 150 students  
**Optimized For:** 1,000 students  
**Max Theoretical:** 10,000+ students (with sharding)

**Bottlenecks to Watch:**
- Attendance table (high insert volume)
- Audit logs (grows indefinitely)
- Content files (storage limit)

**Solutions:**
- Partition attendance by month
- Archive audit logs older than 6 months
- Use Bunny.net for videos (unlimited)

---

## SECURITY CHECKLIST

- [x] UUID primary keys (not sequential IDs)
- [x] RLS enabled on all tables
- [x] Foreign key constraints
- [x] Check constraints on critical fields
- [x] Unique constraints on codes/emails
- [x] Audit logging
- [x] Soft deletes (is_active flags)
- [x] Device session tracking
- [ ] Encrypt sensitive fields (if needed)
- [ ] Rate limiting on auth (Supabase built-in)

---

**Schema Version:** 1.0  
**Last Updated:** 2025-02-14  
**Status:** Production Ready ✅
