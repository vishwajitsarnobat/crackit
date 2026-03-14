-- ============================================
-- TEACHER-BATCH ASSIGNMENTS
-- Run this migration against your Supabase DB.
-- ============================================

CREATE TABLE teacher_batch_assignments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_id   UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject    VARCHAR(100),
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, batch_id)
);

CREATE INDEX idx_tba_user  ON teacher_batch_assignments(user_id);
CREATE INDEX idx_tba_batch ON teacher_batch_assignments(batch_id);

-- RLS
ALTER TABLE teacher_batch_assignments ENABLE ROW LEVEL SECURITY;

-- CEO: full access
CREATE POLICY "ceo_all" ON teacher_batch_assignments
    FOR ALL USING (get_my_role() = 'ceo');

-- Centre Head: manage assignments for batches in their centres
CREATE POLICY "ch_tba" ON teacher_batch_assignments
    FOR ALL USING (
        get_my_role() = 'centre_head'
        AND EXISTS (
            SELECT 1 FROM batches b
            WHERE b.id = teacher_batch_assignments.batch_id
            AND b.centre_id = ANY(get_my_centre_ids())
        )
    );

-- Teacher: read own assignments
CREATE POLICY "teacher_own_tba" ON teacher_batch_assignments
    FOR SELECT USING (
        get_my_role() = 'teacher'
        AND user_id = auth.uid()
    );
