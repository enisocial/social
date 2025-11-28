-- Migration: Setup admin role for admin@binkaa.com
-- Date: 2025-11-28
-- Description: Assign admin role to the admin user

-- First, ensure the user_roles table exists and has proper structure
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the admin user by email
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@binkaa.com'
    LIMIT 1;

    -- If admin user exists, ensure they have admin role
    IF admin_user_id IS NOT NULL THEN
        -- Remove any existing admin role for this user (to avoid duplicates)
        DELETE FROM user_roles
        WHERE user_id = admin_user_id AND role = 'admin';

        -- Insert admin role
        INSERT INTO user_roles (user_id, role)
        VALUES (admin_user_id, 'admin');

        RAISE NOTICE 'Admin role assigned to user: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Admin user admin@binkaa.com not found in auth.users';
    END IF;
END $$;

-- Verify the admin role was assigned
SELECT
    u.email,
    ur.role,
    ur.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@binkaa.com' AND ur.role = 'admin';
