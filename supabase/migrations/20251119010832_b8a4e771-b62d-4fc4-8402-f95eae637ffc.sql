-- Assign admin role to admin@binkaa.com
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID for admin@binkaa.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@binkaa.com';
  
  -- If user exists, insert admin role (ignore if already exists)
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;