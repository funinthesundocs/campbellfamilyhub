/*
  # Add Typography Settings to Theme Configuration

  ## Changes
  1. Adds typography columns to theme_settings table:
    - heading_font: Font family for headings (h1, h2, h3, etc.)
    - body_font: Font family for body text
    - heading_font_weight: Font weight for headings (300, 400, 600, 700)
    - body_font_weight: Font weight for body text (300, 400, 600, 700)
    - heading_font_size_scale: Multiplier for heading sizes (0.8 - 1.5)
    - body_font_size_scale: Multiplier for body text (0.8 - 1.5)

  ## Default Values
  - Heading Font: Playfair Display (current design)
  - Body Font: Inter (current design)
  - Both weights: 400 (normal)
  - Both scales: 1.0 (100%)

  ## Available Fonts
  Roboto, Montserrat, Lato, Poppins, Inter, Work Sans, Karla, Rubik, 
  Baloo Tamma 2, Playfair Display, Lora, Roboto Slab
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'heading_font'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN heading_font text DEFAULT 'Playfair Display';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'body_font'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN body_font text DEFAULT 'Inter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'heading_font_weight'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN heading_font_weight text DEFAULT '400';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'body_font_weight'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN body_font_weight text DEFAULT '400';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'heading_font_size_scale'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN heading_font_size_scale numeric DEFAULT 1.0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'body_font_size_scale'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN body_font_size_scale numeric DEFAULT 1.0;
  END IF;
END $$;