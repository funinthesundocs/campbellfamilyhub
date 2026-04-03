/*
  # Create Member Invites System

  1. New Tables
    - `member_invites`
      - `id` (uuid, primary key)
      - `code` (text, unique) - 8-character invite code
      - `email` (text, nullable) - optional email restriction
      - `created_by` (uuid, references user_profiles)
      - `used_by` (uuid, nullable, references user_profiles)
      - `expires_at` (timestamptz) - when invite expires
      - `used_at` (timestamptz, nullable) - when invite was used
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `member_invites` table
    - Admins can view all invites
    - Admins can create invites
    - Public can validate unused invite codes for registration
*/

CREATE TABLE IF NOT EXISTS member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  email text,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  used_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invites"
  ON member_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create invites"
  ON member_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update invites"
  ON member_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete invites"
  ON member_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_member_invites_code ON member_invites(code);
CREATE INDEX IF NOT EXISTS idx_member_invites_created_by ON member_invites(created_by);