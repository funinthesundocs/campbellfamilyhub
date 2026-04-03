/*
  # Fix Hub Settings Super Admin Access

  1. Changes
    - Update "Admins can modify hub settings" policy to check for both is_admin and is_super_admin
    - This allows super admins to update hub settings (hub name, tagline, etc.)

  2. Security
    - Policy now correctly grants access to both regular admins and super admins
    - Maintains existing security model
*/

DROP POLICY IF EXISTS "Admins can modify hub settings" ON hub_settings;

CREATE POLICY "Admins can update hub settings"
  ON hub_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND (is_admin = true OR is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can insert hub settings"
  ON hub_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "Admins can delete hub settings"
  ON hub_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND (is_admin = true OR is_super_admin = true)
    )
  );
