-- Adds the "self_update" policy to the users table
-- This allows each user to update their own row (used by the profile page)
-- Allowed fields (full_name, phone, profile_photo_url) are enforced by the API,
-- but this policy is required for the update to succeed at the DB level.

CREATE POLICY "self_update" ON users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
