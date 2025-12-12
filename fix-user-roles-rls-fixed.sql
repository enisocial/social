-- Fix user_roles RLS policies with proper authentication
-- Drop all existing problematic policies first

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "System admin can manage roles" ON public.user_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own roles (for default user role assignment)
CREATE POLICY "Users can insert their own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'user');

-- Allow system admin to view all roles (using email check to avoid recursion)
CREATE POLICY "System admin can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Allow system admin to manage all roles
CREATE POLICY "System admin can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com')
WITH CHECK (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Ensure admin role exists for admin@binkaa.com
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@binkaa.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.users.id AND role = 'admin'
);
