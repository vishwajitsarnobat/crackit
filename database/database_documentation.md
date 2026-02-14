# DATABASE DESIGN DOCUMENTATION
## Crack It Coaching Institute

---

## TABLE OF CONTENTS
1. Entity-Relationship Overview
2. Normalization Analysis
3. Relationship Details
4. Flexibility & Extensibility
5. Scalability Considerations
6. Index Strategy
7. Data Integrity Rules

---

## 1. ENTITY-RELATIONSHIP OVERVIEW

### Conceptual ER Diagram (Text Representation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ORGANIZATIONAL HIERARCHY                             │
└─────────────────────────────────────────────────────────────────────────┘

                           ┌──────────┐
                           │  STATES  │
                           └────┬─────┘
                                │ 1
                                │
                                │ N
                           ┌────▼──────┐
                           │ DISTRICTS │
                           └────┬──────┘
                                │ 1
                                │
                                │ N
                           ┌────▼──────┐
                           │  CENTERS  │
                           └────┬──────┘
                                │ N
                                │
                           ┌────▼───────────┐
                           │ USER_CENTER_   │
                           │   ASSIGNMENTS  │
                           └────────────────┘
                                │ N
                                │
                           ┌────▼────┐
                           │  USERS  │◄──────┐
                           └────┬────┘       │
                                │            │
                           ┌────▼────┐       │
                           │  ROLES  │       │
                           └─────────┘       │
                                             │
┌─────────────────────────────────────────────────────────────────────────┐
│                      ACADEMIC STRUCTURE                                 │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐           ┌──────────────┐           ┌──────────┐
     │ COURSES  │◄─────N────│COURSE_       │────N─────►│ SUBJECTS │
     └────┬─────┘           │  SUBJECTS    │           └──────────┘
          │ 1               └──────────────┘
          │
          │ N
     ┌────▼─────┐
     │ BATCHES  │───────────────┐
     └────┬─────┘               │
          │ N                   │ N
          │                ┌────▼───────┐
          │                │ BATCH_     │
          │                │   TEACHERS │
          │                └────────────┘
          │                     │ N
          │                     │
     ┌────▼───────────────┐     │
     │ STUDENT_BATCH_     │◄────┘
     │   ENROLLMENTS      │
     └────────────────────┘
          │ N
          │
     ┌────▼─────┐
     │ STUDENTS │
     └──────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTENT MANAGEMENT                                   │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │ CONTENT_     │
     │   TYPES      │
     └──────┬───────┘
            │ 1
            │
            │ N
     ┌──────▼───────┐           ┌──────────────────┐
     │  CONTENT     │◄──────N───│ CONTENT_         │
     └──────┬───────┘           │   PREREQUISITES  │
            │                   └──────────────────┘
            │ N
            │
     ┌──────▼──────────┐
     │ CONTENT_        │
     │   PROGRESS      │
     └─────────────────┘
            │ N
            │
     ┌──────▼──────────┐
     │ REVISION_       │
     │   REMINDERS     │
     └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     ASSESSMENT SYSTEM                                   │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │  EXAM_TYPES  │
     └──────┬───────┘
            │ 1
            │
            │ N
     ┌──────▼───────┐
     │    EXAMS     │
     └──────┬───────┘
            │ 1
            │
            ├─────────────N──────┐
            │                    │
     ┌──────▼──────────┐  ┌─────▼─────────┐
     │ EXAM_SECTIONS   │  │ STUDENT_MARKS │
     └──────┬──────────┘  └───────────────┘
            │ N                  │
            │                    │ N
     ┌──────▼───────────┐  ┌─────▼─────────────────┐
     │ EXAM_QUESTIONS   │  │ STUDENT_MCQ_          │
     └──────┬───────────┘  │   RESPONSES           │
            │ N             └──────────────────────┘
            │
     ┌──────▼──────────┐
     │ MCQ_QUESTIONS   │
     └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   OPERATIONAL MODULES                                   │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐              ┌──────────────┐
     │  ATTENDANCE  │              │ FEE_         │
     └──────┬───────┘              │   STRUCTURES │
            │ N                    └──────┬───────┘
            │                             │ 1
     ┌──────▼────────────┐                │
     │ ATTENDANCE_       │                │ N
     │   SUMMARY         │         ┌──────▼──────┐
     └───────────────────┘         │ STUDENT_    │
                                   │   FEES      │
                                   └──────┬──────┘
                                          │ N
                                          │
                                   ┌──────▼────────────┐
                                   │ FEE_PAYMENT_      │
                                   │   HISTORY         │
                                   └───────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   COMMUNICATION & NOTIFICATIONS                         │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────────────┐
     │ NOTIFICATION_    │
     │    TYPES         │
     └──────┬───────────┘
            │ 1
            │
            │ N
     ┌──────▼──────────┐
     │ NOTIFICATIONS   │
     └─────────────────┘

     ┌──────────────────┐
     │ MEETING_         │
     │   REQUESTS       │
     └──────────────────┘

     ┌──────────────────┐
     │ ANNOUNCEMENTS    │
     └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      POINTS & REWARDS                                   │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │ POINTS_RULES │
     └──────────────┘

     ┌──────────────────┐
     │ POINTS_          │
     │   TRANSACTIONS   │
     └──────────────────┘
```

---

## 2. NORMALIZATION ANALYSIS

### Normal Forms Achieved: **3NF (Third Normal Form)**

#### **1st Normal Form (1NF) - Achieved**
✅ All tables have atomic values (no repeating groups)  
✅ Each column contains only one value  
✅ Each table has a primary key (UUID)  
✅ No duplicate rows possible

**Example:**
```
❌ NOT 1NF:
students (id, name, phone_numbers: "123, 456, 789")

✅ 1NF:
students (id, name, phone, alternate_phone)
```

#### **2nd Normal Form (2NF) - Achieved**
✅ All non-key attributes fully depend on the primary key  
✅ No partial dependencies (all PKs are single UUID)  
✅ Junction tables properly normalized

**Example:**
```
✅ 2NF Achieved:
batch_teachers (id, batch_id, user_id, subject_id)
- All attributes depend on the entire composite relationship
```

#### **3rd Normal Form (3NF) - Achieved**
✅ No transitive dependencies  
✅ All non-key attributes depend ONLY on the primary key  
✅ Lookup tables created for repeating values

**Example:**
```
❌ NOT 3NF:
exams (id, exam_name, exam_type_name, exam_type_description)
- exam_type_description depends on exam_type_name (transitive)

✅ 3NF Achieved:
exams (id, exam_name, exam_type_id)
exam_types (id, type_name, description)
```

#### **Denormalization (Strategic)**
For performance, we've intentionally denormalized in specific cases:

1. **students.current_points** - Cached from points_transactions
2. **attendance_summary** - Pre-calculated monthly stats
3. **student_performance_summary** - Cached analytics
4. **content.view_count** - Aggregated from content_progress

**Justification:** These are read-heavy fields updated by triggers/cron jobs to avoid expensive JOIN queries on dashboards.

---

## 3. RELATIONSHIP DETAILS

### Primary Relationships

#### **1. Users → Roles (Many-to-One)**
```sql
users.role_id → roles.id

Cardinality: N:1
Business Rule: Each user has exactly one primary role
Flexibility: Role permissions stored in JSONB for easy modification
```

**Why this design?**
- Single role keeps authorization simple
- JSONB permissions allow role customization without schema changes
- Future: Can add user_roles junction table if multi-role needed

---

#### **2. States → Districts → Centers (Hierarchy)**
```sql
districts.state_id → states.id
centers.district_id → districts.id

Cardinality: 1:N at each level
Business Rule: Strict organizational hierarchy
```

**Why this design?**
- Supports future state_admin role (can filter by state_id)
- Enables geographic reporting (state-wise, district-wise)
- Easy to add region/zone level if needed

**Flexibility Example:**
```sql
-- Add new level: Zones
CREATE TABLE zones (
    id UUID PRIMARY KEY,
    state_id UUID REFERENCES states(id),
    zone_name VARCHAR(100)
);

ALTER TABLE districts ADD COLUMN zone_id UUID REFERENCES zones(id);
-- No changes to other tables needed!
```

---

#### **3. Users ↔ Centers (Many-to-Many)**
```sql
user_center_assignments (user_id, center_id)

Cardinality: N:M
Business Rule: Users (especially teachers) can work at multiple centers
```

**Why this design?**
- Teachers often teach at multiple branches
- District admins oversee multiple centers
- Supports part-time/visiting faculty

**Query Example:**
```sql
-- Get all centers for a teacher
SELECT c.* FROM centers c
JOIN user_center_assignments uca ON c.id = uca.center_id
WHERE uca.user_id = '...' AND uca.is_active = TRUE;
```

---

#### **4. Courses ↔ Subjects (Many-to-Many)**
```sql
course_subjects (course_id, subject_id)

Cardinality: N:M
Business Rule: Courses can have multiple subjects; subjects can be in multiple courses
```

**Why this design?**
- Physics is in both IIT-JEE and NEET courses
- Allows flexible subject combinations
- Weightage field for customized grade calculation

**Example:**
```sql
-- IIT-JEE course subjects with weightage
INSERT INTO course_subjects (course_id, subject_id, weightage) VALUES
('iit-jee-11', 'physics', 100),
('iit-jee-11', 'chemistry', 100),
('iit-jee-11', 'mathematics', 100);

-- NEET course (Biology has higher weightage)
INSERT INTO course_subjects (course_id, subject_id, weightage) VALUES
('neet-11', 'physics', 90),
('neet-11', 'chemistry', 90),
('neet-11', 'biology', 120);
```

---

#### **5. Batches → Course/Center (Many-to-One)**
```sql
batches.course_id → courses.id
batches.center_id → centers.id

Cardinality: N:1
Business Rule: Each batch belongs to one course at one center
```

**Why this design?**
- Physical batches are tied to specific locations
- Clear ownership for content and attendance
- Enables batch-level reporting

---

#### **6. Students ↔ Batches (Many-to-Many)**
```sql
student_batch_enrollments (student_id, batch_id)

Cardinality: N:M
Business Rule: Students can enroll in multiple courses/batches simultaneously
```

**Why this design?**
- Student might take both IIT-JEE and Olympiad prep
- Supports trial classes (can enroll/unenroll)
- Tracks enrollment history (withdrawal_reason, status)

**Status Workflow:**
```
'active' → 'withdrawn' → (can re-enroll)
'active' → 'completed' → (course finished)
'active' → 'suspended' → (disciplinary/fee issues)
```

---

#### **7. Content → Batch/Subject (Many-to-One)**
```sql
content.batch_id → batches.id
content.subject_id → subjects.id
content.content_type_id → content_types.id

Cardinality: N:1 for each
Business Rule: Content belongs to one batch and one subject
```

**Why this design?**
- Batch-specific content (different pace for different batches)
- Clear subject categorization
- Content type flexibility (video, PDF, quiz, etc.)

**Future Extension - Multi-Batch Content:**
```sql
-- If content needs to be shared across batches
CREATE TABLE content_batch_sharing (
    content_id UUID REFERENCES content(id),
    batch_id UUID REFERENCES batches(id)
);
-- Original content.batch_id becomes "primary_batch_id"
```

---

#### **8. Content → Content (Prerequisites)**
```sql
content_prerequisites (content_id, prerequisite_content_id)

Cardinality: N:M (self-referencing)
Business Rule: Content can have multiple prerequisites; content can be prerequisite for multiple others
```

**Why this design?**
- Enforces learning paths (must watch A before B)
- Prevents students from jumping ahead
- Supports complex curriculum structures

**Example:**
```
Advanced Calculus → requires → Basic Calculus
                 → requires → Trigonometry
```

---

#### **9. Students → Content (Progress Tracking)**
```sql
content_progress (student_id, content_id)

Cardinality: N:M
Business Rule: Each student has unique progress for each content item
```

**Why this design?**
- Individual progress tracking
- Supports resume functionality (last_position_seconds)
- Enables personalized dashboards

**Key Fields:**
- `completion_percentage`: 0-100 (for partial completions)
- `watch_time_seconds`: Total time spent
- `times_accessed`: Engagement metric

---

#### **10. Exams → Exam Types (Many-to-One)**
```sql
exams.exam_type_id → exam_types.id

Cardinality: N:1
Business Rule: Each exam instance has one type
```

**Flexibility for New Exam Types:**
```sql
-- Add MCQ test type
INSERT INTO exam_types (type_code, type_name, allows_negative_marking)
VALUES ('online_mcq', 'Online MCQ Test', TRUE);

-- Add practical exam type
INSERT INTO exam_types (type_code, type_name)
VALUES ('practical', 'Practical Exam', FALSE);

-- No schema changes needed!
```

---

#### **11. Exams → MCQ Questions (Many-to-Many)**
```sql
exam_questions (exam_id, mcq_question_id)

Cardinality: N:M
Business Rule: Exams can reuse questions; questions can appear in multiple exams
```

**Why this design?**
- Question bank reusability
- Reduces redundancy
- Enables question analytics (average_score, times_used)

**Question Bank Benefits:**
```sql
-- Get frequently missed questions
SELECT q.*, AVG(r.is_correct) as success_rate
FROM mcq_questions q
JOIN student_mcq_responses r ON q.id = r.mcq_question_id
GROUP BY q.id
HAVING AVG(r.is_correct) < 0.5
ORDER BY success_rate;
```

---

#### **12. Students → Fees (One-to-Many)**
```sql
student_fees.student_id → students.id

Cardinality: 1:N
Business Rule: Each student has multiple fee records (monthly)
```

**Why this design?**
- Separate record for each installment
- Tracks payment history
- Supports partial payments (amount_paid < amount_due)

**Payment States:**
```
'pending' → 'partial' → 'paid'
           ↓
        'overdue' (if past due_date)
```

---

#### **13. Points Transactions (History Log)**
```sql
points_transactions.student_id → students.id

Cardinality: 1:N
Business Rule: Immutable log of all points earned/redeemed
```

**Why this design?**
- Audit trail (who awarded points, when)
- Balance calculation via SUM(points)
- Supports disputes (can review history)

**Transaction Types:**
```
'earned'   - Performance-based (monthly)
'redeemed' - Fee discount (Feb/March)
'adjusted' - Manual correction (admin)
'expired'  - Points expiry (if implemented)
```

---

## 4. FLEXIBILITY & EXTENSIBILITY

### Design Patterns for Flexibility

#### **Pattern 1: Type Tables**
Instead of enums, use lookup tables:

```sql
-- ❌ Rigid:
ALTER TYPE exam_type ADD VALUE 'practical'; -- Requires migration!

-- ✅ Flexible:
INSERT INTO exam_types (type_code, type_name) 
VALUES ('practical', 'Practical Exam'); -- Just data!
```

**Used for:**
- roles
- content_types
- exam_types
- notification_types

---

#### **Pattern 2: JSONB Metadata**
Store flexible attributes in JSONB:

```sql
-- Example: Content with video chapters
content.metadata = {
  "chapters": [
    {"title": "Introduction", "start": 0, "end": 120},
    {"title": "Main Topic", "start": 120, "end": 600}
  ],
  "transcript_url": "https://...",
  "quality_options": ["720p", "1080p"]
}

-- Example: Exam with section-wise instructions
exams.metadata = {
  "sections": [
    {"name": "Physics", "instructions": "No negative marking"},
    {"name": "Chemistry", "instructions": "-0.25 per wrong"}
  ],
  "allowed_tools": ["calculator", "formula_sheet"]
}
```

**Benefits:**
- No migrations for new fields
- Different records can have different structures
- Easy to evolve schema

---

#### **Pattern 3: Permission JSONB**
Role permissions in flexible structure:

```sql
-- CEO role
roles.permissions = {
  "full_access": true
}

-- State Admin role (future)
roles.permissions = {
  "scope": "state",
  "state_ids": ["uuid1", "uuid2"],
  "can_view_reports": true,
  "can_manage_centers": false,
  "can_view_financials": true
}

-- Teacher role
roles.permissions = {
  "scope": "batch",
  "can_upload_content": true,
  "can_mark_attendance": true,
  "can_enter_marks": true,
  "can_view_all_marks": false
}
```

**Adding New Permission:**
```sql
-- Just update JSONB, no schema change
UPDATE roles SET permissions = permissions || '{"can_create_announcements": true}'
WHERE role_name = 'teacher';
```

---

### Extension Examples

#### **Adding State Admin Role**

**Step 1: Add Role**
```sql
INSERT INTO roles (role_name, display_name, level, permissions) VALUES
('state_admin', 'State Administrator', 2, '{
  "scope": "state",
  "can_view_centers": true,
  "can_view_reports": true,
  "can_manage_district_admins": true,
  "can_approve_budgets": true
}');
```

**Step 2: Add RLS Policy**
```sql
-- State admins can view centers in their state
CREATE POLICY "state_admin_view_centers" ON centers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN user_center_assignments uca ON u.id = uca.user_id
    JOIN districts d ON centers.district_id = d.id
    WHERE u.id = auth.uid()
    AND r.role_name = 'state_admin'
    AND d.state_id IN (
      SELECT DISTINCT d2.state_id FROM districts d2
      JOIN centers c2 ON d2.id = c2.district_id
      JOIN user_center_assignments uca2 ON c2.id = uca2.center_id
      WHERE uca2.user_id = u.id
    )
  )
);
```

**Step 3: Assign User**
```sql
-- Create state admin user
INSERT INTO users (id, role_id, full_name, email) VALUES
('uuid', (SELECT id FROM roles WHERE role_name = 'state_admin'), 'John Doe', 'john@example.com');

-- Assign to all centers in Maharashtra
INSERT INTO user_center_assignments (user_id, center_id)
SELECT 'uuid', c.id
FROM centers c
JOIN districts d ON c.district_id = d.id
JOIN states s ON d.state_id = s.id
WHERE s.state_code = 'MH';
```

**No schema changes needed!**

---

#### **Adding MCQ Test Feature**

**Already supported! Just use existing tables:**

```sql
-- 1. Create exam
INSERT INTO exams (batch_id, subject_id, exam_type_id, exam_name, total_questions)
VALUES ('batch-uuid', 'subject-uuid', 
        (SELECT id FROM exam_types WHERE type_code = 'mcq_test'),
        'Physics MCQ Mock Test', 50);

-- 2. Add sections (optional)
INSERT INTO exam_sections (exam_id, section_name, total_questions, marks_per_question)
VALUES ('exam-uuid', 'Section A: Easy', 20, 2),
       ('exam-uuid', 'Section B: Medium', 20, 3),
       ('exam-uuid', 'Section C: Hard', 10, 5);

-- 3. Add questions to exam
INSERT INTO exam_questions (exam_id, exam_section_id, mcq_question_id, question_order)
SELECT 'exam-uuid', 'section-a-uuid', id, ROW_NUMBER() OVER (ORDER BY id)
FROM mcq_questions
WHERE subject_id = 'physics-uuid' AND difficulty_level = 'easy'
LIMIT 20;

-- 4. Students submit answers
INSERT INTO student_mcq_responses (student_id, exam_id, mcq_question_id, selected_answer)
VALUES ('student-uuid', 'exam-uuid', 'question-uuid', 'B');

-- 5. Auto-calculate marks
UPDATE student_marks SET
  marks_obtained = (
    SELECT SUM(marks_awarded) FROM student_mcq_responses
    WHERE student_id = 'student-uuid' AND exam_id = 'exam-uuid'
  ),
  correct_answers = (
    SELECT COUNT(*) FROM student_mcq_responses
    WHERE student_id = 'student-uuid' AND exam_id = 'exam-uuid' AND is_correct = TRUE
  )
WHERE student_id = 'student-uuid' AND exam_id = 'exam-uuid';
```

**Benefits:**
- No new tables needed
- Reuses question bank
- Supports auto-grading
- Detailed analytics per question

---

#### **Adding Discussion Forums (Future)**

**If needed later, extend with:**

```sql
CREATE TABLE discussion_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id),
    subject_id UUID REFERENCES subjects(id),
    created_by UUID REFERENCES users(id),
    title VARCHAR(300),
    description TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE discussion_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES discussion_topics(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES discussion_posts(id), -- For replies
    posted_by UUID REFERENCES users(id),
    content TEXT,
    attachments JSONB, -- URLs to files
    likes_count INTEGER DEFAULT 0,
    is_solution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Integrates seamlessly:**
- Uses existing users, batches, subjects
- Permissions via RLS (students in batch can post)
- No impact on existing tables

---

## 5. SCALABILITY CONSIDERATIONS

### Horizontal Scalability

#### **UUID Primary Keys**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Benefits:**
- No single auto-increment bottleneck
- Can generate IDs on client-side
- Easy to shard/partition by ID range
- Merging databases is trivial

**Sharding Example (Future):**
```sql
-- Shard centers by state
-- Shard 1: MH, GJ, MP centers
-- Shard 2: DL, UP, HR centers
-- Users query their shard only
```

---

#### **Time-Series Partitioning**

For high-volume tables, add partitioning:

```sql
-- Partition attendance by month
CREATE TABLE attendance (
    id UUID,
    student_id UUID,
    attendance_date DATE,
    ...
) PARTITION BY RANGE (attendance_date);

-- Create monthly partitions
CREATE TABLE attendance_2025_01 PARTITION OF attendance
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE attendance_2025_02 PARTITION OF attendance
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-create via cron or pg_partman extension
```

**Benefits:**
- Queries scan only relevant partitions
- Old data can be archived/dropped easily
- Indexes are smaller (per partition)

**Candidate Tables:**
- attendance (by month)
- audit_logs (by month)
- content_progress (by month)
- notifications (by month)

---

#### **Read Replicas**

Supabase supports read replicas. Separate read/write:

```typescript
// Write to primary
await supabasePrimary.from('attendance').insert({...});

// Read from replica (reports, dashboards)
await supabaseReplica.from('attendance').select('*');
```

**Query Patterns:**
- **Primary:** Writes, real-time updates
- **Replica:** Reports, analytics, exports

---

### Vertical Scalability

#### **Caching Strategy**

**Level 1: Application Cache (React Query / SWR)**
```typescript
// Cache student dashboard for 5 minutes
const { data } = useQuery('student-dashboard', fetchDashboard, {
  staleTime: 5 * 60 * 1000
});
```

**Level 2: Database Cache (Materialized Views)**
```sql
-- Pre-calculated batch performance
CREATE MATERIALIZED VIEW mv_batch_performance AS
SELECT 
  b.id,
  b.batch_name,
  AVG(sm.percentage) as avg_marks,
  AVG(ats.attendance_percentage) as avg_attendance
FROM batches b
LEFT JOIN student_marks sm ON ...
LEFT JOIN attendance_summary ats ON ...
GROUP BY b.id;

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_batch_performance;
```

**Level 3: Redis (Optional Future)**
```typescript
// Cache frequently accessed data
redis.set('student-points:uuid', points, 'EX', 3600);
```

---

#### **Index Strategy**

**Already Indexed:**
- All foreign keys (automatic)
- Lookup fields (email, phone, student_code)
- Composite indexes for common queries

**Add as Needed:**
```sql
-- GIN index for JSONB search
CREATE INDEX idx_content_metadata ON content USING GIN (metadata);

-- Full-text search on content titles
CREATE INDEX idx_content_title_search ON content USING GIN (to_tsvector('english', title));

-- Partial index for active records only
CREATE INDEX idx_active_students ON students(id) WHERE is_active = TRUE;
```

---

#### **Query Optimization Patterns**

**1. Use CTEs for Complex Queries**
```sql
WITH student_stats AS (
  SELECT student_id, AVG(percentage) as avg_marks
  FROM student_marks
  GROUP BY student_id
),
attendance_stats AS (
  SELECT student_id, AVG(attendance_percentage) as avg_attendance
  FROM attendance_summary
  GROUP BY student_id
)
SELECT 
  s.full_name,
  ss.avg_marks,
  ats.avg_attendance
FROM students s
JOIN student_stats ss ON s.id = ss.student_id
JOIN attendance_stats ats ON s.id = ats.student_id;
```

**2. Pagination**
```sql
-- Always use LIMIT/OFFSET
SELECT * FROM content
WHERE batch_id = 'uuid'
ORDER BY order_index
LIMIT 20 OFFSET 0;
```

**3. Avoid SELECT ***
```sql
-- ❌ Inefficient
SELECT * FROM students;

-- ✅ Efficient
SELECT id, full_name, class_level, current_points FROM students;
```

---

## 6. INDEX STRATEGY

### Automatic Indexes

PostgreSQL automatically creates indexes on:
- Primary keys (UUID columns)
- Unique constraints (student_code, email, etc.)

### Manually Created Indexes

#### **Single-Column Indexes**
```sql
-- Foreign keys (for JOINs)
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_content_batch ON content(batch_id);

-- Filter columns
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_content_published ON content(is_published);

-- Sort columns
CREATE INDEX idx_attendance_date ON attendance(attendance_date DESC);
```

#### **Composite Indexes**
```sql
-- Queries that filter by multiple columns
CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date DESC);
CREATE INDEX idx_content_batch_subject ON content(batch_id, subject_id, order_index);

-- Covering index (includes all queried columns)
CREATE INDEX idx_student_marks_covering ON student_marks(student_id, exam_id) 
INCLUDE (marks_obtained, percentage);
```

#### **Partial Indexes**
```sql
-- Index only active records (smaller, faster)
CREATE INDEX idx_active_students ON students(id) WHERE is_active = TRUE;
CREATE INDEX idx_pending_fees ON student_fees(student_id, due_date) 
WHERE payment_status = 'pending';

-- Index scheduled notifications only
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) 
WHERE is_sent = FALSE;
```

#### **JSONB Indexes (GIN)**
```sql
-- Search within JSONB fields
CREATE INDEX idx_roles_permissions ON roles USING GIN (permissions);
CREATE INDEX idx_content_metadata ON content USING GIN (metadata);

-- Query example:
SELECT * FROM roles WHERE permissions @> '{"can_upload_content": true}';
```

---

### Index Maintenance

```sql
-- Identify unused indexes
SELECT 
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused index
DROP INDEX idx_unused_index;

-- Rebuild bloated index
REINDEX INDEX idx_name;

-- Analyze table statistics
ANALYZE students;
```

---

## 7. DATA INTEGRITY RULES

### Constraints

#### **NOT NULL Constraints**
```sql
-- Essential fields cannot be NULL
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE students ALTER COLUMN class_level SET NOT NULL;
ALTER TABLE exams ALTER COLUMN total_marks SET NOT NULL;
```

#### **CHECK Constraints**
```sql
-- Validate data ranges
ALTER TABLE students ADD CONSTRAINT chk_class_level 
CHECK (class_level BETWEEN 1 AND 12);

ALTER TABLE student_marks ADD CONSTRAINT chk_marks_range 
CHECK (marks_obtained >= 0 AND marks_obtained <= total_marks);

ALTER TABLE content ADD CONSTRAINT chk_order_index 
CHECK (order_index >= 0);

-- Validate status values
ALTER TABLE student_fees ADD CONSTRAINT chk_payment_status
CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'));
```

#### **Foreign Key Constraints with Cascades**
```sql
-- Cascade deletes (delete dependent records)
ALTER TABLE content ADD CONSTRAINT fk_content_batch
FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

-- Set NULL (preserve record but remove reference)
ALTER TABLE content ADD CONSTRAINT fk_content_uploaded_by
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- Restrict (prevent deletion if referenced)
ALTER TABLE students ADD CONSTRAINT fk_students_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
```

---

### Business Rules via Triggers

#### **Auto-Generate Student Code**
```sql
CREATE OR REPLACE FUNCTION generate_student_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_code IS NULL THEN
    NEW.student_code := 'STU' || TO_CHAR(CURRENT_DATE, 'YYYY') || 
                        LPAD(NEXTVAL('student_code_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_student_code
BEFORE INSERT ON students
FOR EACH ROW EXECUTE FUNCTION generate_student_code();
```

#### **Prevent Duplicate Attendance**
```sql
-- Already enforced by UNIQUE constraint
ALTER TABLE attendance ADD CONSTRAINT unq_attendance_date
UNIQUE (student_id, batch_id, attendance_date);

-- Additional validation trigger
CREATE OR REPLACE FUNCTION validate_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Cannot mark future attendance
  IF NEW.attendance_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot mark attendance for future dates';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_attendance
BEFORE INSERT OR UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION validate_attendance();
```

#### **Calculate Points on Mark Entry**
```sql
CREATE OR REPLACE FUNCTION calculate_monthly_points()
RETURNS TRIGGER AS $$
DECLARE
  v_attendance_pct DECIMAL;
  v_marks_avg DECIMAL;
  v_points INTEGER;
BEGIN
  -- Get attendance percentage
  SELECT AVG(attendance_percentage) INTO v_attendance_pct
  FROM attendance_summary
  WHERE student_id = NEW.student_id
  AND month_year = DATE_TRUNC('month', CURRENT_DATE);
  
  -- Get marks average
  SELECT AVG(percentage) INTO v_marks_avg
  FROM student_marks
  WHERE student_id = NEW.student_id
  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
  
  -- Calculate points: (Attendance * 0.3) + (Marks * 0.7)
  v_points := ROUND((COALESCE(v_attendance_pct, 0) * 0.3) + 
                    (COALESCE(v_marks_avg, 0) * 0.7));
  
  -- Log points transaction
  INSERT INTO points_transactions (
    student_id, transaction_type, points, balance_after,
    description, month_year
  ) VALUES (
    NEW.student_id, 'earned', v_points,
    (SELECT current_points + v_points FROM students WHERE id = NEW.student_id),
    'Monthly performance points', DATE_TRUNC('month', CURRENT_DATE)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. MIGRATION STRATEGY

### Initial Setup
```sql
-- 1. Run schema SQL file
psql -U postgres -d crack_it < database_schema.sql

-- 2. Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Insert sample data
INSERT INTO states (state_name, state_code) VALUES ...
INSERT INTO roles (role_name, display_name, level) VALUES ...
```

### Future Migrations

Create versioned migration files:

**Format:** `YYYYMMDD_HHMM_description.sql`

**Example:** `20250215_1430_add_discussion_forums.sql`
```sql
-- Migration: Add discussion forums
-- Date: 2025-02-15
-- Author: Developer

BEGIN;

CREATE TABLE discussion_topics (
  ...
);

CREATE TABLE discussion_posts (
  ...
);

-- Add RLS policies
ALTER TABLE discussion_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_view_batch_topics" ON discussion_topics ...

-- Update version
INSERT INTO schema_migrations (version, description) 
VALUES ('20250215_1430', 'Add discussion forums');

COMMIT;
```

---

## SUMMARY

### ✅ Design Goals Achieved

1. **Normalized (3NF)** - No redundancy, proper dependencies
2. **Flexible** - Easy to add roles, exam types, content types
3. **Scalable** - UUIDs, partitioning-ready, indexed properly
4. **Extensible** - JSONB metadata, type tables, clear patterns
5. **Secure** - RLS policies, audit logs, constraints

### Key Features

- **17 core entity tables**
- **13 junction tables** for many-to-many relationships
- **4 lookup tables** for flexibility
- **3 cached summary tables** for performance
- **50+ indexes** for query optimization
- **10+ database functions** for business logic
- **Comprehensive RLS policies** for security

### Next Steps

1. Review schema with client
2. Approve design decisions
3. Run setup script in Supabase
4. Populate with sample data
5. Begin API development

---

**Schema Design: COMPLETE ✅**
**Ready for Development: YES ✅**
