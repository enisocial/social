-- Add missing updated_at column to user_presence table
-- This fixes the schema cache issue causing API errors

-- Add the updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_presence'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.user_presence ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create or replace the trigger to update the timestamp
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_update_presence_timestamp ON public.user_presence;
CREATE TRIGGER trigger_update_presence_timestamp
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- Ensure all existing records have an updated_at value
UPDATE public.user_presence
SET updated_at = NOW()
WHERE updated_at IS NULL;
