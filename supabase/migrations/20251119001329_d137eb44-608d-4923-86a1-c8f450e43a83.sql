-- Add edit history columns to posts
ALTER TABLE public.posts
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN edit_history JSONB DEFAULT '[]'::jsonb;

-- Add edit history columns to comments
ALTER TABLE public.comments
ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN edit_history JSONB DEFAULT '[]'::jsonb;

-- Create profile completeness view helper function
CREATE OR REPLACE FUNCTION public.get_profile_completeness(user_id_param UUID)
RETURNS TABLE(
  completeness_score INTEGER,
  missing_fields TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
  missing TEXT[] := '{}';
  total_fields INTEGER := 11;
  filled_fields INTEGER := 0;
BEGIN
  SELECT * INTO profile_record FROM profiles WHERE id = user_id_param;
  
  IF profile_record.avatar_url IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'avatar_url'); END IF;
  IF profile_record.cover_photo_url IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'cover_photo_url'); END IF;
  IF profile_record.bio IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'bio'); END IF;
  IF profile_record.work IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'work'); END IF;
  IF profile_record.education IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'education'); END IF;
  IF profile_record.current_city IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'current_city'); END IF;
  IF profile_record.hometown IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'hometown'); END IF;
  IF profile_record.relationship_status IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'relationship_status'); END IF;
  IF profile_record.birthdate IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'birthdate'); END IF;
  IF profile_record.website IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'website'); END IF;
  IF profile_record.phone IS NOT NULL THEN filled_fields := filled_fields + 1; ELSE missing := array_append(missing, 'phone'); END IF;
  
  RETURN QUERY SELECT 
    ROUND((filled_fields::NUMERIC / total_fields::NUMERIC) * 100)::INTEGER,
    missing;
END;
$$;