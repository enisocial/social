-- Add new fields to profiles table for complete Facebook-like profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hometown TEXT,
ADD COLUMN IF NOT EXISTS current_city TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS public_email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS relationship_status TEXT,
ADD COLUMN IF NOT EXISTS work TEXT,
ADD COLUMN IF NOT EXISTS education TEXT;

-- Add privacy settings to account_settings for granular control
ALTER TABLE public.account_settings
ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_birthdate BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_relationship BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_work BOOLEAN DEFAULT true;