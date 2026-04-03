/*
  # Add admin update policy for user_profiles

  1. Security Changes
    - Add policy allowing admins and super admins to update any user profile
    - Add WITH CHECK clause to existing user update policy for completeness

  2. Notes
    - Super admins and admins need to edit member profiles from Admin panel
    - This enables the Edit Member functionality
*/

CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.is_admin = true OR up.is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (up.is_admin = true OR up.is_super_admin = true)
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());