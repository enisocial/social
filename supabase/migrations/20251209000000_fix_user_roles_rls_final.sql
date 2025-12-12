-- Fix user_roles RLS policies with proper authentication
-- This migration fixes the infinite recursion issue by using direct email checks

-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Create simple, non-recursive policies

-- Policy 1: Users can view their own roles
CREATE POLICY "users_can_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own roles (for default user role assignment)
CREATE POLICY "users_can_insert_own_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Admin (by email) can view all roles
CREATE POLICY "admin_can_view_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@binkaa.com'
  )
);

-- Policy 4: Admin (by email) can manage all roles
CREATE POLICY "admin_can_manage_all_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@binkaa.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@binkaa.com'
  )
);

-- Ensure admin role exists for admin@binkaa.com
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@binkaa.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure all users have a default 'user' role
INSERT INTO user_roles (user_id, role)
SELECT id, 'user'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.users.id
)
ON CONFLICT (user_id, role) DO NOTHING;
