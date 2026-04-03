/*
  # Add dietary restrictions and cuisine type to recipes

  1. Changes
    - Add `dietary_restrictions` column to recipes (jsonb array for multiple restrictions)
    - Add `cuisine_type` column to recipes (text for single cuisine type)
    - Add `view_count` column for tracking recipe popularity
  
  2. Purpose
    - Enable filtering recipes by dietary restrictions (vegetarian, vegan, gluten-free, etc.)
    - Enable filtering recipes by cuisine type (italian, mexican, asian, etc.)
    - Track recipe views for "Most Popular" sorting
  
  3. Notes
    - dietary_restrictions uses jsonb to allow multiple restrictions per recipe
    - All columns are nullable to not break existing recipes
    - Default values allow gradual data population
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'dietary_restrictions'
  ) THEN
    ALTER TABLE recipes ADD COLUMN dietary_restrictions jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'cuisine_type'
  ) THEN
    ALTER TABLE recipes ADD COLUMN cuisine_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE recipes ADD COLUMN view_count integer DEFAULT 0;
  END IF;
END $$;
