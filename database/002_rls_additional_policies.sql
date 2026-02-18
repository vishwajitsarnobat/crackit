-- Migration: 002_rls_additional_policies.sql
-- Purpose: Enable RLS and add policies for previously unprotected sensitive tables
-- Tables covered: user_center_assignments, batch_teachers, user_active_sessions,
--                 audit_logs, fee_structures, roles, points_rules

-- Risk: Core trust anchor for all center-scoped policies.
--       Without this, users can self-assign to any center.
ALTER TABLE user_center_assignments ENABLE ROW LEVEL SECURITY;

-- CEO: full access
CREATE POLICY "ceo_full_access_uca" ON user_center_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );

-- Centre heads: can manage assignments within their own center
CREATE POLICY "centre_head_manage_uca" ON user_center_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments my_uca
            JOIN users u ON my_uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'centre_head'
            AND my_uca.center_id = user_center_assignments.center_id
            AND my_uca.is_active = TRUE
        )
    );

-- All users: can view their own assignment(s)
CREATE POLICY "user_view_own_uca" ON user_center_assignments
    FOR SELECT
    USING (user_id = auth.uid());

-- Risk: Teacher RLS on content, attendance, exams, and marks
--       all trust this table. Free writes = privilege escalation.

ALTER TABLE batch_teachers ENABLE ROW LEVEL SECURITY;

-- CEO: full access
CREATE POLICY "ceo_full_access_batch_teachers" ON batch_teachers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );

-- Centre heads: can manage teacher assignments for batches in their center
CREATE POLICY "centre_head_manage_batch_teachers" ON batch_teachers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            JOIN batches b ON batch_teachers.batch_id = b.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'centre_head'
            AND uca.center_id = b.center_id
            AND uca.is_active = TRUE
        )
    );

-- Teachers: can only view their own batch assignments
CREATE POLICY "teacher_view_own_batch_assignments" ON batch_teachers
    FOR SELECT
    USING (user_id = auth.uid());


-- Risk: Contains FCM tokens, refresh tokens, and IP addresses.
ALTER TABLE user_active_sessions ENABLE ROW LEVEL SECURITY;

-- Each user: full control over their own session row only
CREATE POLICY "user_manage_own_session" ON user_active_sessions
    FOR ALL
    USING (user_id = auth.uid());

-- CEO: read-only view of all sessions (monitoring/security)
CREATE POLICY "ceo_view_all_sessions" ON user_active_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );


-- Risk: Security audit trail — must be append-only and
--       invisible to all non-CEO roles.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- CEO: full access (read + write for system-level inserts)
CREATE POLICY "ceo_full_access_audit_logs" ON audit_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );

-- All other roles: no policy = no access (intentional by design)

-- Risk: Financial configuration — students or teachers
--       should never be able to read or tamper with fee amounts.
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;

-- CEO: full access
CREATE POLICY "ceo_full_access_fee_structures" ON fee_structures
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );

-- Centre heads: full management of fee structures in their center
CREATE POLICY "centre_head_manage_fee_structures" ON fee_structures
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'centre_head'
            AND uca.center_id = fee_structures.center_id
            AND uca.is_active = TRUE
        )
    );

-- Accountants: read-only within their assigned center
CREATE POLICY "accountant_view_fee_structures" ON fee_structures
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_center_assignments uca
            JOIN users u ON uca.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.role_name = 'accountant'
            AND uca.center_id = fee_structures.center_id
            AND uca.is_active = TRUE
        )
    );


-- Risk: Writable roles table allows privilege escalation —
--       a user could modify their own role's permissions JSONB.
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- CEO: full access (only one who can manage role definitions)
CREATE POLICY "ceo_full_access_roles" ON roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );

-- All authenticated users: read-only (needed for role name lookups in other policies)
CREATE POLICY "all_users_view_roles" ON roles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Risk: Controls how points are calculated and redeemed.
--       Writable by anyone without RLS.
ALTER TABLE points_rules ENABLE ROW LEVEL SECURITY;

-- CEO: full access
CREATE POLICY "ceo_full_access_points_rules" ON points_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name = 'ceo'
        )
    );

-- All authenticated users: read-only (needed for points calculation logic)
CREATE POLICY "all_users_view_points_rules" ON points_rules
    FOR SELECT
    USING (auth.uid() IS NOT NULL);