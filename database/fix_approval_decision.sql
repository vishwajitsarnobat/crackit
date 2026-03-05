CREATE OR REPLACE FUNCTION process_approval_decision(
    p_approval_id UUID,
    p_action TEXT,
    p_reviewer_id UUID,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_request user_approval_requests%ROWTYPE;
BEGIN
    IF p_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid action: %', p_action;
    END IF;

    SELECT * INTO v_request
    FROM user_approval_requests
    WHERE id = p_approval_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found.';
    END IF;

    IF v_request.status <> 'pending' THEN
        RAISE EXCEPTION 'Approval request already processed.';
    END IF;

    IF p_action = 'approve' THEN
        UPDATE user_approval_requests
        SET status = 'approved',
            reviewed_by = p_reviewer_id,
            reviewed_at = NOW(),
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE id = p_approval_id;

        UPDATE users
        SET is_active = TRUE,
            updated_at = NOW()
        WHERE id = v_request.user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User not found for approval request.';
        END IF;

        IF v_request.centre_id IS NOT NULL THEN
            INSERT INTO user_centre_assignments (
                user_id,
                centre_id,
                is_active,
                is_primary
            )
            VALUES (
                v_request.user_id,
                v_request.centre_id,
                TRUE,
                TRUE
            )
            ON CONFLICT (user_id, centre_id) DO UPDATE
            SET is_active = TRUE,
                is_primary = TRUE;
        END IF;
    ELSE
        UPDATE user_approval_requests
        SET status = 'rejected',
            reviewed_by = p_reviewer_id,
            reviewed_at = NOW(),
            rejection_reason = NULLIF(BTRIM(COALESCE(p_rejection_reason, '')), ''),
            updated_at = NOW()
        WHERE id = p_approval_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
