# Crack It Coaching Institute - Database Documentation
**Version:** 3.6 (Mar 2026)
**Database:** PostgreSQL 14+ (Supabase)
**Tables:** 26 | **Views:** 0 | **Triggers:** 35

## Deliverables

- `database/database_schema.sql` - full schema plus essential bootstrap seed rows
- `database/heavy_data_seed.sql` - realistic non-production load data for centres, users, batches, enrollments, attendance, exams, fees, salaries, expenses, approvals, and rewards
- `database/DOCUMENTATION.md` - schema and lifecycle reference

---

## Design Principles

- **3NF** - no redundant data stored; summaries computed at runtime from base tables
- **UUID primary keys** - unguessable, scalable
- **RLS enforced at DB level** - helper functions (`get_my_role`, `get_my_centre_ids`, `get_my_teacher_batch_ids`) power scoped policies
- **Triggers handle only required computed state** - receipt numbers, student codes, invoice/salary status, append-only protection, attendance/marks validation
- **No scope-drift tables** - removed `content_progress`, `revision_reminders`, `meeting_requests`, and `student_of_the_month` because they are outside the final requirement set
- **No notifications table** - Firebase handles push delivery; app queries source tables for badge counts
- **No attendance_summary table** - queried at runtime; acceptable at this scale
- **Single device login** - `user_active_sessions` is 1 row per user (PK = user_id)

---

## Architecture Overview

```
auth.users (Supabase managed)
    └── users
            ├── roles
            ├── user_active_sessions
            ├── user_approval_requests
            └── user_centre_assignments
                        └── centres
                                └── batches
                                        ├── teacher_batch_assignments
                                        ├── student_batch_enrollments → students
                                        ├── attendance
                                        ├── content
                                        └── exams → student_marks

students
    ├── student_invoices → fee_transactions
    │                    └── invoice_reward_allocations
    └── points_transactions → reward_rule_awards

centres
    ├── centre_expenses
    ├── staff_salaries → staff_salary_payments
    └── staff_attendance

reward_rules
    ├── reward_rule_executions
    └── reward_rule_awards → points_transactions
```

---

## Section-by-Section Reference

---

### Section 1 - Identity & Roles

| Table | Purpose |
|-------|---------|
| `roles` | 5 roles: ceo, centre_head, teacher, accountant, student |
| `users` | All users. `is_active = FALSE` until approved. `profile_photo_url` here |
| `user_active_sessions` | 1 row per user. Stores `fcm_token` for Firebase push (absent alerts etc.) |
| `user_approval_requests` | Approval inbox. CEO approves centre_head/accountant. Centre head approves teacher/student |

**Role hierarchy (level):** `ceo(1)` → `centre_head(2)` → `teacher(3)` → `accountant(4)` → `student(5)`

**Approval flow:**
```
User registers → users.is_active = FALSE
             → user_approval_requests row created (status = pending)
             → Approver sets status = approved
             → Backend flips users.is_active = TRUE
```

**Partial unique index** on `user_approval_requests(user_id) WHERE status = 'pending'` - prevents duplicate pending requests but allows re-application after rejection.

**`get_my_role()`** - SECURITY DEFINER, gates on `is_active = TRUE`. Returns NULL for unapproved users, blocking them from every RLS policy silently.

---

### Section 2 - Centres

| Table | Purpose |
|-------|---------|
| `centres` | Coaching centres. No states/districts - not required by any feature |
| `user_centre_assignments` | Many-to-many: staff ↔ centres. Supports multi-centre assignments |

**`get_my_centre_ids()`** - SECURITY DEFINER, returns `UUID[]` of centres assigned to current user. Used in all centre-scoped RLS policies to avoid recursive joins.

---

### Section 3 - Academic Structure

| Table | Purpose |
|-------|---------|
| `batches` | Core operational unit. Belongs to a centre. Students and teachers are attached directly to batches |
| `teacher_batch_assignments` | Teacher ↔ batch assignment with subject, salary source amount, and assignment lifecycle |

**Delete behavior:** Deleting a centre cascades to batches and then to dependent academic/financial data.

---

### Section 4 - Students & Admission

| Table | Purpose |
|-------|---------|
| `students` | Student profile extending `users`. Has `admission_form_data JSONB` for PDF generation |
| `student_batch_enrollments` | Student ↔ batch enrollment with `monthly_fee`, `withdrawn_at`, and active-only uniqueness |

**Key fields on `students`:**
- `declaration_accepted` + `declaration_accepted_at` - mandatory checkbox before form submission
- `admission_form_data` - full form payload; app generates downloadable PDF from this JSONB
- `current_points` - live balance synchronized from immutable points ledger inserts
- `student_code` - auto-generated by trigger: `STU20260001`, resets per year

**Trigger:** `trg_set_withdrawn_at` - stamps `withdrawn_at` when status changes to `withdrawn`.

---

### Section 5 - Financial Management

| Table | Purpose |
|-------|---------|
| `student_invoices` | One invoice per student per batch per month. Contains both `monthly_fee` and `amount_due` |
| `fee_transactions` | Immutable payment log. Never updated or deleted |
| `invoice_reward_allocations` | Immutable invoice-level reward allocation log used to apply student-level redemptions oldest-first |
| `centre_expenses` | Monthly expenses per centre per category |
| `staff_salaries` | Generated monthly salary snapshot per teacher per centre |
| `staff_salary_payments` | Immutable salary payment log against generated salary rows |

**No `fee_structures` table** - fees are attached to active student enrollments through `student_batch_enrollments.monthly_fee`.

**Key distinction on `student_invoices`:**
- `monthly_fee` - the full standard recurring amount stored on the enrollment and copied onto invoices.
- `amount_due` - what is actually owed this specific month. Pro-rated (smaller) for month 1. Equal to `monthly_fee` for all subsequent months.
- `amount_discount` - reward point redemptions applied against this invoice.

**Invoice lifecycle:**
```
Admission
  → Centre head creates enrollment
  → Enrollment stores monthly_fee = 1000
  → System creates first invoice automatically with amount_due = prorated first-month amount

1st of every following month - cron fires at 01:00
  → Reads monthly_fee from active enrollments
  → Includes only enrollments whose `enrollment_date` falls on or before the target month end
  → Creates new invoice: amount_due = monthly_fee (full, no pro-rating)
  → Skips if invoice for this month already exists (ON CONFLICT DO NOTHING)

Centre head wants to change future fee behavior
  → Updates enrollment monthly_fee to 1200
  → Future generated invoices read monthly_fee = 1200
  → New invoice: amount_due = 1200

Student pays → fee_transactions INSERT
  → trg_fee_payment fires
  → Re-sums all transactions for the invoice
  → Updates amount_paid and payment_status

Reward redemption
  → Creates immutable points transaction for net redemption or reversal
  → Writes immutable `invoice_reward_allocations` rows oldest-first across pending invoices
  → Invoice discounts are synchronized from allocation rows
```

**`trg_fee_payment`** re-sums all `fee_transactions` for the invoice and derives `amount_paid` + `payment_status` cleanly.

**`fee_transactions` immutability** - no role can UPDATE or DELETE. Corrections are handled as new transactions.

**Reward redemption allocation model:**
- reward points are redeemed at the student level, not invoice by invoice
- allocation is applied oldest-first across pending invoices within the user's accessible centre scope
- invoice-level discount remains visible through `student_invoices.amount_discount`, but its source of truth is the immutable `invoice_reward_allocations` ledger
- database validation now blocks invoice reward allocations that would exceed outstanding invoice amount or reverse below zero
- positive allocation rows must link to `redeemed` transactions and negative allocation rows must link to `redeemed_reversal` transactions when a points transaction is attached

**Salary lifecycle:**
- `teacher_batch_assignments` is the salary source of truth
- `generate_staff_salaries_for_month(...)` creates monthly salary snapshots
- assignment insert, update, and unassign events now resync affected current/future salary months automatically
- `staff_salary_payments` is immutable
- triggers keep `staff_salaries.amount_paid`, `status`, and `payment_date` in sync

**Enrollment and assignment safety rules:**
- students can only be enrolled into batches belonging to centres they are actively assigned to
- teachers can only be assigned to batches belonging to centres they are actively assigned to
- inactive users cannot be assigned or enrolled
- future-dated enrollments and assignments cannot be withdrawn or unassigned before their effective start date
- active enrollments support controlled monthly fee updates, and pending invoice amounts are resynced safely
- active teacher assignments support controlled salary/subject/start-date updates, with start-date changes blocked once affected salary months have payment history
- centre heads can update student profile identity/guardian fields and teacher profile identity fields within their scoped centres
- out-of-scope centre and batch filters are rejected in enrollment and teacher-management APIs instead of being silently ignored
- recurring fee or salary source values cannot be changed once affected invoice/salary history already carries payments or reward allocations

**Teacher task API safety rules:**
- teacher task batch selectors now return only actively assigned batches
- exam creation supports future-dated exams, but mark entry remains scoped to the teacher's assigned batches
- staff attendance marking is restricted to teachers who are actively teaching at least one batch in the selected centre
- staff attendance rosters support optional batch filtering so centre heads can narrow teacher cards to a specific batch in the selected centre
- content library accepts only `video` and `document` types with http/https links

**Finance task API safety rules:**
- fees, salaries, and expenses all enforce centre-scoped access before returning detail records
- fee transactions, salary payments, and expense entries now expose recorder names for better audit visibility
- invoice transaction history cannot be fetched outside the requester's allowed centre scope

**Approval review rules:**
- CEO can view and review all approval request types across centres
- centre heads can view and review only teacher and student requests for their assigned centres

**Financial analytics scope rules:**
- CEO can switch across all active centres
- accountants and centre heads can query only centres they are actively assigned to
- out-of-scope centre filters are rejected at the API layer before analytics data is returned

**Monthly automation:**
- `/api/internal/financials/monthly` generates the target month's student invoices and staff salaries
- `/api/internal/rewards/monthly` runs after financial generation so timely-fee reward execution can rely on the current invoice set
- both internal routes require `CRON_SECRET`

**Expense categories (exact per requirements):** `rent`, `electricity_bill`, `stationery`, `internet_bill`, `miscellaneous`

**Receipt number** auto-generated: `REC-2026-00001`, resets per year.

---

### Section 6 - Attendance

| Table | Purpose |
|-------|---------|
| `attendance` | Student attendance. Radio button: `present` / `absent` only |
| `staff_attendance` | Teacher/centre_head attendance with `in_time`, `out_time` |

**Who marks what:**
- Teacher marks student attendance
- Centre Head marks teacher attendance
- CEO marks centre_head attendance

**`staff_attendance.status`** has three values:
- `present` - arrived on time, left on time
- `absent` - did not come
- `partial` - came late or left early; exact times captured in `in_time` / `out_time`

**`staff_attendance` UNIQUE** on `(user_id, centre_id, attendance_date)` - centre_id included because a teacher assigned to two centres can have entries for both on the same date.

**Trigger:** `validate_attendance_date` - fires on both tables, rejects future dates.

**No `attendance_summary` table** - attendance percentage is queried at runtime directly from source tables.

---

### Section 7 - Content

| Table | Purpose |
|-------|---------|
| `content` | Video or document links per batch |

---

### Section 8 - Assessments

| Table | Purpose |
|-------|---------|
| `exams` | Offline exams per batch. `results_published` flag controls student visibility. `subject` enables subject-wise analysis |
| `student_marks` | Manually entered marks. `is_absent = TRUE` forces `marks_obtained = 0` |

**`exams.subject`** - Optional `VARCHAR(100)`. Enables subject-wise filtering and breakdown in analytics.

**Trigger:** `validate_marks` - rejects marks exceeding `total_marks`.

---

### Section 9 - Rewards

| Table | Purpose |
|-------|---------|
| `reward_rules` | CEO-defined automatic reward rules for attendance, perfect attendance, attendance streaks, performance, and timely fee payment |
| `points_transactions` | Immutable points ledger. Positive = earned, negative = redeemed/deducted |
| `reward_rule_awards` | Deduplicated execution log for automatic reward awards |
| `reward_rule_executions` | Auditable rule-run history with eligible/awarded/skipped/failed counts |

**Reward reasons (CHECK constraint):**
- `rule_award`
- `manual_adjustment`
- `manual_deduction`
- `redeemed`
- `redeemed_reversal`

Automatic attendance, performance, and timely-fee awards now all normalize to `rule_award` and are distinguished by `reward_rule_id`, `reference_id`, and linked `reward_rule_awards.metadata`.

**`students.current_points`** is synchronized by DB trigger on immutable `points_transactions` inserts.

**Automatic rule execution model:**
- rule definition lives in `reward_rules`
- every run writes a `reward_rule_executions` record for auditability
- one execution inserts a `points_transactions` row plus a linked `reward_rule_awards` row
- `award_key` prevents duplicate re-awards for the same rule/student/month tuple
- timely fee rewards are based on the invoice becoming fully settled by the configured cutoff date, derived from immutable `fee_transactions`
- app-side monthly automation can call the internal rewards cron endpoint, which executes all active reward rules for the previous month
- reward rule management reads recent execution history directly from `reward_rule_executions` so CEOs can review recent run outcomes per rule
- a preview endpoint can return eligible student counts and sample rows before a rule is executed manually
- a dedicated execution-history endpoint supports filtered retrieval by rule, month, status, and limit for audit/review flows

**Reward criteria validation model:**
- attendance rules require only `minimum_percentage`
- perfect attendance rules require `minimum_days`
- attendance streak rules require `minimum_streak_days`
- performance rules require `minimum_percentage` and allow an optional `subject`
- timely fee payment rules require `due_day_of_month` and `require_full_payment_by_due_date`

---

**No notifications table.** Push notifications delivered via Firebase using `fcm_token` from `user_active_sessions`. In-app counts (pending fees, pending approvals) queried directly from source tables.

---

## Reporting Strategy

All reports/analytics are computed at runtime from source tables in application queries. No SQL views are maintained in schema.

---

## RLS Summary

| Role | Scope |
|------|-------|
| `ceo` | Full access to all tables. `fee_transactions`: SELECT only |
| `centre_head` | All data within assigned centres. Manages approvals for teachers/students |
| `accountant` | Invoices, transactions (INSERT+SELECT only), expenses, salaries for assigned centres |
| `teacher` | Attendance, content, exams, marks for batches in assigned centres |
| `student` | Own profile, own enrollments, own invoices, published content, published exam results, own points |
| All users | Own session (`user_active_sessions`), own centre assignments (SELECT), own approval request status |

---

## Triggers Summary

| Trigger | Table | Fires | Does |
|---------|-------|-------|------|
| `trg_*_updated_at` | selected mutable tables | BEFORE UPDATE | Stamps `updated_at = NOW()` |
| `trg_generate_student_code` | `students` | BEFORE INSERT | Generates `STU20260001` |
| `trg_generate_receipt_number` | `fee_transactions` | BEFORE INSERT | Generates `REC-2026-00001` |
| `trg_sync_student_points_on_insert` | `points_transactions` | AFTER INSERT | Updates `students.current_points` |
| `trg_prevent_points_transaction_update/delete` | `points_transactions` | BEFORE UPDATE/DELETE | Enforces immutable reward ledger |
| `trg_prevent_centre_expense_update/delete` | `centre_expenses` | BEFORE UPDATE/DELETE | Enforces append-only expense log |
| `trg_fee_payment` | `fee_transactions` | AFTER INSERT | Recalculates `amount_paid` + `payment_status` on invoice |
| `trg_prevent_fee_transaction_update/delete` | `fee_transactions` | BEFORE UPDATE/DELETE | Enforces immutable fee ledger |
| `trg_validate_invoice_reward_allocation` | `invoice_reward_allocations` | BEFORE INSERT | Blocks over-allocation and invalid reversal linkage |
| `trg_prevent_invoice_reward_allocation_update/delete` | `invoice_reward_allocations` | BEFORE UPDATE/DELETE | Enforces immutable reward allocation ledger |
| `trg_sync_invoice_discount_from_allocations` | `invoice_reward_allocations` | AFTER INSERT | Rebuilds invoice discount from allocation ledger |
| `trg_create_initial_student_invoice` | `student_batch_enrollments` | AFTER INSERT | Creates first prorated invoice automatically in DB |
| `trg_validate_student_attendance_date` | `attendance` | BEFORE INSERT/UPDATE | Rejects future dates |
| `trg_validate_staff_attendance_date` | `staff_attendance` | BEFORE INSERT/UPDATE | Rejects future dates |
| `trg_validate_marks` | `student_marks` | BEFORE INSERT/UPDATE | Rejects marks > total_marks |
| `trg_set_withdrawn_at` | `student_batch_enrollments` | BEFORE UPDATE | Stamps `withdrawn_at` |
| `trg_recalculate_staff_salary_totals` | `staff_salary_payments` | AFTER INSERT/UPDATE/DELETE | Syncs `staff_salaries` totals and status |
| `trg_prevent_staff_salary_payment_update/delete` | `staff_salary_payments` | BEFORE UPDATE/DELETE | Enforces immutable salary payment ledger |
| `trg_sync_staff_salary_on_assignment_change` | `teacher_batch_assignments` | AFTER INSERT/UPDATE/DELETE | Resyncs affected salary months for assignment lifecycle changes |

---

## Cron Jobs

| Job | Schedule | Does |
|-----|----------|------|
| `create-monthly-invoices` | 1st of every month at 01:00 | For every active enrollment, creates next month's invoice using `student_batch_enrollments.monthly_fee` |
| `create-monthly-staff-salaries` | 1st of every month at 01:05 | Creates monthly staff salary snapshots from active teacher assignments |

---

## Key Design Decisions

1. **No `fee_structures` table** - fees are not fixed per batch. `monthly_fee` lives on active student enrollments and is copied into generated invoices.

2. **`monthly_fee` vs `amount_due` on invoices** - `monthly_fee` is the standard recurring amount. `amount_due` is what's actually owed for that specific month - pro-rated (smaller) for month 1, equal to `monthly_fee` thereafter. Keeping them separate allows the cron to always use the correct full amount while month 1 stays accurately pro-rated.

3. **`fee_transactions` is append-only** - financial integrity. Corrections handled as new transactions (credit entries). No role can UPDATE or DELETE.

4. **`is_active = FALSE` default on users** - entire approval flow relies on this single flag. `get_my_role()` gates on it, so unapproved users are silently blocked from all RLS policies without any extra checks.

5. **No summary/cache tables** - all reports are computed at runtime from source tables. Keeps the schema lean and avoids cache-sync complexity.

6. **No notifications table** - Firebase owns push delivery. In-app notification badges query source tables directly (count of pending invoices, pending approvals etc.). Eliminates a whole table plus scheduling complexity.

7. **Parent and student share one account** - single device login via `user_active_sessions`. FCM token on that session receives both student-facing and parent-facing push notifications.

8. **`staff_attendance.status = 'partial'`** - late arrival and early departure are both represented by a single `partial` status. The exact detail is captured in `in_time` and `out_time`. Two separate statuses would add no information beyond what the times already tell you.

9. **`withdrawn_at` on enrollments** - needed to calculate dropout rate. Without it, you only know a student withdrew, not when.

10. **`get_my_centre_ids()` returns `UUID[]`** - used with `= ANY(...)` instead of `EXISTS` subqueries into `user_centre_assignments`. This avoids recursive RLS evaluation on that table.

11. **`points_transactions.reason` is a CHECK constraint** - keeps reward logic auditable and controlled by schema.

12. **`reward_rule_awards.award_key` is UNIQUE** - automatic rules can be safely re-run without double-awarding points.

13. **Schema scope now tracks only required product domains** - unsupported reminder, meeting, and student-award tables were removed to keep the schema in bijection with `requirements.md`.
