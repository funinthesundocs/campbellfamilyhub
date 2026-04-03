/*
  # Add Custom Attributes Column to Properties

  1. Changes
    - Add `custom_attributes` JSONB column to `properties` table
    - This column stores key-value pairs for dynamic property attributes
    - Keys correspond to `property_attributes.key` values

  2. Example Data
    - { "beds": 5, "cribs": 2, "refrigerators": 1, "fold_out_sofas": 2 }
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'custom_attributes'
  ) THEN
    ALTER TABLE properties ADD COLUMN custom_attributes jsonb DEFAULT '{}';
  END IF;
END $$;