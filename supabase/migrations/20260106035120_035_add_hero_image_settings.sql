/*
  # Add Hero Image Settings to Theme Configuration

  1. New Columns
    - `hero_image_url` (text) - URL of the hero image stored in Supabase Storage
    - `hero_overlay_color` (text) - Overlay color: 'black' or 'white'
    - `hero_overlay_opacity` (numeric) - Opacity value between 0 and 1

  2. Changes
    - Adds hero image configuration to hub_settings table
    - Allows super admins to upload and configure home page hero image
    - Provides real-time overlay color and opacity controls
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hub_settings' AND column_name = 'hero_image_url'
  ) THEN
    ALTER TABLE hub_settings ADD COLUMN hero_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hub_settings' AND column_name = 'hero_overlay_color'
  ) THEN
    ALTER TABLE hub_settings ADD COLUMN hero_overlay_color text DEFAULT 'black';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hub_settings' AND column_name = 'hero_overlay_opacity'
  ) THEN
    ALTER TABLE hub_settings ADD COLUMN hero_overlay_opacity numeric DEFAULT 0.4;
  END IF;
END $$;