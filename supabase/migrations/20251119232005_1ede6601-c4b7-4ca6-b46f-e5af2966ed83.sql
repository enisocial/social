-- Enable realtime for post_reactions
ALTER TABLE post_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE post_reactions;

-- Create notification trigger for post reactions
CREATE OR REPLACE FUNCTION create_post_reaction_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id UUID;
  reactor_name TEXT;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;
  
  -- Get reactor's name
  SELECT name INTO reactor_name FROM profiles WHERE id = NEW.user_id;
  
  -- Don't create notification if user reacts to their own post
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, metadata)
    VALUES (
      post_owner_id,
      'like',
      jsonb_build_object(
        'liker_id', NEW.user_id,
        'liker_name', reactor_name,
        'post_id', NEW.post_id,
        'reaction_type', NEW.reaction_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for post reactions
DROP TRIGGER IF EXISTS post_reaction_notification_trigger ON post_reactions;
CREATE TRIGGER post_reaction_notification_trigger
AFTER INSERT ON post_reactions
FOR EACH ROW
EXECUTE FUNCTION create_post_reaction_notification();