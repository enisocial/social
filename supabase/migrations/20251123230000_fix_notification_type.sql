-- Fix notification type enum to include 'friend_request'
-- This migration ensures the enum has the correct value required by the application

DO $$
BEGIN
  -- Check if 'friend_request' value exists in notification_type enum
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'friend_request' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'friend_request';
  END IF;
END$$;

-- Update the trigger function to use the correct notification type
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, metadata)
    VALUES (
      NEW.receiver_id,
      'friend_request', -- Changed from 'follow' to 'friend_request'
      jsonb_build_object(
        'follower_id', NEW.sender_id,
        'request_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;
