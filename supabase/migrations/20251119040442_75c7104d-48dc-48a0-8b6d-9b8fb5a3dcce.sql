-- Enable full replica identity for realtime updates
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;