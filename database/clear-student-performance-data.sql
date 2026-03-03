-- Clears student academic/performance data.
-- WARNING: This is destructive for student-side records.
-- Run only in development/testing.

BEGIN;

-- Remove marks first, then exams (performance records).
DELETE FROM student_marks;
DELETE FROM exams;

-- Remove enrollments and students.
-- Deleting students cascades to related tables that reference student_id.
DELETE FROM student_batch_enrollments;
DELETE FROM students;

-- Remove all batches as requested.
-- (This also clears dependent attendance/content/invoice data through cascades.)
DELETE FROM batches;

COMMIT;
