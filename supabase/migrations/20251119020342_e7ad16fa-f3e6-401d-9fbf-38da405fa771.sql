-- Fix RLS policies for account_settings table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own settings" ON public.account_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.account_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.account_settings;

-- Allow users to view their own settings
CREATE POLICY "Users can view own settings"
ON public.account_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to create their own settings
CREATE POLICY "Users can insert own settings"
ON public.account_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own settings
CREATE POLICY "Users can update own settings"
ON public.account_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure the trigger for creating default settings exists
CREATE OR REPLACE FUNCTION public.create_default_account_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger if needed
DROP TRIGGER IF EXISTS on_profile_created_create_settings ON public.profiles;
CREATE TRIGGER on_profile_created_create_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_account_settings();