-- Enable full replica identity for messages table to ensure all data is sent via realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;