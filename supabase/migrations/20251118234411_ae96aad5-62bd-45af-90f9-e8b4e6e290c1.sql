-- Enable realtime for friend_requests table
ALTER TABLE friend_requests REPLICA IDENTITY FULL;

-- Add friend_requests to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;