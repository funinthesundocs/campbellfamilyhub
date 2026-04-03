/*
  # Add User Type Column

  1. Changes
    - Add `user_type` column to `user_profiles` table
    - Valid values: 'family', 'guest', 'admin'
    - Default value: 'family'
    - Existing users will be set to 'family' or 'admin' based on is_admin flag

  2. Notes
    - This column distinguishes between family members, guests, and admins
    - Super admins are identified separately by is_super_admin flag
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN user_type text DEFAULT 'family'
      CHECK (user_type IN ('family', 'guest', 'admin'));
  END IF;
END $$;

UPDATE user_profiles SET user_type = 'admin' WHERE is_admin = true AND user_type IS NULL;
UPDATE user_profiles SET user_type = 'family' WHERE user_type IS NULL;