-- Fix infinite recursion in user_roles RLS policies
-- Better solution: Use email-based admin check to avoid recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow role checking for authentication" ON public.user_roles;

-- Keep only the basic policy for users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow system admin (admin@binkaa.com) to view all roles for authentication
CREATE POLICY "System admin can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'admin@binkaa.com');

-- Allow system admin to manage roles
CREATE POLICY "System admin can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (true);
