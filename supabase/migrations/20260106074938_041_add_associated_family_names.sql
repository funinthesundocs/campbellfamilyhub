/*
  # Add Associated Family Names to Hub Settings

  1. Changes
    - Add `associated_family_names` column to `hub_settings` table
    - This field stores comma-separated family names that will rotate in the logo

  2. New Columns
    - `associated_family_names` (text, nullable)
      - Stores comma-separated list of family names
      - Will be used for visual rotation effects in the header/logo
*/

ALTER TABLE hub_settings
ADD COLUMN IF NOT EXISTS associated_family_names text DEFAULT NULL;
