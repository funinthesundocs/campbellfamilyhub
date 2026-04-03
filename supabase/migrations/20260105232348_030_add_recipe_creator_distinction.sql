/*
  # Add Recipe Creator Distinction

  1. Changes
    - Add `original_author` column to `recipes` table
      - Stores the name of the person who originally created the recipe (e.g., "Grandma Betty")
      - Nullable text field, as some recipes may not have a known original author
      - Distinct from `submitted_by` which tracks the system user who digitized/uploaded the recipe
    
  2. Purpose
    - Distinguish between the recipe's original creator (family member who made it) 
      and the system user who uploaded/digitized it
    - Preserves family history and proper attribution
    - Example: "Grandma Betty's Turkey Gravy" created by Grandma Betty, digitized by John Campbell
  
  3. Notes
    - Backward compatible: existing recipes work without original_author
    - No data loss or breaking changes
    - `source` field remains for book/URL references
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'original_author'
  ) THEN
    ALTER TABLE recipes ADD COLUMN original_author text;
  END IF;
END $$;