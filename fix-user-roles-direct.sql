-- Fix user_roles RLS policies directly (run this in Supabase SQL Editor)
-- This fixes the infinite recursion issue

-- Step 1: Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;

-- Step 2: Create new, simple policies

-- Users can view their own roles
CREATE POLICY "users_can_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own roles
CREATE POLICY "users_can_insert_own_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin (by email) can view all roles - NO RECURSION
CREATE POLICY "admin_can_view_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Admin (by email) can manage all roles - NO RECURSION
CREATE POLICY "admin_can_manage_all_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Step 3: Ensure admin role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@binkaa.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Ensure all users have default 'user' role
INSERT INTO user_roles (user_id, role)
SELECT id, 'user'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.users.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Test the policies work
-- SELECT 'RLS Policies fixed successfully' as result;
