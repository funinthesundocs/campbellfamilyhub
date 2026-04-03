/*
  # Move Hero Image Settings to Per-Theme Configuration

  1. Changes
    - Add `hero_image_url` (text) to theme_settings - URL of hero image per theme
    - Add `hero_overlay_color` (text) to theme_settings - Overlay color per theme
    - Add `hero_overlay_opacity` (numeric) to theme_settings - Overlay opacity per theme

  2. Migration Strategy
    - Copy existing hero_image_url from hub_settings to all themes
    - Copy existing hero_overlay_color from hub_settings to all themes
    - Copy existing hero_overlay_opacity from hub_settings to all themes
    - Preserve hub_settings columns for backwards compatibility

  3. Notes
    - Each theme now has independent hero image configuration
    - Allows different hero images for dark vs light themes
    - Maintains design consistency with other theme properties
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'hero_image_url'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN hero_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'hero_overlay_color'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN hero_overlay_color text DEFAULT 'black';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'hero_overlay_opacity'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN hero_overlay_opacity numeric DEFAULT 0.4;
  END IF;
END $$;

UPDATE theme_settings
SET 
  hero_image_url = (SELECT hero_image_url FROM hub_settings LIMIT 1),
  hero_overlay_color = COALESCE((SELECT hero_overlay_color FROM hub_settings LIMIT 1), 'black'),
  hero_overlay_opacity = COALESCE((SELECT hero_overlay_opacity FROM hub_settings LIMIT 1), 0.4)
WHERE hero_image_url IS NULL;