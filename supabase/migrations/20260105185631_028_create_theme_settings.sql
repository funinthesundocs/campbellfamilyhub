/*
  # Create Theme Settings Table

  1. New Tables
    - `theme_settings`
      - `id` (uuid, primary key)
      - `theme_name` (text, unique) - 'original', 'dark', 'light', 'custom'
      - `bg_primary` (text) - Main page background color
      - `bg_secondary` (text) - Cards, panels, elevated surfaces
      - `bg_tertiary` (text) - Hover states, subtle elevation
      - `text_primary` (text) - Headings and main content
      - `text_secondary` (text) - Subheadings and body text
      - `text_muted` (text) - Captions, disabled states, placeholders
      - `accent_primary` (text) - Main interactive elements (gold)
      - `accent_secondary` (text) - Secondary actions (sage)
      - `border_default` (text) - Default borders
      - `border_interactive` (text) - Focus rings, hover borders
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `theme_settings` table
    - All authenticated users can read theme settings
    - Only admins can update theme settings
  
  3. Initial Data
    - Original: Current dark theme (preserved)
    - Dark: Same as Original (admin can modify)
    - Light: Current light theme (preserved)
    - Custom: Starts as dark theme (admin configures)
*/

CREATE TABLE IF NOT EXISTS theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name text UNIQUE NOT NULL,
  bg_primary text NOT NULL,
  bg_secondary text NOT NULL,
  bg_tertiary text NOT NULL,
  text_primary text NOT NULL,
  text_secondary text NOT NULL,
  text_muted text NOT NULL,
  accent_primary text NOT NULL,
  accent_secondary text NOT NULL,
  border_default text NOT NULL,
  border_interactive text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read theme settings"
  ON theme_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update theme settings"
  ON theme_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
    )
  );

INSERT INTO theme_settings (theme_name, bg_primary, bg_secondary, bg_tertiary, text_primary, text_secondary, text_muted, accent_primary, accent_secondary, border_default, border_interactive)
VALUES
  ('original', '#0f0f0f', '#1a1a1a', '#242424', '#ffffff', '#a3a3a3', '#666666', '#c9a962', '#7a9a6d', '#2a2a2a', '#404040'),
  ('dark', '#0f0f0f', '#1a1a1a', '#242424', '#ffffff', '#a3a3a3', '#666666', '#c9a962', '#7a9a6d', '#2a2a2a', '#404040'),
  ('light', '#faf9f6', '#ffffff', '#f5f5f5', '#1a1a1a', '#525252', '#a3a3a3', '#c9a962', '#7a9a6d', '#e5e5e5', '#d4d4d4'),
  ('custom', '#0f0f0f', '#1a1a1a', '#242424', '#ffffff', '#a3a3a3', '#666666', '#c9a962', '#7a9a6d', '#2a2a2a', '#404040')
ON CONFLICT (theme_name) DO NOTHING;