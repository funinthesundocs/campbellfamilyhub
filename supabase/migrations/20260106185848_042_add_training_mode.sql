/*
  # Add Training Mode Support

  1. Changes
    - Add `training_mode` boolean column to user_profiles (default true for new users)
    - Add `training_progress` jsonb column to track tour completion and dismissed tips
    - Create index on training_mode for efficient queries

  2. Security
    - Users can only update their own training preferences
*/

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS training_mode boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS training_progress jsonb DEFAULT '{"tour_completed": false, "dismissed_tips": [], "current_step": 0}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_profiles_training_mode ON user_profiles(training_mode);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update own training mode'
  ) THEN
    CREATE POLICY "Users can update own training mode"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
