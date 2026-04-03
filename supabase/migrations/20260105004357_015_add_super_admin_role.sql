/*
  # Add Super Admin Role

  1. Changes
    - Add `is_super_admin` boolean column to `user_profiles` table
    - Default to false for all users
    - Super admins have elevated privileges over regular admins

  2. Notes
    - Super admin can manage other admins
    - Super admin can generate invite codes
    - Regular admins cannot modify super admin status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;
END $$;