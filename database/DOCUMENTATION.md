# Crack It Coaching Institute — Database Documentation
**Version:** 1.0  
**Database:** PostgreSQL 14+ (Supabase)  
**Last Updated:** February 2026

---

## Design Principles

- Normalized to **3NF**
- **UUID primary keys** throughout for scalability and unguessability
- **RLS (Row Level Security)** on all sensitive tables — security enforced at DB level
- **JSONB fields** used for flexible/extensible data (permissions, metadata, schedules)
- **Triggers** handle computed state automatically (attendance summary, invoice status, reminders)
- **`pg_cron`** handles scheduled jobs (overdue invoice marking)

---

## Architecture Overview

```
auth.users (Supabase)
    └── users (our profile layer)
            ├── roles (what type of user)
            └── user_center_assignments (which centers)
                        └── centers
                                ├── districts → states
                                └── batches
                                        ├── batch_teachers → users
                                        ├── student_batch_enrollments → students
                                        ├── content
                                        ├── exams → student_marks
                                        ├── attendance → attendance_summary
                                        └── fee_structures → student_invoices → fee_transactions
```

---

## Sections & Tables

### Section 1 — Core Identity & Access Control

| Table | Purpose |
|-------|---------|
| `roles` | System roles with hierarchical levels and JSONB permissions |
| `users` | All users — links to `auth.users`. Single table for all roles |

**Roles (level order):** `ceo(1)` → `state_admin(2)` → `district_admin(3)` → `centre_head(4)` → `teacher/accountant(5)` → `student(6)`

> `state_admin` and `district_admin` are defined but have no RLS policies yet — reserved for future feature.

---

### Section 2 — Organizational Hierarchy

| Table | Purpose |
|-------|---------|
| `states` | Top-level geography |
| `districts` | Belongs to a state. Unique per `(state_id, district_code)` |
| `centers` | Coaching centers. Belongs to a district |
| `user_center_assignments` | Many-to-many: users ↔ centers. Supports multi-center staff |

**Delete behavior:** Deleting a state is `RESTRICT`ed if districts exist. Deleting a district is `RESTRICT`ed if centers exist.

---

### Section 3 — Academic Structure

| Table | Purpose |
|-------|---------|
| `courses` | Course offerings (IIT-JEE, NEET, Olympiad). Has `class_levels` array |
| `subjects` | PHY, CHEM, MATH, BIO, etc. |
| `course_subjects` | Many-to-many: courses ↔ subjects with weightage |
| `batches` | Physical batch within a center for a course. Has schedule JSONB |
| `batch_teachers` | Many-to-many: batches ↔ teachers, scoped per subject |

**Note:** Batches are the core operational unit. Students enroll in batches, not courses directly.

---

### Section 4 — Student Management

| Table | Purpose |
|-------|---------|
| `students` | Student profile — extends `users`. Has points tracking |
| `student_batch_enrollments` | Many-to-many: students ↔ batches with status tracking |

**Enrollment statuses:** `active`, `completed`, `withdrawn`, `suspended`  
**Trigger:** `sync_enrollment_active_status` — automatically sets `is_active = FALSE` when status becomes non-active.

---

### Section 5 — Content Management

| Table | Purpose |
|-------|---------|
| `content_types` | `video`, `pdf`, `ppt`, `notes` |
| `content` | YouTube/Drive content linked to a batch+subject. Has tags array |
| `content_progress` | Per-student completion tracking with timestamps |

**Note:** Content is scoped to batch+subject, not course — intentional design.

---

### Section 6 — Assessment System

| Table | Purpose |
|-------|---------|
| `exam_types` | `unit_test`, `monthly_test`, `final_exam`, `mock_test`, etc. |
| `exams` | Offline exams linked to batch+subject. Has `results_published` flag |
| `student_marks` | Manually entered marks per student per exam |

**Constraints:** `marks_obtained >= 0`, absent students must have `marks_obtained = 0`.  
**Trigger:** `validate_student_marks` — rejects marks exceeding `total_marks`.

---

### Section 7 — Attendance Management

| Table | Purpose |
|-------|---------|
| `attendance` | Daily attendance per student per batch |
| `attendance_summary` | Cached monthly rollup (auto-updated by trigger) |

**Valid statuses:** `present`, `absent`, `late`, `leave`  
**Generated column:** `attendance_percentage` in summary is computed from `present_days / total_days`.  
**Trigger:** `auto_update_attendance_summary` — fires on every attendance INSERT/UPDATE, keeps monthly summary in sync.  
**Trigger:** `validate_attendance_date` — rejects future dates.

---

### Section 8 — Fee Management

| Table | Purpose |
|-------|---------|
| `fee_structures` | Fee config per batch. Types: `admission`, `tuition`, `exam`, `material` |
| `student_invoices` | Individual fee records per student. Tracks due/paid/discount/late_fee |
| `fee_transactions` | Immutable payment log. Never updated or deleted |

**Invoice statuses:** `pending`, `partial`, `paid`, `overdue`  
**Trigger:** `update_invoice_status` — fires on `fee_transactions` INSERT, recalculates `amount_paid` and `payment_status`.  
**Cron job:** Runs daily at midnight — flips `pending/partial` invoices past `due_date` to `overdue`.  
**Important:** `fee_transactions` is intentionally append-only. RLS prevents updates/deletes even for accountants.

---

### Section 9 — Points & Rewards

| Table | Purpose |
|-------|---------|
| `points_rules` | Formula config for earning/redeeming points. Has `allowed_months` array |
| `points_transactions` | Immutable log of all point changes. Positive = earned, negative = redeemed |

**Function:** `calculate_student_points(student_id)` — recalculates from transaction log and updates `students.current_points`.  
**Note:** Points redeemed on invoices are stored in `student_invoices.points_redeemed` and applied as `amount_discount`.

---

### Section 10 — Communication & Notifications

| Table | Purpose |
|-------|---------|
| `notification_types` | Defines types: `fee_reminder`, `attendance_alert`, `exam_reminder`, etc. |
| `notifications` | Individual notification records per user. Has `scheduled_for` for deferred delivery |
| `meeting_requests` | Student-initiated meeting tickets. Assigned to a teacher or centre head |
| `announcements` | Notice board with `scope`: `global`, `center`, `course`, `batch` |

**Announcement scope constraint:** Enforced via `valid_scope_target` CHECK — only the matching ID column (center_id/course_id/batch_id) can be set for each scope.  
**Target roles:** `target_roles` array controls who sees each announcement.

---

### Section 11 — Device & Session Management

| Table | Purpose |
|-------|---------|
| `user_active_sessions` | One row per user. Stores `device_id`, `fcm_token`, `refresh_token`, `ip_address` |

**Note:** Single active session per user (PK = `user_id`).

---

### Section 12 — Revision Reminders

| Table | Purpose |
|-------|---------|
| `revision_reminders` | Spaced repetition reminders at 7, 21, 60 days after content completion |

**Trigger:** `create_revision_reminder` — auto-created when `content_progress.is_completed` flips to TRUE.  
**Trigger:** `advance_revision_stage` (BEFORE UPDATE) — timestamps each stage, advances `next_reminder_date`, deactivates after 60-day reminder is sent.

---

### Section 13 — Performance Analytics

| Table | Purpose |
|-------|---------|
| `student_performance_summary` | Cached monthly rollup of attendance + marks + content + points per student per batch |

**Note:** Not auto-updated by trigger — designed to be populated by a scheduled backend job or cron. Used for fast dashboard loading.

---

### Section 14 — Audit Logging

| Table | Purpose |
|-------|---------|
| `audit_logs` | Records INSERT/UPDATE/DELETE actions with old/new values, user context, IP |

**Access:** CEO only via RLS. Backend service role can always write (bypasses RLS). Designed to be append-only.

---

## Helper Functions

| Function | Purpose |
|----------|---------|
| `get_my_role()` | Returns current user's role name. `SECURITY DEFINER` — bypasses RLS to prevent recursion |
| `get_my_center_ids()` | Returns array of center UUIDs assigned to current user. `SECURITY DEFINER` — used in all centre head policies |
| `calculate_student_points(uuid)` | Recalculates points from transaction log, updates `students.current_points` |
| `update_attendance_summary(...)` | Aggregates daily attendance into monthly summary row (upsert) |

---

## RLS Summary

| Role | Access Scope |
|------|-------------|
| `ceo` | Full access to everything except cannot modify `fee_transactions` |
| `centre_head` | Full access within their assigned centers only |
| `teacher` | Can manage content, attendance, exams, marks for their assigned batches only |
| `accountant` | Can view/update invoices and INSERT transactions for their center only |
| `student` | Can only view their own data and published content/results |
| All authenticated | Can read `roles` and `points_rules` (needed for UI) |

**Key pattern:** All role checks use `get_my_role()`. All center-scoped checks use `get_my_center_ids()`. Both are `SECURITY DEFINER` to avoid RLS recursion.

---

## Key Design Decisions to Remember

1. **Students pay for batches, not courses** — `fee_structures` and `student_invoices` are linked to `batch_id`. This allows premium vs standard batches for the same course.

2. **Content is batch+subject scoped, not course scoped** — teachers upload content per batch they teach, giving flexibility for different content across batches of the same course.

3. **`fee_transactions` is immutable** — no UPDATE or DELETE allowed at any level. Corrections are handled at the business logic layer (e.g., credit notes as new transactions).

4. **`attendance_summary` is trigger-maintained** — always in sync with `attendance` table. `student_performance_summary` is NOT trigger-maintained — needs scheduled job.

5. **`is_active` + `status` on enrollments** — `status` is the source of truth. `is_active` is derived from it automatically via trigger. Always read `is_active` for queries, never `status` directly for filtering.

6. **Year-based code generation** — `student_code` (STU20260001) and `receipt_number` (REC-2026-00001) reset per year using `COUNT(*) + 1` on year-prefixed pattern. Minor race condition risk under extreme concurrency (not a real concern at this scale).

7. **`state_admin` / `district_admin` roles exist but have no RLS policies** — intentionally deferred. Adding them in future requires only new policies, no schema changes.

---

## Views

| View | Purpose |
|------|---------|
| `v_student_marks_detailed` | Marks with percentage, grade, and rank within batch |
| `v_student_dashboard` | Student summary: enrollments, attendance, marks, content, fees |
| `v_batch_performance` | Batch-level stats: students, attendance, avg marks, content, exams |
| `v_fee_collection_summary` | Center-level fee overview: monthly collected, outstanding |
| `v_teacher_workload` | Teacher's batches, students, subjects, content uploaded, exams created |
| `v_upcoming_exams` | Scheduled exams in next 30 days |
| `v_low_attendance_students` | Students below 75% attendance in last 2 months |