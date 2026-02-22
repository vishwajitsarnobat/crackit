-- Trigger: Notify CEO on New Enrollment Request
-- This should be run in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION notify_ceo_on_enrollment_request()
RETURNS TRIGGER AS $$
DECLARE
    ceo_role_id UUID;
    v_notification_type_id UUID;
BEGIN
    -- 1. Get the ID for the 'ceo' role
    SELECT id INTO ceo_role_id FROM roles WHERE role_name = 'ceo' LIMIT 1;
    
    -- 2. Get/Create notification type for enrollment
    -- (Assuming type_code 'enrollment_request' exists or we use 'announcement')
    SELECT id INTO v_notification_type_id FROM notification_types WHERE type_code = 'announcement' LIMIT 1;

    -- 3. Notify all CEO accounts
    INSERT INTO notifications (
        user_id,
        notification_type_id,
        title,
        message,
        action_url,
        reference_type,
        reference_id
    )
    SELECT 
        u.id, 
        v_notification_type_id,
        'New Enrollment Request',
        'Staff member has requested access as: ' || NEW.requested_role,
        '/admin/approvals',
        'enrollment_request',
        NEW.id
    FROM users u
    WHERE u.role_id = ceo_role_id AND u.is_active = TRUE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to user_approval_requests
DROP TRIGGER IF EXISTS tr_notify_ceo_on_enrollment ON user_approval_requests;
CREATE TRIGGER tr_notify_ceo_on_enrollment
AFTER INSERT ON user_approval_requests
FOR EACH ROW
EXECUTE FUNCTION notify_ceo_on_enrollment_request();
