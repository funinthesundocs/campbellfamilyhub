/*
  # Fix Public Access RLS Policies

  1. Changes
    - Add public SELECT policy for theme_settings (allow anonymous users to read theme colors)
    - Add public SELECT policy for hub_settings (allow anonymous users to read hub name/settings)
    - Add authenticated SELECT policy for user_profiles (allow users to read member profiles)

  2. Security
    - Anonymous users can read theme settings (needed for styling before login)
    - Anonymous users can read hub settings (needed for branding before login)
    - Authenticated users can read all user profiles (needed for member directory, recipe authors, etc.)
    - Existing write policies remain unchanged (admins only)

  3. Impact
    - Fixes 401 errors on homepage for unauthenticated users
    - Allows theme and hub settings to load before login
    - Enables proper display of member names, avatars, and recipe authors
*/

CREATE POLICY "Public can read theme settings"
  ON theme_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can read hub settings"
  ON hub_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can read hub settings"
  ON hub_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);
